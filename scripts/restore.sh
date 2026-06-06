#!/usr/bin/env bash
# scripts/restore.sh — CarsAuto Disaster Recovery
#
# Usage:
#   ./scripts/restore.sh [command] [options]
#
# Commands:
#   db      <file.sql.gz>   Restore database from backup
#   images  <file.tar.gz>   Restore Cloudinary images from backup
#   full    <backup-dir>    Full system restore from a timestamped backup set
#   dry-run <file.sql.gz>   Validate restore without writing (safe test)
#   status                  Show current system health before restore
#
# Options:
#   --no-confirm            Skip interactive confirmation prompts (CI use)
#   --target-db <name>      Restore to a different database name (for DR testing)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_BACKUP="${ROOT_DIR}/.env.backup"
[[ -f "$ENV_BACKUP" ]] && source "$ENV_BACKUP"

# Defaults
DB_CONTAINER="${DB_CONTAINER:-cars_auto_db}"
POSTGRES_USER="${POSTGRES_USER:-carsauto}"
POSTGRES_DB="${POSTGRES_DB:-autobazaar}"
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
RESTORE_LOG="${ROOT_DIR}/restore-$(date +%Y-%m-%dT%H-%M-%S).log"
NO_CONFIRM="${NO_CONFIRM:-false}"
TARGET_DB=""

# Colour codes
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

log()   { echo -e "[$(date '+%H:%M:%S')] ${*}" | tee -a "$RESTORE_LOG"; }
ok()    { log "${GREEN}✔${NC} ${*}"; }
warn()  { log "${YELLOW}⚠${NC}  ${*}"; }
err()   { log "${RED}✖${NC} ${*}" >&2; }
die()   { err "$*"; exit 1; }
hr()    { log "${BLUE}$(printf '─%.0s' {1..60})${NC}"; }

# ─────────────────────────────────────────────────────────────────────────────
# CONFIRM PROMPT
# ─────────────────────────────────────────────────────────────────────────────
confirm() {
  local msg="$1"
  [[ "$NO_CONFIRM" == "true" ]] && { warn "Skipping confirmation (--no-confirm)"; return 0; }
  echo -e "\n${RED}${BOLD}⚠  WARNING: ${msg}${NC}"
  echo -e "Type ${BOLD}YES${NC} (all caps) to continue, anything else to abort: "
  read -r answer
  [[ "$answer" == "YES" ]] || die "Restore aborted by user"
}

# ─────────────────────────────────────────────────────────────────────────────
# DECRYPT BACKUP IF NEEDED
# ─────────────────────────────────────────────────────────────────────────────
decrypt_if_needed() {
  local file="$1"
  if [[ "$file" == *.gpg ]]; then
    [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]] && die "File is encrypted but BACKUP_ENCRYPTION_KEY is not set"
    local decrypted="${file%.gpg}"
    log "Decrypting ${file} …"
    gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
        --output "$decrypted" --decrypt "$file" \
      || die "Decryption failed"
    ok "Decrypted to $decrypted"
    echo "$decrypted"
  else
    echo "$file"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# PRE-RESTORE SYSTEM STATUS
