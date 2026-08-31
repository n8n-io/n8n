#!/usr/bin/env bash
# Run local n8n main #N (1..3) against the PoC compose services.
#   ./run-main.sh 1   -> http://localhost:5678
#   ./run-main.sh 2   -> http://localhost:5679
#   ./run-main.sh 3   -> http://localhost:5680
set -euo pipefail
N="${1:?usage: run-main.sh <1|2|3>}"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

export N8N_PORT=$((5677 + N))
# Separate user folder per main: distinct instance identity + settings file.
# Outside the repo: an .n8n/nodes/package.json inside the workspace tree would
# be picked up as a pnpm workspace and break turbo builds.
export N8N_USER_FOLDER="$HOME/.n8n-poc-seats/main-$N"
mkdir -p "$N8N_USER_FOLDER" "$POC_DIR/.poc-data"

echo "[poc] main-$N on port $N8N_PORT (user folder: $N8N_USER_FOLDER)"
cd "$REPO_ROOT"
# `exec` keeps this shell's PID, so the pid file survives for the chaos
# scenarios (kill -9 / SIGSTOP by main number).
echo $$ > "$POC_DIR/.poc-data/main-$N.pid"
exec node packages/cli/bin/n8n start
