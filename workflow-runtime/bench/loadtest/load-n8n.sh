#!/usr/bin/env bash
# Loads a key set into fresh v1 and v2 databases (drops them first). The
# load runs n8n in regular mode on LOAD_BUDGET vCPUs (default 8); it is not measured.
#   load-n8n.sh <keys-file>
set -euo pipefail
source "$(dirname "$0")/env.sh"
keys=$1
N=$NODE26/node
"$KIT/engine.sh" stop
docker start lt-n8n-pg > /dev/null 2>&1 || true
for _ in $(seq 60); do docker exec lt-n8n-pg pg_isready -q 2> /dev/null && break; sleep 1; done
for db in n8n_v1 n8n_v2 engine_v2; do docker exec lt-n8n-pg dropdb -U postgres --if-exists "$db"; done
"$KIT/engine.sh" start v1 "${LOAD_BUDGET:-8}" 0 > /dev/null
taskset -c "$LOADGEN_CPUS" $N "$KIT/n8n-load.mjs" --url http://127.0.0.1:5678 --pool "$DATA/pool.jsonl" --keys "$keys" --out "$LT/engine/manifest-v1.json" --conc 16
"$KIT/engine.sh" start v2 "${LOAD_BUDGET:-8}" 0 > /dev/null
taskset -c "$LOADGEN_CPUS" $N "$KIT/n8n-load.mjs" --url http://127.0.0.1:5679 --pool "$DATA/pool.jsonl" --keys "$keys" --out "$LT/engine/manifest-v2.json" --v2 --conc 16
"$KIT/engine.sh" stop
echo "load done"
