// apps/worker/src/processors/price-curve-recompute.processor.ts
//
// Prompt 7: nightly recompute of PriceCurve from SOLD listings only
// (status = 'SOLD' AND soldPrice IS NOT NULL).
//
// WHAT "avgDepreciationPct" ACTUALLY MEASURES HERE (flagged, not silently
// assumed): true depreciation modeling needs an original/MSRP price to
// compare a sold price against, bucketed by vehicle age. This schema has
// no MSRP field anywhere. What it DOES have is each listing's own asking
// price (Listing.price) vs what it actually sold for (Listing.soldPrice)
// — so this job computes the average ASKING-TO-SOLD discount
// ((price - soldPrice) / price), grouped by brand + bodyType + country +
// model year, and stores that under avgDepreciationPct. It answers "how
// far below asking price do cars like this typically sell for," which is
// a genuinely useful sanity-check signal for suggestPrice (see
// AiService.suggestPrice's updated comment) but is NOT a year-over-year
// value-decline curve — please rename the column/signal if that
// distinction matters for how it's surfaced to sellers later.
//
// yearBucket = the vehicle's model year itself, ungrouped further — model
// year is already a natural, reasonably-sized granularity for this
// market; no need to bucket into ranges on top of it.

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

interface CurveRow {
  brandId: string;
  bodyType: string;
  country: string;
  yearBucket: number;
  avgDepreciationPct: number;
  sampleSize: number;
}

@Injectable()
@Processor('maintenance')
export class PriceCurveRecomputeProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PriceCurveRecomputeProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.maintenanceQueue.add(
      'recompute-price-curves',
      {},
      {
        jobId: 'price-curve-recompute-nightly',
        repeat: { pattern: '0 6 * * *' }, // 06:00 UTC — after seller-score's 05:30 slot
      },
    );
    this.logger.log('Registered nightly price-curve-recompute repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'recompute-price-curves') return;

    this.logger.log('Starting nightly price-curve recompute');

    let rows: CurveRow[];
    try {
      rows = await this.prisma.$queryRaw<CurveRow[]>`
        SELECT
          vs."brandId" AS "brandId",
          vs."bodyType"::text AS "bodyType",
          loc.country AS country,
          vs.year AS "yearBucket",
          AVG((l.price - l."soldPrice") / NULLIF(l.price, 0) * 100)::float AS "avgDepreciationPct",
          COUNT(*)::int AS "sampleSize"
        FROM listings l
        JOIN listing_vehicle_specs vs ON vs."listingId" = l.id
        LEFT JOIN locations loc ON loc.id = l."locationId"
        WHERE l.status = 'SOLD'
          AND l."soldPrice" IS NOT NULL
          AND l."deletedAt" IS NULL
          AND vs."brandId" IS NOT NULL
          AND vs."bodyType" IS NOT NULL
          AND vs.year IS NOT NULL
          AND loc.country IS NOT NULL
        GROUP BY vs."brandId", vs."bodyType", loc.country, vs.year
      `;
    } catch (err) {
      this.logger.error(`Price-curve aggregation query failed: ${(err as Error).message}`);
      return;
    }

    let upserted = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.prisma.priceCurve.upsert({
          where: {
            brandId_bodyType_country_yearBucket: {
              brandId: row.brandId,
              bodyType: row.bodyType as any,
              country: row.country,
              yearBucket: row.yearBucket,
            },
          },
          create: {
            brandId: row.brandId,
            bodyType: row.bodyType as any,
            country: row.country,
            yearBucket: row.yearBucket,
            avgDepreciationPct: row.avgDepreciationPct,
            sampleSize: row.sampleSize,
          },
          update: {
            avgDepreciationPct: row.avgDepreciationPct,
            sampleSize: row.sampleSize,
            lastComputedAt: new Date(),
          },
        });
        upserted++;
      } catch (err) {
        failed++;
        this.logger.warn(`PriceCurve upsert failed for one bucket: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Price-curve recompute complete — ${upserted} bucket(s) upserted, ${failed} failed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'PriceCurveRecomputeProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
