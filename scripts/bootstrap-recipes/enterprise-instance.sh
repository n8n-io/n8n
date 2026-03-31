#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

pushd "$SCRIPT_DIR/../../packages/cli" > /dev/null

N8N_LICENSE_TENANT_ID="$(read_secret license_tenant_id)" \
N8N_LICENSE_ACTIVATION_KEY="$(read_secret license_activation_key)" \
./bin/n8n
