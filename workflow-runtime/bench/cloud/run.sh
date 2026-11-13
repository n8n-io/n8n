#!/usr/bin/env bash
# The cloud benchmark: machine facts, the runtime workloads W1 to W7, and
# the warm and mix runs of workflows, across shard counts and host worker
# counts. Run setup.sh first. See README.md.
#
#   bench/cloud/run.sh [--quick] [--bundles DIR] [--no-micro] [--no-synthetic]
#
# --bundles DIR  also runs bench/warm/warm.ts on real bundles (DIR is the
#                set with bundles/; needs REPLAY, ENGINE_TEST_DIR, GYM_REPO
#                and the gym: see README.md). Off by default.
# --quick        a short dry run: fewer shard and worker counts, short runs.
#
# Environment (defaults in brackets):
#   OUT            result folder [bench/cloud/results/<UTC time>]
#   SECS           seconds per measured load run [20; quick 5]
#   WARM_RUNS      runs per workflow in warm mode [200; quick 60]
#   CODE_MODES     Code steps in the host or native ["host native"; quick "host"]
#   SHARDS_LIST    shard counts ["1 2 4 8 <server cores>"; quick "1 2"]
#   WORKERS_LIST   host worker counts ["1 2 4 8"; quick "1 2"]
#   LOADGEN_SSH, SERVER_IP, AUX   the CPU layout and a second machine (common.sh)
set -euo pipefail
source "$(dirname "$0")/common.sh"
QUICK=0 BUNDLES= MICRO=1 SYNTH=1
while [ $# -gt 0 ]; do
  case $1 in
    --quick) QUICK=1 ;;
    --bundles) BUNDLES=$2; shift ;;
    --no-micro) MICRO=0 ;;
    --no-synthetic) SYNTH=0 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
  shift
done
if [ "$QUICK" = 1 ]; then
  SECS=${SECS:-5} WARM_RUNS=${WARM_RUNS:-60} CODE_MODES=${CODE_MODES:-host}
  export SHARDS_LIST=${SHARDS_LIST:-"1 2"}
  WORKERS_LIST=${WORKERS_LIST:-"1 2"}
fi
SECS=${SECS:-20}
WARM_RUNS=${WARM_RUNS:-200}
CODE_MODES=${CODE_MODES:-"host native"}
WORKERS_LIST=${WORKERS_LIST:-"1 2 4 8"}
OUT=${OUT:-$KIT/results/$(date -u +%Y%m%d-%H%M%S)}
mkdir -p "$OUT"
OUT=$(cd "$OUT" && pwd)
export SECS
[ -x "$WFRT" ] || { echo "no wfrt build: run setup.sh" >&2; exit 1; }
[ -f "$HOST_JS" ] || { echo "no fallback host build: run setup.sh" >&2; exit 1; }

echo "results in $OUT; server cores $SERVER_CPUS, aux cores $AUX_CPUS${LOADGEN_SSH:+, load generator on $LOADGEN_SSH}"
"$KIT/sysinfo.sh" before > "$OUT/sysinfo-before.json"
loadgen_setup

ENGINE_PID=
ENGINE_CPUS=
stop_engine() {
  [ -z "$ENGINE_PID" ] && return 0
  curl -fs -X POST "http://127.0.0.1:$CONTROL/stop" > /dev/null 2>&1 || true
  stop_pid "$ENGINE_PID"
  ENGINE_PID=
}
trap stop_engine EXIT
CONTROL=18099
WEB=18080

