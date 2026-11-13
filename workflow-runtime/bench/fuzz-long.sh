#!/usr/bin/env bash
# Long fuzz runs: each target for SECS seconds (default 600), PAR targets at
# a time (default 4), in waves. The fuzzer runs one test of a binary for ever, so each
# target is its own `zig build fuzz -Dfuzz-filter=<name> --fuzz`. A crashing
# input is copied to bench/fuzz-crashes/<target>.bin; add it to the target's
# seeds as a regression test. Logs go to $OUT (default /tmp/wfrt-fuzz).
#   bench/fuzz-long.sh                  all targets
#   SECS=60 bench/fuzz-long.sh "fuzz json decode and encode"
set -uo pipefail
cd "$(dirname "$0")/.."
SECS=${SECS:-600}
PAR=${PAR:-4}
OUT=${OUT:-/tmp/wfrt-fuzz}
mkdir -p "$OUT" bench/fuzz-crashes
TARGETS=(
  "fuzz module verifier and interpreter"
  "fuzz http request and response parsers"
  "fuzz chunked split positions"
  "fuzz chunked decoder on random bytes"
  "fuzz url parser and query encoder"
  "fuzz log reader and recovery"
  "fuzz admin request bodies"
  "fuzz credential templates"
  "fuzz core state machine"
  "fuzz json decode and encode"
  "fuzz multipart parser"
  "fuzz multipart round trip"
  "fuzz webhook body"
  "fuzz tzif parser"
  "fuzz cron parser and slots"
)
[ $# -gt 0 ] && TARGETS=("$@")


run_one() {
  local t=$1 slug=${1// /-}
  local log="$OUT/$slug.log"
  # Its own cache: parallel fuzzers in one cache race on corpus files.
  # Compile first (a seed-only run): in Zig 0.17 the build system's use of
  # <cache>/tmp races the fuzzer's start, which then cannot open its log.
  zig build fuzz -Drelease=true -Dfuzz-filter="$t" --cache-dir "$OUT/cache-$slug" > "$log" 2>&1 || {
    echo "FAIL $t: the seeds fail (log $log)"
    return 1
  }
  mkdir -p "$OUT/cache-$slug/tmp"
  # One worker (-j1): several workers of one run also race on <cache>/tmp.
  zig build fuzz -Drelease=true -Dfuzz-filter="$t" --fuzz -j1 --cache-dir "$OUT/cache-$slug" > "$log" 2>&1 &
  local pid=$!
  local waited=0
  while [ $waited -lt "$SECS" ] && kill -0 $pid 2> /dev/null; do sleep 5; waited=$((waited + 5)); done
  # Stop the fuzzer workers (children of zig build), then zig build.
  pkill -TERM -P $pid 2> /dev/null
  kill -TERM $pid 2> /dev/null
  wait $pid 2> /dev/null
  # A failing input; a fuzzer panic without one is a setup problem.
  if grep -aq "input saved to" "$log"; then
    local saved
    saved=$(grep -ao "input saved to '[^']*'" "$log" | head -1 | sed "s/input saved to '//; s/'$//")
    [ -n "$saved" ] && [ -f "$saved" ] && cp "$saved" "bench/fuzz-crashes/$slug.bin"
    echo "FAIL $t after ${waited}s (log $log)"
    return 1
  fi
  if grep -aq "error: test process unexpectedly terminated" "$log"; then
    echo "SETUP $t after ${waited}s: the fuzzer stopped without a failing input (log $log)"
    return 1
  fi
  echo "ok   $t ${waited}s"
}

# Waves of PAR targets (bash 3.2 on macOS has no `wait -n`).
failed=0
i=0
while [ $i -lt ${#TARGETS[@]} ]; do
  pids=()
  j=0
  while [ $j -lt "$PAR" ] && [ $i -lt ${#TARGETS[@]} ]; do
    run_one "${TARGETS[$i]}" & pids+=($!)
    i=$((i + 1)); j=$((j + 1))
  done
  for p in "${pids[@]}"; do wait "$p" || failed=1; done
done
exit $failed
