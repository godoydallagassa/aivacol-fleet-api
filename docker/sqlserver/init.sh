#!/usr/bin/env bash
set -euo pipefail

until /opt/mssql-tools/bin/sqlcmd \
  -S sqlserver \
  -U sa \
  -P "${DB_PASSWORD}" \
  -Q "SELECT 1"; do
  sleep 3
done

escape_sed() {
  printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'
}

sed \
  -e "s|__DB_DATABASE__|$(escape_sed "${DB_DATABASE}")|g" \
  -e "s|__DB_USERNAME__|$(escape_sed "${DB_USERNAME}")|g" \
  -e "s|__DB_PASSWORD__|$(escape_sed "${DB_PASSWORD}")|g" \
  /init.sql > /tmp/init.sql

/opt/mssql-tools/bin/sqlcmd \
  -S sqlserver \
  -U sa \
  -P "${DB_PASSWORD}" \
  -i /tmp/init.sql \
  -b
