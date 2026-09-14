# shellcheck shell=bash
# harness.sh — progress log, metrics, failure handling, per-backend state.
# Sourced by encryption-cycle.sh; not executable on its own.

metric() { echo "$1,$2,$3" >>"$METRICS_FILE"; }  # kind,label,value

phase() {
  metric phase_s "$PHASE" "$((SECONDS - PHASE_STARTED))"
  PHASE="$1"
  PHASE_STARTED=$SECONDS
  echo
  echo "[$(date +%H:%M:%S)] ================ [$BACKEND] $* ================"
}
step()  { echo "[$(date +%H:%M:%S)] [$BACKEND/$PHASE] $*"; }
ok()    { echo "[$(date +%H:%M:%S)] [$BACKEND/$PHASE]   OK: $*"; }

summary() {
  metric phase_s "$PHASE" "$((SECONDS - PHASE_STARTED))"
  echo
  python3 - "$METRICS_FILE" "$BACKEND" <<'PY'
import sys
from collections import defaultdict

phase_s, decrypts, rotates = {}, defaultdict(list), []
with open(sys.argv[1]) as f:
    for line in f:
        kind, label, value = line.strip().split(",", 2)
        if kind == "phase_s" and label != "setup":
            phase_s[label] = phase_s.get(label, 0) + int(value)
        elif kind == "decrypt_ms":
            decrypts[label].append(float(value))
        elif kind == "rotate_ms":
            rotates.append(float(value))

print(f"=== metrics [{sys.argv[2]}] ===")
print(f"{'phase':<14} {'duration':>9} {'decrypt checks':>15} {'avg ms':>8} {'max ms':>8}")
for label, secs in phase_s.items():
    ms = decrypts.get(label, [])
    avg = f"{sum(ms)/len(ms):.1f}" if ms else "-"
    mx = f"{max(ms):.1f}" if ms else "-"
    print(f"{label:<14} {secs:>8}s {len(ms):>15} {avg:>8} {mx:>8}")
total = sum(phase_s.values())
all_ms = [v for ms in decrypts.values() for v in ms]
print(f"{'total':<14} {total:>8}s {len(all_ms):>15} "
      f"{sum(all_ms)/len(all_ms):>8.1f} {max(all_ms):>8.1f}")
if rotates:
    print(f"rotate api: {len(rotates)} calls, "
          f"avg {sum(rotates)/len(rotates):.1f} ms, max {max(rotates):.1f} ms")
PY
}

fail() {
  echo "[$(date +%H:%M:%S)] [$BACKEND/$PHASE] FAIL: $SPEC_NAME - $*"
  echo "--- last 40 log lines ($LOG_FILE) ---"
  tail -n 40 "$LOG_FILE" 2>/dev/null || echo "(no log file)"
  exit 1
}

cleanup() {
  local code=$?
  [ -n "$CONTAINER" ] && docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  [ -n "$PG_CONTAINER" ] && docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
  if [ -n "$N8N_PID" ] && kill -0 "$N8N_PID" 2>/dev/null; then
    kill "$N8N_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do kill -0 "$N8N_PID" 2>/dev/null || break; sleep 0.5; done
    kill -9 "$N8N_PID" 2>/dev/null || true
  fi
  exit "$code"
}

init_backend() {
  BACKEND="$1"
  local work="$WORK_ROOT/$BACKEND"
  DATA_DIR="$work/home/.n8n"
  LOG_FILE="$work/n8n.log"
  COOKIE_JAR="$work/cookies.txt"
  OUT_FILE="$work/out.json"
  METRICS_FILE="$work/metrics.csv"
  CONTAINER="n8n-${SPEC_NAME}-${BACKEND}-$$"
  PG_CONTAINER=""
  mkdir -p "$DATA_DIR"
  : >"$METRICS_FILE"
  PHASE="setup"
  PHASE_STARTED=$SECONDS

  if [ "$BACKEND" = "postgres" ]; then
    PG_CONTAINER="n8n-${SPEC_NAME}-pg-$$"
    start_postgres
  fi
}

teardown_backend() {
  if [ -n "$PG_CONTAINER" ]; then
    docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
    PG_CONTAINER=""
  fi
}
