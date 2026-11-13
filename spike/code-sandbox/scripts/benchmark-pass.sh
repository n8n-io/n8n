#!/usr/bin/env bash
# Runs the js-code-node scenario of @n8n/benchmark against one n8n
# configuration and saves the k6 summary and the code sandbox timing records.
#
#   BACKEND=sandbox SCOPE=execution VUS=5 DURATION=1m spike/code-sandbox/scripts/benchmark-pass.sh
#   BACKEND=task-runners spike/code-sandbox/scripts/benchmark-pass.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
BACKEND="${BACKEND:-sandbox}"
SCOPE="${SCOPE:-execution}"
# REUSE=true keeps worker processes between tasks (N8N_CODE_SANDBOX_REUSE_WORKERS).
REUSE="${REUSE:-false}"
SUFFIX=""
[[ "$REUSE" == "true" ]] && SUFFIX="-reuse"
VUS="${VUS:-5}"
DURATION="${DURATION:-1m}"
# NAME_SUFFIX marks a variant in the output folder name, for example "-pool".
NAME="$BACKEND-$SCOPE$SUFFIX${NAME_SUFFIX:-}"
[[ "$BACKEND" == "task-runners" ]] && NAME="task-runners"
OUT="$SPIKE_DIR/benchmark/$NAME-vus$VUS"
rm -rf "$OUT"
mkdir -p "$OUT"
S=spike/code-sandbox/scripts

DB="${N8N_USER_FOLDER:-$SPIKE_DIR/user}/.n8n/database.sqlite"

start_n8n() {
	[[ -f "$SPIKE_DIR/n8n.pid" ]] && kill "$(cat "$SPIKE_DIR/n8n.pid")" 2>/dev/null || true
	sleep 3
	# The benchmark CLI archives and deletes its workflow before a run. On a slow
	# host the delete can fail while the workflow is still being unpublished,
	# and then every later run fails with "already archived". Undo the archive.
	if [[ -f "$DB" ]]; then
		sqlite3 "$DB" "UPDATE workflow_entity SET isArchived = 0, active = 0
			WHERE isArchived = 1 AND name LIKE '[BENCHMARK]%';" || true
	fi
	BACKEND="$BACKEND" SCOPE="$SCOPE" N8N_CODE_SANDBOX_TIMINGS_PATH="$OUT/timings.jsonl" N8N_CODE_SANDBOX_REUSE_WORKERS="$REUSE" N8N_LOG_LEVEL=warn \
		nohup "$S/start-n8n.sh" >>"$OUT/n8n.log" 2>&1 &
	echo $! >"$SPIKE_DIR/n8n.pid"
	until curl -sf http://127.0.0.1:5678/healthz/readiness >/dev/null; do sleep 1; done
	sleep 3
}

# Up to 3 attempts: a failed attempt does not run k6.
for attempt in 1 2 3; do
	start_n8n
	packages/@n8n/benchmark/bin/n8n-benchmark run \
		--testScenariosPath=packages/@n8n/benchmark/scenarios \
		--scenarioFilter=js-code-node \
		--scenarioNamePrefix="$NAME" \
		--n8nBaseUrl=http://127.0.0.1:5678 \
		--vus="$VUS" --duration="$DURATION" 2>&1 | tee "$OUT/k6.txt" || true
	grep -q "iterations" "$OUT/k6.txt" && break
	echo "attempt $attempt failed" >>"$OUT/attempts.txt"
	sleep 10
done
