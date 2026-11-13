#!/usr/bin/env bash
# The runtime workloads W1 to W7 across shard counts, as CSV:
#   suite,workload,shards,host_workers,conns,rate_per_s,p50_us,p99_us,wfrt_cores,host_cores,load1,notes
#
#   bench/cloud/micro.sh > micro.csv
#
# W1 glue in process (bench-w1, one thread per shard); W2 webhook in and
# reply out; W3 W2 plus one call to the stub (0 ms); W4 W3 with the call as
# a code step in the fallback host; W5 park and resume approvals; W6 a
# loop of 100 effects; W7 W2 with 100 KB bodies. W5 and W6 run on one core.
# Environment: SECS (default 10), SHARDS_LIST, HOST_WORKERS (W4, default 2),
# and the CPU layout of common.sh.
set -euo pipefail
source "$(dirname "$0")/common.sh"
SECS=${SECS:-10}
HOST_WORKERS=${HOST_WORKERS:-2}
WORK=${WORK:-$(mktemp -d /tmp/wfrt-micro-XXXX)}
BASE=${BASE_PORT:-19400}
PORT=$BASE
# The W3 and W4 modules call the stub on 127.0.0.1:19090 (src/shell/programs.zig).
STUB=19090
SOCK=$WORK/fb.sock
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do stop_pid "$p"; done; }
trap cleanup EXIT

for w in w2 w3 w4; do "$WFRT" asm "$w" "$WORK/$w.wfm" none > /dev/null; done
LT=$(( AUX > 1 ? AUX - 1 : 1 ))
[ -n "$LOADGEN_SSH" ] && LT=${LOADGEN_THREADS:-4}

row() { echo "$1,$2,$3,$4,$5,$6,$7,$8,$9,${10},$(load1),${11:-}"; }

# serve_and_load name shards module route conns body extra-serve-args...
serve_and_load() {
  local name=$1 shards=$2 module=$3 route=$4 conns=$5 body=$6; shift 6
  rm -rf "$WORK/log" && mkdir -p "$WORK/log"
  pinx "$(first_cpus "$shards")" "$WFRT" serve --port "$PORT" --shards "$shards" --log-dir "$WORK/log" \
    --module "$module" --route "$route" "$@" > "$WORK/serve-$name-$shards.txt" 2>&1 &
  local sp=$!
  PIDS+=("$sp")
  for _ in $(seq 1 100); do grep -q "wfrt serving" "$WORK/serve-$name-$shards.txt" 2> /dev/null && break; sleep 0.1; done
  wfrt_load --port "$PORT" --conns "$conns" --seconds 2 --path "${route#* }" --body "$body" --threads "$LT" > /dev/null
  local c0 h0 c1 h1 out
  c0=$(cpu_tree "$sp"); h0=$( [ -n "${HOSTPID:-}" ] && cpu_tree "$HOSTPID" || echo 0)
  out=$(wfrt_load --port "$PORT" --conns "$conns" --seconds "$SECS" --path "${route#* }" --body "$body" --threads "$LT")
  c1=$(cpu_tree "$sp"); h1=$( [ -n "${HOSTPID:-}" ] && cpu_tree "$HOSTPID" || echo 0)
  stop_pid "$sp"; wait "$sp" 2> /dev/null || true
  local rate p50 p99
  rate=$(sed -n 's/.*rate=\([0-9]*\).*/\1/p' <<< "$out")
  p50=$(sed -n 's/.*p50=\([0-9]*\)us.*/\1/p' <<< "$out")
  p99=$(sed -n 's/.*p99=\([0-9]*\)us.*/\1/p' <<< "$out")
  row micro "$name" "$shards" "${HOST_WORKERS_USED:-0}" "$conns" "$rate" "$p50" "$p99" \
    "$(echo "($c1 - $c0) / $SECS" | bc -l | xargs printf %.2f)" "$(echo "($h1 - $h0) / $SECS" | bc -l | xargs printf %.2f)"
}

echo "suite,workload,shards,host_workers,conns,rate_per_s,p50_us,p99_us,wfrt_cores,host_cores,load1,notes"

# W5 and W6: one core.
out=$(pin 0 "$WFRT" bench-w5 200000)
row micro W5-park "1" 0 0 "$(sed -n 's/.*park_rate=\([0-9]*\).*/\1/p' <<< "$out")" "" "" 1 0 "resume_rate=$(sed -n 's/.*resume_rate=\([0-9]*\).*/\1/p' <<< "$out")/s snapshot_bytes=$(sed -n 's/.*snapshot_bytes_per_exec=\([0-9]*\).*/\1/p' <<< "$out")"
out=$(pin 0 "$WFRT" bench-w6)
row micro W6-loop100 1 0 0 "$(sed -n 's/.*executions=\([0-9]*\)\/s.*/\1/p' <<< "$out")" "" "" 1 0 "effect_round_trips=$(sed -n 's/.*effect_round_trips=\([0-9]*\).*/\1/p' <<< "$out")/s"

pinx "$AUX_CPUS" "$WFRT" stub --port "$STUB" > "$WORK/stub.txt" 2>&1 &
PIDS+=($!)

rm -f "$SOCK"
pinx "$SERVER_CPUS" node "$HOST_JS" --socket "$SOCK" --workers "$HOST_WORKERS" > "$WORK/host.txt" 2>&1 &
HOST_BG=$!
PIDS+=("$HOST_BG")
wait_for_file "$SOCK" 60 || { echo "the fallback host did not start; see $WORK/host.txt" >&2; exit 1; }

for s in $(shard_list); do
  out=$(pin "$(first_cpus "$s")" "$WFRT" bench-w1 --seconds "$SECS" --threads "$s")
  row micro W1-glue "$s" 0 0 "$(sed -n 's/.* rate=\([0-9]*\).*/\1/p' <<< "$out")" "" "" "$s" 0 "in process"
  conns=$(( 64 * s < 2048 ? 64 * s : 2048 ))
  serve_and_load W2-none "$s" "$WORK/w2.wfm" "POST /w2" "$conns" 1024
  serve_and_load W3-stub0ms "$s" "$WORK/w3.wfm" "POST /w3" "$conns" 1024
  serve_and_load W7-100KB "$s" "$WORK/w2.wfm" "POST /w2" "$(( conns < 256 ? conns : 256 ))" 102400 --rbuf-kb 256
  HOSTPID=$HOST_BG HOST_WORKERS_USED=$HOST_WORKERS serve_and_load W4-hoststep "$s" "$WORK/w4.wfm" "POST /w4" 256 1024 --fallback "$SOCK"
done
