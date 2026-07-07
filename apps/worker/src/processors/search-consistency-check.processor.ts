// apps/worker/src/processors/search-consistency-check.processor.ts
//
// Search Architecture Phase 5: nightly job (same 'maintenance' queue +
// repeatable-job pattern as partition-maintenance.processor.ts and
// ranking-recompute.processor.ts) that checks Postgres and Meilisearch
// haven't silently drifted apart — the dual-write pipeline from Phase 1
// is "eventually consistent, best-effort" by design (fire-and-forget
// listeners, retried-but-not-infinitely BullMQ jobs), so SOME drift
// mechanism has to actually watch for it rather than assume it never
// happens.
//
// Two checks:
//   1. Document COUNT parity — Postgres's ACTIVE/non-deleted listing count
//      vs Meilisearch's total document count.
//   2. Field-level spot-check — N random ACTIVE listing ids, compared
//      field-by-field (title, price, status) between the two stores.
//      Catches the case count parity would miss: same number of
//      documents, but stale/wrong field values on some of them.
//
// Alerting: this repo has no dedicated ops/infra alerting channel (no
// Slack webhook, no PagerDuty integration) — the closest existing hook is
// the worker's own EmailService, already used for user-facing mail. On
// drift exceeding the threshold, this job logs at `error` level (always)
// and additionally emails ADMIN_ALERT_EMAIL if that env var is set
// (best-effort — a failed alert email is logged, never thrown).

import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { MeilisearchService } from '../common/search-index/meilisearch.service';
import { EmailService } from '../common/email/email.service';

// Count drift beyond this fraction of the Postgres count triggers an alert.
// 2% is a starting guess — some transient drift is expected (indexing
// lag for listings created/changed in the last few minutes), so this
// isn't 0%, but shouldn't ever be large or persistent.
const COUNT_DRIFT_THRESHOLD = 0.02;

// How many random listings to field-compare each run. Small enough to be
// cheap nightly overhead, large enough to have a reasonable chance of
// catching a systemic (not one-off) field-mapping bug.
const SPOT_CHECK_SAMPLE_SIZE = 25;

// More than this many field-level mismatches out of the sample size above
// is treated as a systemic issue worth alerting on, not statistical noise
// from the same indexing-lag window as the count check.
const SPOT_CHECK_MISMATCH_THRESHOLD = 2;

@Injectable()
@Processor('maintenance')
export class SearchConsistencyCheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SearchConsistencyCheckProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meilisearch: MeilisearchService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'search-consistency-check',
      {},
      {
        jobId: 'search-consistency-check-nightly',
        repeat: { pattern: '30 4 * * *' }, // 04:30 UTC daily — after ranking-recompute's 04:00 slot
      },
    );
    this.logger.log('Registered nightly search-consistency-check repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'search-consistency-check') return;

    const [countResult, spotCheckResult] = await Promise.all([
      this.checkDocumentCount(),
      this.spotCheckFields(),
    ]);

    if (countResult.drifted || spotCheckResult.drifted) {
      await this.alert(countResult, spotCheckResult);
    } else {
      this.logger.log(
        `Search consistency check passed — Postgres: ${countResult.postgresCount}, Meilisearch: ${countResult.meilisearchCount}, spot-check mismatches: ${spotCheckResult.mismatches}/${spotCheckResult.sampleSize}`,
      );
    }
  }

  private async checkDocumentCount(): Promise<{ drifted: boolean; postgresCount: number; meilisearchCount: number; driftFraction: number }> {
    const [postgresCount, meilisearchCount] = await Promise.all([
      this.prisma.listing.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      this.meilisearch.getDocumentCount(),
    ]);

    const driftFraction = postgresCount > 0 ? Math.abs(postgresCount - meilisearchCount) / postgresCount : 0;
    return { drifted: driftFraction > COUNT_DRIFT_THRESHOLD, postgresCount, meilisearchCount, driftFraction };
  }

  private async spotCheckFields(): Promise<{ drifted: boolean; mismatches: number; sampleSize: number; examples: string[] }> {
    const sample = await this.prisma.$queryRaw<{ id: string; title_en: string; price: string; status: string }[]>`
      SELECT id, title_en, price::text, status
      FROM listings
      WHERE status = 'ACTIVE' AND deleted_at IS NULL
      ORDER BY random()
      LIMIT ${SPOT_CHECK_SAMPLE_SIZE}
    `;

    let mismatches = 0;
    const examples: string[] = [];

    for (const row of sample) {
      const doc = await this.meilisearch.getDocument(row.id);
      if (!doc) {
        mismatches++;
        examples.push(`${row.id}: missing from Meilisearch entirely`);
        continue;
      }
      const priceMatches = Math.abs(Number(doc.price) - Number(row.price)) < 0.01;
      const titleMatches = doc.titleEn === row.title_en;
      const statusMatches = doc.status === row.status;
      if (!priceMatches || !titleMatches || !statusMatches) {
        mismatches++;
        examples.push(
          `${row.id}: ${!titleMatches ? 'title ' : ''}${!priceMatches ? 'price ' : ''}${!statusMatches ? 'status ' : ''}mismatch`,
        );
      }
    }

    return {
      drifted: mismatches > SPOT_CHECK_MISMATCH_THRESHOLD,
      mismatches,
      sampleSize: sample.length,
      examples: examples.slice(0, 5), // cap what goes into the alert email
    };
  }

  private async alert(
    countResult: { postgresCount: number; meilisearchCount: number; driftFraction: number },
    spotCheckResult: { mismatches: number; sampleSize: number; examples: string[] },
  ): Promise<void> {
    const message =
      `Search index drift detected — Postgres: ${countResult.postgresCount} ACTIVE listings, ` +
      `Meilisearch: ${countResult.meilisearchCount} documents (${(countResult.driftFraction * 100).toFixed(1)}% drift). ` +
      `Spot-check: ${spotCheckResult.mismatches}/${spotCheckResult.sampleSize} field mismatches. ` +
      `Examples: ${spotCheckResult.examples.join('; ') || 'none'}. ` +
      `Consider running POST /admin/search/reindex.`;

    this.logger.error(message);

    const alertEmail = this.config.get<string>('ADMIN_ALERT_EMAIL');
    if (!alertEmail) {
      this.logger.warn('ADMIN_ALERT_EMAIL not configured — drift alert only logged, not emailed');
      return;
    }

    try {
      await this.email.sendMail({
        to: alertEmail,
        subject: '[CarsAuto] Search index drift detected',
        html: `<p>${message}</p>`,
        text: message,
      });
    } catch (err) {
      this.logger.error(`Failed to send search-drift alert email: ${(err as Error).message}`);
    }
  }
}
