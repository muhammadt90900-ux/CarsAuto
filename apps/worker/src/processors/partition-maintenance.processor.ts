// apps/worker/src/processors/partition-maintenance.processor.ts
//
// Phase 2 / Prompt 2.3 — pg_cron fallback.
//
// This environment's managed Postgres does not have the pg_cron extension
// available (true of Railway today, and true of AWS RDS for Postgres unless
// explicitly enabled via a parameter group — see docs/DATABASE-OPERATIONS.md
// for which provider production actually uses), so "never let us run out of
// partitions" is implemented as a
// BullMQ repeatable job instead of a pg_cron scheduled SQL job.
//
// Runs monthly (see the repeat pattern registered in registerRepeatingJob()
// below) and creates the next few months' partitions — ahead of time, not
// just-in-time — for all 4 partitioned tables (messages, audit_logs,
// transaction_logs, notifications). Uses CREATE TABLE IF NOT EXISTS, so
// it's safe to run more often than needed and safe to re-run after a
// failure without creating duplicates.
//
// PREREQUISITE: the 4 tables must already have been converted to
// partitioned tables via the migrations in prisma/migrations-manual/
// (partition-messages.sql etc.) before this job does anything useful —
// running it against a non-partitioned table is a harmless no-op error
// that gets logged and retried, not a crash.

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ErrorTrackerService } from '../common/monitoring/error-tracker.service';

// How far ahead to keep partitions created. 3 matches the "next 3 months"
// starting window from the manual migrations — keeping the same margin
// going forward means we're never closer than ~2 months to running out,
// even if this job fails silently for a cycle.
const MONTHS_AHEAD = 3;

const PARTITIONED_TABLES = ['messages', 'audit_logs', 'transaction_logs', 'notifications'] as const;

@Injectable()
@Processor('maintenance')
export class PartitionMaintenanceProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(PartitionMaintenanceProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('maintenance') private readonly maintenanceQueue: Queue,
    private readonly errorTracker: ErrorTrackerService,
  ) {
    super();
  }

  // Registers the repeatable job once on worker startup. BullMQ dedupes
  // repeatable jobs by (name + repeat pattern + jobId), so this is safe to
  // run on every worker replica's startup without creating duplicate
  // schedules.
  async onModuleInit() {
    await this.maintenanceQueue.add(
      'create-next-partitions',
      {},
      {
        jobId: 'partition-maintenance-monthly', // stable id → dedupes across replicas/restarts
        repeat: { pattern: '0 3 1 * *' }, // 03:00 UTC on the 1st of every month
      },
    );
    this.logger.log('Registered monthly partition-maintenance repeatable job');
  }

  async process(job: Job): Promise<void> {
    if (job.name !== 'create-next-partitions') return;

    this.logger.log(`Running partition maintenance — ensuring partitions exist through +${MONTHS_AHEAD} months`);

    for (const table of PARTITIONED_TABLES) {
      try {
        await this.ensureFuturePartitions(table);
      } catch (err) {
        // One table's failure (e.g. it hasn't been migrated to partitioned
        // form yet) shouldn't block the others.
        this.logger.error(`Failed to ensure partitions for "${table}"`, err as Error);
      }
    }
  }

  private async ensureFuturePartitions(table: (typeof PARTITIONED_TABLES)[number]): Promise<void> {
    // Raw SQL: same idempotent CREATE TABLE IF NOT EXISTS ... PARTITION OF
    // pattern as the manual migration files, but driven by "now" at run
    // time instead of a fixed window, and only walking forward (we never
    // need to backfill past partitions here — those were created once by
    // the manual migration).
    await this.prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
        month_start date;
        month_end   date;
        partition_name text;
      BEGIN
        FOR month_start IN
          SELECT generate_series(
            date_trunc('month', now()),
            date_trunc('month', now() + interval '${MONTHS_AHEAD} months'),
            interval '1 month'
          )::date
        LOOP
          month_end := (month_start + interval '1 month')::date;
          partition_name := '${table}_' || to_char(month_start, 'YYYY_MM');

          EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "${table}" FOR VALUES FROM (%L) TO (%L)',
            partition_name, month_start, month_end
          );
        END LOOP;
      END $$;
    `);

    this.logger.log(`Ensured partitions exist for "${table}" through +${MONTHS_AHEAD} months`);
  }

  // PROMPT 3: this job failing repeatedly is a genuine "we're about to run
  // out of partitions" risk (see this file's header) — job name/id only,
  // no payload (job.data here is just a table name/month, not PII, but
  // kept consistent with every other processor's handler regardless).
  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error): void {
    this.errorTracker.capture({
      error,
      context: 'PartitionMaintenanceProcessor',
      jobName: job?.name,
      jobId:   job?.id,
      level:   'fatal', // running out of partitions breaks inserts entirely
      extra:   { attemptsMade: job?.attemptsMade },
    });
  }
}
