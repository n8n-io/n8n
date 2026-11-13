#!/usr/bin/env bash
# Integration test of the admin API and the event stream (spec 9). It starts
# wfrt with --admin-port, loads two versions of a workflow, runs a manual
# execution with trace, reads the events, calls an active webhook, resumes an
# approval, checks per-workflow credentials for HTTP and the fallback host,
# unloads a workflow, then restarts wfrt and checks that the
# workflow set comes back from the log. Needs Node.js.
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=$PWD/zig-out/bin/wfrt
LANG_DIR=$PWD/../packages/@n8n/workflow-lang
TMP=$(mktemp -d)
BASE=${BASE_PORT:-28460}
PORT=$BASE ADMIN=$((BASE + 1)) ECHO=$((BASE + 2))
PID="" FAKE=""
cleanup() {
  local code=$?
  if [ -n "$PID" ]; then { kill "$PID"; wait "$PID"; } 2>/dev/null || true; fi
  if [ -n "$FAKE" ]; then { kill "$FAKE"; wait "$FAKE"; } 2>/dev/null || true; fi
  if [ "$code" != 0 ] && [ -f "$TMP/serve.txt" ]; then echo "--- wfrt output" >&2; cat "$TMP/serve.txt" >&2; fi
  rm -rf "$TMP"
}
trap cleanup EXIT

zig build -Drelease=true
for f in orders-v1 orders-v2 approve creds binary upload hooks sendwait bigupload; do
  node "$LANG_DIR/src/cli.ts" compile "bench/admin/$f.ts" -o "$TMP/$f" > /dev/null
done

# A test value only; it is not a real secret.
export WFRT_TEST_ADMIN_SECRET=admin-test-secret-0123456789
start() {
  "$WFRT" serve --port "$PORT" --admin-port "$ADMIN" --admin-secret-env WFRT_TEST_ADMIN_SECRET \
    --log-dir "$TMP/log" --fallback "$TMP/fb.sock" --profile embedded >> "$TMP/serve.txt" 2>&1 &
  PID=$!
  for _ in $(seq 1 50); do
    if node -e "fetch('http://127.0.0.1:$ADMIN/_admin/workflows').then(()=>process.exit(0),()=>process.exit(1))"; then return; fi
    sleep 0.1
  done
  echo "wfrt did not start" >&2; cat "$TMP/serve.txt" >&2; exit 1
}

mkdir -p "$TMP/log"
# A stand-in fallback host and an HTTP echo server for the credential checks.
node bench/admin/fake.mjs "$TMP/fb.sock" "$ECHO" & FAKE=$!
for _ in $(seq 1 50); do [ -S "$TMP/fb.sock" ] && break; sleep 0.1; done
start
node bench/admin/check.mjs before "$TMP" "$PORT" "$ADMIN" "$ECHO"
{ kill "$PID"; wait "$PID"; } 2>/dev/null || true
start
node bench/admin/check.mjs after "$TMP" "$PORT" "$ADMIN" "$ECHO"
echo "admin test passed"
