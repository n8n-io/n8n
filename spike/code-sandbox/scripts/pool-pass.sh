#!/usr/bin/env bash
# Warm pool pass: worker reuse without and with the warm pool of the sandbox
# service, back to back for each scope. The pool needs an API restart with
# SANDBOX_CODE_POOLS, so COMPOSE must run docker compose for the local sandbox
# service stack. A restart empties the API store (SQLite in the container), so
# the script deletes all sandboxes first.
#
#   AB_DIR=/tmp/n8n-spike/run5 spike/code-sandbox/scripts/pool-pass.sh
#
# COMPOSE defaults to scripts/compose.sh (macOS and Linux). To run it on a
# remote VM, use spike/code-sandbox/remote/remote.sh.
set -uo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
SANDBOX_SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"
COMPOSE="${COMPOSE:-spike/code-sandbox/scripts/compose.sh}"
API="${N8N_SANDBOX_SERVICE_URL:-http://127.0.0.1:8080}"
KEY="${N8N_SANDBOX_SERVICE_API_KEY:-test}"
export SPIKE_DIR
export N8N_USER_FOLDER="$SPIKE_DIR/user"
export N8N_RESTRICT_FILE_ACCESS_TO="$SPIKE_DIR;$(realpath "$SPIKE_DIR")"
AB="${AB_DIR:-$SPIKE_DIR/pool}"
mkdir -p "$AB"
# Two passes at the same time restart the API under each other.
LOCK="$SPIKE_DIR/.pool-pass.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
	echo "another pool pass runs ($LOCK exists)" >&2
	exit 1
fi
S=spike/code-sandbox/scripts
# k6 reads the API address from BASE_URL.
export BASE_URL="${N8N_SANDBOX_SERVICE_URL:-http://127.0.0.1:8080}"
export WORKLOADS="${WORKLOADS:-W1 W2 W3}"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$AB/progress.log"; }

stop_n8n() {
	[[ -f "$AB/n8n.pid" ]] && kill "$(cat "$AB/n8n.pid")" 2>/dev/null
	sleep 3
}

sandbox_ids() {
	curl -sf -H "X-Api-Key: $KEY" "$API/sandboxes" | node -e '
		let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
			for (const r of JSON.parse(s || "[]")) console.log(r.id);
		});'
}

pooled_count() {
	curl -sf -H "X-Api-Key: $KEY" "$API/sandboxes" | node -e '
		let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
			console.log(JSON.parse(s || "[]").filter((r) => r.pool_key).length);
		});'
}

# wait_pool N: waits until N sandboxes are in the pool (at most 3 minutes).
wait_pool() {
	local want="$1" i
	for i in $(seq 1 180); do
		[[ "$(pooled_count)" -ge "$want" ]] && return 0
		sleep 1
	done
	log "WARN pool did not reach $want"
}

# restart_api POOLS POOLED: deletes all sandboxes, restarts the API with
# SANDBOX_CODE_POOLS=POOLS, and waits until a runner takes creates and the pool
# holds POOLED sandboxes.
restart_api() {
	local pools="$1" pooled="$2" id i
	stop_n8n
	for id in $(sandbox_ids); do
		curl -s -o /dev/null -X DELETE -H "X-Api-Key: $KEY" "$API/sandboxes/$id"
	done
	SANDBOX_CODE_POOLS="$pools" $COMPOSE up -d --no-deps api >>"$AB/compose.log" 2>&1
	until curl -sf "$API/healthz" >/dev/null; do sleep 1; done
	if [[ "$pooled" -gt 0 ]]; then
		wait_pool "$pooled"
	else
		for i in $(seq 1 120); do
			id=$(curl -sf -X POST -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"slots":1}' "$API/v1/code/sandboxes" | node -e '
				let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => console.log(JSON.parse(s || "{}").id ?? ""));')
			if [[ -n "$id" ]]; then
				curl -s -o /dev/null -X DELETE -H "X-Api-Key: $KEY" "$API/v1/code/sandboxes/$id"
				break
			fi
			sleep 1
		done
	fi
	sleep 5
}

# shellcheck source=lib.sh
source "$S/lib.sh"
record_host "$AB"
start_load_sampler "$AB/load-avg.txt"
trap 'stop_n8n; stop_load_sampler; rmdir "$LOCK"' EXIT
trap 'exit 143' INT TERM

pool_json() { echo "[{\"runtime\":\"n8n-js\",\"slots\":$1,\"taskMemoryMb\":$2,\"spareWorkers\":true,\"reuseWorkers\":true,\"size\":$3}]"; }

# 1. Direct Task API benchmark: creates one at a time and in bursts.
K6_POOL_SIZE="${K6_POOL_SIZE:-8}"
for mode in nopool pool; do
	if [[ "$mode" == "pool" ]]; then
		restart_api "$(pool_json 2 256 "$K6_POOL_SIZE")" "$K6_POOL_SIZE"
	else
		restart_api "" 0
	fi
	# K6_BURSTS="1 10" skips the burst of 50 on a small VM: 50 sandboxes do not fit in its memory.
	for burst in ${K6_BURSTS:-1 10 50}; do
		[[ "$mode" == "pool" ]] && wait_pool "$K6_POOL_SIZE"
		name="k6-create-burst$burst-$mode"
		log "$name"
		SCENARIO=create BURST=$burst ITERATIONS=50 REUSE_WORKERS=true \
			k6 run -q "$SANDBOX_SERVICE_DIR/benchmarks/k6-code-task-api.js" >"$AB/$name.txt" 2>&1
	done
done

# 2. Latency pass and n8n benchmark for each scope: reuse, then reuse + pool.
for spec in "execution 2 ${POOL_EXECUTION:-8}" "node 1 ${POOL_NODE:-8}" "workflow 4 ${POOL_WORKFLOW:-4}"; do
	read -r scope slots size <<<"$spec"
	for mode in nopool pool; do
		suffix=""
		if [[ "$mode" == "pool" ]]; then
			suffix="-pool"
			restart_api "$(pool_json "$slots" 512 "$size")" "$size"
		else
			restart_api "" 0
		fi
		log "latency $scope reuse $mode"
		SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=$scope REUSE=true RUNS=50 WARMUP=5 W3_RUNS=5 \
			NAME="sandbox-$scope-sparetrue-n8n-js-reuse$suffix" "$S/latency-pass.sh" >>"$AB/latency.txt" 2>&1
		for vus in 1 5; do
			[[ "$mode" == "pool" ]] && wait_pool "$size"
			log "benchmark $scope vus=$vus reuse $mode"
			SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=$scope REUSE=true VUS=$vus NAME_SUFFIX="$suffix" \
				"$S/benchmark-pass.sh" >/dev/null 2>&1
		done
	done
done

stop_n8n
restart_api "" 0
log "all done"
