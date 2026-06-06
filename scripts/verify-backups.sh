#!/usr/bin/env bash
# scripts/verify-backups.sh — CarsAuto Backup Verification & Health Report
#
# Runs a full health check on all backup files:
#   1. Checksum integrity (sha256)
#   2. File format validity (gzip / tar / SQL content)
#   3. Recency check (warn if backup is older than WARN_AGE_HOURS)
#   4. Minimum-size guard (warn if suspiciously small)
#   5. Outputs a JSON report + human-readable summary
#
# Usage:
#   ./scripts/verify-backups.sh              # verify all backups, report to stdout
#   ./scripts/verify-backups.sh --json       # output JSON report only
#   ./scripts/verify-backups.sh --latest     # only verify latest backup per type
#
# Exit codes:
#   0  All verifications passed
#   1  One or more verifications failed
#   2  No backups found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_BACKUP="${ROOT_DIR}/.env.backup"
[[ -f "$ENV_BACKUP" ]] && source "$ENV_BACKUP"

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
WARN_AGE_HOURS="${WARN_AGE_HOURS:-26}"   # Alert if no backup in 26 hours
MIN_DB_SIZE_BYTES="${MIN_DB_SIZE_BYTES:-10240}"   # 10KB minimum for DB backup
MIN_IMG_SIZE_BYTES="${MIN_IMG_SIZE_BYTES:-1024}"  # 1KB minimum for image archive
JSON_MODE=false
LATEST_ONLY=false
REPORT_FILE="${BACKUP_DIR}/verify/health-$(date +%Y-%m-%dT%H-%M-%S).json"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

PASS=0; FAIL=0; WARN=0
declare -a ISSUES=()

log()  { [[ "$JSON_MODE" == "false" ]] && echo -e "[$(date '+%H:%M:%S')] $*"; }
ok()   { ((PASS++)) || true; log "${GREEN}✔${NC} $*"; }
fail() { ((FAIL++)) || true; log "${RED}✖${NC} $*"; ISSUES+=("FAIL: $*"); }
warn() { ((WARN++)) || true; log "${YELLOW}⚠${NC}  $*"; ISSUES+=("WARN: $*"); }
hr()   { log "${BLUE}$(printf '─%.0s' {1..60})${NC}"; }

# ─────────────────────────────────────────────────────────────────────────────
# FILE CHECKS
# ─────────────────────────────────────────────────────────────────────────────
check_checksum() {
  local file="$1"
  local sha_file="${file}.sha256"
  if [[ -f "$sha_file" ]]; then
    sha256sum -c "$sha_file" > /dev/null 2>&1 \
      && ok "Checksum OK: $(basename "$file")" \
      || fail "Checksum MISMATCH: $(basename "$file")"
  else
    warn "No .sha256 file for: $(basename "$file")"
  fi
}

check_size() {
  local file="$1"
  local min_bytes="$2"
  local size
  size=$(stat -c '%s' "$file" 2>/dev/null || echo 0)
  if [[ "$size" -lt "$min_bytes" ]]; then
    fail "File too small (${size}B < ${min_bytes}B): $(basename "$file")"
  else
    ok "Size OK ($(numfmt --to=iec "$size")): $(basename "$file")"
  fi
}

check_age() {
  local file="$1"
  local max_hours="$2"
  local mtime
  mtime=$(stat -c '%Y' "$file" 2>/dev/null || echo 0)
  local now
  now=$(date +%s)
  local age_hours=$(( (now - mtime) / 3600 ))
  if [[ "$age_hours" -gt "$max_hours" ]]; then
    warn "Stale backup (${age_hours}h old > ${max_hours}h threshold): $(basename "$file")"
  else
    ok "Recency OK (${age_hours}h old): $(basename "$file")"
  fi
}

check_gzip() {
  local file="$1"
  gzip -t "$file" > /dev/null 2>&1 \
    && ok "gzip integrity OK: $(basename "$file")" \
    || fail "gzip CORRUPT: $(basename "$file")"
}

check_tar() {
  local file="$1"
  tar -tzf "$file" > /dev/null 2>&1 \
    && ok "tar.gz integrity OK: $(basename "$file")" \
    || fail "tar.gz CORRUPT: $(basename "$file")"
}

