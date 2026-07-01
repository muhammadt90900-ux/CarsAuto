# k8s/ — Kubernetes manifests

## Before applying

1. Replace every `REPLACE_ORG/REPLACE_REPO` and `{{IMAGE_TAG}}` placeholder
   in `api-deployment.yaml`, `web-deployment.yaml`, and
   `worker-deployment.yaml` — `{{IMAGE_TAG}}` is meant to be substituted by
   your CI pipeline (a git SHA or release tag), not applied literally.
2. Replace the placeholder domains in `configmap.yaml` and `ingress.yaml`
   (`carsauto.iq` / `api.carsauto.iq`) with your real domain(s).
3. Fill in `secrets.yaml` with real values — and read its header comment
   about NOT committing real secrets in plain YAML. Use Sealed Secrets,
   External Secrets Operator, or SOPS for anything beyond a local/throwaway
   cluster.
4. `apps/worker` has no CI image-build step yet (`.github/workflows/ci.yml`
   only builds `API_IMAGE`/`WEB_IMAGE`) — add a `WORKER_IMAGE` build/push
   step before `worker-deployment.yaml` has an image to pull.
5. Meilisearch itself isn't included here as a manifest — `configmap.yaml`
   assumes a Service named `meilisearch` exists in this namespace. Run it
   as a StatefulSet with a PersistentVolumeClaim (same shape as
   `docker-compose.yml`'s `meilisearch` service), or point `MEILISEARCH_URL`
   at a managed/Meilisearch Cloud instance instead.
6. Postgres and Redis are assumed to already exist (managed services, or
   their own StatefulSets) — not included here either, for the same reason:
   stateful datastores need careful PVC/backup planning that's a separate
   decision from the stateless app tier this manifest set covers.

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml       # after filling in real values
kubectl apply -f api-deployment.yaml
kubectl apply -f web-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f services.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml
```

Or just `kubectl apply -f k8s/` — apply order mostly doesn't matter since
Kubernetes will retry pods that reference not-yet-created ConfigMaps/Secrets,
but doing it in the order above avoids the retry churn on first apply.

## Notes on deviations from the original plan

- **Health probes** (`api-deployment.yaml`'s `readinessProbe`/`livenessProbe`)
  only work correctly because `apps/api/src/common/monitoring/health.controller.ts`
  was fixed as part of this same change — it previously always returned
  HTTP 200 regardless of actual DB/Redis health, which would have made the
  readiness probe pass even when the database was down.
- **WebSocket ingress path** is `/socket.io/`, not `/api/socket.io/` —
  verified against `chat.gateway.ts` and `main.ts`; see `ingress.yaml`'s
  header comment for the full reasoning.
