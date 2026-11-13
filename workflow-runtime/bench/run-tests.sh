#!/usr/bin/env bash
# Run the Debug unit test binaries directly (`zig build install-tests`).
# `zig build test-debug` hides how a test binary ended: a test that dies on
# a signal shows only "failed command". Here a failure names the tests that
# failed, or the last test that started when the binary died, the exit code
# or signal, and the end of the log.
#   bench/run-tests.sh [bin dir]     (default zig-out/bin)
set -uo pipefail
cd "$(dirname "$0")/.."
BIN=${1:-zig-out/bin}
LOG=$(mktemp -d)
trap 'rm -rf "$LOG"' EXIT
failed=0
for t in core-test shell-test; do
  "$BIN/$t" > "$LOG/$t.log" 2>&1
  rc=$?
  if [ $rc -ne 0 ]; then
    failed=1
    how="exit $rc"
    [ $rc -gt 128 ] && how="signal $((rc - 128)) ($(kill -l $((rc - 128)) 2> /dev/null || echo '?'))"
    # A test name holds dots, so take the whole line up to the "..." the
    # runner prints when the test starts.
    last=$(grep -aoE '^[0-9]+/[0-9]+ .*\.\.\.' "$LOG/$t.log" | tail -1)
    echo "FAIL $t: $how; last test started: ${last:-none}" >&2
    # A test that fails (rather than dies) prints FAIL after its name, and
    # the log goes on. The test's own output can come between the name and
    # FAIL, so keep the last name line and print it for each FAIL.
    awk '/^[0-9]+\/[0-9]+ /{ name = $0 } /FAIL \(/{ print "  failed: " name }' "$LOG/$t.log" >&2
    tail -40 "$LOG/$t.log" >&2
  else
    grep -aE "tests passed|passed;" "$LOG/$t.log" | tail -1 | sed "s/^/$t: /"
  fi
done
exit $failed
