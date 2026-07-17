#!/usr/bin/env bash
# Continuously display lease/worker/outbox state from the PoC postgres.
set -euo pipefail
POC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INTERVAL="${1:-1}"
while true; do
  OUT="$(docker exec -i n8n-poc-postgres-1 psql -U n8n -d n8n -f - < "$POC_DIR/watch-leases.sql" 2>&1 || true)"
  clear
  date '+%H:%M:%S'
  printf '%s\n' "$OUT"
  sleep "$INTERVAL"
done
