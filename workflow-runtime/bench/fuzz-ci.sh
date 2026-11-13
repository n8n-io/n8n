#!/usr/bin/env bash
# CI fuzzing: every fuzz target, RUNS iterations each (default 3K).
# The Zig 0.17 fuzzer fuzzes only one test of each test binary, so each
# target gets its own `zig build fuzz -Dfuzz-filter=<name> --fuzz=RUNS`.
# Each also gets its own cache directory: fuzzers that share a cache race
# on <cache>/tmp and lock each other's corpus (also across CI runs of
# other checkouts). A filter is a new compile anyway, so the private cache
# costs nothing.
# A target fails when:
#   - the fuzzer saves a failing input, panics or ends on a signal (zig
#     build exits 0 in these cases, so the log is checked), or
#   - its run count does not grow (the target did not run).
# A failing input is copied to bench/fuzz-crashes/<target>.bin.
#   bench/fuzz-ci.sh                       all targets
#   RUNS=50K PAR=6 bench/fuzz-ci.sh "fuzz json decode and encode"
set -uo pipefail
cd "$(dirname "$0")/.."
RUNS=${RUNS:-3K}
PAR=${PAR:-4}
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
mkdir -p bench/fuzz-crashes

TARGETS=()
if [ $# -gt 0 ]; then
  TARGETS=("$@")
else
  # Every `test "fuzz ..."` in the sources: a new target is fuzzed at once.
  while IFS= read -r t; do TARGETS+=("$t"); done < <(grep -rhoE 'test "fuzz[^"]*"' src | sed 's/^test "//; s/"$//' | sort -u)
fi

run_one() {
  local t=$1 slug=${1// /-}
  local log="$OUT/$slug.log"
  # One worker (-j1): workers of one run also race on <cache>/tmp.
  zig build fuzz -Drelease=true -Dfuzz-filter="$t" --fuzz="$RUNS" -j1 --cache-dir "$OUT/cache-$slug" > "$log" 2>&1
  local rc=$?
  # The fuzzer rewrites its output line: one line per update.
  local text
  text=$(tr '\r' '\n' < "$log")
  if grep -aq "input saved to" <<< "$text"; then
    local saved
    saved=$(grep -ao "input saved to '[^']*'" <<< "$text" | head -1 | sed "s/input saved to '//; s/'$//")
    [ -n "$saved" ] && [ -f "$saved" ] && cp "$saved" "bench/fuzz-crashes/$slug.bin"
    echo "FAIL $t: a failing input (bench/fuzz-crashes/$slug.bin)"
    tail -40 <<< "$text"
    return 1
  fi
  if [ $rc -ne 0 ] || grep -aqE "panic|terminated with signal|unexpectedly terminated" <<< "$text"; then
    echo "FAIL $t: the fuzzer stopped (exit $rc)"
    tail -40 <<< "$text"
    return 1
  fi
  # "Runs: <before> -> <after>" for each binary with this target.
  local runs
  runs=$(grep -aoE "Runs: [0-9]+ -> [0-9]+" <<< "$text" | awk '{ if ($4 > $2) grew = 1 } END { print grew ? "ok" : "none" }')
  if [ "$runs" != ok ]; then
    echo "FAIL $t: no fuzz runs"
    tail -20 <<< "$text"
    return 1
  fi
  echo "ok   $t ($(grep -aoE "Runs: [0-9]+ -> [0-9]+" <<< "$text" | tail -1))"
}

# Waves of PAR targets (bash 3.2 on macOS has no `wait -n`).
failed=0
i=0
while [ $i -lt ${#TARGETS[@]} ]; do
  pids=()
  j=0
  while [ $j -lt "$PAR" ] && [ $i -lt ${#TARGETS[@]} ]; do
    run_one "${TARGETS[$i]}" & pids+=($!)
    i=$((i + 1))
    j=$((j + 1))
  done
  for p in "${pids[@]}"; do wait "$p" || failed=1; done
done
echo "${#TARGETS[@]} fuzz targets, $RUNS runs each: $([ $failed = 0 ] && echo ok || echo FAILED)"
exit $failed
