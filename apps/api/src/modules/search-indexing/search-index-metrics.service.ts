// apps/api/src/modules/search-indexing/search-index-metrics.service.ts
//
// Search Architecture Phase 5: Prometheus gauges need something to push
// values into them periodically (unlike counters/histograms, which are
// updated inline as events happen) — this polls Meilisearch's health
// endpoint and the search-index BullMQ queue's job counts every 15s and
// writes the results into MetricsService's gauges.

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MeilisearchService } from '../../common/search-index/meilisearch.service';
import { MetricsService } from '../../common/monitoring/metrics.service';
import { SEARCH_INDEX_QUEUE, SearchIndexJobData } from './search-index.constants';

const POLL_INTERVAL_MS = 15_000;

@Injectable()
export class SearchIndexMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchIndexMetricsService.name);
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly meilisearch: MeilisearchService,
    private readonly metrics: MetricsService,
    @InjectQueue(SEARCH_INDEX_QUEUE) private readonly queue: Queue<SearchIndexJobData>,
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    // Fire once immediately rather than waiting for the first interval tick.
    this.poll();
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private async poll(): Promise<void> {
    try {
      const healthy = await this.meilisearch.healthCheck();
      this.metrics.meilisearchHealthUp.set(healthy ? 1 : 0);
    } catch (err) {
      // healthCheck() itself never throws (see its own try/catch), but
      // guard anyway — a metrics poller must never itself crash anything.
      this.logger.warn(`Meilisearch health poll failed: ${(err as Error).message}`);
    }

    try {
      const counts = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
      this.metrics.searchIndexQueueDepth.set({ state: 'waiting' }, counts.waiting ?? 0);
      this.metrics.searchIndexQueueDepth.set({ state: 'active' }, counts.active ?? 0);
      this.metrics.searchIndexQueueDepth.set({ state: 'delayed' }, counts.delayed ?? 0);
      this.metrics.searchIndexQueueDepth.set({ state: 'failed' }, counts.failed ?? 0);
    } catch (err) {
      this.logger.warn(`search-index queue depth poll failed: ${(err as Error).message}`);
    }
  }
}
