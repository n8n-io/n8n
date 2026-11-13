#!/usr/bin/env bash
# CPU cost per request of W2 (webhook in, reply out) and W3 (W2 plus one
# call to the stub at 0 ms) on one shard. The counts come from the `wfrt`
# process itself (`/usr/bin/time -l` on macOS: instructions retired, cycles,
# user and system time), not from the rate: a loaded machine changes the rate
# and the time per request far more than the instructions per request.
#   bench/perf/cpu.sh [seconds] [conns]
# Prints: workload,requests,instructions/req,cycles/req,user_us/req,sys_us/req,cpu_us/req
# PROFILE=1 also writes a `sample` profile of each run to $OUT.
set -euo pipefail
cd "$(dirname "$0")/../.."
SECS=${1:-8}
CONNS=${2:-64}
OUT=${OUT:-$(mktemp -d /tmp/wfrt-perf-XXXX)}
mkdir -p "$OUT"
WFRT=${WFRT:-./zig-out/bin/wfrt}
PORT=${PORT:-19700}
STUB=
cleanup() { [ -n "$STUB" ] && kill "$STUB" 2> /dev/null || true; }
trap cleanup EXIT
for w in w2 w3; do "$WFRT" asm "$w" "$OUT/$w.wfm" none > /dev/null; done
# The W3 module calls the stub on 127.0.0.1:19090 (src/shell/programs.zig).
"$WFRT" stub --port 19090 > "$OUT/stub.txt" 2>&1 &
STUB=$!

echo "workload,requests,instr_per_req,cycles_per_req,user_us,sys_us,cpu_us"
for w in w2 w3; do
  rm -rf "$OUT/log" && mkdir -p "$OUT/log"
  /usr/bin/time -l "$WFRT" serve --port "$PORT" --shards 1 --log-dir "$OUT/log" --module "$OUT/$w.wfm" --route "POST /$w" > "$OUT/serve-$w.txt" 2> "$OUT/time-$w.txt" &
  tp=$!
  for _ in $(seq 1 100); do grep -q "wfrt serving" "$OUT/serve-$w.txt" 2> /dev/null && break; sleep 0.1; done
  sp=$(pgrep -P "$tp" | head -1)
  if [ "${PROFILE:-0}" = 1 ]; then sample "$sp" "$SECS" -file "$OUT/sample-$w.txt" > /dev/null 2>&1 & fi
  out=$("$WFRT" load --port "$PORT" --conns "$CONNS" --seconds "$SECS" --path "/$w" --body 256 --threads 2)
  kill "$sp"; wait "$tp" 2> /dev/null || true
  ok=$(sed -n 's/.*ok=\([0-9]*\).*/\1/p' <<< "$out")
  awk -v ok="$ok" -v w="$w" '
    /real/ { user = $3; sys = $5 }
    /instructions retired/ { ins = $1 }
    /cycles elapsed/ { cyc = $1 }
    END { printf "%s,%d,%.0f,%.0f,%.2f,%.2f,%.2f\n", w, ok, ins / ok, cyc / ok, user * 1e6 / ok, sys * 1e6 / ok, (user + sys) * 1e6 / ok }' "$OUT/time-$w.txt"
done
if [ "${PROFILE:-0}" = 1 ]; then echo "profiles in $OUT"; fi