# ─────────────────────────────────────────────────────────────────────────────
show_status() {
  hr
  log "${BOLD}🩺 System Status${NC}"

  log "Docker containers:"
  docker ps --format "  {{.Names}}\t{{.Status}}" 2>/dev/null \
    | grep -E "cars_auto" || warn "No cars_auto containers found"

  log "\nDisk usage:"
  df -h "$ROOT_DIR" 2>/dev/null | tail -1 | awk '{printf "  Available: %s / %s (%s used)\n", $4, $2, $5}'

  log "\nLatest backups:"
  for subdir in db images config; do
    local latest
    latest=$(ls -t "${BACKUP_DIR}/${subdir}/" 2>/dev/null | head -1 || echo "(none)")
    printf "  %-10s %s\n" "$subdir:" "$latest"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# PRE-RESTORE SAFETY BACKUP
# ─────────────────────────────────────────────────────────────────────────────
safety_backup() {
  log "Creating safety backup before restore …"
  local safety_file="${BACKUP_DIR}/db/SAFETY_BEFORE_RESTORE_$(date +%Y-%m-%dT%H-%M-%S).sql.gz"
  docker inspect "$DB_CONTAINER" --format '{{.State.Running}}' 2>/dev/null \
    | grep -q true || { warn "DB container not running — skipping safety backup"; return 0; }
  docker exec "$DB_CONTAINER" \
    pg_dump -U "$POSTGRES_USER" --no-password "$POSTGRES_DB" \
    2>>"$RESTORE_LOG" | gzip > "$safety_file" \
    && ok "Safety backup: $safety_file" \
    || warn "Safety backup failed — proceeding with restore anyway"
}

# ─────────────────────────────────────────────────────────────────────────────
# DATABASE RESTORE
# ─────────────────────────────────────────────────────────────────────────────
restore_db() {
  local file
  file=$(decrypt_if_needed "$1")
  local db_target="${TARGET_DB:-$POSTGRES_DB}"

  hr
  log "${BOLD}🔄 Database Restore${NC}"
  log "  Source : $file"
  log "  Target : $db_target (container: $DB_CONTAINER)"

  # Validate file exists and is readable
  [[ -f "$file" ]] || die "Backup file not found: $file"

  # Checksum check
  if [[ -f "${1}.sha256" ]]; then
    log "Verifying checksum …"
    sha256sum -c "${1}.sha256" || die "Checksum verification failed — aborting restore"
    ok "Checksum OK"
  fi

  # Gzip integrity test
  case "$file" in
    *.sql.gz)
      gzip -t "$file" 2>>"$RESTORE_LOG" || die "Backup file appears corrupt (gzip test failed)"
      ok "File integrity OK"
      ;;
    *.dump)
      docker exec "$DB_CONTAINER" pg_restore --list "$file" > /dev/null 2>>"$RESTORE_LOG" \
        || die "Backup file appears corrupt (pg_restore test failed)"
      ok "pg_restore format validated"
      ;;
  esac

  # Confirm unless --no-confirm
  confirm "This will DROP and recreate database '${db_target}' on container '${DB_CONTAINER}'"

  # Safety backup
  safety_backup

  log "Terminating active connections to ${db_target} …"
  docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${db_target}' AND pid <> pg_backend_pid();" \
    >> "$RESTORE_LOG" 2>&1 || true

  log "Dropping database ${db_target} …"
  docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" postgres \
    -c "DROP DATABASE IF EXISTS ${db_target};" >> "$RESTORE_LOG" 2>&1 \
    || die "Failed to drop database"

  log "Recreating database ${db_target} …"
  docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" postgres \
    -c "CREATE DATABASE ${db_target} OWNER ${POSTGRES_USER};" >> "$RESTORE_LOG" 2>&1 \
    || die "Failed to create database"

  log "Restoring data …"
  case "$file" in
    *.sql.gz)
      zcat "$file" | docker exec -i "$DB_CONTAINER" \
        psql -U "$POSTGRES_USER" "$db_target" >> "$RESTORE_LOG" 2>&1 \
        || die "psql restore failed"
      ;;
    *.dump)
      docker exec "$DB_CONTAINER" \
        pg_restore -U "$POSTGRES_USER" -d "$db_target" --no-owner --role="$POSTGRES_USER" \
        "$file" >> "$RESTORE_LOG" 2>&1 \
        || die "pg_restore failed"
      ;;
  esac

  # Post-restore validation
  log "Running post-restore checks …"
  local table_count
  table_count=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$db_target" -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)

  [[ "${table_count:-0}" -gt 0 ]] \
    && ok "Post-restore: ${table_count} tables found" \
    || warn "Post-restore: No tables found — restore may have failed"

  hr
  ok "DATABASE RESTORE COMPLETE"
  log "  Restored to : $db_target"
  log "  Tables found: ${table_count:-unknown}"
  log "  Log         : $RESTORE_LOG"
}