check_sql_content() {
  local file="$1"
  local lines
  lines=$(zcat "$file" 2>/dev/null | wc -l || echo 0)
  if [[ "$lines" -lt 10 ]]; then
    fail "SQL dump appears empty (${lines} lines): $(basename "$file")"
    return
  fi
  ok "SQL content OK (${lines} lines): $(basename "$file")"

  # Check for expected CarsAuto tables
  local has_tables
  has_tables=$(zcat "$file" 2>/dev/null | grep -cE "CREATE TABLE (public\.)?(User|Listing|Car)" || echo 0)
  if [[ "$has_tables" -gt 0 ]]; then
    ok "Expected schema tables found"
  else
    warn "Expected CarsAuto tables (User, Listing, Car) not found in dump"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# VERIFY ALL DB BACKUPS
# ─────────────────────────────────────────────────────────────────────────────
verify_db_backups() {
  hr
  log "${BOLD}📦 Verifying DB Backups${NC}"

  local db_dir="${BACKUP_DIR}/db"
  [[ -d "$db_dir" ]] || { warn "No DB backup directory found"; return; }

  local files
  if [[ "$LATEST_ONLY" == "true" ]]; then
    files=$(ls -t "${db_dir}/"*.sql.gz* 2>/dev/null | head -1 || true)
  else
    files=$(ls -t "${db_dir}/"*.sql.gz* 2>/dev/null || true)
  fi

  if [[ -z "$files" ]]; then
    fail "No DB backups found in ${db_dir}"
    return
  fi

  # Recency: ensure at least one backup in the last WARN_AGE_HOURS
  local latest
  latest=$(echo "$files" | head -1)
  check_age "$latest" "$WARN_AGE_HOURS"

  # Verify each file
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    log "\n  → $(basename "$f")"
    check_checksum "$f"
    check_size "$f" "$MIN_DB_SIZE_BYTES"
    case "$f" in
      *.sql.gz)
        check_gzip "$f"
        check_sql_content "$f"
        ;;
      *.gpg)
        ok "Encrypted backup — skipping content check"
        ;;
    esac
  done <<< "$files"
}

# ─────────────────────────────────────────────────────────────────────────────
# VERIFY IMAGE BACKUPS
# ─────────────────────────────────────────────────────────────────────────────
verify_image_backups() {
  hr
  log "${BOLD}🖼  Verifying Image Backups${NC}"

  local img_dir="${BACKUP_DIR}/images"
  [[ -d "$img_dir" ]] || { warn "No image backup directory found"; return; }

  local files
  if [[ "$LATEST_ONLY" == "true" ]]; then
    files=$(ls -t "${img_dir}/"*.tar.gz* 2>/dev/null | head -1 || true)
  else
    files=$(ls -t "${img_dir}/"*.tar.gz* 2>/dev/null || true)
  fi

  if [[ -z "$files" ]]; then
    warn "No image backups found — may be acceptable if Cloudinary is the source of truth"
    return
  fi

  local latest
  latest=$(echo "$files" | head -1)
  check_age "$latest" "$WARN_AGE_HOURS"

  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    log "\n  → $(basename "$f")"
    check_checksum "$f"
    check_size "$f" "$MIN_IMG_SIZE_BYTES"
    case "$f" in
      *.tar.gz)
        check_tar "$f"
        # Check for manifest
        local has_manifest
        has_manifest=$(tar -tzf "$f" 2>/dev/null | grep -c "manifest.json" || echo 0)
        [[ "$has_manifest" -gt 0 ]] \
          && ok "manifest.json present in archive" \
          || warn "No manifest.json in image archive"
        ;;
      *.gpg)
        ok "Encrypted backup — skipping content check"
        ;;
    esac
  done <<< "$files"
}

# ─────────────────────────────────────────────────────────────────────────────
# VERIFY CONFIG BACKUPS
# ─────────────────────────────────────────────────────────────────────────────
verify_config_backups() {
  hr
  log "${BOLD}⚙️  Verifying Config Backups${NC}"

  local cfg_dir="${BACKUP_DIR}/config"
  [[ -d "$cfg_dir" ]] || { warn "No config backup directory found"; return; }

  local files
  files=$(ls -t "${cfg_dir}/"*.tar.gz* 2>/dev/null || true)
  if [[ -z "$files" ]]; then
    warn "No config backups found"
    return
  fi

  local latest
  latest=$(echo "$files" | head -1)
  check_age "$latest" "$((WARN_AGE_HOURS * 7))"  # Config backups less frequent

  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    log "\n  → $(basename "$f")"
    check_checksum "$f"
    case "$f" in
      *.tar.gz) check_tar "$f" ;;
      *.gpg)    ok "Encrypted config backup" ;;
    esac
  done <<< "$files"
}

