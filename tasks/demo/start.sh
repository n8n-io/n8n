#!/usr/bin/env bash
# Launch one instance-pull demo n8n (dev or prd). Run from anywhere.
#   ./tasks/demo/start.sh dev     # n8n on :5678, role=dev
#   ./tasks/demo/start.sh prd     # n8n on :5679, role=prd  (run in a second terminal)
#
# Each role uses a SEPARATE N8N_USER_FOLDER, so dev and prd get independent
# databases + credential stores — that is what lets prd genuinely lack the
# credential the dev workflow needs.
set -euo pipefail

ROLE="${1:-}"
if [[ "$ROLE" != "dev" && "$ROLE" != "prd" ]]; then
  echo "usage: $0 <dev|prd>" >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

# Shared GitHub config (auto-exported).
set -a
# shellcheck disable=SC1091
source "$HERE/instance-pull.env"
set +a

export N8N_INSTANCE_PULL_DEMO=true
export INSTANCE_PULL_ROLE="$ROLE"
export INSTANCE_PULL_BRANCH_BASE="${INSTANCE_PULL_BRANCH_BASE:-main}"

# Pre-seed the instance owner (same creds on dev + prd) so both instances skip
# the setup wizard. The password is a pre-hashed bcrypt string — log in with the
# plaintext that produced it. Single quotes are REQUIRED so the shell does not
# expand the $... segments of the hash. Owner is re-applied on every start.
export N8N_INSTANCE_OWNER_MANAGED_BY_ENV=true
export N8N_INSTANCE_OWNER_EMAIL='james@n8n.io'
export N8N_INSTANCE_OWNER_PASSWORD_HASH='$2a$10$sjWVnRqBclp2CZbsa.5j6Om3lhYPosupV2vHWmaQ7GZta9BbSWVnK'
export N8N_INSTANCE_OWNER_FIRST_NAME='James'
export N8N_INSTANCE_OWNER_LAST_NAME='Gee'

if [[ "$ROLE" == "dev" ]]; then
  export N8N_PORT=5678
  export N8N_RUNNERS_BROKER_PORT=5680
  export N8N_USER_FOLDER="${HOME}/.n8n-instance-pull-dev"
else
  export N8N_PORT=5679
  export N8N_RUNNERS_BROKER_PORT=5681
  export N8N_USER_FOLDER="${HOME}/.n8n-instance-pull-prd"
fi
mkdir -p "$N8N_USER_FOLDER"

echo "▶ n8n role=$ROLE  port=$N8N_PORT  broker=$N8N_RUNNERS_BROKER_PORT  userFolder=$N8N_USER_FOLDER  repo=${INSTANCE_PULL_GH_OWNER}/${INSTANCE_PULL_GH_REPO}"
cd "$ROOT"
exec pnpm start
