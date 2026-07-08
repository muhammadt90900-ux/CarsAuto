# @cars-auto/worker

Standalone BullMQ worker process for CarsAuto. Runs the `translations` and
`notifications` job processors in a process completely separate from the
HTTP API (`apps/api`), so heavy background CPU work (OpenAI translation
calls, transactional email, web push) never competes with HTTP request
handling for the event loop.

## How it connects

- **Same Postgres** as `apps/api` — `DATABASE_URL` must point at the same
  database.
- **Same Redis** as `apps/api` — `REDIS_URL` must point at the same
  instance, and the queue names (`translations`, `notifications`) match
  exactly what `apps/api` already produces jobs to. **No changes were made
  to `apps/api`'s queue producers** — this worker just adds a second
  consumer process.
- **No HTTP server.** `src/main.ts` uses
  `NestFactory.createApplicationContext()`, not `NestFactory.create()` +
  `app.listen()`. There is no `EXPOSE` in the Dockerfile and no HTTP health
  endpoint — use process-liveness checks (restart count, `docker inspect`,
  k8s pod status) instead.

## ⚠️ Temporary code duplication — read before editing

The following files are **verbatim copies** of files that still live in
`apps/api/src/...`:

| apps/worker file | apps/api source |
|---|---|
| `src/common/prisma/prisma.service.ts` | `src/common/prisma/prisma.service.ts` |
| `src/common/ai/openai.service.ts` | `src/common/ai/openai.service.ts` |
| `src/common/ai/ai-cache.service.ts` | `src/common/ai/ai-cache.service.ts` |
| `src/common/ai/ai-cost-tracker.service.ts` | `src/common/ai/ai-cost-tracker.service.ts` |
| `src/common/cache/cache.service.ts` | `src/common/cache/cache.service.ts` |
| `src/common/cache/base-redis-store.ts` | `src/common/cache/base-redis-store.ts` |
| `src/common/email/email.service.ts` + `templates/` | `src/common/email/email.service.ts` + `templates/` |
| `src/common/logger/logger.service.ts` | `src/common/logger/logger.service.ts` |
| `src/modules/notifications/notifications.service.ts` | `src/modules/notifications/notifications.service.ts` |
| `src/processors/translation.processor.ts` | `src/modules/ai/translation/translation.processor.ts` |
| `src/processors/email-notification.processor.ts` | `src/modules/notifications/email-notification.processor.ts` |

This was an explicit, intentional constraint for this migration step: **the
processors were NOT removed from `apps/api` yet**, because `apps/api` is
still the only place that *enqueues* jobs, and pulling the processors out
from under it before this worker was proven stable in production would have
been the riskier move. Right now, **both** `apps/api` and `apps/worker` will
register a `@Processor('translations')` / `@Processor('notifications')`
listener — BullMQ will simply load-balance jobs across whichever
process(es) are running, which is safe, just redundant.

**Next step (separate, deliberate follow-up):** once this worker has run in
production for a while and is confirmed stable, delete the processor
registrations (and the now-dead `TranslationProcessor` /
`EmailNotificationProcessor` providers) from `apps/api/src/modules/ai/ai.module.ts`
and `apps/api/src/modules/notifications/notifications.module.ts`, leaving
`apps/api` as a pure job *producer* and `apps/worker` as the sole *consumer*.
Until that cleanup happens, if you change processor logic, **update both
copies** (or do the cleanup now rather than maintaining two copies longer
than necessary).

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL / REDIS_URL to match apps/api's .env
npm install
npm run dev
```

## Scaling

Because this is a separate process, you can run multiple replicas of
`apps/worker` independently of how many `apps/api` replicas you run —
scale workers based on translation/notification job volume, not HTTP
traffic.
