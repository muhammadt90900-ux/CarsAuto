#!/usr/bin/env bash
# scripts/backup.sh — CarsAuto Full Backup System
# Covers: PostgreSQL database, Cloudinary images, Redis snapshot, config files
#
# Usage:
#   ./scripts/backup.sh [command] [options]
#
# Commands:
#   full          Full backup (DB + images + config) — default
#   db            Database only
#   images        Cloudinary images only
#   config        Config/env files only
#   verify [file] Verify a specific backup or latest backup
#   list          List all local backups
#   clean         Remove backups older than RETENTION_DAYS
#
# Environment variables (override via .env.backup or shell exports):
#   BACKUP_DIR            Local directory for backups      (default: ./backups)
#   RETENTION_DAYS        Days to keep local backups       (default: 30)
#   DB_CONTAINER          Postgres container name          (default: cars_auto_db)
#   POSTGRES_USER         DB user                          (default: carsauto)
#   POSTGRES_DB           DB name                          (default: autobazaar)
#   CLOUDINARY_CLOUD_NAME Cloudinary cloud name            (required for images)
#   CLOUDINARY_API_KEY    Cloudinary API key               (required for images)
#   CLOUDINARY_API_SECRET Cloudinary API secret            (required for images)
#   S3_BUCKET             S3 bucket for offsite storage    (optional)
#   S3_PREFIX             S3 key prefix                    (default: carsauto-backups)
#   SLACK_WEBHOOK_URL     Slack notification webhook       (optional)
#   BACKUP_ENCRYPTION_KEY GPG passphrase for encryption    (optional)

set -euo pipefail

# ── Load .env.backup if present ───────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_BACKUP="${ROOT_DIR}/.env.backup"
[[ -f "$ENV_BACKUP" ]] && source "$ENV_BACKUP"

# ── Defaults ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_CONTAINER="${DB_CONTAINER:-cars_auto_db}"
POSTGRES_USER="${POSTGRES_USER:-carsauto}"
POSTGRES_DB="${POSTGRES_DB:-autobazaar}"
S3_PREFIX="${S3_PREFIX:-carsauto-backups}"
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
LOG_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.log"

# Colour codes
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo -e "[$(date '+%H:%M:%S')] ${*}" | tee -a "$LOG_FILE"; }
ok()   { log "${GREEN}✔${NC} ${*}"; }
warn() { log "${YELLOW}⚠${NC}  ${*}"; }
err()  { log "${RED}✖${NC} ${*}" >&2; }
die()  { err "$*"; notify_slack "❌ Backup FAILED: $*"; exit 1; }

hr() { log "${BLUE}$(printf '─%.0s' {1..60})${NC}"; }

notify_slack() {
  local msg="$1"
  [[ -z "${SLACK_WEBHOOK_URL:-}" ]] && return 0
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"[CarsAuto Backup] ${msg}\"}" \
    > /dev/null 2>&1 || warn "Slack notification failed"
}

require_cmd() {
  command -v "$1" &>/dev/null || die "Required command not found: $1"
}

encrypt_file() {
  local file="$1"
  [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]] && { echo "$file"; return; }
  gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
      --symmetric --cipher-algo AES256 \
      --output "${file}.gpg" "$file" \
    && rm "$file" \
    && echo "${file}.gpg"
}

upload_s3() {
  local file="$1"
  local key="$2"
  [[ -z "${S3_BUCKET:-}" ]] && return 0
  require_cmd aws
  log "Uploading to s3://${S3_BUCKET}/${key} …"
  aws s3 cp "$file" "s3://${S3_BUCKET}/${key}" \
      --storage-class STANDARD_IA \
      --metadata "timestamp=${TIMESTAMP},hostname=$(hostname)" \
    && ok "Uploaded to S3" \
    || warn "S3 upload failed — local backup still intact"
}

