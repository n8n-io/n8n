#!/usr/bin/env bash
# Run one local queue-mode worker (executions need at least one).
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

export N8N_USER_FOLDER="$POC_DIR/.poc-data/worker-1"
mkdir -p "$N8N_USER_FOLDER"
# Worker health-check server; must not collide with the mains (5678-5680).
export QUEUE_HEALTH_CHECK_PORT=5681

echo "[poc] worker-1"
cd "$REPO_ROOT"
exec node packages/cli/bin/n8n worker
