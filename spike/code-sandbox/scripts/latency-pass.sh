#!/usr/bin/env bash
# Latency pass and baseline pass (SPIKE-SPEC-opus.md, section 12, steps 3 and 6)
# for one configuration.
#
#   BACKEND=sandbox SCOPE=execution SPARE=true RUNS=200 W3_RUNS=20 spike/code-sandbox/scripts/latency-pass.sh
#   BACKEND=task-runners spike/code-sandbox/scripts/latency-pass.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
BACKEND="${BACKEND:-sandbox}"
SCOPE="${SCOPE:-execution}"
# REUSE=true keeps worker processes between tasks (N8N_CODE_SANDBOX_REUSE_WORKERS).
REUSE="${REUSE:-false}"
SUFFIX=""
[[ "$REUSE" == "true" ]] && SUFFIX="-reuse"
SPARE="${SPARE:-true}"
RUNTIME="${RUNTIME:-n8n-js}"
RUNS="${RUNS:-200}"
WARMUP="${WARMUP:-20}"
W3_RUNS="${W3_RUNS:-20}"
NAME="${NAME:-$BACKEND-$SCOPE-spare$SPARE-$RUNTIME$SUFFIX}"
[[ "$BACKEND" == "task-runners" ]] && NAME="task-runners"
OUT="$SPIKE_DIR/latency-$NAME"
mkdir -p "$OUT"
S=spike/code-sandbox/scripts

[[ -f "$SPIKE_DIR/n8n.pid" ]] && kill "$(cat "$SPIKE_DIR/n8n.pid")" 2>/dev/null || true
sleep 3
BACKEND="$BACKEND" SCOPE="$SCOPE" N8N_CODE_SANDBOX_SPARE_WORKERS="$SPARE" N8N_CODE_SANDBOX_RUNTIME="$RUNTIME" \
	N8N_CODE_SANDBOX_TIMINGS_PATH="$OUT/timings.jsonl" N8N_CODE_SANDBOX_REUSE_WORKERS="$REUSE" N8N_LOG_LEVEL=warn \
	nohup "$S/start-n8n.sh" >"$OUT/n8n.log" 2>&1 &
echo $! >"$SPIKE_DIR/n8n.pid"
until curl -sf http://127.0.0.1:5678/healthz/readiness >/dev/null; do sleep 1; done
sleep 5

# WORKLOADS limits the pass to some workloads, for example "W1 W2 W3". WFILE is
# not in the default list.
WORKLOADS="${WORKLOADS:-W1 W2 W3 W5b W6}"
want() { [[ " $WORKLOADS " == *" $1 "* ]]; }
run() { node "$S/run-workload.mjs" --label "$1-$NAME" --out "$OUT/client.jsonl" "${@:2}"; }
want W1 && run W1 --path spike-w1 --runs "$RUNS" --warmup "$WARMUP"
want W2 && run W2 --path spike-w2 --runs "$RUNS" --warmup "$WARMUP"
want W3 && run W3 --path spike-w3 --runs "$W3_RUNS" --warmup 2
want W5b && run W5b-1mb --path spike-w5b --query size=1mb --runs "$RUNS" --warmup "$WARMUP"
want W6 && run W6 --path spike-w6 --query mode=ten --runs "$RUNS" --warmup "$WARMUP"
# WFILE: the W5 binary workflow (streams), one size after the other.
if want WFILE; then
	for spec in ${FILE_RUNS:-1mb:20 100mb:10 1gb:5}; do
		size="${spec%%:*}"
		run "WFILE-$size" --path spike-w5 --query "size=$size" --runs "${spec##*:}" --warmup 1
	done
fi
exit 0
