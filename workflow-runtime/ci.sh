#!/usr/bin/env bash
# The checks from the Zig coding standards, in the order CI runs them.
set -euo pipefail
# A failed command names itself: some steps fail without output of their own.
trap 'echo "ci.sh: line $LINENO failed (exit $?): $BASH_COMMAND" >&2' ERR
cd "$(dirname "$0")"
zig fmt --check .
zig build check
# Linux cross-compiles: with the net code (epoll, c-ares and OpenSSL
# callers; `check` compiles without linking), and without it.
# On Linux the native check already covers this, and an explicit target
# does not search the system library paths.
if [ "$(uname -s)" != Linux ]; then
  zig build check -Dtarget=x86_64-linux-gnu
  zig build check -Dtarget=x86_64-linux-gnu -Dnet=false
fi
# Debug tests run outside the build runner, so a test binary that dies
# names its last test and its signal (bench/run-tests.sh).
zig build install-tests
bench/run-tests.sh
zig build install-tests-safe
bench/run-tests.sh zig-out/bin/safe
zig build -Drelease=true
./zig-out/bin/wfrt sim --seeds "${SIM_SEEDS:-1000}"
./zig-out/bin/wfrt bench-counts
if [ -d ../packages/@n8n/workflow-lang/corpus ]; then ./zig-out/bin/wfrt corpus ../packages/@n8n/workflow-lang/corpus; fi
# Compiled library code (src/core/aot.zig): a warning, not a failure, when a
# node source changed after the last `wfrt aot-gen` (docs/aot-design.md).
if command -v node > /dev/null && [ -d ../packages/@n8n/workflow-lang/node_modules ]; then
  AOT=$(mktemp -d)
  if (cd ../packages/@n8n/workflow-lang && node scripts/aot-modules.ts "$AOT" > /dev/null) && ./zig-out/bin/wfrt aot-check "$AOT"/*.wfm > "$AOT/check.txt"; then
    tail -1 "$AOT/check.txt"
  else
    cat "$AOT/check.txt" >&2 || true
    echo "warning: some library code has no compiled form; run wfrt aot-gen (docs/aot-design.md)" >&2
  fi
  rm -rf "$AOT"
fi

# Fuzz targets: every one, a fixed number of runs each (bench/fuzz-ci.sh;
# bench/fuzz-long.sh runs them for minutes). One `zig build fuzz` fuzzes
# only one test of each binary and exits 0 when the fuzzer panics, so the
# script runs each target alone and checks its log.
RUNS="${FUZZ_RUNS:-3K}" PAR="${FUZZ_PAR:-8}" bench/fuzz-ci.sh

# Leaks: a Debug `serve` loads a workflow, answers a webhook, takes
# credentials, then stops on SIGTERM. The process allocator reports any
# leak at exit.
zig build --prefix zig-out/debug
LEAK=$(mktemp -d)
WFRT_CI_SECRET=ci-leak-check-secret-0123 && export WFRT_CI_SECRET
./zig-out/debug/bin/wfrt asm w2 "$LEAK/w2.wfm"
# Two free ports (webhooks, admin), unless LEAK_PORT names them: fixed
# ports collide when two runs share the machine.
LP=${LEAK_PORT:-$(bench/lib/free-ports.sh 38000)} && LA=$((LP + 1))
# Both ports must be free: a serve left from an earlier run would answer the
# checks below in place of this one, which then fails to bind.
if curl -s -o /dev/null --max-time 1 127.0.0.1:$LA/ || curl -s -o /dev/null --max-time 1 127.0.0.1:$LP/; then
  echo "leak check: port $LP or $LA is in use (a serve from an earlier run?); stop it or set LEAK_PORT" >&2; exit 1
fi
./zig-out/debug/bin/wfrt serve --profile embedded --port "$LP" --admin-port "$LA" --admin-secret-env WFRT_CI_SECRET \
  --log-dir "$LEAK" --module "$LEAK/w2.wfm" --route "POST /w2" > "$LEAK/out.txt" 2>&1 &
SERVE=$!
# A failed step must not leave `serve` running: it would hold the ports
# and fail the next run at bind.
trap 'kill "$SERVE" 2> /dev/null || true' EXIT
# A Debug build on a loaded machine can take seconds to start.
READY=0
for _ in $(seq 1 300); do
  if ! kill -0 "$SERVE" 2> /dev/null; then echo "leak check: serve stopped at start" >&2; cat "$LEAK/out.txt" >&2; exit 1; fi
  curl -s -o /dev/null 127.0.0.1:$LA/_admin/workflows && READY=1 && break
  sleep 0.1
done
if [ "$READY" != 1 ]; then echo "leak check: serve was not ready after 30 s" >&2; cat "$LEAK/out.txt" >&2; exit 1; fi
H="authorization: Bearer $WFRT_CI_SECRET"
# Each step says which one failed. `Expect:` is off: the admin port does
# not answer 100-continue (README), and curl would wait on it.
step() { "$@" > /dev/null || { echo "leak check: curl failed ($?): $*" >&2; cat "$LEAK/out.txt" >&2; exit 1; }; }
step curl -s -H 'Expect:' -XPUT -H "$H" 127.0.0.1:$LA/_admin/workflows/ci -d "{\"versionId\":\"1\",\"module\":\"$(base64 < "$LEAK/w2.wfm" | tr -d '\n')\",\"active\":false}"
step curl -s -XPOST 127.0.0.1:$LP/w2 -d '{"id":1}'
step curl -s -H 'Expect:' -XPUT -H "$H" 127.0.0.1:$LA/_admin/credentials -d '{"a":{"type":"t","data":{"x":1}}}'
kill -TERM "$SERVE"
if ! wait "$SERVE"; then
  echo "leak check: serve exited with an error after SIGTERM:" >&2; cat "$LEAK/out.txt" >&2; exit 1
fi
trap - EXIT
if grep -q "leaked" "$LEAK/out.txt" || ! grep -q "wfrt stopping" "$LEAK/out.txt"; then
  echo "serve shutdown leak check failed:" >&2; cat "$LEAK/out.txt" >&2; exit 1
fi
rm -rf "$LEAK"
echo "serve shutdown: no leaks"

# Growth: after startup a shard's memory must not grow, whatever the load.
bench/growth-test.sh ./zig-out/debug/bin/wfrt

# Rules. ripgrep when it is there, else grep.
search() {
  if command -v rg > /dev/null; then rg -n "$1" "$2" ${3:+--glob "!$3"}; else grep -rnE "$1" "$2" ${3:+--exclude="$(basename "$3")"}; fi
}
if search 'page_allocator|c_allocator|smp_allocator' src src/main.zig; then
  echo "global allocator outside main" >&2; exit 1
fi
if search 'std\.Io|std\.Thread|std\.c\.|std\.posix|std\.time|std\.fs|std\.process|crypto\.random|extern fn|@cImport' src/core; then
  echo "I/O, clock, threads, randomness or C in the core" >&2; exit 1
fi
# C stays in the shell: the core never calls it, main goes through sys.zig.
if search 'std\.c\.|extern fn|@cImport' src/main.zig; then
  echo "C library calls in main.zig: use src/shell/sys.zig" >&2; exit 1
fi
# After startup a shard allocates nothing: no allocator calls on its
# per-request paths. growth-test.sh checks the running server; this
# catches the common patterns before it runs.
if search 'r\.gpa\.(alloc|create|dupe|realloc)|toOwnedSlice\(r\.gpa|sh\.gpa\.(alloc|dupe|create)' src/shell/server.zig; then
  echo "allocation from the shard allocator in server.zig: use a pool reserved at startup" >&2; exit 1
fi
