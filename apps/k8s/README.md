# k8s/ — Kubernetes manifests

## Before applying

1. Nothing to do here anymore for a CI-driven deploy: the `ghcr.io/
   REPLACE_ORG/REPLACE_REPO/...:{{IMAGE_TAG}}` placeholders in
   `api-deployment.yaml`, `web-deployment.yaml`, and `worker-deployment.yaml`
   are matched and substituted automatically by the `deploy` job in
   `.github/workflows/ci.yml` (`kustomize edit set image`, pinning by the
   real, just-built image digest — see that job's comments). The literal
   placeholder text is expected to remain in these files at rest; do not
   hand-edit it. If you ever need to `kubectl apply -k apps/k8s/` manually
   outside of CI, run the same `kustomize edit set image` command from that
   job first, substituting your own real image references.
2. Replace the placeholder domains in `configmap.yaml` and `ingress.yaml`
   (`carsauto.iq` / `api.carsauto.iq`) with your real domain(s).
3. Fill in `secrets.yaml` with real values — and read its header comment
   about NOT committing real secrets in plain YAML. Use Sealed Secrets,
   External Secrets Operator, or SOPS for anything beyond a local/throwaway
   cluster.
4. ~~`apps/worker` has no CI image-build step yet~~ — resolved: the `build`
   job in `.github/workflows/ci.yml` now builds and pushes `WORKER_IMAGE`
   alongside `API_IMAGE`/`WEB_IMAGE`, using `apps/worker/Dockerfile` (note:
   renamed from the old lowercase `dockerfile` for consistency with the
   other two apps).
5. Meilisearch itself isn't included here as a manifest — `configmap.yaml`
   assumes a Service named `meilisearch` exists in this namespace. Run it
   as a StatefulSet with a PersistentVolumeClaim (same shape as
   `docker-compose.yml`'s `meilisearch` service), or point `MEILISEARCH_URL`
   at a managed/Meilisearch Cloud instance instead.
6. Postgres and Redis are assumed to already exist (managed services, or
   their own StatefulSets) — not included here either, for the same reason:
   stateful datastores need careful PVC/backup planning that's a separate
   decision from the stateless app tier this manifest set covers.
   F-SEC fix (Prompt 6): "Redis" here is really two logical connections now
   — see `secrets.yaml`'s `CRITICAL_REDIS_URL`/`CRITICAL_REDIS_DB` comment
   for the two ways to satisfy that (separate instance, or same instance +
   different db index) depending on what's available/affordable.
   F-PERF fix (Prompt 7): `secrets.yaml`'s `DATABASE_READ_URLS` (plural,
   comma-separated) replaces the old single `DATABASE_READ_URL` — provision
   2 read replicas via your Postgres provider (a starting point, not a
   load-tested number — see docker-compose.yml's equivalent comment) and
   list both. `prisma.service.ts`'s `db('read')` round-robins across
   whatever's listed there, so scaling to more replicas later is a
   one-line `secrets.yaml` change, no code change.
7. `pgbouncer-deployment.yaml` needs `secrets.yaml`'s `DATABASE_DIRECT_URL`
   key filled in with the REAL, direct-to-Postgres connection string —
   `DATABASE_URL` (used by the api/worker) points AT this PgBouncer
   Deployment instead, once both are applied. Run schema migrations /
   `prisma db push` against `DATABASE_DIRECT_URL`, not `DATABASE_URL` —
   PgBouncer's transaction-pooling mode does not reliably support DDL.
8. `hpa.yaml`'s p95-latency metric needs Prometheus Adapter already
   installed cluster-wide (same "assumed, not included" pattern as
   Postgres/Redis/Prometheus above) with `prometheus-adapter-rules.yaml`'s
   rule merged into its config — see that file's header for exact steps.
   The HPA still works on CPU alone if you skip this, just without the
   latency-based trigger.
9. **F-SEC fix (Prompt 6):** `network-policies.yaml` default-denies all
   ingress traffic in this namespace, then allows back exactly the paths
   this app actually uses — see that file's header comment for the full
   traffic map and, importantly, for two assumptions you need to verify
   against your real cluster: the ingress controller's namespace is assumed
   to be literally named `ingress-nginx`, and Prometheus's namespace is
   assumed to be literally named `monitoring`. If either differs, update the
   corresponding `namespaceSelector` in `network-policies.yaml` before
   applying, or every request through your ingress (or every Prometheus
   scrape) will be silently dropped. `pdb.yaml` and `resource-quota.yaml`
   need no per-cluster edits — they're sized directly from replica counts
   and resource requests/limits already in this directory (see each file's
   header for the arithmetic).
10. **Centralized logging (Prompt 4):** `promtail-daemonset.yaml` ships
    every pod's stdout/stderr to Loki, same as `network-policies.yaml`'s
    Postgres/Redis/Meilisearch pattern — it assumes a Loki instance
    reachable at `http://loki:3100` in this namespace, which this manifest
    set doesn't provide a Deployment for. See that file's header for the
    real decision you need to make (reuse docker-compose's Loki instance
    vs. a proper object-storage-backed Loki deployment) before this is
    production-ready — it's not something this pass can pick for you.

## Apply order

**Production (via CI):** `kubectl apply -k apps/k8s/` — this is what the
`deploy` job in `.github/workflows/ci.yml` runs, after `kustomization.yaml`
(in this directory) has had real image digests substituted in via
`kustomize edit set image`. You should not need to run this by hand for a
normal deploy.

**Manual / first-time-cluster-setup**, applying each file individually in
an order that avoids retry churn on first apply (Kubernetes will retry pods
that reference not-yet-created ConfigMaps/Secrets either way, so this order
is a convenience, not a hard requirement):

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml       # after filling in real values
kubectl apply -f resource-quota.yaml
kubectl apply -f pgbouncer-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f hpa.yaml
kubectl apply -f pdb.yaml
kubectl apply -f promtail-daemonset.yaml
kubectl apply -f ingress.yaml
kubectl apply -f network-policies.yaml   # apply LAST — see note below
```

⚠️ **Apply `network-policies.yaml` last**, after every other resource in
this list — its `default-deny-ingress` policy takes effect immediately on
apply, so applying it before, say, `carsauto-web` exists doesn't cause an
error, but applying it before you've verified the ingress-controller/
Prometheus namespace assumptions above (item 9) means you'd find out about
a wrong assumption via a production outage instead of during setup. Test
with `kubectl apply --dry-run=client -f network-policies.yaml` first either
way.

## Notes on deviations from the original plan

- **Health probes** (`api-deployment.yaml`'s `readinessProbe`/`livenessProbe`)
  only work correctly because `apps/api/src/common/monitoring/health.controller.ts`
  was fixed as part of this same change — it previously always returned
  HTTP 200 regardless of actual DB/Redis health, which would have made the
  readiness probe pass even when the database was down.
- **WebSocket ingress path** is `/socket.io/`, not `/api/socket.io/` —
  verified against `chat.gateway.ts` and `main.ts`; see `ingress.yaml`'s
  header comment for the full reasoning.
- **Blast-radius hardening (Prompt 6):** `network-policies.yaml`, `pdb.yaml`,
  and `resource-quota.yaml` are additive — they were verified against every
  existing manifest's actual service dependencies (envFrom secrets/config,
  DNS names in `configmap.yaml`/`secrets.yaml`, `ingress.yaml`'s backends)
  before being written, specifically so they lock down what's NOT currently
  used without breaking what is. See `network-policies.yaml`'s header for
  the full traffic map that was checked.