# start_engine code shards workers
start_engine() {
  local code=$1 shards=$2 workers=$3 work=/tmp/wfrt-cloud-engine
  rm -rf "$work"
  # wfrt on the first `shards` server cores; the host (its server process and
  # workers) on the next ones when they fit, else on all server cores.
  local wcpus hcpus
  wcpus=$(first_cpus "$shards")
  if [ $(( shards + workers + 1 )) -le "$SERVER_N" ]; then
    hcpus="$shards-$(( shards + workers ))"
  else
    hcpus=$SERVER_CPUS
  fi
  WFRT_CPUS=$wcpus HOST_CPUS=$hcpus pinx "$AUX_CPUS" node "$KIT/synth/engine.ts" --work "$work" --code "$code" \
    --shards "$shards" --workers "$workers" --port "$WEB" --control-port "$CONTROL" --bind "$BIND" > "$OUT/engine.log" 2>&1 &
  ENGINE_PID=$!
  wait_for_file "$work/ready.json" 180 || { tail -20 "$OUT/engine.log" >&2; echo "the engine did not start" >&2; exit 1; }
  ENGINE_CPUS="wfrt:$wcpus host:$hcpus"
}

if [ "$MICRO" = 1 ]; then
  echo "== W1 to W7 across shard counts"
  "$KIT/micro.sh" > "$OUT/micro.csv" 2> "$OUT/micro.log" || { tail -20 "$OUT/micro.log"; exit 1; }
  column -s, -t < "$OUT/micro.csv" | head -50
fi

if [ "$SYNTH" = 1 ]; then
  for code in $CODE_MODES; do
    echo "== synthetic warm, Code steps $code"
    start_engine "$code" 1 2
    pin "$AUX_CPUS" node "$KIT/synth/drive.mjs" --control "http://127.0.0.1:$CONTROL" --mode warm --conc 4 \
      --runs "$WARM_RUNS" --seconds 10 --out "$OUT/warm-synth-$code.json" > "$OUT/warm-synth-$code.log" 2>&1
    curl -fs "http://127.0.0.1:$CONTROL/stub" > "$OUT/stub-calls-$code.json" || true
    stop_engine
    node "$RUNTIME/bench/warm/report.mjs" "$OUT/warm-synth-$code.json" | tee "$OUT/warm-synth-$code.txt"
  done
  echo "== synthetic mix across shard and host worker counts"
  for code in $CODE_MODES; do
    for s in $(shard_list); do
      for w in $WORKERS_LIST; do
        start_engine "$code" "$s" "$w"
        conc=$(( 8 * w + 4 * s ))
        line=$(drive "$CONTROL" --mode mix --conc "$conc" --seconds "$SECS" --label "$ENGINE_CPUS" 2> /dev/null | tail -1)
        stop_engine
        echo "$line" >> "$OUT/mix.jsonl"
        echo "code=$code shards=$s workers=$w conc=$conc: $line" | cut -c1-220
      done
    done
  done
fi

if [ -n "$BUNDLES" ]; then
  : "${REPLAY:?--bundles needs REPLAY (a replay JSONL with match=exact rows)}"
  : "${ENGINE_TEST_DIR:?--bundles needs ENGINE_TEST_DIR}"
  export GYM_SRC=${GYM_REPO:-$HOME/work/ai-gym}
  "$KIT/gym.sh" "$OUT/gym" > /dev/null
  source "$OUT/gym/gym.env"
  for code in $CODE_MODES; do
    echo "== real bundles, warm, Code steps $code"
    pin "$SERVER_CPUS" node "$RUNTIME/bench/warm/warm.ts" --set "$BUNDLES" --replay "$REPLAY" --sample "${SAMPLE:-150}" \
      --runs "$WARM_RUNS" --seconds 10 --conc 4 --code "$code" --out "$OUT/warm-bundles-$code.json" > "$OUT/warm-bundles-$code.log" 2>&1
    node "$RUNTIME/bench/warm/report.mjs" "$OUT/warm-bundles-$code.json" | tee "$OUT/warm-bundles-$code.txt"
  done
  kill "$(cat "$OUT/gym/gym.pid")" 2> /dev/null || true
fi

"$KIT/sysinfo.sh" after > "$OUT/sysinfo-after.json"
node "$KIT/summarize.mjs" "$OUT"
echo "done: $OUT/summary.md and $OUT/results.csv"
