#!/usr/bin/env bash
# Linux only. Memory and thread checks that macOS cannot run:
#   1. Valgrind memcheck on the unit tests (core and shell), a short sim and
#      the corpus, all Debug builds. Any memcheck error fails the script.
#   2. The thread sanitizer (-Dtsan=true) on the threaded parts: `serve`
#      with 4 shards under load, and the 4-thread glue benchmark.
#   3. -Dsanitize-c=true: full UBSan for C code that the modules compile.
#      wfrt compiles no C itself (OpenSSL and c-ares are system libraries),
#      so this build only checks that the option works.
# It runs everything with `nice` and keeps files in $OUT (/tmp/wfrt-san).
set -euo pipefail
cd "$(dirname "$0")/.."
[ "$(uname -s)" = Linux ] || { echo "Linux only"; exit 2; }
OUT=${OUT:-/tmp/wfrt-san}
CORPUS=${CORPUS:-../packages/@n8n/workflow-lang/corpus}
BASE=${BASE_PORT:-28700}
mkdir -p "$OUT"
NICE="nice -n 10"
PIDS=()
cleanup() { for p in "${PIDS[@]}"; do kill "$p" 2> /dev/null || true; done; }
trap cleanup EXIT

echo "== valgrind memcheck"
# Valgrind 3.22 does not know the SHA-NI and other newer instructions that
# Zig uses for the native CPU: build for the baseline x86-64 CPU.
zig build install-tests -Dcpu=baseline
zig build -Dcpu=baseline --prefix zig-out/debug
VG=(valgrind --error-exitcode=99 --leak-check=full --errors-for-leak-kinds=definite --show-leak-kinds=definite -q)
$NICE "${VG[@]}" zig-out/bin/core-test > "$OUT/vg-core.txt" 2>&1 && echo "ok   core tests" || { echo "FAIL core tests"; tail -40 "$OUT/vg-core.txt"; exit 1; }
$NICE "${VG[@]}" zig-out/bin/shell-test > "$OUT/vg-shell.txt" 2>&1 && echo "ok   shell tests" || { echo "FAIL shell tests"; tail -40 "$OUT/vg-shell.txt"; exit 1; }
# No crashes under Valgrind: after a crash the sim maps a fresh shard, and
# Zig's page allocator then passes mmap an address hint that Valgrind
# rejects with EINVAL (std treats that as unreachable). Recovery under
# memcheck is covered by the shell tests (retry test, log and state-machine
# fuzz seeds).
$NICE "${VG[@]}" zig-out/debug/bin/wfrt sim --seeds "${VG_SEEDS:-5}" --crash 0 > "$OUT/vg-sim.txt" 2>&1 && echo "ok   sim: $(tail -1 "$OUT/vg-sim.txt")" || { echo "FAIL sim"; tail -40 "$OUT/vg-sim.txt"; exit 1; }
if [ -d "$CORPUS" ]; then
  $NICE "${VG[@]}" zig-out/debug/bin/wfrt corpus "$CORPUS" > "$OUT/vg-corpus.txt" 2>&1 && echo "ok   corpus: $(tail -1 "$OUT/vg-corpus.txt")" || { echo "FAIL corpus"; tail -40 "$OUT/vg-corpus.txt"; exit 1; }
fi

echo "== thread sanitizer"
zig build -Dtsan=true --prefix zig-out/tsan
T=zig-out/tsan/bin/wfrt
$T asm w2 "$OUT/w2.wfm"
export TSAN_OPTIONS="halt_on_error=0 exitcode=66 log_path=$OUT/tsan"
rm -f "$OUT"/tsan.*
# A fresh log: replaying an old one would delay the listener.
rm -rf "$OUT/tsan-log" && mkdir -p "$OUT/tsan-log"
$NICE $T serve --port "$BASE" --shards 4 --module "$OUT/w2.wfm" --route "POST /w2" --log-dir "$OUT/tsan-log" --stats > "$OUT/tsan-serve.txt" 2>&1 & PIDS+=($!)
SERVE=$!
for _ in $(seq 1 100); do grep -q "wfrt serving" "$OUT/tsan-serve.txt" && break; sleep 0.1; done
$NICE zig-out/debug/bin/wfrt load --port "$BASE" --conns 64 --seconds 5 --path /w2 --threads 4 > "$OUT/tsan-load.txt" 2>&1 || true
kill -TERM "$SERVE"; wait "$SERVE" || true
grep -q "ok=[1-9]" "$OUT/tsan-load.txt" || { echo "FAIL the load sent no request:"; cat "$OUT/tsan-load.txt"; exit 1; }
$NICE $T bench-w1 --seconds 2 --threads 4 > "$OUT/tsan-w1.txt" 2>&1 || true
if ls "$OUT"/tsan.* > /dev/null 2>&1; then
  echo "FAIL thread sanitizer reports:"; head -60 "$OUT"/tsan.*; exit 1
fi
echo "ok   serve (4 shards, load: $(grep -o 'ok=[0-9]* .*rate=[0-9]*/s' "$OUT/tsan-load.txt" | tail -1)), bench-w1 4 threads"

echo "== sanitize-c build"
zig build -Dsanitize-c=true --prefix zig-out/ubsan
zig-out/ubsan/bin/wfrt corpus "$CORPUS" | tail -1
echo "linux sanitizers passed"