# ─────────────────────────────────────────────────────────────────────────────
# DRY RUN — validate without writing
# ─────────────────────────────────────────────────────────────────────────────
dry_run_db() {
  local file
  file=$(decrypt_if_needed "$1")
  hr
  log "${BOLD}🧪 Dry-Run Restore (read-only validation)${NC}"
  log "  File: $file"

  # Checksum
  if [[ -f "${1}.sha256" ]]; then
    sha256sum -c "${1}.sha256" && ok "Checksum OK" || die "Checksum FAILED"
  fi

  # Integrity
  gzip -t "$file" && ok "gzip OK" || die "File corrupt"

  # SQL structure preview
  log "SQL preview (first 20 lines):"
  zcat "$file" | head -20 | sed 's/^/  /'

  # Restore to temp DB
  local tmp_db="dr_test_$(date +%s)"
  log "Creating temporary database ${tmp_db} for dry-run …"
  docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" postgres \
    -c "CREATE DATABASE ${tmp_db} OWNER ${POSTGRES_USER};" >> "$RESTORE_LOG" 2>&1 \
    || die "Could not create temp DB"

  log "Loading backup into ${tmp_db} …"
  local restore_ok=true
  zcat "$file" | docker exec -i "$DB_CONTAINER" \
    psql -U "$POSTGRES_USER" "$tmp_db" >> "$RESTORE_LOG" 2>&1 \
    || restore_ok=false

  # Count tables in temp DB
  local table_count
  table_count=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$tmp_db" -t \
    -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)

  # Cleanup temp DB
  docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" postgres \
    -c "DROP DATABASE IF EXISTS ${tmp_db};" >> "$RESTORE_LOG" 2>&1 || true

  [[ "$restore_ok" == "true" ]] \
    && ok "Dry-run PASSED — ${table_count} tables restored successfully" \
    || die "Dry-run FAILED — check log: $RESTORE_LOG"

  hr
  ok "DRY-RUN COMPLETE — backup is valid and restorable"
}

# ─────────────────────────────────────────────────────────────────────────────
# IMAGE RESTORE (Cloudinary re-upload)
# ─────────────────────────────────────────────────────────────────────────────
restore_images() {
  local archive
  archive=$(decrypt_if_needed "$1")
  hr
  log "${BOLD}🖼  Image Restore (Cloudinary re-upload)${NC}"

  local required_vars=(CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET)
  for v in "${required_vars[@]}"; do
    [[ -z "${!v:-}" ]] && die "$v is not set — cannot restore images"
  done

  [[ -f "$archive" ]] || die "Image archive not found: $archive"
  gzip -t "$archive" 2>/dev/null || die "Archive file appears corrupt"

  confirm "This will re-upload images to Cloudinary cloud '${CLOUDINARY_CLOUD_NAME}'"

  local extract_dir="/tmp/carsauto_img_restore_$(date +%s)"
  mkdir -p "$extract_dir"
  log "Extracting archive …"
  tar -xzf "$archive" -C "$extract_dir"

  local manifest
  manifest=$(find "$extract_dir" -name "manifest.json" | head -1)
  if [[ -n "$manifest" ]]; then
    local asset_count
    asset_count=$(python3 -c "import json; d=json.load(open('${manifest}')); print(d.get('count', '?'))")
    log "Manifest: ${asset_count} assets to restore"
  fi

  log "Re-uploading to Cloudinary …"
  python3 - <<PYEOF
import json, os, sys, urllib.request, urllib.parse, hashlib, hmac, time, base64, glob

api_key    = "${CLOUDINARY_API_KEY}"
api_secret = "${CLOUDINARY_API_SECRET}"
cloud_name = "${CLOUDINARY_CLOUD_NAME}"
img_dir    = "${extract_dir}"

def sign(params, secret):
    to_sign = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if k != "file")
    return hashlib.sha1(f"{to_sign}{secret}".encode()).hexdigest()

