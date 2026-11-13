#!/usr/bin/env bash
# CPU per execution of each workload, from process CPU time (ps), not from
# the request rate: macOS cannot pin a process to a core, and the machine is
# shared. One shard (`serve --shards 1`), one fallback host, the local stubs
# at 0 ms. The stubs and the load generator are left out of the counts.
#   bench/mix/measure.sh [reps] [seconds] > results.csv
# Output: CSV `workload,rep,ok,wfrt_cpu_s,host_cpu_s,load1` on stdout.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPS=${1:-5}
SECS=${2:-10}
CONNS=${CONNS:-32}
BASE=${BASE_PORT:-28800}
STUB=$BASE TLS=$((BASE + 1)) PORT=$((BASE + 2))
WORK=${WORK:-$(mktemp -d)}
WFRT=$PWD/zig-out/bin/wfrt
HOST=$PWD/../packages/@n8n/workflow-fallback-host/dist/main.js
# A Unix socket path has at most 104 bytes on macOS: keep it short.
SOCK=${SOCK:-/tmp/wfrt-mix-$$.sock}
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2> /dev/null || true; done; rm -f "$SOCK"; }
trap cleanup EXIT

zig build -Drelease=true
node bench/mix/workloads.mjs "$WORK/wl" "$STUB" > /dev/null
"$WFRT" asm w2 "$WORK/w2-none.wfm" none
"$WFRT" asm w2 "$WORK/w2-batched.wfm" batched
"$WFRT" asm w2 "$WORK/w2-sync.wfm" sync

OPENSSL=openssl
[ -x /opt/homebrew/opt/openssl@3/bin/openssl ] && OPENSSL=/opt/homebrew/opt/openssl@3/bin/openssl
"$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=localhost \
  -keyout "$WORK/key.pem" -out "$WORK/cert.pem" 2> /dev/null
"$WFRT" stub --port "$STUB" > /dev/null 2>&1 & PIDS+=($!)
"$WFRT" stub --port "$TLS" --tls-cert "$WORK/cert.pem" --tls-key "$WORK/key.pem" > /dev/null 2>&1 & PIDS+=($!)

# Test values only; nothing here is a real secret.
cat > "$WORK/creds.json" << 'EOF'
{ "slack": { "type": "slackApi", "data": { "accessToken": "xoxb-bench" },
  "inject": { "headers": { "authorization": "Bearer {{$credentials.accessToken}}" } } } }
EOF
rm -f "$SOCK"
node "$HOST" --socket "$SOCK" --workers 1 > "$WORK/host.txt" 2>&1 & HOSTPID=$!
PIDS+=($HOSTPID)
for _ in $(seq 1 100); do [ -S "$SOCK" ] && break; sleep 0.1; done
kill -0 "$HOSTPID" 2> /dev/null && [ -S "$SOCK" ] || { echo "the fallback host did not start:" >&2; cat "$WORK/host.txt" >&2; exit 1; }

# CPU seconds of a process and its children, from `ps` (M:SS.ss or H:MM:SS.ss).
cpu_tree() {
  local pids
  pids=$( { echo "$1"; pgrep -P "$1" || true; } | paste -sd, -)
  { ps -o cputime= -p "$pids" 2> /dev/null || true; } | awk -F: '{ s = 0; for (i = 1; i <= NF; i++) s = s * 60 + $i; t += s } END { printf "%.2f", t }'
}

run_workload() {
  local name=$1 module=$2 route=$3
  rm -rf "$WORK/log" "$WORK/serve-$name.txt" && mkdir -p "$WORK/log"
  # `env` execs wfrt, so `$!` is wfrt itself, not a subshell.
  env GYM_ADDR=10.255.0.9 GYM_HOSTS=api.example.com,slack.com GYM_PORT_MAP="443=$TLS" \
    "$WFRT" serve --shards 1 --port "$PORT" --log-dir "$WORK/log" --module "$module" ${route:+--route "$route"} \
    --fallback "$SOCK" --credentials "$WORK/creds.json" --gym-env --insecure-tls > "$WORK/serve-$name.txt" 2>&1 &
  local wpid=$!
  for _ in $(seq 1 100); do grep -q "wfrt serving" "$WORK/serve-$name.txt" 2> /dev/null && break; sleep 0.1; done
  local path=/g
  [ -n "$route" ] && path=${route#POST }
  "$WFRT" load --port "$PORT" --conns "$CONNS" --seconds 3 --path "$path" --body 256 --threads 2 > /dev/null
  for rep in $(seq 1 "$REPS"); do
    local w0 h0 w1 h1 ok load1
    w0=$(cpu_tree "$wpid"); h0=$(cpu_tree "$HOSTPID")
    ok=$("$WFRT" load --port "$PORT" --conns "$CONNS" --seconds "$SECS" --path "$path" --body 256 --threads 2 | grep -o 'ok=[0-9]*' | cut -d= -f2)
    w1=$(cpu_tree "$wpid"); h1=$(cpu_tree "$HOSTPID")
    load1=$(sysctl -n vm.loadavg | awk '{print $2}')
    echo "$name,$rep,$ok,$(echo "$w1 - $w0" | bc),$(echo "$h1 - $h0" | bc),$load1"
  done
  kill "$wpid"; wait "$wpid" 2> /dev/null || true
  # The port must be free for the next workload.
  for _ in $(seq 1 50); do kill -0 "$wpid" 2> /dev/null || break; sleep 0.1; done
}

echo "workload,rep,ok,wfrt_cpu_s,host_cpu_s,load1"
# ONLY="glue-k1-n0 w2-sync" runs some workloads.
ALL="w2-none w2-batched w2-sync glue-k1-n0 glue-k1-n40 glue-k2-n0 glue-k2-n40 http-n0 http-n8 https-n8 slack-n8 code-n8 v1set-n8 v1setx-n8"
for w in ${ONLY:-$ALL}; do
  case $w in
    w2-*) run_workload "$w" "$WORK/$w.wfm" "POST /w2" ;;
    *) run_workload "$w" "$WORK/wl/$w/$w.wfm" "" ;;
  esac
done
