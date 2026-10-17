#!/usr/bin/env bash
# Churn and load pass (SPIKE-SPEC-opus.md, section 12, step 5) for one scope
# mode: W9, W12 (W2 and W9 at fixed concurrency) and W14, with sandbox polling
# and a leak check at the end.
#
#   SCOPE=execution DURATION=300 spike/code-sandbox/scripts/load-pass.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
SCOPE="${SCOPE:-execution}"
# REUSE=true keeps worker processes between tasks (N8N_CODE_SANDBOX_REUSE_WORKERS).
REUSE="${REUSE:-false}"
SUFFIX=""
[[ "$REUSE" == "true" ]] && SUFFIX="-reuse"
DURATION="${DURATION:-300}"
CONCURRENCY="${CONCURRENCY:-10}"
W14_CONCURRENCY="${W14_CONCURRENCY:-20}"
OUT="$SPIKE_DIR/load-$SCOPE$SUFFIX"
mkdir -p "$OUT"
S=spike/code-sandbox/scripts

[[ -f "$SPIKE_DIR/n8n.pid" ]] && kill "$(cat "$SPIKE_DIR/n8n.pid")" 2>/dev/null || true
sleep 3
BACKEND=sandbox SCOPE="$SCOPE" N8N_CODE_SANDBOX_TIMINGS_PATH="$OUT/timings.jsonl" N8N_CODE_SANDBOX_REUSE_WORKERS="$REUSE" N8N_LOG_LEVEL=warn \
	nohup "$S/start-n8n.sh" >"$OUT/n8n.log" 2>&1 &
echo $! >"$SPIKE_DIR/n8n.pid"
until curl -sf http://127.0.0.1:5678/healthz/readiness >/dev/null; do sleep 1; done
sleep 5

node "$S/sandboxes.mjs" poll --interval 5 --out "$OUT/sandboxes.jsonl" >/dev/null &
POLL=$!
trap 'kill $POLL 2>/dev/null || true' EXIT

paths=$(seq 0 99 | sed 's/^/spike-w14-/' | paste -sd, -)
node "$S/run-workload.mjs" --path spike-w9 --runs 20 --warmup 0 --label "W9-$SCOPE$SUFFIX" --out "$OUT/client.jsonl"
node "$S/run-workload.mjs" --path spike-w2 --duration "$DURATION" --concurrency "$CONCURRENCY" --warmup 0 --label "W12-w2-c$CONCURRENCY-$SCOPE$SUFFIX" --out "$OUT/client.jsonl"
node "$S/run-workload.mjs" --path spike-w9 --duration "$DURATION" --concurrency "$CONCURRENCY" --warmup 0 --label "W12-w9-c$CONCURRENCY-$SCOPE$SUFFIX" --out "$OUT/client.jsonl"
node "$S/run-workload.mjs" --paths "$paths" --duration "$DURATION" --concurrency "$W14_CONCURRENCY" --warmup 0 --label "W14-c$W14_CONCURRENCY-$SCOPE$SUFFIX" --out "$OUT/client.jsonl"

kill $POLL 2>/dev/null || true
# Idle timeout (30 s) plus 10 s. In workflow mode, the max lifetime also applies.
node "$S/sandboxes.mjs" leak-check --wait 40 | tee -a "$OUT/client.jsonl"
