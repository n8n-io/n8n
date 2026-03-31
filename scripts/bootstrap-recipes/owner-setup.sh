#!/usr/bin/env bash
set -euo pipefail

# Delete /Users/ireneeajeneza/.n8n before continuing
if [[ -d "/Users/ireneeajeneza/.n8n" ]]; then
  echo "Deleting /Users/ireneeajeneza/.n8n"
  rm -rf "/Users/ireneeajeneza/.n8n"
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

PASSWORD_FILE="$SECRETS_DIR/owner_password"

pushd "$SCRIPT_DIR/../../packages/cli" > /dev/null

# for the fullstack run `./bin/n8n` instead of `pnpm dev`
N8N_INIT_OWNER_EMAIL=owner@example.com \
N8N_INIT_OWNER_FIRST_NAME=Jane \
N8N_INIT_OWNER_LAST_NAME=Doe \
N8N_INIT_OWNER_PASSWORD_FILE="$PASSWORD_FILE" \
pnpm dev
