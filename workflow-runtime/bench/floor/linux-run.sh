#!/usr/bin/env bash
# Runs the floor benchmarks on Linux with the measured thread on one core
# and the peer threads (clients, IPC host side) on others.
#   CORE=7 PEERS=15 REPS=3 bench/floor/linux-run.sh <wl-dir> <out-file>
# <wl-dir> holds the compiled workloads of workflows.mjs (bytecode is the
# same on every platform, so it can come from another machine).
set -euo pipefail
cd "$(dirname "$0")"
WL=${1:?workload dir}
OUT=${2:?out file}
CORE=${CORE:-7}
PEERS=${PEERS:-15}
REPS=${REPS:-3}
F=./zig-out/bin/floor
export FLOOR_SERVER_CPUS=$CORE FLOOR_CLIENT_CPUS=$PEERS
ALL="$CORE,$PEERS"
run() { taskset -c "$ALL" nice -n 5 "$F" "$@" | tee -a "$OUT"; }
one() { taskset -c "$CORE" nice -n 5 "$F" "$@" | tee -a "$OUT"; }
CERT=$(mktemp -d /tmp/wfrt-floor-cert.XXXX)
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 2 -subj /CN=127.0.0.1 \
  -keyout "$CERT/key.pem" -out "$CERT/cert.pem" 2> /dev/null

uname -r | sed 's/^/kernel /' | tee -a "$OUT"
for _ in $(seq 1 "$REPS"); do one freq; done
one syscalls --iters 1000000
for rep in $(seq 1 "$REPS"); do
  for m in raw http uring uring_ms; do
    for c in 1 64 512; do
      cl=$([ "$c" = 1 ] && echo 1 || echo 2)
      run net --mode "$m" --conns "$c" --clients "$cl" --secs 3
    done
  done
  # Both ends on one thread: the TCP stack alone, no wakeups.
  for c in 1 64 512; do one net --inline --conns "$c" --secs 2; done
  for r in 200 760 4400; do one net --inline --conns 64 --req 350 --resp "$r" --secs 2; done
  one churn --n 2000
  for r in 200 760 4400; do
    run net --mode http --conns 64 --req 350 --resp "$r" --secs 3
    run net --mode tls --conns 64 --req 350 --resp "$r" --secs 3 --cert "$CERT/cert.pem" --key "$CERT/key.pem"
  done
  run net --mode tls --conns 64 --req 350 --resp 760 --secs 3 --cert "$CERT/cert.pem" --key "$CERT/key.pem" --no-read-ahead
  for b in 1 16 64; do run ipc --frame 1024 --batch "$b" --rounds $((100000 / b)); done
  for w in w1 w2 w3; do one core "$w" --secs 3; done
  for m in glue-k1-n0 glue-k1-n40 glue-k2-n40 http-n0 http-n8 slack-n8; do
    one core module --wfm "$WL/$m/$m.wfm" --trigger "$WL/trigger.json" --resp "$WL/ok-resp.json" --secs 3
  done
  one core module --wfm "$WL/sheets-n4/sheets-n4.wfm" --trigger "$WL/trigger.json" --resp "$WL/sheets-resp.json" --secs 3
  for f in data/*.json; do one core json --file "$f"; done
  one native
done
run net --mode raw --conns 64 --idle 10000 --secs 3
run net --mode raw --conns 64 --idle 50000 --secs 3 || true
for n in 1000 10000 50000; do one timers --n "$n" --ops 1000000; done
LOG=$(mktemp -d /tmp/wfrt-floor-log.XXXX)
for t in none batched sync; do for b in 1 64 512; do one log --path "$LOG/log.bin" --tier "$t" --rec 1072 --batch "$b" --batches 500; done; done
rm -rf "$LOG" "$CERT"
