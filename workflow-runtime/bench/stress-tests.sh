#!/usr/bin/env bash
# Repeat a test binary under load until it fails, then stop and report.
#
# The shell test binary is flaky only on a loaded machine: it passes alone,
# and sometimes fails while several builds and fuzzers share the CPUs. This
# script makes that failure visible. It runs M copies of the binary in
# parallel, with background processes that burn CPU, N times in total. At the
# first failure it prints the full log of the run, its exit code or signal,
# and the last test that started, then stops.
#
#   bench/stress-tests.sh [binary]            (default zig-out/bin/shell-test)
#   N=100 M=16 bench/stress-tests.sh          runs and parallel copies
#   LOAD=8 bench/stress-tests.sh              background CPU burners (default M)
#   TIMEOUT=120 bench/stress-tests.sh         seconds before a run counts as hung
#
# It only stops the processes that it starts itself, by PID.
set -uo pipefail
cd "$(dirname "$0")/.."
BIN=${1:-zig-out/bin/shell-test}
N=${N:-50}
CPUS=$(getconf _NPROCESSORS_ONLN 2> /dev/null || echo 4)
M=${M:-$((CPUS * 2))}
LOAD=${LOAD:-$M}
TIMEOUT=${TIMEOUT:-120}

if [ ! -x "$BIN" ]; then
  echo "stress-tests: $BIN is missing; run 'zig build install-tests' first" >&2
  exit 2
fi

WORK=$(mktemp -d)
cleanup() {
  # Stop only the processes whose PIDs this script recorded.
  for f in "$WORK"/*.pid; do
    [ -e "$f" ] || continue
    kill -KILL "$(cat "$f")" 2> /dev/null || true
  done
  rm -rf "$WORK"
}
trap cleanup EXIT

# CPU burners: a busy shell loop keeps one CPU busy and needs no tools.
for i in $(seq 1 "$LOAD"); do
  bash -c 'while :; do :; done' &
  echo $! > "$WORK/load-$i.pid"
  disown $!
done

# One run: `$1` is its number. Writes the status to `<n>.rc`, after a watchdog
# has killed the binary if it is still alive after TIMEOUT seconds.
run_one() {
  local n=$1
  # The watchdog stops when the run ends. It acts only while the run's PID
  # file exists, so it never signals a PID that the system has given to
  # another process in the meantime.
  watchdog() {
    local waited=0
    while [ "$waited" -lt "$TIMEOUT" ]; do
      sleep 1
      [ -e "$WORK/$n.pid" ] || exit 0
      waited=$((waited + 1))
    done
    kill -TERM "$RUNNER" 2> /dev/null || exit 0
    sleep 5
    [ -e "$WORK/$n.pid" ] || exit 0
    kill -KILL "$RUNNER" 2> /dev/null || true
  }
  local RUNNER
  "$BIN" > "$WORK/$n.out" 2> "$WORK/$n.err" &
  RUNNER=$!
  echo "$RUNNER" > "$WORK/$n.pid"
  watchdog &
  wait "$RUNNER"
  local rc=$?
  rm -f "$WORK/$n.pid"
  echo "$rc" > "$WORK/$n.rc"
}

describe() {
  if [ "$1" -gt 128 ]; then
    local sig=$(( $1 - 128 ))
    echo "signal ${sig} ($(kill -l "$sig" 2> /dev/null || echo unknown))"
  else
    echo "exit $1"
  fi
}

echo "stress-tests: $N runs, $M in parallel, $LOAD CPU burners, timeout ${TIMEOUT}s, $BIN"
start=$(date +%s)
done_n=0
failed=0
while [ "$done_n" -lt "$N" ]; do
  batch=$(( N - done_n ))
  [ "$batch" -gt "$M" ] && batch=$M
  base=$done_n
  jobs=""
  for i in $(seq 1 "$batch"); do
    run_one $(( base + i )) &
    jobs="$jobs $!"
  done
  # Wait for this batch only: a bare `wait` would also wait for the CPU
  # burners, which run until the script ends.
  for p in $jobs; do wait "$p"; done
  done_n=$(( base + batch ))
  for i in $(seq 1 "$batch"); do
    n=$(( base + i ))
    rc=$(cat "$WORK/$n.rc" 2> /dev/null || echo 255)
    if [ "$rc" != 0 ]; then
      failed=1
      break
    fi
  done
  [ "$failed" = 1 ] && break
done

if [ "$failed" = 0 ]; then
  echo "stress-tests: $N runs passed in $(( $(date +%s) - start ))s"
  exit 0
fi

echo "stress-tests: run $n FAILED: $(describe "$rc")" >&2
# Zig's test runner prints "<i>/<n> <name>..." for each test as it starts, so
# the last such line names the test that did not finish.
last=$(grep -aoE '^[0-9]+/[0-9]+ .*\.\.\.' "$WORK/$n.err" | tail -1)
echo "stress-tests: last test started: ${last:-none}" >&2
echo "stress-tests: run $n of $N, after $(( $(date +%s) - start ))s, seed 0 (the test runner's default)" >&2
echo "----- stdout -----" >&2
cat "$WORK/$n.out" >&2
echo "----- stderr (full) -----" >&2
cat "$WORK/$n.err" >&2
echo "----- end -----" >&2
exit 1
