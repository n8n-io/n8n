#!/usr/bin/env bash
# Boot a local n8n instance in the dev or prd role for the instance-pull demo.
# Each role gets its own port + N8N_USER_FOLDER (so a separate sqlite DB + encryption key),
# so you can run both side by side in two terminals:
#
#   ./tasks/demo/start.sh dev     # raises reviews -> :5678
#   ./tasks/demo/start.sh prd     # validates + publishes -> :5679
#
# Fill in the GitHub values in tasks/demo/instance-pull.env first (dev needs them to push + open PRs).
# Requires a prior `pnpm build` (or `pnpm agent:setup build`).
set -euo pipefail

ROLE="${1:-}"
if [[ "$ROLE" != "dev" && "$ROLE" != "prd" ]]; then
  echo "Usage: $0 <dev|prd>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$REPO_ROOT/tasks/demo/instance-pull.env"

# Load the shared GitHub config (INSTANCE_PULL_REPO_URL / GH_OWNER / GH_REPO / GH_TOKEN).
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# start.sh is authoritative for role/port/user-folder so the two instances never collide.
export N8N_INSTANCE_PULL_DEMO=true
export N8N_PUBLIC_API_PACKAGES_ENABLED=true
export INSTANCE_PULL_ROLE="$ROLE"
export N8N_USER_FOLDER="$REPO_ROOT/.demo/$ROLE"
mkdir -p "$N8N_USER_FOLDER"

if [[ "$ROLE" == "dev" ]]; then
  export N8N_PORT="${DEV_PORT:-5678}"
else
  export N8N_PORT="${PRD_PORT:-5679}"
  # Public base URL prd uses to build the /credential-binding/<pr> link.
  export INSTANCE_PULL_PUBLIC_URL="${INSTANCE_PULL_PUBLIC_URL:-http://localhost:$N8N_PORT}"
fi

echo "▶ n8n [$ROLE] on http://localhost:$N8N_PORT  (data: $N8N_USER_FOLDER)"
cd "$REPO_ROOT"
exec node ./packages/cli/bin/n8n start