uploaded = 0
errors = 0

for img_path in glob.glob(os.path.join(img_dir, "**/*"), recursive=True):
    if not os.path.isfile(img_path):
        continue
    if img_path.endswith(".json"):
        continue

    filename = os.path.basename(img_path)
    public_id = os.path.splitext(filename)[0].replace("__", "/")
    ext = os.path.splitext(filename)[1].lstrip(".")

    ts = int(time.time())
    params = {"public_id": public_id, "timestamp": str(ts)}
    sig = sign(params, api_secret)

    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"

    with open(img_path, "rb") as f:
        file_data = f.read()

    boundary = "----CarsAutoRestore"
    body = ""
    body_bytes = b""
    for k, v in {**params, "api_key": api_key, "signature": sig}.items():
        body_bytes += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
    body_bytes += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: image/{ext}\r\n\r\n".encode()
    body_bytes += file_data
    body_bytes += f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        url, data=body_bytes,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            uploaded += 1
            if uploaded % 20 == 0:
                print(f"  Uploaded {uploaded} images …")
    except Exception as e:
        print(f"  [WARN] Failed {public_id}: {e}", file=sys.stderr)
        errors += 1

print(f"[OK] Uploaded {uploaded} images, {errors} errors")
PYEOF

  rm -rf "$extract_dir"
  ok "IMAGE RESTORE COMPLETE"
}

# ─────────────────────────────────────────────────────────────────────────────
# FULL RESTORE
# ─────────────────────────────────────────────────────────────────────────────
full_restore() {
  hr
  log "${BOLD}🚨 FULL DISASTER RECOVERY RESTORE${NC}"

  show_status

  confirm "FULL RESTORE: This will restore BOTH the database AND images. This is destructive."

  # Find latest DB backup
  local db_file
  db_file=$(ls -t "${BACKUP_DIR}/db/"*.sql.gz* 2>/dev/null | head -1)
  [[ -z "$db_file" ]] && die "No DB backup found in ${BACKUP_DIR}/db/"
  log "Latest DB backup: $db_file"

  restore_db "$db_file"

  # Images (optional — don't fail full restore if missing)
  local img_file
  img_file=$(ls -t "${BACKUP_DIR}/images/"*.tar.gz* 2>/dev/null | head -1 || true)
  if [[ -n "$img_file" ]]; then
    restore_images "$img_file"
  else
    warn "No image archive found — skipping image restore"
  fi

  hr
  ok "FULL RESTORE COMPLETE"
  log "Restart all services: docker compose up -d"
}

# ─────────────────────────────────────────────────────────────────────────────
# PARSE ARGS & DISPATCH
# ─────────────────────────────────────────────────────────────────────────────
# Parse optional flags first
POSITIONAL=()
for arg in "$@"; do
  case "$arg" in
    --no-confirm) NO_CONFIRM=true ;;
    --target-db=*) TARGET_DB="${arg#*=}" ;;
    *) POSITIONAL+=("$arg") ;;
  esac
done
set -- "${POSITIONAL[@]:-}"

CMD="${1:-help}"

case "$CMD" in
  db)
    [[ -z "${2:-}" ]] && die "Usage: $0 db <file.sql.gz>"
    restore_db "$2"
    ;;
  images)
    [[ -z "${2:-}" ]] && die "Usage: $0 images <file.tar.gz>"
    restore_images "$2"
    ;;
  full)
    full_restore
    ;;
  dry-run)
    [[ -z "${2:-}" ]] && die "Usage: $0 dry-run <file.sql.gz>"
    dry_run_db "$2"
    ;;
  status)
    show_status
    ;;
  *)
    echo "Usage: $0 {db <file>|images <file>|full|dry-run <file>|status} [--no-confirm] [--target-db=<name>]"
    exit 1
    ;;
esac
