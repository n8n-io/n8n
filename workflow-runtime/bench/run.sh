#!/usr/bin/env bash
# Run the HTTP workloads (W2, W3, W4, W7) and print one line per run with
# the rate, the server's CPU and the log bytes per execution. The load
# generator and the stub run on the same machine, on other cores.
# ONLY=w3 runs only W3; ONLY=w3tls runs W3 with a compiled module over http
# and over https (TLS stub). Processes stop by PID, so other wfrt processes
# on the machine are not touched.
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=./zig-out/bin/wfrt
OUT=${OUT:-/tmp/wfrt-bench}
SECS=${SECS:-5}
CONNS=${CONNS:-128}
mkdir -p "$OUT"
zig build -Drelease=true

for w in w2 w3 w4; do for d in none batched sync; do "$WFRT" asm "$w" "$OUT/$w-$d.wfm" "$d"; done; done

ONLY=${ONLY:-all}
PIDS=()
stop_all() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; sleep 0.5; }
trap stop_all EXIT
want() { [ "$ONLY" = all ] || [ "$ONLY" = "$1" ]; }

run() { # name module route extra-serve-args... ; uses BODY
  local name=$1 module=$2 route=$3; shift 3
  rm -rf "$OUT/log-$name"; mkdir -p "$OUT/log-$name"
  "$WFRT" serve --port 18080 --shards 1 --log-dir "$OUT/log-$name" --module "$module" --route "$route" "$@" > "$OUT/serve-$name.txt" 2>&1 &
  local sp=$!
  PIDS+=("$sp")
  sleep 1
  "$WFRT" load --port 18080 --conns "$CONNS" --threads 4 --seconds "$SECS" --path "${route#* }" --body "${BODY:-1024}" > "$OUT/load-$name.txt" 2>&1 &
  local lp=$!
  sleep $((SECS / 2))
  local cpu; cpu=$(ps -o %cpu= -p "$sp" | tr -d ' ')
  wait "$lp"
  local ok; ok=$(sed -n 's/.*ok=\([0-9]*\).*/\1/p' "$OUT/load-$name.txt")
  local bytes; bytes=$(cat "$OUT/log-$name"/*.log 2>/dev/null | wc -c | tr -d ' ')
  local per=$(( ok > 0 ? bytes / ok : 0 ))
  echo "$name | $(cat "$OUT/load-$name.txt") | server_cpu=${cpu}% | log_bytes_per_exec=$per"
  kill "$sp"; wait "$sp" 2>/dev/null || true
}

if want w2; then for d in none batched sync; do run "W2-$d" "$OUT/w2-$d.wfm" "POST /w2"; done; fi

if want w3; then
  for delay in 0 10 100; do
    "$WFRT" stub --port 19090 --delay-ms "$delay" > "$OUT/stub.txt" 2>&1 &
    stub=$!; PIDS+=("$stub")
    sleep 0.5
    CONNS=$(( delay == 100 ? 2048 : CONNS )) run "W3-none-${delay}ms" "$OUT/w3-none.wfm" "POST /w3"
    [ "$delay" = 0 ] && run "W3-sync-0ms" "$OUT/w3-sync.wfm" "POST /w3"
    kill "$stub"; wait "$stub" 2>/dev/null || true; sleep 0.3
  done
fi

# W3 over TLS: the same compiled workflow calls the stub over http and over
# https (self-signed certificate, so the server runs with --insecure-tls).
if want w3tls; then
  node ../packages/@n8n/workflow-lang/src/cli.ts compile bench/w3tls/w3-http.ts -o "$OUT" > /dev/null
  node ../packages/@n8n/workflow-lang/src/cli.ts compile bench/w3tls/w3-https.ts -o "$OUT" > /dev/null
  OPENSSL=openssl
  [ -x /opt/homebrew/opt/openssl@3/bin/openssl ] && OPENSSL=/opt/homebrew/opt/openssl@3/bin/openssl
  "$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=127.0.0.1 -addext "subjectAltName=IP:127.0.0.1" \
    -keyout "$OUT/stub-key.pem" -out "$OUT/stub-cert.pem" 2>/dev/null
  "$WFRT" stub --port 19090 > "$OUT/stub-http.txt" 2>&1 & PIDS+=($!)
  "$WFRT" stub --port 19443 --tls-cert "$OUT/stub-cert.pem" --tls-key "$OUT/stub-key.pem" > "$OUT/stub-https.txt" 2>&1 & PIDS+=($!)
  sleep 0.5
  run "W3c-http-0ms" "$OUT/w3-http.wfm" "POST /w3"
  run "W3c-https-0ms" "$OUT/w3-https.wfm" "POST /w3" --insecure-tls
fi

if want w4 && [ -f ../packages/@n8n/workflow-fallback-host/dist/main.js ]; then
  rm -f /tmp/wf-bench.sock
  node ../packages/@n8n/workflow-fallback-host/dist/main.js --socket /tmp/wf-bench.sock > "$OUT/fallback.txt" 2>&1 &
  fb=$!; PIDS+=("$fb")
  sleep 2
  run "W4-none" "$OUT/w4-none.wfm" "POST /w4" --fallback /tmp/wf-bench.sock
  kill "$fb" 2>/dev/null || true
fi

if want w7; then
  BODY=102400 CONNS=64 run "W7-none-100KB" "$OUT/w2-none.wfm" "POST /w2" --rbuf-kb 256
  BODY=102400 CONNS=64 run "W7-batched-100KB" "$OUT/w2-batched.wfm" "POST /w2" --rbuf-kb 256
fi
