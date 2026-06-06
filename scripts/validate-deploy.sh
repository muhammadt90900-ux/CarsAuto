#!/usr/bin/env bash
# scripts/validate-deploy.sh
#
# Post-deploy validation script — runs on the server after containers restart.
# Called by the CI deploy job; can also be run manually.
#
# Usage:
#   ./scripts/validate-deploy.sh [--api-url URL] [--web-url URL] [--retries N]
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
RETRIES="${RETRIES:-5}"
RETRY_DELAY="${RETRY_DELAY:-10}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

PASS=0
FAIL=0
WARNINGS=()

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { log "✅ $*"; ((PASS++)) || true; }
err()  { log "❌ $*" >&2; ((FAIL++)) || true; }
warn() { log "⚠️  $*"; WARNINGS+=("$*"); }

http_check() {
  local label="$1" url="$2" expected_status="${3:-200}"
  local status
  for i in $(seq 1 "$RETRIES"); do
    status=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [[ "$status" == "$expected_status" ]] || \
       ([[ "$expected_status" == "2xx" ]] && [[ "$status" -ge 200 && "$status" -lt 300 ]]); then
      ok "$label — HTTP $status"
      return 0
    fi
    log "  ↳ attempt $i/$RETRIES: got HTTP $status, expected $expected_status — retrying in ${RETRY_DELAY}s"
    sleep "$RETRY_DELAY"
  done
  err "$label — HTTP $status after $RETRIES attempts (expected $expected_status)"
  return 1
}

json_field_check() {
  local label="$1" url="$2" field="$3" expected="$4"
  local value
  value=$(curl -sf --max-time 10 "$url" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','MISSING'))" 2>/dev/null || echo "ERROR")
  if [[ "$value" == "$expected" ]]; then
    ok "$label — $field=$value"
  else
    err "$label — expected $field='$expected', got '$value'"
  fi
}

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url)  API_URL="$2";  shift 2 ;;
    --web-url)  WEB_URL="$2";  shift 2 ;;
    --retries)  RETRIES="$2";  shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

log "=================================================="
log "  CarsAuto Deployment Validation"
log "  API: $API_URL  |  Web: $WEB_URL"
log "=================================================="

# ── 1. Container status ───────────────────────────────────────────────────────
log ""
log "── Container Status ──────────────────────────────"
if command -v docker &>/dev/null; then
  for service in api web; do
    CONTAINER_STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json "$service" 2>/dev/null \
      | python3 -c "import sys,json; s=json.load(sys.stdin); print(s[0].get('State','unknown'))" 2>/dev/null \
      || echo "unknown")
    if [[ "$CONTAINER_STATUS" == "running" ]]; then
      ok "Container '$service' is running"
    else
      err "Container '$service' state: $CONTAINER_STATUS"
    fi
  done
else
  warn "docker not available — skipping container status checks"
fi

# ── 2. API health endpoint ────────────────────────────────────────────────────
log ""
log "── API Health ────────────────────────────────────"
http_check "API /health" "$API_URL/health" "200"
json_field_check "API /health status field" "$API_URL/health" "status" "ok"

# ── 3. API key endpoints smoke test ──────────────────────────────────────────
log ""
log "── API Smoke Tests ───────────────────────────────"
http_check "API /metrics (Prometheus)" "$API_URL/metrics" "200"
# Auth endpoint should return 401 with no token (not 500)
AUTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL/auth/me" 2>/dev/null || echo "000")
if [[ "$AUTH_STATUS" == "401" || "$AUTH_STATUS" == "403" ]]; then
  ok "API /auth/me returns $AUTH_STATUS (expected — unauthenticated)"
elif [[ "$AUTH_STATUS" == "200" ]]; then
  warn "API /auth/me returned 200 without token — check auth guard"
else
  err "API /auth/me returned unexpected $AUTH_STATUS"
fi

# ── 4. Web health ─────────────────────────────────────────────────────────────
log ""
log "── Web Health ────────────────────────────────────"
http_check "Web homepage" "$WEB_URL/" "2xx"
# Ensure no 500 error page on locale routes
for locale in en ku ar; do
  http_check "Web /$locale" "$WEB_URL/$locale" "2xx"
done

# ── 5. Response time check ────────────────────────────────────────────────────
log ""
log "── Response Times ────────────────────────────────"
API_TIME=$(curl -sf -o /dev/null -w "%{time_total}" --max-time 10 "$API_URL/health" 2>/dev/null || echo "99")
WEB_TIME=$(curl -sf -o /dev/null -w "%{time_total}" --max-time 10 "$WEB_URL/" 2>/dev/null || echo "99")

if python3 -c "exit(0 if float('$API_TIME') < 1.0 else 1)" 2>/dev/null; then
  ok "API response time: ${API_TIME}s (< 1.0s)"
else
  warn "API response time: ${API_TIME}s (> 1.0s — may need investigation)"
fi

if python3 -c "exit(0 if float('$WEB_TIME') < 3.0 else 1)" 2>/dev/null; then
  ok "Web response time: ${WEB_TIME}s (< 3.0s)"
else
  warn "Web response time: ${WEB_TIME}s (> 3.0s — may need investigation)"
fi

# ── 6. DB migration status ────────────────────────────────────────────────────
log ""
log "── DB Migration Status ───────────────────────────"
if command -v docker &>/dev/null; then
  MIGRATE_STATUS=$(docker compose -f "$COMPOSE_FILE" exec -T api \
    npx prisma migrate status 2>&1 | tail -1 || echo "unknown")
  if echo "$MIGRATE_STATUS" | grep -qi "database schema is up to date\|no pending migrations"; then
    ok "Prisma migrations: up to date"
  else
    warn "Prisma migration status: $MIGRATE_STATUS"
  fi
else
  warn "docker not available — skipping migration status check"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "=================================================="
log "  Results: ✅ $PASS passed  |  ❌ $FAIL failed  |  ⚠️  ${#WARNINGS[@]} warnings"
log "=================================================="

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  log "Warnings:"
  for w in "${WARNINGS[@]}"; do log "  • $w"; done
fi

if [[ $FAIL -gt 0 ]]; then
  log "Deployment validation FAILED"
  exit 1
fi

log "Deployment validation PASSED ✅"
exit 0
