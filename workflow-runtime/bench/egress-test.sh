#!/usr/bin/env bash
# Integration test for outbound HTTP: TLS, DNS, chunked and large bodies,
# redirects, headers, credentials and certificate checks. It starts a local
# Node.js upstream with a self-signed certificate and two wfrt instances:
# one with --insecure-tls and credentials, one that checks certificates.
# The checks run twice: with an HTTP/1.1 upstream (ALPN falls back) and
# with an HTTP/2 upstream (ALPN h2).
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=$PWD/zig-out/bin/wfrt
LANG_DIR=$PWD/../packages/@n8n/workflow-lang
TMP=$(mktemp -d)
BASE=${BASE_PORT:-28440}
HTTPS=$BASE HTTP=$((BASE + 1)) RAW=$((BASE + 2)) A=$((BASE + 3)) B=$((BASE + 4))
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; rm -rf "$TMP"; }
trap cleanup EXIT

zig build -Drelease=true

OPENSSL=openssl
[ -x /opt/homebrew/opt/openssl@3/bin/openssl ] && OPENSSL=/opt/homebrew/opt/openssl@3/bin/openssl
"$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
  -keyout "$TMP/key.pem" -out "$TMP/cert.pem" 2>/dev/null

node "$LANG_DIR/src/cli.ts" compile bench/egress/workflow.ts -o "$TMP/wf" > /dev/null

# Test values only; nothing here is a real secret.
cat > "$TMP/creds.json" <<'EOF'
{ "api": { "type": "httpHeaderAuth", "data": { "token": "s3cret", "key": "k1" },
  "inject": { "headers": { "authorization": "Bearer {{$credentials.token}}" },
              "qs": { "api_key": "{{$credentials.key}}" } } } }
EOF

for proto in h1 h2; do
  echo "== upstream $proto"
  STARTED=()
  H2=$([ "$proto" = h2 ] && echo 1 || echo 0) node bench/egress/server.mjs "$TMP" "$HTTPS" "$HTTP" "$RAW" > "$TMP/upstream.txt" 2>&1 & STARTED+=($!)
  rm -rf "$TMP/log-a" "$TMP/log-b"; mkdir -p "$TMP/log-a" "$TMP/log-b"
  "$WFRT" serve --port "$A" --log-dir "$TMP/log-a" --module "$TMP/wf/workflow.wfm" --route "POST /egress" \
    --credentials "$TMP/creds.json" --insecure-tls > "$TMP/serve-a.txt" 2>&1 & STARTED+=($!)
  "$WFRT" serve --port "$B" --log-dir "$TMP/log-b" --module "$TMP/wf/workflow.wfm" --route "POST /egress" \
    > "$TMP/serve-b.txt" 2>&1 & STARTED+=($!)
  PIDS+=("${STARTED[@]}")
  sleep 3
  if ! UPSTREAM=$proto node bench/egress/check.mjs "$A" "$B" "$HTTPS" "$HTTP" "$RAW"; then
    echo "--- serve-a"; tail -20 "$TMP/serve-a.txt"; echo "--- serve-b"; tail -20 "$TMP/serve-b.txt"
    echo "--- upstream"; tail -20 "$TMP/upstream.txt"
    exit 1
  fi
  for p in "${STARTED[@]}"; do kill "$p" 2>/dev/null || true; done
  for p in "${STARTED[@]}"; do wait "$p" 2>/dev/null || true; done
done
# HTTP/2 behaviours (GOAWAY, RST_STREAM, PING, trailers, CONTINUATION,
# windows, a stream limit of 4) against Node's http2 session API, then Go's
# net/http when Go is installed.
H2UP=$((BASE + 5)) GOUP=$((BASE + 6)) H2SERVE=$((BASE + 7))
node bench/egress/h2server.mjs "$TMP" "$H2UP" > "$TMP/h2up.txt" 2>&1 & PIDS+=($!)
if command -v go > /dev/null; then
  (cd bench/egress/goserver && go build -o "$TMP/goserver" .)
  "$TMP/goserver" "$TMP/cert.pem" "$TMP/key.pem" "$GOUP" > "$TMP/goup.txt" 2>&1 & PIDS+=($!)
fi
mkdir -p "$TMP/log-h2"
"$WFRT" serve --port "$H2SERVE" --log-dir "$TMP/log-h2" --module "$TMP/wf/workflow.wfm" --route "POST /egress" \
  --insecure-tls > "$TMP/serve-h2.txt" 2>&1 & PIDS+=($!)
sleep 2
node bench/egress/h2check.mjs "$H2SERVE" "$H2UP" || { tail -20 "$TMP/serve-h2.txt" "$TMP/h2up.txt"; exit 1; }
if command -v go > /dev/null; then
  node bench/egress/h2check.mjs "$H2SERVE" "$GOUP" go || { tail -20 "$TMP/serve-h2.txt" "$TMP/goup.txt"; exit 1; }
  # Regression: responses in several TLS records and reads (headers, then
  # the body after a pause; many records in one segment) all complete, over
  # HTTP/2 and over HTTP/1.1 (a second serve with h2 off).
  node bench/egress/hangcheck.mjs "$H2SERVE" "$GOUP" || { tail -20 "$TMP/serve-h2.txt"; exit 1; }
  H1SERVE=$((BASE + 8))
  mkdir -p "$TMP/log-h1"
  "$WFRT" serve --port "$H1SERVE" --log-dir "$TMP/log-h1" --module "$TMP/wf/workflow.wfm" --route "POST /egress" \
    --insecure-tls --egress-h2 off > "$TMP/serve-h1.txt" 2>&1 & PIDS+=($!)
  sleep 1
  node bench/egress/hangcheck.mjs "$H1SERVE" "$GOUP" || { tail -20 "$TMP/serve-h1.txt"; exit 1; }
else
  echo "skip Go interop (no go)"
fi

# The secret must not reach the logs of the process.
if grep -q s3cret "$TMP/serve-a.txt"; then echo "a credential value reached the serve output" >&2; exit 1; fi
