#!/usr/bin/env bash
set -euo pipefail

# Recipe: API Key Bootstrap (Phase 4)
#
# Creates a public API key for the instance owner on first boot.
# The raw key is written to bootstrap-secrets/api_key and logged at info level.
#
# On subsequent boots the key already exists in the DB — the step is skipped
# and the output file is re-written if it was lost.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

PASSWORD_HASH="$(read_secret owner_password_hash)"
API_KEY_FILE="$SECRETS_DIR/api_key"

# Delete previous n8n data to simulate a fresh boot.
if [[ -d "/Users/ireneeajeneza/.n8n" ]]; then
  echo "Deleting /Users/ireneeajeneza/.n8n"
  rm -rf "/Users/ireneeajeneza/.n8n"
fi

pushd "$SCRIPT_DIR/../../packages/cli" > /dev/null

N8N_LOG_LEVEL=debug \
N8N_INIT_OWNER_EMAIL=owner@example.com \
N8N_INIT_OWNER_FIRST_NAME=Jane \
N8N_INIT_OWNER_LAST_NAME=Doe \
N8N_INIT_OWNER_PASSWORD_HASH="$PASSWORD_HASH" \
N8N_INIT_API_KEY_LABEL=bootstrap-key \
N8N_INIT_API_KEY_SCOPES=workflow:create,workflow:read,workflow:list,workflow:update,workflow:delete,workflow:activate,workflow:deactivate \
N8N_INIT_API_KEY_OUTPUT_FILE="$API_KEY_FILE" \
N8N_LICENSE_TENANT_ID="$(read_secret license_tenant_id)" \
N8N_LICENSE_ACTIVATION_KEY="$(read_secret license_activation_key)" \
pnpm dev
