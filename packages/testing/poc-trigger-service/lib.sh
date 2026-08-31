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
# Multi-main needs an enterprise license. Trigger seats do NOT need a leader,
# so without a key we fall back to running the fleet without multi-main: every
# main considers itself leader, which is exactly the leaderless posture the
# seats flags expect. (Leader-gated background jobs like pruning then run on
# every main — harmless for a demo.)
if [ -n "${N8N_LICENSE_ACTIVATION_KEY:-}" ]; then
  export N8N_LICENSE_ACTIVATION_KEY
  export N8N_LICENSE_TENANT_ID="${N8N_LICENSE_TENANT_ID:-1001}"
  export N8N_MULTI_MAIN_SETUP_ENABLED=true
else
  echo "[poc] no N8N_LICENSE_ACTIVATION_KEY: running WITHOUT multi-main (seats don't need it)"
  export N8N_MULTI_MAIN_SETUP_ENABLED=false
fi

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

# --- The flows under test: publication service + trigger seats ---
export N8N_USE_WORKFLOW_PUBLICATION_SERVICE=true
export N8N_USE_TRIGGER_SEATS=true
# Snappy demo timings: 2s reconcile ticks, 10s leases (a paused holder is
# reclaimable ~10s after its last renewal), short teardown wait.
export N8N_TRIGGER_SEAT_RECONCILE_INTERVAL_SECONDS=2
export N8N_TRIGGER_SEAT_LEASE_SECONDS=10
export N8N_TRIGGER_SEAT_TEARDOWN_WAIT_SECONDS=8

# --- Misc ---
# Task runners are irrelevant to the PoC demos and their default broker port
# collides across co-located local processes.
export N8N_RUNNERS_ENABLED=false
export N8N_LOG_LEVEL=debug
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_SECURE_COOKIE=false
export GENERIC_TIMEZONE=UTC
