#!/usr/bin/env bash
# The synthetic mix (Code steps native) on one wfrt shard, for each given
# wfrt binary in turn, ROUNDS times: wfrt instructions, cycles and CPU time
# per run. macOS (instruction counts from bench/perf/rusage.c).
#   bench/perf/mix-ab.sh <wfrt-a> [<wfrt-b> ...]
set -euo pipefail
cd "$(dirname "$0")/../.."
RUSAGE=${RUSAGE:-/tmp/wfrt-rusage}
[ -x "$RUSAGE" ] || cc -O2 -o "$RUSAGE" bench/perf/rusage.c
ROUNDS=${ROUNDS:-2}
SECS=${SECS:-15}
CODE=${CODE:-native}
for round in $(seq 1 "$ROUNDS"); do
  for bin in "$@"; do
    work=/tmp/wfrt-mixab
    rm -rf "$work"
    WFRT_BIN=$bin RUSAGE_BIN=$RUSAGE node bench/cloud/synth/engine.ts --work "$work" --code "$CODE" --shards 1 --workers 4 --port 28180 --control-port 28199 > /tmp/wfrt-mixab.log 2>&1 &
    ep=$!
    for _ in $(seq 1 120); do grep -q "^ready" /tmp/wfrt-mixab.log && break; sleep 1; done
    line=$(node bench/cloud/synth/drive.mjs --control http://127.0.0.1:28199 --mode mix --conc 24 --seconds "$SECS" --out /tmp/wfrt-mixab.jsonl 2> /dev/null | tail -1)
    curl -fs -X POST http://127.0.0.1:28199/stop > /dev/null || true
    wait "$ep" 2> /dev/null || true
    sleep 2
    [ -n "$line" ] || { echo "$(basename "$bin"),failed"; continue; }
    node -e "const r=JSON.parse(process.argv[1]); console.log([process.argv[2], r.runs, Math.round(r.wfrtInstructionsPerRun), Math.round(r.wfrtCyclesPerRun), r.wfrtUsPerRun.toFixed(0)].join(','))" "$line" "$(basename "$bin")"
  done
done