# ─────────────────────────────────────────────────────────────────────────────
# S3 OFFSITE VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
verify_s3_offsite() {
  [[ -z "${S3_BUCKET:-}" ]] && return 0
  hr
  log "${BOLD}☁️  Verifying S3 Offsite Backups${NC}"

  command -v aws &>/dev/null || { warn "aws CLI not found — skipping S3 check"; return; }

  local s3_prefix="${S3_PREFIX:-carsauto-backups}"
  local recent_s3
  recent_s3=$(aws s3 ls "s3://${S3_BUCKET}/${s3_prefix}/db/" \
      --recursive 2>/dev/null \
    | sort | tail -5 || true)

  if [[ -z "$recent_s3" ]]; then
    fail "No DB backups found in s3://${S3_BUCKET}/${s3_prefix}/db/"
  else
    ok "S3 DB backups found:"
    echo "$recent_s3" | while IFS= read -r line; do log "  $line"; done
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GENERATE REPORT
# ─────────────────────────────────────────────────────────────────────────────
generate_report() {
  mkdir -p "$(dirname "$REPORT_FILE")"
  python3 - <<PYEOF
import json, os, glob, time

backup_dir = "${BACKUP_DIR}"
report = {
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "summary": {
        "pass": ${PASS},
        "fail": ${FAIL},
        "warn": ${WARN},
        "status": "$( [[ $FAIL -gt 0 ]] && echo "FAILED" || ([[ $WARN -gt 0 ]] && echo "WARNING" || echo "OK") )"
    },
    "issues": $(python3 -c "import json,sys; issues=${ISSUES@Q}.split('\n') if '' else []; print(json.dumps([i.strip() for i in '${ISSUES[*]:-}'.split('|') if i.strip()]))" 2>/dev/null || echo '[]'),
    "backup_files": {}
}

for subdir in ["db", "images", "config"]:
    path = os.path.join(backup_dir, subdir)
    files = []
    if os.path.isdir(path):
        for f in sorted(glob.glob(os.path.join(path, "*")), reverse=True)[:10]:
            stat = os.stat(f)
            files.append({
                "name": os.path.basename(f),
                "size_bytes": stat.st_size,
                "modified": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(stat.st_mtime))
            })
    report["backup_files"][subdir] = files

with open("${REPORT_FILE}", "w") as f:
    json.dump(report, f, indent=2)
print("${REPORT_FILE}")
PYEOF
}

# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print_summary() {
  hr
  log "${BOLD}📊 Verification Summary${NC}"
  log "  ${GREEN}PASS${NC}: ${PASS}"
  log "  ${YELLOW}WARN${NC}: ${WARN}"
  log "  ${RED}FAIL${NC}: ${FAIL}"

  if [[ ${#ISSUES[@]} -gt 0 ]]; then
    log "\nIssues:"
    for issue in "${ISSUES[@]}"; do
      log "  • $issue"
    done
  fi

  local report
  report=$(generate_report)
  ok "Report: $report"

  [[ $FAIL -gt 0 ]] && { err "VERIFICATION FAILED — ${FAIL} critical issues"; return 1; }
  [[ $WARN -gt 0 ]] && { warn "Verification passed with ${WARN} warnings"; return 0; }
  ok "All verifications PASSED"
}

# ─────────────────────────────────────────────────────────────────────────────
# PARSE ARGS
# ─────────────────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --json)   JSON_MODE=true ;;
    --latest) LATEST_ONLY=true ;;
  esac
done

# Run checks
verify_db_backups
verify_image_backups
verify_config_backups
verify_s3_offsite
print_summary

# Exit 2 if no backups at all (PASS=0 and FAIL indicates "not found")
[[ $PASS -eq 0 && $FAIL -gt 0 ]] && exit 2
[[ $FAIL -gt 0 ]] && exit 1
exit 0