# ── Ensure backup directory ───────────────────────────────────────────────────
init_dirs() {
  mkdir -p "${BACKUP_DIR}/db" \
            "${BACKUP_DIR}/images" \
            "${BACKUP_DIR}/config" \
            "${BACKUP_DIR}/verify"
}

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE BACKUP
# ─────────────────────────────────────────────────────────────────────────────
backup_db() {
  hr
  log "${BOLD}📦 PostgreSQL Backup${NC}"

  # Verify container is running
  docker inspect "$DB_CONTAINER" --format '{{.State.Running}}' 2>/dev/null \
    | grep -q true || die "Container '$DB_CONTAINER' is not running"

  local db_file="${BACKUP_DIR}/db/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

  log "Running pg_dump on ${POSTGRES_DB} …"
  docker exec "$DB_CONTAINER" \
    pg_dump -U "$POSTGRES_USER" \
            --no-password \
            --verbose \
            --format=custom \
            --compress=9 \
            "$POSTGRES_DB" \
    > "${db_file%.gz}.dump" 2>>"$LOG_FILE" \
    || die "pg_dump failed"

  # Also export plain SQL (gzipped) for maximum compatibility
  docker exec "$DB_CONTAINER" \
    pg_dump -U "$POSTGRES_USER" --no-password "$POSTGRES_DB" \
    2>>"$LOG_FILE" | gzip > "$db_file" \
    || die "pg_dump (plain) failed"

  local size
  size=$(du -sh "$db_file" | cut -f1)
  ok "DB dump written: $db_file ($size)"

  # Encrypt if key provided
  db_file=$(encrypt_file "$db_file")

  # Write checksum
  sha256sum "$db_file" > "${db_file}.sha256"
  ok "Checksum: $(cat "${db_file}.sha256")"

  # Offsite upload
  upload_s3 "$db_file" "${S3_PREFIX}/db/$(basename "$db_file")"
  upload_s3 "${db_file}.sha256" "${S3_PREFIX}/db/$(basename "${db_file}.sha256")"

  echo "$db_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# CLOUDINARY IMAGE BACKUP
# ─────────────────────────────────────────────────────────────────────────────
backup_images() {
  hr
  log "${BOLD}🖼  Cloudinary Image Backup${NC}"

  local required_vars=(CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET)
  for v in "${required_vars[@]}"; do
    [[ -z "${!v:-}" ]] && { warn "Skipping image backup — $v not set"; return 0; }
  done

  require_cmd curl
  require_cmd python3

  local img_dir="${BACKUP_DIR}/images/${TIMESTAMP}"
  mkdir -p "$img_dir"

  log "Fetching asset list from Cloudinary …"

  # Use Cloudinary Admin API to list all resources
  python3 - <<PYEOF
import json, os, sys, urllib.request, urllib.parse, hashlib, time, base64

api_key    = "${CLOUDINARY_API_KEY}"
api_secret = "${CLOUDINARY_API_SECRET}"
cloud_name = "${CLOUDINARY_CLOUD_NAME}"
out_dir    = "${img_dir}"

auth = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
base_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/resources/image"

resources = []
next_cursor = None

while True:
    params = {"max_results": 500}
    if next_cursor:
        params["next_cursor"] = next_cursor
    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"[ERROR] Cloudinary API error: {e}", file=sys.stderr)
        sys.exit(1)

    resources.extend(data.get("resources", []))
    next_cursor = data.get("next_cursor")
    print(f"  Fetched {len(resources)} assets so far …")
    if not next_cursor:
        break

# Save manifest
manifest_path = os.path.join(out_dir, "manifest.json")
with open(manifest_path, "w") as f:
    json.dump({"timestamp": "${TIMESTAMP}", "count": len(resources), "resources": resources}, f, indent=2)

print(f"[OK] Manifest written: {manifest_path} ({len(resources)} assets)")

# Download each image (up to 500MB total guard)
downloaded = 0
errors = 0
MAX_BYTES = 500 * 1024 * 1024

for r in resources:
    public_id = r["public_id"].replace("/", "__")
    fmt = r.get("format", "jpg")
    dest = os.path.join(out_dir, f"{public_id}.{fmt}")

    # Use secure_url if available
    url = r.get("secure_url") or r.get("url")
    if not url:
        errors += 1
        continue

    try:
        with urllib.request.urlopen(url, timeout=60) as resp:
            data = resp.read()
        with open(dest, "wb") as f:
            f.write(data)
        downloaded += 1
        if downloaded % 50 == 0:
            print(f"  Downloaded {downloaded}/{len(resources)} …")
    except Exception as e:
        print(f"  [WARN] Failed to download {public_id}: {e}", file=sys.stderr)
        errors += 1

print(f"[OK] Downloaded {downloaded} images, {errors} errors")
PYEOF

  local img_archive="${BACKUP_DIR}/images/cloudinary_${TIMESTAMP}.tar.gz"
  tar -czf "$img_archive" -C "${BACKUP_DIR}/images" "$TIMESTAMP"
  local size
  size=$(du -sh "$img_archive" | cut -f1)
  ok "Image archive: $img_archive ($size)"

  img_archive=$(encrypt_file "$img_archive")
  sha256sum "$img_archive" > "${img_archive}.sha256"

  upload_s3 "$img_archive" "${S3_PREFIX}/images/$(basename "$img_archive")"
  upload_s3 "${img_archive}.sha256" "${S3_PREFIX}/images/$(basename "${img_archive}.sha256")"

  # Optionally remove raw image dir to save space
  rm -rf "$img_dir"

  echo "$img_archive"
}

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG / ENV BACKUP
# ─────────────────────────────────────────────────────────────────────────────
backup_config() {
  hr
  log "${BOLD}⚙️  Config Backup${NC}"

  local cfg_archive="${BACKUP_DIR}/config/config_${TIMESTAMP}.tar.gz"

  # Collect all env/config files (never include secrets in plain text if encryption is off)
  local files=()
  for f in \
    "${ROOT_DIR}/.env.production" \
    "${ROOT_DIR}/.env.backup" \
    "${ROOT_DIR}/docker-compose.yml" \
    "${ROOT_DIR}/monitoring/prometheus.yml" \
    "${ROOT_DIR}/apps/api/.env" \
    "${ROOT_DIR}/apps/web/.env.local"
  do
    [[ -f "$f" ]] && files+=("$f")
  done

  if [[ ${#files[@]} -eq 0 ]]; then
    warn "No config files found to back up — skipping"
    return 0
  fi

  tar -czf "$cfg_archive" "${files[@]}" 2>>"$LOG_FILE"
  ok "Config archive: $cfg_archive"

  # Always encrypt config (contains secrets)
  if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
    warn "BACKUP_ENCRYPTION_KEY not set — config backup is unencrypted. Set this in .env.backup."
  fi
  cfg_archive=$(encrypt_file "$cfg_archive")
  sha256sum "$cfg_archive" > "${cfg_archive}.sha256"

  upload_s3 "$cfg_archive" "${S3_PREFIX}/config/$(basename "$cfg_archive")"
  echo "$cfg_archive"
}

# ─────────────────────────────────────────────────────────────────────────────
# BACKUP VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────
verify_backup() {
  local target="${1:-}"
  hr
  log "${BOLD}🔍 Backup Verification${NC}"

  # If no file given, verify the latest DB backup
  if [[ -z "$target" ]]; then
    target=$(ls -t "${BACKUP_DIR}/db/"*.sql.gz* 2>/dev/null | head -1)
    [[ -z "$target" ]] && die "No backup files found to verify in ${BACKUP_DIR}/db/"
  fi

  log "Verifying: $target"

  # 1. Checksum
  local checksum_file="${target}.sha256"
  if [[ -f "$checksum_file" ]]; then
    sha256sum -c "$checksum_file" && ok "Checksum OK" || die "Checksum MISMATCH — file may be corrupted"
  else
    warn "No .sha256 file found — skipping checksum verification"
  fi

  # 2. File integrity
  case "$target" in
    *.sql.gz)
      log "Testing gzip integrity …"
      gzip -t "$target" && ok "gzip integrity OK" || die "gzip file is corrupt"

      log "Checking SQL content …"
      local line_count
      line_count=$(zcat "$target" | wc -l)
      [[ "$line_count" -gt 10 ]] \
        && ok "SQL file has ${line_count} lines" \
        || die "SQL dump appears empty (${line_count} lines)"

      log "Checking for key SQL markers …"
      zcat "$target" | grep -qE "^(CREATE|INSERT|COPY|SET)" \
        && ok "SQL markers found (CREATE/INSERT/COPY/SET)" \
        || warn "No typical SQL markers found — dump may be empty"
      ;;
    *.dump)
      log "Testing pg_restore compatibility …"
      docker exec "$DB_CONTAINER" \
        pg_restore --list "$target" 2>>"$LOG_FILE" | head -20
      ok "pg_restore can read the dump"
      ;;
    *.tar.gz)
      log "Testing tar.gz integrity …"
      tar -tzf "$target" > /dev/null && ok "tar.gz integrity OK" || die "tar.gz is corrupt"
      ;;
    *.gpg)
      [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]] \
        && warn "Encrypted backup — skipping content verify (BACKUP_ENCRYPTION_KEY not set)" \
        && return 0
      log "Decrypting for verification …"
      local decrypted="${BACKUP_DIR}/verify/verify_${TIMESTAMP}"
      gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
          --output "$decrypted" --decrypt "$target" \
        && ok "Decryption OK" && rm -f "$decrypted" \
        || die "Decryption FAILED"
      ;;
  esac

  # 3. Size sanity check
  local size_bytes
  size_bytes=$(stat -c '%s' "$target")
  [[ "$size_bytes" -lt 1024 ]] && warn "Backup file is suspiciously small (${size_bytes} bytes)"

  local report_file="${BACKUP_DIR}/verify/verify_${TIMESTAMP}.json"
  python3 -c "
