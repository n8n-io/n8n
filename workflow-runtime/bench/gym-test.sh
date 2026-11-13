#!/usr/bin/env bash
# Integration test of --gym-env and --ca-file against the real ai-gym
# (../ai-gym, or GYM_SRC). It builds the gym, makes its CA, starts it with
# the github service only, and checks that wfrt reaches a vendor host over
# TLS with the vendor name for SNI and the certificate check, that a name
# the gym's resolver refuses fails, and that loopback on a mapped port is
# redirected. Without the gym source or Go it prints "skipped".
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=$PWD/zig-out/bin/wfrt
LANG_DIR=$PWD/../packages/@n8n/workflow-lang
GYM_SRC=${GYM_SRC:-$PWD/../../ai-gym}
if [ ! -d "$GYM_SRC/services/gym" ] || ! command -v go > /dev/null; then echo "gym test skipped (no $GYM_SRC or no go)"; exit 0; fi
TMP=$(mktemp -d)
BASE=${BASE_PORT:-28540}
HTTPS=$BASE DNS=$((BASE + 1)) ADMIN=$((BASE + 2)) PORT=$((BASE + 3))
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do { kill "$p"; wait "$p"; } 2>/dev/null || true; done; rm -rf "$TMP"; }
trap cleanup EXIT

zig build -Drelease=true
(cd "$GYM_SRC/services/gym" && go build -o "$TMP/gym" ./cmd/gym)
"$TMP/gym" ca -dir "$TMP/ca" > /dev/null
SIM_HARNESS_TOKEN=harness "$TMP/gym" -only github -data-dir="$TMP/data" -dns-listen="127.0.0.1:$DNS" \
  -dns-answer=10.255.0.53 -bind-https="127.0.0.1:$HTTPS" -admin="127.0.0.1:$ADMIN" -ca-dir="$TMP/ca" \
  -egress-allow=127.0.0.1 > "$TMP/gym.log" 2>&1 & PIDS+=($!)
for _ in $(seq 1 100); do curl -sf "http://127.0.0.1:$ADMIN/readyz" > /dev/null && break; sleep 0.1; done
node "$LANG_DIR/src/cli.ts" compile bench/gym/workflow.ts -o "$TMP/wf" > /dev/null

GYM_ADDR=10.255.0.53 GYM_HOSTS='api.github.com,*.githubusercontent.com' GYM_DNS="127.0.0.1:$DNS" \
  GYM_PORT_MAP="443=$HTTPS" "$WFRT" serve --profile embedded --gym-env --ca-file "$TMP/ca/ca.pem" \
  --port "$PORT" --module "$TMP/wf/workflow.wfm" > "$TMP/wfrt.log" 2>&1 & PIDS+=($!)
sleep 1
call() { curl -s -m 15 -XPOST "127.0.0.1:$PORT/gym" -H 'content-type: application/json' -d "{\"url\":\"$1\"}"; }
check() { if [[ $2 != *"$3"* ]]; then echo "FAIL $1: $2" >&2; cat "$TMP/wfrt.log" >&2; exit 1; fi; echo "ok   $1"; }
check "vendor host over TLS" "$(call https://api.github.com/users/octocat)" '"status":401'
check "wildcard pattern" "$(call https://raw.githubusercontent.com/o/r/main/x)" '"status":'
check "refused name" "$(call https://example.invalid/)" 'DNS server refused'
check "loopback on a mapped port" "$(call http://127.0.0.1:443/)" 'HTTP request to an HTTPS server'
echo "gym test passed"
