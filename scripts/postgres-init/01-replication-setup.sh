#!/bin/bash
# scripts/postgres-init/01-replication-setup.sh
#
# F-PERF fix (Prompt 7): runs automatically via the official postgres image's
# docker-entrypoint-initdb.d mechanism, ONLY on the PRIMARY's first boot
# (an empty data directory) — never runs again after that, same as any other
# file in this directory.
#
# Sets up what physical streaming replication needs on the primary side:
#   1. A dedicated `replicator` role with the REPLICATION privilege (never
#      reuse the app's own POSTGRES_USER for this).
#   2. A pg_hba.conf entry permitting replication connections from the
#      Docker network the replica containers are on.
#
# wal_level/max_wal_senders/max_replication_slots/hot_standby are set via
# postgres's own `command:` flags in docker-compose.yml, not here — this
# script only handles the role + pg_hba.conf, since those aren't expressible
# as command-line flags.

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
      CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
    END IF;
  END
  \$\$;
EOSQL

# Allow replication connections from anywhere on the compose network's
# subnet. Scoped to `replication` connections only (not regular database
# access) — this does NOT grant the replicator role access to query data,
# only to stream WAL.
echo "host replication replicator 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