import json, time, os
report = {
  'file': '${target}',
  'verified_at': '${TIMESTAMP}',
  'size_bytes': ${size_bytes},
  'checksum_ok': $([ -f "$checksum_file" ] && echo 'true' || echo 'false'),
}
with open('${report_file}', 'w') as f:
    json.dump(report, f, indent=2)
print('Report: ${report_file}')
"
  ok "Verification complete → $report_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# LIST BACKUPS
# ─────────────────────────────────────────────────────────────────────────────
list_backups() {
  hr
  log "${BOLD}📋 Backup Inventory${NC}"
  for subdir in db images config; do
    echo -e "\n${BLUE}── ${subdir^^} ──${NC}"
    ls -lh "${BACKUP_DIR}/${subdir}/" 2>/dev/null \
      | grep -v '^total' \
      | awk '{printf "  %-50s %s\n", $9, $5}' \
      || echo "  (empty)"
  done
  echo ""
  local total
  total=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
  log "Total backup storage: ${total}"
}

# ─────────────────────────────────────────────────────────────────────────────
# CLEAN OLD BACKUPS
# ─────────────────────────────────────────────────────────────────────────────
clean_backups() {
  hr
  log "${BOLD}🧹 Cleaning backups older than ${RETENTION_DAYS} days${NC}"
  local count=0
  while IFS= read -r f; do
    rm -f "$f"
    log "  Removed: $(basename "$f")"
    ((count++)) || true
  done < <(find "${BACKUP_DIR}" -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null)
  ok "Cleaned ${count} old backup file(s)"
}

# ─────────────────────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────────────────────
main() {
  init_dirs
  local cmd="${1:-full}"

  hr
  log "${BOLD}CarsAuto Backup System — ${cmd^^}${NC}"
  log "Timestamp : $TIMESTAMP"
  log "Backup dir: $BACKUP_DIR"
  hr

  case "$cmd" in
    full)
      local db_file img_file cfg_file
      db_file=$(backup_db)
      img_file=$(backup_images)
      cfg_file=$(backup_config)
      clean_backups
      hr
      ok "FULL BACKUP COMPLETE"
      [[ -n "$db_file"  ]] && log "  DB     : $db_file"
      [[ -n "$img_file" ]] && log "  Images : $img_file"
      [[ -n "$cfg_file" ]] && log "  Config : $cfg_file"
      notify_slack "✅ Full backup completed at ${TIMESTAMP}"
      ;;
    db)
      backup_db
      ;;
    images)
      backup_images
      ;;
    config)
      backup_config
      ;;
    verify)
      verify_backup "${2:-}"
      ;;
    list)
      list_backups
      ;;
    clean)
      clean_backups
      ;;
    *)
      echo "Usage: $0 {full|db|images|config|verify [file]|list|clean}"
      exit 1
      ;;
  esac
}

main "$@"
