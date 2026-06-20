#!/usr/bin/env bash
# scripts/backup-restore.sh — CarsAuto Backup & Restore Helper
#
# This is a unified entry point that delegates to the full scripts:
#   scripts/backup.sh   — create backups (DB, images, config)
#   scripts/restore.sh  — restore from backups (DB, images, full)
#   scripts/verify-backups.sh — verify backup integrity
#
# Usage:
#   ./scripts/backup-restore.sh backup  [full|db|images|config]
#   ./scripts/backup-restore.sh restore [db <file>|images <file>|full|dry-run <file>]
#   ./scripts/backup-restore.sh verify  [--latest]
#   ./scripts/backup-restore.sh list
#   ./scripts/backup-restore.sh status

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'; BOLD='\033[1m'

usage() {
  cat <<USAGE
${BOLD}CarsAuto Backup & Restore${NC}

Usage:
  $0 backup  [full|db|images|config]        Create a backup
  $0 restore db <file.sql.gz>               Restore database
  $0 restore images <file.tar.gz>           Restore Cloudinary images
  $0 restore full                           Full disaster recovery restore
  $0 restore dry-run <file.sql.gz>          Test restore without writing
  $0 verify  [--latest]                     Verify backup integrity
  $0 list                                   List all backups
  $0 status                                 Show system & backup status

Options:
  --no-confirm    Skip interactive prompts (for CI)
  --target-db=X   Restore to a different DB name (DR testing)
USAGE
}

CMD="${1:-help}"
shift || true

case "$CMD" in
  backup)
    exec bash "${SCRIPT_DIR}/backup.sh" "${1:-full}"
    ;;
  restore)
    exec bash "${SCRIPT_DIR}/restore.sh" "$@"
    ;;
  verify)
    exec bash "${SCRIPT_DIR}/verify-backups.sh" "$@"
    ;;
  list)
    exec bash "${SCRIPT_DIR}/backup.sh" list
    ;;
  status)
    exec bash "${SCRIPT_DIR}/restore.sh" status
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo -e "${RED}Unknown command: $CMD${NC}"
    usage
    exit 1
    ;;
esac
