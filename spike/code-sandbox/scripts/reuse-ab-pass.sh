#!/usr/bin/env bash
# Runs every benchmark twice, with and without worker reuse, back to back, so
# both modes see the same machine load. Results go to $SPIKE_DIR/ab.
#
#   SANDBOX_SERVICE_DIR=../n8n-sandbox-service-opus spike/code-sandbox/scripts/reuse-ab-pass.sh
set -uo pipefail
cd "$(dirname "$0")/../../.."

SPIKE_DIR="${SPIKE_DIR:-/tmp/n8n-spike}"
SANDBOX_SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"
export SPIKE_DIR
# The passes below write to $AB, but n8n keeps the prepared data and files.
export N8N_USER_FOLDER="$SPIKE_DIR/user"
export N8N_RESTRICT_FILE_ACCESS_TO="$SPIKE_DIR;$(realpath "$SPIKE_DIR")"
AB="${AB_DIR:-$SPIKE_DIR/ab}"
mkdir -p "$AB"
S=spike/code-sandbox/scripts
# k6 reads the API address from BASE_URL.
export BASE_URL="${N8N_SANDBOX_SERVICE_URL:-http://127.0.0.1:8080}"
# shellcheck source=lib.sh
source "$S/lib.sh"
record_host "$AB"
start_load_sampler "$AB/load-avg.txt"
trap 'stop_load_sampler' EXIT
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$AB/progress.log"; }

# 1. Direct Task API benchmark.
for reuse in false true; do
	for args in "SCENARIO=task" "SCENARIO=task THINK=1" "SCENARIO=rpc THINK=1"; do
		name="k6-$(echo "$args" | tr ' =' '-_')-reuse$reuse"
		log "$name"
		env $args REUSE_WORKERS=$reuse ITERATIONS=50 k6 run -q "$SANDBOX_SERVICE_DIR/benchmarks/k6-code-task-api.js" >"$AB/$name.txt" 2>&1
	done
done

# 2. Latency pass. 3. n8n benchmark. Each scope with and without reuse.
# WORKLOADS limits the latency pass (see latency-pass.sh).
export WORKLOADS="${WORKLOADS:-W1 W2 W3 W5b W6}"
if [[ "${TASK_RUNNER_LATENCY:-false}" == "true" ]]; then
	log "latency task-runners"
	SPIKE_DIR="$AB" BACKEND=task-runners RUNS=50 WARMUP=5 W3_RUNS=5 "$S/latency-pass.sh" >>"$AB/latency.txt" 2>&1
fi
for scope in execution node workflow; do
	for reuse in false true; do
		log "latency $scope reuse=$reuse"
		SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=$scope REUSE=$reuse RUNS=50 WARMUP=5 W3_RUNS=5 "$S/latency-pass.sh" >>"$AB/latency.txt" 2>&1
	done
done
log "benchmark task-runners"
for vus in 1 5; do SPIKE_DIR="$AB" BACKEND=task-runners VUS=$vus "$S/benchmark-pass.sh" >/dev/null 2>&1; done
for scope in execution node workflow; do
	for vus in 1 5; do
		for reuse in false true; do
			log "benchmark $scope vus=$vus reuse=$reuse"
			SPIKE_DIR="$AB" BACKEND=sandbox SCOPE=$scope REUSE=$reuse VUS=$vus "$S/benchmark-pass.sh" >/dev/null 2>&1
		done
	done
done

# 4. Load pass. SKIP_LOAD=true skips it.
[[ "${SKIP_LOAD:-false}" == "true" ]] || for scope in execution node workflow; do
	for reuse in false true; do
		log "load $scope reuse=$reuse"
		w14=10
		[[ "$scope" == "workflow" ]] && w14=5
		SPIKE_DIR="$AB" SCOPE=$scope REUSE=$reuse DURATION=60 CONCURRENCY=5 W14_CONCURRENCY=$w14 "$S/load-pass.sh" >>"$AB/load.txt" 2>&1
	done
done
[[ -f "$AB/n8n.pid" ]] && kill "$(cat "$AB/n8n.pid")" 2>/dev/null
log "all done"
