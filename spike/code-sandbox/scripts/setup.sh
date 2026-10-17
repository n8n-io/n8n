#!/usr/bin/env bash
# Prepares a local n8n for the spike: W5 files, workflows imported and active.
#
#   spike/code-sandbox/scripts/setup.sh
#
# N8N_USER_FOLDER (default /tmp/n8n-spike/user) holds the SQLite database.
set -euo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$SPIKE_DIR/user}"
N8N="packages/cli/bin/n8n"
mkdir -p "$N8N_USER_FOLDER"

echo "==> W5 files in $SPIKE_DIR"
# W5_SIZES selects the files (name:MiB). The latency and benchmark passes need none.
for spec in ${W5_SIZES:-1mb:1 100mb:100 1gb:1024}; do
	name="${spec%%:*}"
	size="${spec##*:}"
	file="$SPIKE_DIR/w5-$name.bin"
	[[ -f "$file" ]] || dd if=/dev/urandom of="$file" bs=1048576 count="$size" status=none
done

echo "==> Import workflows"
node spike/code-sandbox/scripts/generate-workloads.mjs
"$N8N" import:workflow --separate --input=spike/code-sandbox/workloads
"$N8N" import:workflow --separate --input=spike/code-sandbox/workloads/w14

echo "==> Activate the webhook workflows"
sqlite3 "$N8N_USER_FOLDER/.n8n/database.sqlite" \
	"UPDATE workflow_entity SET active = 1, activeVersionId = versionId
	 WHERE id LIKE 'spike%' AND id != 'spikeW1000000010';
	 SELECT count(*) || ' active spike workflows' FROM workflow_entity WHERE id LIKE 'spike%' AND active = 1;"
