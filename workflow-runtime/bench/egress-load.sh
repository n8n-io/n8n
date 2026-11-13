#!/usr/bin/env bash
# W3 at vendor latency: a webhook calls the stub, which answers after
# DELAY ms. INFLIGHT requests are kept in flight by the load generator
# (CONNS connections with PIPELINE requests each), so by Little's law the
# executions in flight are about INFLIGHT and the rate is at most
# INFLIGHT / DELAY. One CSV line per run: the rate, the latency, the
# server's CPU time per request (user + system, /usr/bin/time -l), its peak
# RSS, and its outbound connections at the end.
#   bench/egress-load.sh                                   # default matrix
#   MODE=h2c DELAYS=300 INFLIGHT_LIST="1000 10000 30000" bench/egress-load.sh
# MODE: h1 (plain HTTP/1.1), h2c (HTTP/2 without TLS, prior knowledge),
# h1tls (HTTP/1.1 over TLS), h2tls (HTTP/2 over TLS, ALPN).
# OLD=1 runs a binary without the egress flags (WFRT=old binary): it gets
# only its defaults. EXTRA holds more `serve` flags. LOAD picks the load
# generator binary (default: WFRT). Processes stop by PID, so other wfrt
# processes on the machine are not touched. macOS cannot pin a process to a
# core: compare CPU time, not rate. Loopback has about 16,000 ephemeral
# ports: HTTP/1.1 needs one outbound socket per request in flight, and
# sockets in TIME_WAIT from a run hold ports for 30 s (WAIT_TW waits).
set -euo pipefail
cd "$(dirname "$0")/.."
WFRT=${WFRT:-./zig-out/bin/wfrt}
LOAD=${LOAD:-$WFRT}
OUT=${OUT:-$(mktemp -d /tmp/wfrt-egress-load-XXXX)}
SECS=${SECS:-8}
DELAYS=${DELAYS:-"100 300"}
INFLIGHT_LIST=${INFLIGHT_LIST:-"1000 10000"}
PIPELINE=${PIPELINE:-32}
PORT=${PORT:-18391}
STUB_PORT=${STUB_PORT:-19391}
THREADS=${THREADS:-4}
MODE=${MODE:-h1}
OLD=${OLD:-0}
EXTRA=${EXTRA:-}
WAIT_TW=${WAIT_TW:-1}
mkdir -p "$OUT"

SCHEME=http
STUB_ARGS=()
case "$MODE" in
  h1) ;;
  h2c) STUB_ARGS=(--h2) ;;
  h1tls | h2tls)
    SCHEME=https
    OPENSSL=openssl
    [ -x /opt/homebrew/opt/openssl@3/bin/openssl ] && OPENSSL=/opt/homebrew/opt/openssl@3/bin/openssl
    "$OPENSSL" req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 1 -subj /CN=127.0.0.1 \
      -addext "subjectAltName=IP:127.0.0.1" -keyout "$OUT/key.pem" -out "$OUT/cert.pem" 2> /dev/null
    STUB_ARGS=(--tls-cert "$OUT/cert.pem" --tls-key "$OUT/key.pem")
    [ "$MODE" = h2tls ] && STUB_ARGS+=(--h2)
    EXTRA="$EXTRA --insecure-tls"
    if [ "$MODE" = h1tls ] && [ "$OLD" = 0 ]; then EXTRA="$EXTRA --egress-h2 off"; fi
    ;;
  *) echo "unknown MODE $MODE" >&2; exit 2 ;;
esac

# The workflow: one GET to the stub, then the reply.
mkdir -p bench/egress-load/.run
sed "s#http://127.0.0.1:19391#$SCHEME://127.0.0.1:$STUB_PORT#" bench/egress-load/w3.ts > bench/egress-load/.run/w3.ts
node ../packages/@n8n/workflow-lang/src/cli.ts compile bench/egress-load/.run/w3.ts -o "$OUT" > /dev/null
rm -rf bench/egress-load/.run

PIDS=()
stop_all() { for p in ${PIDS[@]+"${PIDS[@]}"}; do kill "$p" 2> /dev/null || true; done; }
trap stop_all EXIT

