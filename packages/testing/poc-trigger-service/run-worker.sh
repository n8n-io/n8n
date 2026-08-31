#!/usr/bin/env bash
# Run local queue-mode worker #N (executions need at least one).
#   ./run-worker.sh      -> worker-1
#   ./run-worker.sh 2    -> worker-2
set -euo pipefail
N="${1:-1}"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

export N8N_USER_FOLDER="$HOME/.n8n-poc-seats/worker-$N"
mkdir -p "$N8N_USER_FOLDER" "$POC_DIR/.poc-data"
# Worker health-check server; mains use 5678-5680, so workers go to 569x.
export QUEUE_HEALTH_CHECK_PORT=$((5690 + N))
# The task broker defaults to 5679 (collides with main-2 and other workers).
export N8N_RUNNERS_BROKER_PORT=$((5700 + N))

echo "[poc] worker-$N"
cd "$REPO_ROOT"
echo $$ > "$POC_DIR/.poc-data/worker-$N.pid"
exec node packages/cli/bin/n8n worker
