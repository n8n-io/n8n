#!/usr/bin/env bash
# All passes for SPIKE-RESULTS-opus-template.md, on one host. Results go to
# $AB_DIR (default $SPIKE_DIR/v2), one folder per pass.
#
#   AB_DIR=$HOME/n8n-spike/v2 spike/code-sandbox/scripts/full-pass.sh
#
# PHASES selects the phases (default: all, in this order):
#   direct       section 4: creates, claims, process start, idle sandboxes
#   taskrunners  baseline in external mode: latency pass and n8n benchmark
#   modes        each mode × option: latency pass, n8n benchmark, sandbox poller
#   fresh        execution + fresh (no spare process): latency pass and 1 VU benchmark
#   load         WLOAD per mode (shared)
#   file         WFILE (execution + shared)
#
# Counts (defaults for the reference host):
#   RUNS=200 WARMUP=20 LOOP_RUNS=20 BENCH_DURATION=1m BENCH_VUS="1 5"
#   SCOPES="node execution workflow" OPTIONS="fresh-spare shared shared-pool"
#   DIRECT_SEQ=200 DIRECT_BURST10=20 DIRECT_BURST50=4 DIRECT_TASKS=200 DIRECT_IDLE_PER=5
#   FRESH_RUNS=50 FRESH_LOOP_RUNS=10 FILE_RUNS="1mb:20 100mb:10 1gb:5"
#   LOAD_DURATION=60
#
# COMPOSE runs docker compose for the local sandbox service stack (restarts the
# API for the pools; a restart empties the API store).
set -uo pipefail
cd "$(dirname "$0")/../../.." || exit 1

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
SANDBOX_SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"
COMPOSE="${COMPOSE:-spike/code-sandbox/scripts/compose.sh}"
API="${N8N_SANDBOX_SERVICE_URL:-http://127.0.0.1:8080}"
KEY="${N8N_SANDBOX_SERVICE_API_KEY:-test}"
export SPIKE_DIR SANDBOX_SERVICE_DIR
export N8N_USER_FOLDER="$SPIKE_DIR/user"
export N8N_RESTRICT_FILE_ACCESS_TO="$SPIKE_DIR;$(realpath "$SPIKE_DIR")"
export SANDBOX_URL="$API" SANDBOX_ADMIN_KEY="$KEY"
export RUNNER_CONTAINERS="${RUNNER_CONTAINERS:-n8n-sandbox-service-runner-dind-local-1,n8n-sandbox-service-runner-dind-local-2}"
AB="${AB_DIR:-$SPIKE_DIR/v2}"
mkdir -p "$AB"
S=spike/code-sandbox/scripts

PHASES="${PHASES:-direct taskrunners modes fresh load file}"
RUNS="${RUNS:-200}"
WARMUP="${WARMUP:-20}"
LOOP_RUNS="${LOOP_RUNS:-20}"
BENCH_DURATION="${BENCH_DURATION:-1m}"
BENCH_VUS="${BENCH_VUS:-1 5}"
SCOPES="${SCOPES:-node execution workflow}"
OPTIONS="${OPTIONS:-fresh-spare shared shared-pool}"
FRESH_RUNS="${FRESH_RUNS:-50}"
FRESH_LOOP_RUNS="${FRESH_LOOP_RUNS:-10}"
LOAD_DURATION="${LOAD_DURATION:-60}"
export FILE_RUNS="${FILE_RUNS:-1mb:20 100mb:10 1gb:5}"

LOCK="$SPIKE_DIR/.full-pass.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
	echo "another full pass runs ($LOCK exists)" >&2
	exit 1
fi
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$AB/progress.log"; }
has() { [[ " $PHASES " == *" $1 "* ]]; }

# stop_n8n stops n8n and waits until port 5678 is free. n8n sets its process
# title to "n8n start".
stop_n8n() {
	local i
	# One SIGTERM only: n8n exits at once on a second signal, and then it does
	# not release its sandboxes or write the last records.
	pkill -x -f 'n8n start' 2>/dev/null
	# n8n releases its sandboxes and writes the last records at shutdown.
	for i in $(seq 1 30); do
		pgrep -x -f 'n8n start' >/dev/null || break
		sleep 1
	done
	for i in $(seq 1 30); do
		curl -s -o /dev/null -m 1 http://127.0.0.1:5678/healthz || return 0
		sleep 1
	done
	log "WARN n8n still answers on 5678"
}

json_get() { curl -sf -H "X-Api-Key: $KEY" "$API$1"; }
sandbox_ids() { json_get /sandboxes | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{for(const r of JSON.parse(s||"[]"))console.log(r.id)})'; }
pooled_count() { json_get /sandboxes | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s||"[]").filter(r=>r.pool_key).length))'; }

