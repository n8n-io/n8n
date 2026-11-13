#!/usr/bin/env bash
# wfrt today, for the gap table: CPU per execution of W2 (webhook in, reply
# out) and W3 (plus one outbound call to the stub), from the server
# process's CPU time, not from the rate. One shard. Run it next to
# `floor net` in the same session, so both see the same machine load.
#   bench/floor/wfrt-http.sh <wfrt-binary> [reps] [secs] [conns]
#   Linux: SERVER_CPU=7 LOAD_CPUS=6 STUB_CPU=14 bench/floor/wfrt-http.sh ...
# Output: one line per run: workload, ok, server CPU s, µs per execution,
# load generator CPU µs per request, stub CPU µs per request.
set -euo pipefail
WFRT=${1:?wfrt binary}
REPS=${2:-3}
SECS=${3:-5}
CONNS=${4:-64}
WORK=$(mktemp -d "${TMPDIR:-/tmp}/wfrt-floor-http.XXXX")
PORT=${PORT:-28480}
STUB=19090 # the hand-assembled W3 module calls this port
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2> /dev/null || true; done; rm -rf "$WORK"; }
trap cleanup EXIT

# CPU seconds of one process: /proc (Linux, clock ticks) or ps (macOS,
# M:SS.ss or H:MM:SS.ss).
cpu_s() {
  if [ -r "/proc/$1/stat" ]; then
    awk -v hz="$(getconf CLK_TCK)" '{ sub(/.*\) /, ""); printf "%.2f", ($12 + $13) / hz }' "/proc/$1/stat"
  else
    ps -o cputime= -p "$1" | awk -F: '{ s = 0; for (i = 1; i <= NF; i++) s = s * 60 + $i; printf "%.2f", s }'
  fi
}
# Linux: pin each process (SERVER_CPU, LOAD_CPUS, STUB_CPU); macOS: no
# pinning. A prefix, not a function: `$!` must be the process itself.
pin_of() { if command -v taskset > /dev/null && [ -n "$1" ]; then echo "taskset -c $1"; fi; }
PIN_SERVER=$(pin_of "${SERVER_CPU:-}")
PIN_LOAD=$(pin_of "${LOAD_CPUS:-}")
PIN_STUB=$(pin_of "${STUB_CPU:-}")

"$WFRT" asm w2 "$WORK/w2.wfm" none
"$WFRT" asm w3 "$WORK/w3.wfm" none
$PIN_STUB nice -n 5 "$WFRT" stub --port "$STUB" > /dev/null 2>&1 &
STUBPID=$!
PIDS+=("$STUBPID")

for rep in $(seq 1 "$REPS"); do
  for w in w2 w3; do
    mkdir -p "$WORK/log-$w-$rep"
    $PIN_SERVER nice -n 5 "$WFRT" serve --port "$PORT" --shards 1 --log-dir "$WORK/log-$w-$rep" --module "$WORK/$w.wfm" --route "POST /$w" > "$WORK/serve.txt" 2>&1 &
    sp=$!
    PIDS+=("$sp")
    sleep 1
    c0=$(cpu_s "$sp")
    s0=$(cpu_s "$STUBPID")
    $PIN_LOAD nice -n 5 "$WFRT" load --port "$PORT" --conns "$CONNS" --threads 2 --seconds "$SECS" --path "/$w" --body 1024 > "$WORK/load.txt" 2>&1 &
    lp=$!
    PIDS+=("$lp")
    sleep "$SECS"
    lc=$(cpu_s "$lp" 2> /dev/null || echo 0)
    wait "$lp" || true
    c1=$(cpu_s "$sp")
    s1=$(cpu_s "$STUBPID")
    ok=$(sed -n 's/.*ok=\([0-9]*\).*/\1/p' "$WORK/load.txt")
    awk -v w="$w" -v ok="$ok" -v c="$(echo "$c1 - $c0" | bc)" -v lc="$lc" -v s="$(echo "$s1 - $s0" | bc)" -v rep="$rep" 'BEGIN {
      printf "wfrt %s rep=%d ok=%d server_cpu_s=%.2f us_per_exec=%.2f loadgen_us_per_req=%.2f stub_us_per_req=%.2f\n", w, rep, ok, c, c * 1e6 / ok, lc * 1e6 / ok, s * 1e6 / ok }'
    kill "$sp"
    wait "$sp" 2> /dev/null || true
  done
done
