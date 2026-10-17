#!/usr/bin/env bash
# Starts n8n for the spike.
#
#   BACKEND=sandbox SCOPE=execution spike/code-sandbox/scripts/start-n8n.sh
#   BACKEND=task-runners spike/code-sandbox/scripts/start-n8n.sh   # baseline
#
# Other N8N_CODE_SANDBOX_* variables pass through.
set -euo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-$SPIKE_DIR/user}"
export N8N_CODE_EXECUTION_BACKEND="${BACKEND:-sandbox}"
export N8N_CODE_SANDBOX_SCOPE="${SCOPE:-execution}"
export N8N_SANDBOX_SERVICE_URL="${N8N_SANDBOX_SERVICE_URL:-http://127.0.0.1:8080}"
export N8N_SANDBOX_SERVICE_API_KEY="${N8N_SANDBOX_SERVICE_API_KEY:-test}"
export N8N_CODE_SANDBOX_TIMINGS_PATH="${N8N_CODE_SANDBOX_TIMINGS_PATH:-$SPIKE_DIR/timings.jsonl}"
# macOS resolves /tmp to /private/tmp, so allow both forms.
export N8N_RESTRICT_FILE_ACCESS_TO="${N8N_RESTRICT_FILE_ACCESS_TO:-$SPIKE_DIR;$(realpath "$SPIKE_DIR")}"
export N8N_SSRF_PROTECTION_ENABLED="${N8N_SSRF_PROTECTION_ENABLED:-true}"
# The echo server runs on localhost, which SSRF protection blocks by default.
export N8N_SSRF_ALLOWED_IP_RANGES="${N8N_SSRF_ALLOWED_IP_RANGES:-127.0.0.1/32}"
export N8N_DIAGNOSTICS_ENABLED=false
export N8N_PERSONALIZATION_ENABLED=false
export N8N_LOG_LEVEL="${N8N_LOG_LEVEL:-info}"
export N8N_PROXY_HOPS=0
# Baseline: task runners in external mode need a launcher. Internal mode is
# the fallback for local runs.
export N8N_RUNNERS_MODE="${N8N_RUNNERS_MODE:-internal}"

exec packages/cli/bin/n8n start
