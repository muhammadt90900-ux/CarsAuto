# Error Tracking (Sentry) — CarsAuto

PROMPT 3. All three apps (`api`, `worker`, `web`) forward unhandled/tracked
errors to Sentry. This doc covers what's captured, what's deliberately
excluded, and the couple of real decisions you need to make before this is
fully live (creating the Sentry project(s) and setting the DSN — everything
else is already wired).

## Architecture: one DSN or three?

**This repo defaults to ONE shared Sentry DSN across api/worker/web**, set
once in `apps/k8s/configmap.yaml`'s `SENTRY_DSN` (server-side) and
`NEXT_PUBLIC_SENTRY_DSN` (web's browser bundle, baked in at build time —
see `apps/web/Dockerfile`). Every event is tagged `service: api|worker|web`
(see each service's `error-tracker.service.ts` / `sentry.*.config.ts`), so
you can still filter/alert per-service inside a single Sentry project.

Trade-off if you later want **separate Sentry projects per service**
instead: better blast-radius isolation for alert routing and quota, at the
cost of three DSNs to manage instead of one and losing single-project
cross-service trace correlation. If you switch, the only things that change
are the `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` values — no code changes
needed, since every capture path already reads these from env.

## What's captured, per service

### API (`apps/api`)
- Every unhandled exception that reaches `AllExceptionsFilter` **with a 5xx
  status only** — 4xx (validation errors, not-found, auth failures) are
  deliberately excluded; they're expected traffic, not bugs, and would
  drown out real signal. See `all-exceptions.filter.ts`.
- Context attached: HTTP method, URL, status code, IP, and the
  authenticated user's id (`userId`) if the request carried a valid JWT —
  never the full user object, never the request body.
- Initialized in `main.ts` before anything else in `bootstrap()`, so
  startup-time crashes are captured too. See `sentry.init.ts`.

### Worker (`apps/worker`)
- Every BullMQ job that exhausts its retry attempts, via each processor's
  `@OnWorkerEvent('failed')` handler (see e.g. `translation.processor.ts`).
  Context: queue/job **name and id only** — never `job.data`, which can
  contain listing text, user emails, or (for anything payment-adjacent)
  financial data.
- Process-level `unhandledRejection`/`uncaughtException` handlers in
  `main.ts`, both captured at `fatal` level.
- Same `sentry.init.ts` pattern as the API, initialized first thing in
  `bootstrap()`.

### Web (`apps/web`)
- Route-segment `error.tsx` boundaries and the root `global-error.tsx`, via
  the shared `reportError()` helper in `src/lib/monitoring.ts`.
- Server Components / Server Actions / Route Handlers, via
  `src/instrumentation.ts`'s `onRequestError` hook (Next.js's own
  instrumentation point — this is NOT the same code path as the
  `error.tsx` boundaries above; it's the only thing that catches errors
  those boundaries structurally can't).
- Client-side JS errors and (optionally) performance traces, via
  `sentry.client.config.ts`, loaded automatically by `withSentryConfig()`
  in `next.config.js`.
- **Session Replay is OFF by default** (`replaysSessionSampleRate: 0` /
  `replaysOnErrorSampleRate: 0` in `sentry.client.config.ts`) — it's a much
  bigger PII surface than error events alone (can capture on-screen text
  like listing prices or chat messages unless every sensitive element is
  manually masked). Turning it on is a deliberate follow-up decision, not
  bundled into this pass.

## What's deliberately NEVER sent

- Passwords, tokens (access/refresh/OTP), and payment card fields
  (`cardNumber`, `cvv`/`cvc`, `expiryMonth`/`expiryYear`, `iban`,
  `accountNumber`) — scrubbed by a `beforeSend` hook in every service's
  Sentry init (`sentry.init.ts` for api/worker, `sentry.*.config.ts` for
  web), recursively, at any nesting depth in whatever gets attached to an
  event.
- `Authorization` and `Cookie` headers — redacted the same way.
- Full request bodies and full BullMQ job payloads — never attached in the
  first place (see "What's captured" above); the `beforeSend` scrubbing is
  defense-in-depth for a future change that starts attaching them, not
  something currently relied on for the happy path.
- 4xx HTTP responses on the API (expected traffic, not bugs).

## Sampling

Performance trace sampling (`tracesSampleRate`) defaults to **10% in
production, 100% in dev/staging** (`NODE_ENV !== 'production'`), overridable
via `SENTRY_TRACES_SAMPLE_RATE` in `apps/k8s/configmap.yaml`. This only
affects performance traces — every error-level event is always captured
regardless of this rate.

## Release tracking

Every event is tagged with a `release` matching the exact git commit that
produced it: `carsauto-{api|worker|web}@<git-sha>`. The git SHA is
substituted into `apps/k8s/configmap.yaml`'s `APP_VERSION` placeholder by
the `deploy` job in `.github/workflows/ci.yml` (`sed` on the checked-out
working copy, see that job's "Set release version in configmap" step) —
this is how you correlate a spike in Sentry back to the exact deploy that
caused it.

Web's client-side release comes from `NEXT_PUBLIC_APP_VERSION`, baked in at
**build time** (see `apps/web/Dockerfile`'s build args) — Next.js inlines
`NEXT_PUBLIC_*` vars into the browser bundle, so unlike the server-side
services, this can't be set at deploy time via the configmap.

## Source maps (web only)

`next.config.js`'s `withSentryConfig()` wrapper uploads source maps to
Sentry at build time, then deletes them from the final image
(`sourcemaps: { deleteSourcemapsAfterUpload: true }`) — they're only needed
by Sentry's servers to de-minify stack traces; shipping them in the
production image would let anyone with container filesystem access read
de-minified source. This requires a `SENTRY_AUTH_TOKEN` at build time,
passed as a Docker BuildKit secret (**not** a build ARG — ARGs end up
inspectable in image layer history, a real secret must not) — see
`apps/web/Dockerfile`'s `RUN --mount=type=secret=sentry_auth_token` step
and `.github/workflows/ci.yml`'s web build step. Without this token set,
`withSentryConfig` logs a warning and skips the upload; the build still
succeeds, error events just report minified stack traces instead.

## Setup checklist (what you actually need to do)

Everything above is already wired in code. To make it live:

1. Create a Sentry project (or three, per the DSN decision above).
2. Set these as **GitHub Actions repository variables** (not secrets — a
   Sentry DSN can only submit events, never read them, so it's not
   sensitive; see `sentry.client.config.ts`'s header comment):
   `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
3. Set `SENTRY_AUTH_TOKEN` as a **GitHub Actions repository secret** (this
   one IS sensitive — scoped to upload source maps to your org).
4. Fill in `SENTRY_DSN` in `apps/k8s/configmap.yaml` (currently empty —
   every service degrades gracefully with it unset, producing a no-op
   Sentry client, so this is safe to leave blank until step 1 is done, but
   you're running production with zero error visibility until you fill it
   in — `env.validation.ts` on both api and worker warns loudly about this
   at startup).
5. (Optional) Configure Sentry alert rules — nothing in this codebase sets
   those up; they're a Sentry-project-level setting, not something CI/CD
   can own.

## Verifying it's working

- API: temporarily throw inside any controller method, hit the endpoint,
  confirm the event shows up in Sentry tagged `service: api` with the
  request's method/URL/statusCode/userId (if authenticated) in `extra`.
- Worker: temporarily throw inside any processor's `process()` method,
  trigger that job, let it exhaust its retries, confirm the event shows up
  tagged `service: worker` with the job's name/id.
- Web: visit any page, trigger a client-side error (or temporarily throw in
  a Server Component), confirm the event shows up with a de-minified stack
  trace (proves source map upload worked) and the correct `release` tag.
