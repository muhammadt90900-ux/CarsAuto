#!/usr/bin/env bash
# scripts/backup-restore.sh — manual DB backup/restore helper
# Usage:
#   ./scripts/backup-restore.sh backup
#   ./scripts/backup-restore.sh restore <file.sql.gz>
#   ./scripts/backup-restore.sh list

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
CONTAINER="${DB_CONTAINER:-cars_auto_db}"
DB_USER="${POSTGRES_USER:-carsauto}"
DB_NAME="${POSTGRES_DB:-autobazaar}"

mkdir -p "$BACKUP_DIR"

case "${1:-help}" in
  backup)
    TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)
    FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
    echo "Creating backup: $FILE"
    docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
    echo "Backup complete: $FILE ($(du -sh "$FILE" | cut -f1))"
    ;;
  restore)
    FILE="${2:-}"
    [[ -z "$FILE" ]] && { echo "Usage: $0 restore <file.sql.gz>" >&2; exit 1; }
    [[ ! -f "$FILE" ]] && { echo "File not found: $FILE" >&2; exit 1; }
    echo "WARNING: This will DROP and recreate the database. Press ENTER to continue."
    read -r
    docker exec -i "$CONTAINER" psql -U "$DB_USER" postgres \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME';" \
      -c "DROP DATABASE IF EXISTS $DB_NAME;" \
      -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    zcat "$FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" "$DB_NAME"
    echo "Restore complete"
    ;;
  list)
    echo "Backups in $BACKUP_DIR:"
    ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (none found)"
    ;;
  *)
    echo "Usage: $0 {backup|restore <file>|list}"
    exit 1
    ;;
esac
