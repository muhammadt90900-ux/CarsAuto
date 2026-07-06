#!/bin/bash
# scripts/postgres-replica/replica-entrypoint.sh
#
# F-PERF fix (Prompt 7): custom entrypoint for the read-replica containers
# in docker-compose.yml (postgres-replica-1, postgres-replica-2). On first
# boot (empty PGDATA), clones the primary via pg_basebackup with `-R`
# (which auto-writes postgresql.auto.conf's primary_conninfo AND a
# standby.signal file — the Postgres 12+ way of saying "start as a
# streaming replica, not a primary"), then hands off to the official image's
# normal entrypoint. On subsequent restarts, PGDATA already has
# standby.signal from the first boot, so this skip the clone and just
# starts normally as a standby.
#
# NOTE: this is the standard documented pg_basebackup replication pattern,
# written for correctness against Postgres 16's documented behavior — it has
# NOT been run end-to-end against a live multi-container Postgres cluster in
# this session (no Docker daemon is available in the sandbox this was
# written in). Validate it in a real docker-compose environment before
# relying on it — in particular, re-check timing (the primary must be
# ready and accepting replication connections before this runs; the
# depends_on healthcheck below should cover that, but confirm under your
# own network conditions) and disk space (pg_basebackup needs room for a
# full copy of the primary's data directory).

set -e

export PGPASSWORD="${REPLICATION_PASSWORD}"

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "[replica-entrypoint] PGDATA is empty — cloning from primary via pg_basebackup..."
  until pg_basebackup \
    --host="${PRIMARY_HOST}" \
    --port="${PRIMARY_PORT:-5432}" \
    --username=replicator \
    --pgdata="$PGDATA" \
    --format=plain \
    --write-recovery-conf \
    --checkpoint=fast \
    --progress
  do
    echo "[replica-entrypoint] primary not ready yet, retrying in 5s..."
    sleep 5
  done
  echo "[replica-entrypoint] base backup complete, standby.signal written by --write-recovery-conf."
  chmod 0700 "$PGDATA"
else
  echo "[replica-entrypoint] PGDATA already populated — skipping clone, starting as standby."
fi

# Hand off to the official postgres image's normal entrypoint/startup.
exec docker-entrypoint.sh postgres
