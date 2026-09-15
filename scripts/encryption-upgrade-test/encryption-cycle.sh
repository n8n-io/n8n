#!/usr/bin/env bash
# encryption-cycle.sh — repeatable tests for the encryption-key rollout.
#
# MODE=upgrade (default): for each database backend (sqlite and postgres by
# default), one instance travels through four phases:
#   P1 SEED       old release (docker image FROM_IMAGE) boots, owner + credential A
#   P2 UPGRADE    this checkout (TO) boots on the same data, rotation flag OFF:
#                 A decrypts; new credential B is written in the LEGACY format
#   P3 DOWNGRADE  FROM boots again on the same data: B (written by the newer
#                 instance) decrypts on the older one — the rollback-safety gate
#   P4 WRITE-ON   TO boots with N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION=true:
#                 A+B decrypt; C is written "<activeKeyId>:.."; rotate via API;
#                 D uses the new key id; A,B,C,D all decrypt (mixed data)
#
# MODE=rotation: this checkout only, fresh database, rotation flag ON — the
# standalone test of DB-stored key rotation:
#   R1 SEED       fresh boot seeds the key store; credential A is keyId-prefixed
#   R2 ROTATE     two rotations via the API, a write after each one must use
#                 the newest key id; all key generations stay in the store
#   R3 RESTART    the instance restarts: keys reload from the database, a new
#                 write keeps the active key id, every generation decrypts
#
# Layout — this file holds the parameters, the shared state, and the main
# dispatch; everything else is sourced from lib/ (see the README):
#   lib/harness.sh         progress log, metrics, failure handling, backend setup
#   lib/instance.sh        database access and instance process control
#   lib/api.sh             REST calls and the encryption assertions
#   lib/cycle-upgrade.sh   run_cycle()    — MODE=upgrade, phases P1-P4
#   lib/cycle-rotation.sh  run_rotation() — MODE=rotation, phases R1-R3
#
# Params (env): MODE (upgrade | rotation; default upgrade), DB (sqlite |
# postgres | both; default both), FROM_IMAGE (default pinned; upgrade mode
# only), PG_IMAGE (default postgres:16), N8N_REPO (default: this repo — must
# be BUILT), N8N_PORT (default 5714), WORK_ROOT (default mktemp).
# Needs: docker (not for rotation on sqlite), sqlite3, python3, curl.
# Exit: 0 PASS, 1 FAIL (loud, with log tail), 77 SKIP (docker unavailable).
set -euo pipefail

# ---------- parameters ----------------------------------------------------------

MODE="${MODE:-upgrade}"
case "$MODE" in
  upgrade) SPEC_NAME="upgrade-cycle";;
  rotation) SPEC_NAME="rotation-cycle";;
  *) echo "FAIL: unknown MODE '$MODE' (use upgrade | rotation)"; exit 1;;
esac
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
N8N_REPO="${N8N_REPO:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
N8N_PORT="${N8N_PORT:-5714}"
# Pinned so the suite is repeatable; bump deliberately when the
# compatibility baseline changes.
FROM_IMAGE="${FROM_IMAGE:-n8nio/n8n:2.37.10}"
PG_IMAGE="${PG_IMAGE:-postgres:16}"
DB="${DB:-both}"
WORK_ROOT="${WORK_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/${SPEC_NAME}.XXXXXX")}"

N8N_BIN="$N8N_REPO/packages/cli/bin/n8n"
PG_PORT=$((N8N_PORT + 2))
PG_PASSWORD="upgrade-test-pw"

BASE_URL="http://localhost:${N8N_PORT}"
BROWSER_ID="spec-${SPEC_NAME}"
OWNER_EMAIL="owner@example.com"
OWNER_PASSWORD="SuperSecret123"

# Per-backend state, set by init_backend(); PHASE by phase().
BACKEND=""
DATA_DIR=""
LOG_FILE=""
COOKIE_JAR=""
OUT_FILE=""
METRICS_FILE=""
CONTAINER=""
PG_CONTAINER=""
N8N_PID=""
PHASE="setup"
PHASE_STARTED=$SECONDS

# ---------- wiring --------------------------------------------------------------

for part in harness instance api cycle-upgrade cycle-rotation; do
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/lib/$part.sh"
done

trap cleanup EXIT

# Rotation mode boots only the local checkout; docker is needed just for the
# postgres backend.
if [ "$MODE" != "rotation" ] || [ "$DB" != "sqlite" ]; then
  command -v docker >/dev/null || { echo "SKIP: $SPEC_NAME - docker not available"; exit 77; }
  docker info >/dev/null 2>&1 || { echo "SKIP: $SPEC_NAME - docker daemon not running"; exit 77; }
fi
[ -x "$N8N_BIN" ] || { echo "FAIL: $SPEC_NAME - n8n binary not found at $N8N_BIN (build the repo first)"; exit 1; }
command -v sqlite3 >/dev/null || { echo "FAIL: $SPEC_NAME - sqlite3 not available"; exit 1; }
command -v python3 >/dev/null || { echo "FAIL: $SPEC_NAME - python3 not available"; exit 1; }

# ---------- main ---------------------------------------------------------------

echo "[$(date +%H:%M:%S)] $SPEC_NAME | work root: $WORK_ROOT"
if [ "$MODE" = "rotation" ]; then
  echo "[$(date +%H:%M:%S)] MODE: rotation (no old-release image) | checkout: $N8N_REPO | DB: $DB"
else
  echo "[$(date +%H:%M:%S)] FROM: $FROM_IMAGE | TO: local checkout at $N8N_REPO | DB: $DB"
fi

run_one() {
  if [ "$MODE" = "rotation" ]; then run_rotation "$1"; else run_cycle "$1"; fi
}

case "$DB" in
  sqlite) run_one sqlite;;
  postgres) run_one postgres;;
  both) run_one sqlite; run_one postgres;;
  *) echo "FAIL: unknown DB '$DB' (use sqlite | postgres | both)"; exit 1;;
esac

echo
echo "[$(date +%H:%M:%S)] PASS: $SPEC_NAME — all requested backends green ($DB)"
