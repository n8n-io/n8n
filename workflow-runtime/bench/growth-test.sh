#!/usr/bin/env bash
# The memory of a shard must not grow after startup (docs/zig-standards.md).
# A `serve` takes webhook requests, executions that wait and are evicted,
# schedule fires in a time zone, admin calls of every kind and an event
# stream client. When it stops it prints, for each shard, the allocations
# after startup and the arena capacity; both must not change.
# Usage: bench/growth-test.sh [wfrt binary] (default: the Debug build).
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=${1:-./zig-out/debug/bin/wfrt}
DIR=$(mktemp -d)
SERVE=
HOST=
cleanup() { [ -n "$SERVE" ] && kill "$SERVE" 2>/dev/null || true; if [ -n "$HOST" ]; then kill "$HOST" 2>/dev/null || true; wait "$HOST" 2>/dev/null || true; fi; rm -rf "$DIR"; }
trap cleanup EXIT
# Free ports, unless GROWTH_PORT names them: fixed ports collide when two
# runs share the machine (a cause of "the host got no frame").
PORT=${GROWTH_PORT:-$(bench/lib/free-ports.sh 30000)}
APORT=$((PORT + 1))
WFRT_GROWTH_SECRET=growth-check-secret-0123 && export WFRT_GROWTH_SECRET
"$WFRT" asm w2 "$DIR/w2.wfm"
"$WFRT" asm approval "$DIR/approval.wfm"
"$WFRT" asm every-second "$DIR/every.wfm"
"$WFRT" asm w4 "$DIR/w4.wfm"
# The fallback host path: a small host answers every frame.
# Each step waits for a readiness signal, not a fixed time: on a loaded
# machine, or on the first launch of a new binary (macOS checks it), a start
# can take seconds. A step that is not ready in 60 s fails the test.
wait_for() { # description, command...
  local what=$1; shift
  for _ in $(seq 1 600); do
    "$@" && return 0
    # A serve that stopped (a port in use, a crash) will never be ready.
    if [ -n "$SERVE" ] && ! kill -0 "$SERVE" 2> /dev/null; then
      echo "growth check: serve stopped while waiting for $what" >&2; cat "$DIR/out.txt" >&2; exit 1
    fi
    sleep 0.1
  done
  echo "growth check: $what was not ready after 60 s" >&2; cat "$DIR/out.txt" "$DIR/host.txt" >&2 2>/dev/null || true; exit 1
}
python3 bench/growth/host.py "$DIR/host.sock" > "$DIR/host.txt" 2>&1 &
HOST=$!
wait_for "the fallback host" grep -q "^host ready" "$DIR/host.txt"
"$WFRT" serve --profile embedded --port "$PORT" --admin-port "$APORT" --admin-secret-env WFRT_GROWTH_SECRET \
  --log-dir "$DIR" --module "$DIR/w2.wfm" --route "POST /w2" --module "$DIR/approval.wfm" --route "POST /ap" \
  --module "$DIR/every.wfm" --module "$DIR/w4.wfm" --route "POST /w4" --fallback "$DIR/host.sock" \
  --credentials bench/growth/creds.json > "$DIR/out.txt" 2>&1 &
SERVE=$!
wait_for "the admin port" curl -s -o /dev/null "127.0.0.1:$APORT/_admin/workflows"
# Steps of W4 need the host: wait until wfrt has its answer to the hello.
wait_for "the fallback host connection" grep -q "the fallback host speaks version" "$DIR/out.txt"
H="authorization: Bearer $WFRT_GROWTH_SECRET"
A="127.0.0.1:$APORT/_admin"
# An event stream client that reads for the whole run.
curl -s -N -H "$H" "$A/events" > "$DIR/events.txt" &
EV=$!
W2=$(base64 < "$DIR/w2.wfm" | tr -d '\n')
EVERY=$(base64 < "$DIR/every.wfm" | tr -d '\n')
for round in 1 2 3; do
  for i in $(seq 1 100); do echo "url = \"http://127.0.0.1:$PORT/w2\""; echo "data = \"{\\\"id\\\":$i}\""; echo 'output = "/dev/null"'; done > "$DIR/w2.cfg"
  curl -s -K "$DIR/w2.cfg" -o /dev/null
  for i in $(seq 1 20); do echo "url = \"http://127.0.0.1:$PORT/ap\""; echo "data = \"{\\\"cid\\\":$i}\""; echo 'output = "/dev/null"'; done > "$DIR/ap.cfg"
  curl -s -K "$DIR/ap.cfg" -o /dev/null --max-time 2 || true
  for i in $(seq 1 50); do echo "url = \"http://127.0.0.1:$PORT/w4\""; echo "data = \"{\\\"id\\\":$i}\""; echo 'output = "/dev/null"'; done > "$DIR/w4.cfg"
  curl -s -K "$DIR/w4.cfg" --max-time 5 || true
  for i in $(seq 1 5); do
    curl -s -XPUT -H "$H" "$A/workflows/wf$i" -o /dev/null \
      -d "{\"versionId\":\"$round\",\"module\":\"$W2\",\"active\":true,\"webhookPrefix\":\"/webhook/r$round\",\"credentials\":{\"c\":{\"type\":\"t\",\"data\":{\"k\":\"v$round\"}}}}"
  done
  curl -s -XPUT -H "$H" "$A/workflows/zone" -o /dev/null -d "{\"versionId\":\"$round\",\"module\":\"$EVERY\",\"active\":true}"
  curl -s -XPUT -H "$H" "$A/credentials" -o /dev/null -d "{\"g\":{\"type\":\"t\",\"data\":{\"round\":$round}}}"
  curl -s -XPUT -H "$H" "$A/variables" -o /dev/null -d "{\"round\":$round}"
  curl -s -H "$H" "$A/workflows" -o /dev/null
  for i in $(seq 1 5); do
    curl -s -XPOST -H "$H" "$A/executions" -o /dev/null -d "{\"workflowId\":\"wf1\",\"executionId\":\"$round$i\",\"trigger\":{\"n\":$i}}"
  done
  curl -s -XDELETE -H "$H" "$A/workflows/wf5" -o /dev/null
  curl -s -XPOST -H "$H" "$A/resume/wfrt-1/0" -o /dev/null -d '{}'
  sleep 1.2
done
kill "$EV" 2>/dev/null || true
wait "$EV" 2>/dev/null || true
kill -TERM "$SERVE"
wait "$SERVE" || true
SERVE=
LINE=$(grep "^shard 0 memory:" "$DIR/out.txt" || true)
echo "$LINE"
# The run did what it is for: approvals waited (and were evicted), and the
# schedule in Europe/Berlin fired.
grep -q "^frame code" "$DIR/host.txt" || { echo "growth check: the host got no frame" >&2; exit 1; }
grep -q '"resumeUrl"' "$DIR/events.txt" || { echo "growth check: no approval waited" >&2; exit 1; }
grep -q '"mode":"trigger","trigger":{"scheduledAt"' "$DIR/events.txt" || grep -q '"step":"Tick"' "$DIR/events.txt" || { echo "growth check: no schedule fired" >&2; exit 1; }
if ! echo "$LINE" | grep -qE "^shard 0 memory: 0 allocation\(s\), 0 bytes after startup; arena ([0-9]+) -> \1 bytes$"; then
  echo "growth check failed: shard memory grew after startup" >&2
  cat "$DIR/out.txt" >&2
  exit 1
fi
echo "shard memory: no growth after startup"
