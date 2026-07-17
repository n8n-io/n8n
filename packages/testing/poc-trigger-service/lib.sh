#!/usr/bin/env bash
# Shared environment for local PoC mains/workers. Sourced by run-main.sh and
# run-worker.sh. The license key is intentionally NOT committed — put it in
# .env.local (see .env.local.example).
POC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$POC_DIR/../../.." && pwd)"

if [ -f "$POC_DIR/.env.local" ]; then
  # shellcheck disable=SC1091
  source "$POC_DIR/.env.local"
fi
if [ -z "${N8N_LICENSE_ACTIVATION_KEY:-}" ]; then
  echo "ERROR: N8N_LICENSE_ACTIVATION_KEY not set. Copy .env.local.example to .env.local and fill it in." >&2
  exit 1
fi
export N8N_LICENSE_ACTIVATION_KEY
export N8N_LICENSE_TENANT_ID="${N8N_LICENSE_TENANT_ID:-1001}"

# --- Database (compose postgres, host-exposed on 5433) ---
export DB_TYPE=postgresdb
export DB_POSTGRESDB_HOST=127.0.0.1
export DB_POSTGRESDB_PORT=5433
export DB_POSTGRESDB_DATABASE=n8n
export DB_POSTGRESDB_USER=n8n
export DB_POSTGRESDB_PASSWORD=n8n

# --- Queue mode (compose redis, host-exposed on 6380); multi-main requires it ---
export EXECUTIONS_MODE=queue
export QUEUE_BULL_REDIS_HOST=127.0.0.1
export QUEUE_BULL_REDIS_PORT=6380
export QUEUE_HEALTH_CHECK_ACTIVE=true
export OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true

# --- Identical across all instances ---
export N8N_ENCRYPTION_KEY=poc-encryption-key

# --- Multi-main + the flows under test ---
export N8N_MULTI_MAIN_SETUP_ENABLED=true
export N8N_USE_WORKFLOW_PUBLICATION_SERVICE=true
# PoC flag consumed by the trigger-service PoC code paths (task 0.2 onward).
export N8N_POC_TRIGGER_SERVICE=true

# --- Misc ---
# Task runners are irrelevant to the PoC demos and their default broker port
# collides across co-located local processes.
export N8N_RUNNERS_ENABLED=false
export N8N_LOG_LEVEL=debug
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_SECURE_COOKIE=false
export GENERIC_TIMEZONE=UTC