wait_pool() {
	local want="$1" i
	for i in $(seq 1 180); do
		[[ "$(pooled_count)" -ge "$want" ]] && return 0
		sleep 1
	done
	log "WARN pool did not reach $want"
}

# restart_api POOLS POOLED: deletes all sandboxes, restarts the API with
# SANDBOX_CODE_POOLS=POOLS and waits for the pool.
restart_api() {
	local pools="$1" pooled="$2" id i
	stop_n8n
	for id in $(sandbox_ids); do
		curl -s -o /dev/null -X DELETE -H "X-Api-Key: $KEY" "$API/sandboxes/$id"
	done
	# A pool refill that runs during the restart leaves containers that the new
	# API store does not know. Stop the API, then remove all sandbox containers.
	$COMPOSE stop api >>"$AB/compose.log" 2>&1
	for r in ${RUNNER_CONTAINERS//,/ }; do
		docker exec "$r" sh -c 'docker ps -aq --filter name=sandbox- | xargs -r docker rm -f' >/dev/null 2>&1
	done
	SANDBOX_CODE_POOLS="$pools" $COMPOSE up -d --no-deps --force-recreate api >>"$AB/compose.log" 2>&1
	until curl -sf "$API/healthz" >/dev/null; do sleep 1; done
	# Wait until a runner takes creates.
	for i in $(seq 1 120); do
		id=$(curl -sf -X POST -H "X-Api-Key: $KEY" -H "Content-Type: application/json" -d '{"slots":1}' "$API/v1/code/sandboxes" |
			node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s||"{}").id??""))')
		if [[ -n "$id" ]]; then
			curl -s -o /dev/null -X DELETE -H "X-Api-Key: $KEY" "$API/v1/code/sandboxes/$id"
			break
		fi
		sleep 1
	done
	[[ "$pooled" -gt 0 ]] && wait_pool "$pooled"
	sleep 5
}

pool_json() { echo "[{\"runtime\":\"n8n-js\",\"slots\":$1,\"taskMemoryMb\":512,\"spareWorkers\":true,\"reuseWorkers\":true,\"size\":$2}]"; }
slots_of() { case "$1" in node) echo 1 ;; execution) echo 2 ;; workflow) echo 4 ;; esac; }
pool_size_of() { case "$1" in node) echo "${POOL_NODE:-8}" ;; execution) echo "${POOL_EXECUTION:-8}" ;; workflow) echo "${POOL_WORKFLOW:-4}" ;; esac; }

POLL=""
start_poll() {
	node "$S/sandboxes.mjs" poll --interval 5 --out "$1" >/dev/null 2>&1 &
	POLL=$!
}
stop_poll() {
	[[ -n "$POLL" ]] && kill "$POLL" 2>/dev/null
	POLL=""
}

# shellcheck source=lib.sh
source "$S/lib.sh"
record_host "$AB"
{
	echo "phases: $PHASES"
	echo "runs: $RUNS warmup: $WARMUP loop runs: $LOOP_RUNS bench: $BENCH_DURATION vus: $BENCH_VUS"
	echo "scopes: $SCOPES options: $OPTIONS"
	echo "n8n: $(node -p 'require("./packages/cli/package.json").version')"
	echo "runners image: n8nio/runners:$(node -p 'require("./packages/cli/package.json").version')"
} >>"$AB/host.txt"
start_load_sampler "$AB/load-avg.txt"
trap 'stop_poll; stop_n8n; stop_load_sampler; "$S/task-runners.sh" stop; rmdir "$LOCK"' EXIT
trap 'exit 143' INT TERM

if ! pgrep -f echo-server.mjs >/dev/null; then
	(setsid nohup node "$S/echo-server.mjs" >"$AB/echo.log" 2>&1 </dev/null &)
	sleep 1
fi

if has direct; then
	D="$AB/direct"
	restart_api "" 0
	log "direct: creates"
	node "$S/direct-pass.mjs" creates --out "$D" --seq "${DIRECT_SEQ:-200}" \
		--burst10 "${DIRECT_BURST10:-20}" --burst50 "${DIRECT_BURST50:-4}" >>"$AB/direct.log" 2>&1
	log "direct: process start"
	node "$S/direct-pass.mjs" procstart --out "$D" --tasks "${DIRECT_TASKS:-200}" >>"$AB/direct.log" 2>&1
	log "direct: idle sandboxes"
	node "$S/direct-pass.mjs" idle --out "$D" --per "${DIRECT_IDLE_PER:-5}" --wait 30 >>"$AB/direct.log" 2>&1
	ps="${POOL_EXECUTION:-8}"
	restart_api "$(pool_json 2 "$ps")" "$ps"
	log "direct: claims"
	node "$S/direct-pass.mjs" claims --out "$D" --pool-size "$ps" --seq "${DIRECT_SEQ:-200}" >>"$AB/direct.log" 2>&1
	log "direct: claim bursts"
	node "$S/direct-pass.mjs" claim-burst --out "$D" --pool-size "$ps" --rounds "${DIRECT_CLAIM_ROUNDS:-13}" >>"$AB/direct.log" 2>&1
