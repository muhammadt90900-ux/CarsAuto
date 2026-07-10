# CarsAuto — Production Deployment Runbook

## Production Deployment

Production runs on **Kubernetes** (`apps/k8s/`), deployed by the `deploy`
job in `.github/workflows/ci.yml`. This is the single production deploy
path — Render.com is not used, and the SSH/docker-compose rolling-deploy
approach previously used here has been replaced. See "CI/CD" below and
`apps/k8s/README.md` for the manifest set.

## Local Development

Everything below this point describing `docker compose up -d` refers to
**local development and staging only**. Docker Compose is not used to
deploy production — see `docker-compose.yml`'s header comment.

## Architecture

```
Internet → Web (Next.js :3000) → API (NestJS :4000)
                                      ↓            ↓
                                 PostgreSQL     Redis
                                      ↓
                              Prometheus :9090
                              Grafana    :3001
                              Backup cron (daily)
```

**Stack:** Next.js 14 · NestJS 10 · PostgreSQL 16 · Redis 7 · BullMQ · Prisma · Turbo monorepo

---

## First-time Setup

### 1. Environment variables

```bash
cp .env.production.template .env.production
# Fill in every CHANGE_ME value
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### 2. Start all services

```bash
docker compose --env-file .env.production up -d
```

### 3. Run database migrations

```bash
docker exec cars_auto_api npx prisma migrate deploy
```

### 4. Verify health

```bash
curl http://localhost:4000/health
# Expected: {"status":"ok","uptime":...}

docker compose ps
# All services should be "healthy"
```

---

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs automatically:

| Trigger | Jobs |
|---------|------|
| Any PR  | lint, type-check |
| Push to `develop` | lint → build images → push to GHCR |
| Push to `main` | lint → build → security scan → e2e → **deploy (Kubernetes)** |

### Required GitHub secrets

| Secret | Description |
|--------|-------------|
| `KUBE_CONFIG` | Base64-encoded kubeconfig for the target cluster |

### Deployment flow

1. Images (`api`, `web`, `worker`) built and tagged `sha-<commit>` + `latest`,
   pushed to GHCR
2. Trivy scans for CRITICAL/HIGH CVEs — fails the pipeline if found
3. Playwright e2e smoke tests run against the built images
4. `kustomize edit set image` substitutes the real, just-built image
   **digests** (not mutable tags) into `apps/k8s/`
5. `kubectl apply -k apps/k8s/` applies the manifest set to the cluster
6. Prisma migrations run as a one-off Kubernetes Pod against
   `DATABASE_DIRECT_URL`
7. `kubectl rollout status` on each of `carsauto-api`, `carsauto-web`,
   `carsauto-worker` is the real health gate — the existing
   readiness/liveness probes in `apps/k8s/*-deployment.yaml` do the actual
   health verification
8. On rollout failure, `kubectl rollout undo` runs automatically for the
   failed deployment(s) before the job fails

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Full Postgres connection string |
| `REDIS_URL` | ✅ | Redis URL (must include password) |
| `JWT_SECRET` | ✅ | ≥32 chars, hex preferred |
| `JWT_EXPIRES_IN` | ✅ | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Refresh token TTL (e.g. `7d`) |
| `FRONTEND_URL` | ✅ | Comma-separated allowed CORS origins |
| `POSTGRES_PASSWORD` | ✅ | DB password (docker-compose) |
| `REDIS_PASSWORD` | ✅ | Redis password (docker-compose) |
| `SMTP_HOST` | ⚠️ | Email disabled if unset |
| `CLOUDINARY_*` | ⚠️ | Image uploads disabled if unset |
| `OPENAI_API_KEY` | ⚠️ | AI features disabled if unset |
| `STRIPE_SECRET_KEY` | ⚠️ | Payments disabled if unset |
| `VAPID_*` | ⚠️ | Push notifications disabled if unset |
| `LOG_LEVEL` | ✅ | `log` (prod) or `debug` (dev) |
| `GRAFANA_PASSWORD` | ✅ | Grafana admin password |

---

## Monitoring

- **Grafana:** `http://<host>:3001` (default user: `admin`)
- **Prometheus:** `http://<host>:9090`

Key metrics to alert on:
- `process_heap_used_bytes` — memory leak detection
- `http_request_duration_seconds_p99` — latency SLO
- API `/health` endpoint — uptime check

---

## Backups

Automated: the `backup` container runs daily at 02:00 UTC and keeps 7 days.

Manual operations:
```bash
# Take a backup now
./scripts/backup-restore.sh backup

# List available backups
./scripts/backup-restore.sh list

# Restore from a specific backup
./scripts/backup-restore.sh restore backups/carsauto_2026-05-31T02-00-00.sql.gz
```

Backup files are stored in the `backup_data` Docker volume and in `./backups/` when using the manual script.

---

## Logging

All services emit JSON log lines in production. Collect with:

- **Docker:** `docker compose logs -f api`  
- **Loki/Grafana:** configure the Loki Docker logging driver and scrape `cars_auto_*` containers  
- **CloudWatch:** replace the `json-file` log driver with `awslogs`

Log levels: `error` · `warn` · `log` · `debug` · `verbose`  
Set `LOG_LEVEL=debug` for troubleshooting (generates more volume).

---

## Troubleshooting

```bash
# API logs (last 100 lines)
docker compose logs api --tail=100

# Live tail all services
docker compose logs -f

# Restart a single service
docker compose restart api

# Check DB connectivity
docker exec cars_auto_api node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$connect().then(() => console.log('DB OK')).catch(console.error);
"

# Check Redis
docker exec cars_auto_redis redis-cli -a $REDIS_PASSWORD ping
```

---

## Security checklist

- [ ] `JWT_SECRET` is ≥ 64 random hex chars
- [ ] `POSTGRES_PASSWORD` and `REDIS_PASSWORD` are strong, unique values
- [ ] `GRAFANA_PASSWORD` changed from default
- [ ] `.env.production` is **not** in git (`.gitignore` enforces this)
- [ ] Prometheus and Grafana ports are **not** exposed to the public internet
- [ ] Redis port `6379` is **not** exposed to the public internet
- [ ] Regular `docker compose pull` and image rebuild to pick up OS patches
- [ ] Trivy scan passes (no CRITICAL/HIGH CVEs) before every deploy