wait_time_wait() {
  [ "$WAIT_TW" = 1 ] || return 0
  for _ in $(seq 1 45); do
    [ "$(netstat -an -p tcp | grep -c TIME_WAIT)" -lt 2000 ] && return 0
    sleep 1
  done
}

echo "mode,delay_ms,inflight,ok,errors,rate_per_s,p50_us,p99_us,cpu_us_per_req,max_rss_mb,egress_conns"
for delay in $DELAYS; do
  "$WFRT" stub --port "$STUB_PORT" --delay-ms "$delay" ${STUB_ARGS[@]+"${STUB_ARGS[@]}"} > "$OUT/stub-$delay.txt" 2>&1 &
  stub=$!
  PIDS+=("$stub")
  sleep 0.5
  for inflight in $INFLIGHT_LIST; do
    wait_time_wait
    tag="$MODE-$delay-$inflight"
    conns=$(((inflight + PIPELINE - 1) / PIPELINE))
    SIZE=""
    if [ "$OLD" = 0 ]; then
      econns=$((inflight + 256))
      if [ "$MODE" = h2c ] || [ "$MODE" = h2tls ]; then econns=256; fi
      SIZE="--slots $((inflight * 5 / 4 + 256)) --max-conns $((conns + 256)) --egress-max-requests $((inflight * 3 / 2 + 256)) --egress-max-conns $econns"
      [ "$MODE" = h2c ] && SIZE="$SIZE --egress-origin 127.0.0.1:$STUB_PORT,h2=prior"
    fi
    # shellcheck disable=SC2086
    /usr/bin/time -l "$WFRT" serve --port "$PORT" --shards 1 --module "$OUT/w3.wfm" --route "POST /w3" $SIZE $EXTRA \
      > "$OUT/serve-$tag.txt" 2> "$OUT/time-$tag.txt" &
    tp=$!
    PIDS+=("$tp")
    for _ in $(seq 1 100); do grep -q "wfrt serving" "$OUT/time-$tag.txt" 2> /dev/null && break; sleep 0.1; done
    sp=$(pgrep -P "$tp" | head -1 || true)
    "$LOAD" load --port "$PORT" --conns "$conns" --pipeline "$PIPELINE" --threads "$THREADS" --seconds "$SECS" --path /w3 --body 64 \
      > "$OUT/load-$tag.txt" 2>&1 || true
    econn=$(lsof -nP -a -p "${sp:-0}" -iTCP:"$STUB_PORT" 2> /dev/null | grep -c ESTABLISHED || true)
    if [ -n "$sp" ]; then kill "$sp" 2> /dev/null || true; fi
    wait "$tp" 2> /dev/null || true
    line=$(grep "requests ok" "$OUT/load-$tag.txt" || echo "requests ok=0 errors=0 rate=0/s p50=0us p99=0us")
    ok=$(sed -n 's/.*ok=\([0-9]*\).*/\1/p' <<< "$line")
    errs=$(sed -n 's/.*errors=\([0-9]*\).*/\1/p' <<< "$line")
    rate=$(sed -n 's/.*rate=\([0-9]*\).*/\1/p' <<< "$line")
    p50=$(sed -n 's/.*p50=\([0-9]*\)us.*/\1/p' <<< "$line")
    p99=$(sed -n 's/.*p99=\([0-9]*\)us.*/\1/p' <<< "$line")
    awk -v m="$MODE" -v ok="$ok" -v d="$delay" -v c="$inflight" -v e="$errs" -v r="$rate" -v p50="$p50" -v p99="$p99" -v ec="$econn" '
      /real/ { user = $3; sys = $5 }
      /maximum resident set size/ { rss = $1 }
      END { printf "%s,%s,%s,%d,%s,%s,%s,%s,%.2f,%.0f,%s\n", m, d, c, ok, e, r, p50, p99, (ok > 0 ? (user + sys) * 1e6 / ok : 0), rss / 1048576, ec }' "$OUT/time-$tag.txt"
  done
  kill "$stub" 2> /dev/null || true
  wait "$stub" 2> /dev/null || true
done