fi

if has taskrunners; then
	restart_api "" 0
	log "task runners (external): latency"
	export N8N_RUNNERS_MODE=external
	# The broker listens on the Docker bridge only, where the runners container
	# connects.
	N8N_RUNNERS_BROKER_LISTEN_ADDRESS="$(ip -4 -o addr show docker0 2>/dev/null | awk '{print $4}' | cut -d/ -f1)"
	export N8N_RUNNERS_BROKER_LISTEN_ADDRESS="${N8N_RUNNERS_BROKER_LISTEN_ADDRESS:-0.0.0.0}"
	"$S/task-runners.sh" start >>"$AB/taskrunners.log" 2>&1
	SPIKE_DIR="$AB" BACKEND=task-runners RUNS="$RUNS" WARMUP="$WARMUP" W3_RUNS="$LOOP_RUNS" WORKLOADS="W1 W2 W3 W6" \
		"$S/latency-pass.sh" >>"$AB/taskrunners.log" 2>&1
	for vus in $BENCH_VUS; do
		log "task runners (external): benchmark vus=$vus"
		SPIKE_DIR="$AB" BACKEND=task-runners VUS="$vus" DURATION="$BENCH_DURATION" "$S/benchmark-pass.sh" >>"$AB/taskrunners.log" 2>&1
	done
	stop_n8n
	"$S/task-runners.sh" stop
	unset N8N_RUNNERS_MODE N8N_RUNNERS_BROKER_LISTEN_ADDRESS
fi

if has modes; then
	for scope in $SCOPES; do
		for opt in $OPTIONS; do
			name="$scope-$opt"
			reuse=false
			suffix=""
			[[ "$opt" != "fresh-spare" ]] && reuse=true
			if [[ "$opt" == "shared-pool" ]]; then
				size="$(pool_size_of "$scope")"
				restart_api "$(pool_json "$(slots_of "$scope")" "$size")" "$size"
				suffix="-pool"
			else
				size=0
				restart_api "" 0
			fi
			start_poll "$AB/poll-$name.jsonl"
			log "$name: latency"
			SPIKE_DIR="$AB" BACKEND=sandbox SCOPE="$scope" REUSE="$reuse" RUNS="$RUNS" WARMUP="$WARMUP" W3_RUNS="$LOOP_RUNS" \
				WORKLOADS="W1 W2 W3 W6" NAME="$name" "$S/latency-pass.sh" >>"$AB/modes.log" 2>&1
			for vus in $BENCH_VUS; do
				stop_n8n
				[[ "$size" -gt 0 ]] && wait_pool "$size"
				log "$name: benchmark vus=$vus"
				SPIKE_DIR="$AB" BACKEND=sandbox SCOPE="$scope" REUSE="$reuse" VUS="$vus" DURATION="$BENCH_DURATION" \
					NAME_SUFFIX="$suffix" "$S/benchmark-pass.sh" >>"$AB/modes.log" 2>&1
			done
			stop_n8n
			stop_poll
		done
	done
fi

if has fresh; then
	restart_api "" 0
	start_poll "$AB/poll-execution-fresh.jsonl"
	log "execution-fresh: latency"
	SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=execution REUSE=false SPARE=false RUNS="$FRESH_RUNS" WARMUP=5 \
		W3_RUNS="$FRESH_LOOP_RUNS" WORKLOADS="W1 W2 W3" NAME="execution-fresh" "$S/latency-pass.sh" >>"$AB/fresh.log" 2>&1
	stop_n8n
	log "execution-fresh: benchmark vus=1"
	N8N_CODE_SANDBOX_SPARE_WORKERS=false SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=execution REUSE=false VUS=1 \
		DURATION="$BENCH_DURATION" NAME_SUFFIX="-fresh" "$S/benchmark-pass.sh" >>"$AB/fresh.log" 2>&1
	stop_n8n
	stop_poll
fi

if has load; then
	for scope in $SCOPES; do
		restart_api "" 0
		log "load $scope (shared)"
		w14=10
		[[ "$scope" == "workflow" ]] && w14=5
		SPIKE_DIR="$AB" SCOPE="$scope" REUSE=true DURATION="$LOAD_DURATION" CONCURRENCY=5 W14_CONCURRENCY=$w14 \
			"$S/load-pass.sh" >>"$AB/load.log" 2>&1
		stop_n8n
	done
fi

if has file; then
	restart_api "" 0
	log "file: WFILE execution shared"
	SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=execution REUSE=true WORKLOADS="WFILE" NAME="execution-shared-file" \
		"$S/latency-pass.sh" >>"$AB/file.log" 2>&1
	stop_n8n
fi

restart_api "" 0
log "all done"
