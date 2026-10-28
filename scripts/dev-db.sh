#!/usr/bin/env bash
# Starts the local Postgres 16 and makes sure the development and test databases exist (idempotent).
set -euo pipefail
if command -v pg_ctlcluster >/dev/null; then
  pg_ctlcluster 16 main start 2>/dev/null || true
fi
as_postgres() { if [ "$(id -u)" = 0 ]; then su postgres -c "$1"; else sudo -u postgres bash -c "$1"; fi; }
as_postgres "psql -tAc \"select 1 from pg_roles where rolname='bbl'\" | grep -q 1 || psql -c \"create role bbl login password 'bbl' createdb\""
for db in bbl_dev bbl_test; do
  as_postgres "psql -tAc \"select 1 from pg_database where datname='$db'\" | grep -q 1 || createdb -O bbl $db"
done
echo "Postgres ready: bbl_dev, bbl_test"
