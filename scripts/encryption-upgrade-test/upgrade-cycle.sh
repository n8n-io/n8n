#!/usr/bin/env bash
# upgrade-cycle.sh — repeatable upgrade test for the encryption-key rollout.
#
# For each database backend (sqlite and postgres by default), one instance
# travels through four phases:
#   P1 SEED       old release (docker image FROM_IMAGE) boots, owner + credential A
#   P2 UPGRADE    this checkout (TO) boots on the same data, rotation flag OFF:
#                 A decrypts; new credential B is written in the LEGACY format
#   P3 DOWNGRADE  FROM boots again on the same data: B (written by the newer
#                 instance) decrypts on the older one — the rollback-safety gate
#   P4 WRITE-ON   TO boots with N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION=true:
#                 A+B decrypt; C is written "<activeKeyId>:.."; rotate via API;
#                 D uses the new key id; A,B,C,D all decrypt (mixed data)
#
# Params (env): DB (sqlite | postgres | both; default both), FROM_IMAGE
# (default n8nio/n8n:latest), PG_IMAGE (default postgres:16), N8N_REPO
# (default: this repo — must be BUILT), N8N_PORT (default 5714), WORK_ROOT
# (default mktemp).
# Needs: docker, sqlite3, python3, curl.
# Exit: 0 PASS, 1 FAIL (loud, with log tail), 77 SKIP (docker unavailable).
set -euo pipefail

SPEC_NAME="upgrade-cycle"
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

# Per-backend state, set by run_cycle().
BACKEND=""
DATA_DIR=""
LOG_FILE=""
COOKIE_JAR=""
OUT_FILE=""
METRICS_FILE=""
CONTAINER=""
PG_CONTAINER=""
N8N_PID=""

# ---------- progress log & metrics -------------------------------------------

PHASE="setup"
PHASE_STARTED=$SECONDS
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

phase_s, decrypts = {}, defaultdict(list)
with open(sys.argv[1]) as f:
    for line in f:
        kind, label, value = line.strip().split(",", 2)
        if kind == "phase_s" and label != "setup":
            phase_s[label] = phase_s.get(label, 0) + int(value)
        elif kind == "decrypt_ms":
            decrypts[label].append(float(value))

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
trap cleanup EXIT

command -v docker >/dev/null || { echo "SKIP: $SPEC_NAME - docker not available"; exit 77; }
docker info >/dev/null 2>&1 || { echo "SKIP: $SPEC_NAME - docker daemon not running"; exit 77; }
[ -x "$N8N_BIN" ] || { echo "FAIL: $SPEC_NAME - n8n binary not found at $N8N_BIN (build the repo first)"; exit 1; }
command -v sqlite3 >/dev/null || { echo "FAIL: $SPEC_NAME - sqlite3 not available"; exit 1; }
command -v python3 >/dev/null || { echo "FAIL: $SPEC_NAME - python3 not available"; exit 1; }

# ---------- database access ----------------------------------------------------

db_query() { # SQL -> rows (pipe-separated columns)
  if [ "$BACKEND" = "postgres" ]; then
    docker exec "$PG_CONTAINER" psql -U postgres -d n8n -tA -F'|' -c "$1"
  else
    sqlite3 "$DATA_DIR/database.sqlite" "$1"
  fi
}

# Env pairs shared by the container and the local checkout for postgres.
# The FROM container reaches the published port via host.docker.internal.
pg_env() { # $1 = docker | local
  local host="localhost"
  [ "$1" = "docker" ] && host="host.docker.internal"
  echo "DB_TYPE=postgresdb DB_POSTGRESDB_HOST=$host DB_POSTGRESDB_PORT=$PG_PORT DB_POSTGRESDB_USER=postgres DB_POSTGRESDB_PASSWORD=$PG_PASSWORD DB_POSTGRESDB_DATABASE=n8n"
}

start_postgres() {
  step "starting $PG_IMAGE (port $PG_PORT)"
  docker run -d --name "$PG_CONTAINER" \
    -p "${PG_PORT}:5432" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB=n8n \
    "$PG_IMAGE" >/dev/null
  local deadline=$((SECONDS + 60))
  until docker exec "$PG_CONTAINER" pg_isready -U postgres -d n8n >/dev/null 2>&1; do
    [ "$SECONDS" -lt "$deadline" ] || fail "postgres not ready within 60s"
    sleep 1
  done
  ok "postgres is ready"
}

# ---------- process control ---------------------------------------------------

start_container() { # start the FROM image on the shared data dir
  step "starting container from $FROM_IMAGE (port $N8N_PORT, data: $DATA_DIR)"
  local -a db_args=()
  if [ "$BACKEND" = "postgres" ]; then
    for kv in $(pg_env docker); do db_args+=(-e "$kv"); done
  fi
  # --user + whole-home mount: files the container writes stay owned by the
  # host user, so the local checkout can reuse the same data (Linux runners
  # have no uid mapping). --add-host makes host.docker.internal resolve on
  # Linux; Docker Desktop has it built in.
  docker run -d --name "$CONTAINER" \
    --user "$(id -u):$(id -g)" \
    --add-host=host.docker.internal:host-gateway \
    -p "${N8N_PORT}:5678" \
    -v "$(dirname "$DATA_DIR"):/home/node" \
    -e HOME=/home/node \
    -e N8N_DIAGNOSTICS_ENABLED=false \
    -e N8N_VERSION_NOTIFICATIONS_ENABLED=false \
    -e N8N_RUNNERS_ENABLED=false \
    -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
    ${db_args[@]+"${db_args[@]}"} \
    "$FROM_IMAGE" >/dev/null
}

stop_container() {
  step "stopping container (logs appended to $LOG_FILE)"
  docker logs "$CONTAINER" >>"$LOG_FILE" 2>&1 || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}

start_local() { # start the local checkout; $1 = "on" enables the rotation flag
  # macOS bash 3.2 + set -u chokes on empty-array expansion, so no array here;
  # the flag reader treats any non-"true" value as off.
  local flag_value=false
  [ "${1:-off}" = "on" ] && flag_value=true
  step "starting local checkout (rotation flag: ${1:-off})"
  local db_env=""
  [ "$BACKEND" = "postgres" ] && db_env="$(pg_env local)"
  env $db_env N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION="$flag_value" \
    N8N_USER_FOLDER="$(dirname "$DATA_DIR")" \
    N8N_PORT="$N8N_PORT" \
    N8N_RUNNERS_BROKER_PORT=$((N8N_PORT + 1000)) \
    N8N_LOG_LEVEL=info \
    N8N_DIAGNOSTICS_ENABLED=false \
    N8N_VERSION_NOTIFICATIONS_ENABLED=false \
    N8N_RUNNERS_ENABLED=false \
    N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
    "$N8N_BIN" start >>"$LOG_FILE" 2>&1 &
  N8N_PID=$!
}

stop_local() {
  [ -n "$N8N_PID" ] || return 0
  step "stopping local n8n (pid $N8N_PID)"
  kill "$N8N_PID" 2>/dev/null || true
  for _ in $(seq 1 30); do kill -0 "$N8N_PID" 2>/dev/null || break; sleep 0.5; done
  kill -9 "$N8N_PID" 2>/dev/null || true
  N8N_PID=""
}

wait_ready() {
  step "waiting for readiness (${BASE_URL}/healthz/readiness, up to 180s)"
  local deadline=$((SECONDS + 180))
  until curl -sf -o /dev/null "${BASE_URL}/healthz/readiness"; do
    [ "$SECONDS" -lt "$deadline" ] || fail "not ready (/healthz/readiness) within 180s"
    if [ -n "$N8N_PID" ] && ! kill -0 "$N8N_PID" 2>/dev/null; then
      fail "local n8n exited prematurely"
    fi
    sleep 2
  done
  ok "instance is ready"
}

wait_gone() { # wait until the port is free again between phases
  step "waiting for port $N8N_PORT to free up"
  local deadline=$((SECONDS + 30))
  while curl -sf -o /dev/null "${BASE_URL}/healthz" 2>/dev/null; do
    [ "$SECONDS" -lt "$deadline" ] || fail "port $N8N_PORT still answering after shutdown"
    sleep 1
  done
}

# ---------- REST helpers ------------------------------------------------------

rest_call() { # METHOD PATH [JSON] -> "HTTP_CODE TIME_TOTAL_S", body in $OUT_FILE
  local method="$1" path="$2" payload="${3:-}"
  local -a args=(-s -o "$OUT_FILE" -w '%{http_code} %{time_total}' -X "$method"
    -H "browser-id: $BROWSER_ID" -b "$COOKIE_JAR" -c "$COOKIE_JAR")
  [ -n "$payload" ] && args+=(-H 'Content-Type: application/json' --data "$payload")
  curl "${args[@]}" "${BASE_URL}${path}"
}

json_get() { # PY_EXPR (parsed JSON available as `d`)
  python3 -c '
import json, sys
with open(sys.argv[1]) as f:
    d = json.load(f)
print(eval(sys.argv[2]))
' "$OUT_FILE" "$1"
}

login() { # fresh cookie for the current instance (field name differs by version)
  step "logging in as $OWNER_EMAIL"
  : >"$COOKIE_JAR"
  local res
  res="$(rest_call POST /rest/login \
    "{\"emailOrLdapLoginId\": \"$OWNER_EMAIL\", \"password\": \"$OWNER_PASSWORD\"}")"
  if [ "${res%% *}" != "200" ]; then
    res="$(rest_call POST /rest/login \
      "{\"email\": \"$OWNER_EMAIL\", \"password\": \"$OWNER_PASSWORD\"}")"
  fi
  [ "${res%% *}" = "200" ] || { echo "login response ($res): $(head -c 300 "$OUT_FILE")"; fail "login failed"; }
  ok "logged in"
}

create_credential() { # NAME SECRET -> prints credential id
  local res
  res="$(rest_call POST /rest/credentials \
    "{\"name\": \"$1\", \"type\": \"httpHeaderAuth\", \"data\": {\"name\": \"$2\", \"value\": \"spec-header-password\"}}")"
  [ "${res%% *}" = "200" ] || { echo "create credential ($res): $(head -c 300 "$OUT_FILE")" >&2; return 1; }
  json_get "d['data']['id']"
}

# The unique secret lives in the NON-password `name` field: the API returns it
# decrypted verbatim, while both fields sit in one encrypted blob — so the
# round-trip proves the stored value decrypts. The password-typed `value` field
# is redacted by the API, which itself only happens after a successful decrypt.
assert_decrypts() { # CRED_ID EXPECTED_SECRET LABEL
  step "checking decrypt of credential $1 ($3)"
  local res code time_s got
  res="$(rest_call GET "/rest/credentials/$1?includeData=true")"
  code="${res%% *}"; time_s="${res##* }"
  [ "$code" = "200" ] || { echo "get credential ($code): $(head -c 300 "$OUT_FILE")"; fail "$3: GET credential $1 returned $code"; }
  got="$(json_get "d['data']['data']['name']")"
  [ "$got" = "$2" ] || { echo "expected: $2"; echo "actual:   $got"; fail "$3: credential $1 did not decrypt to the seeded secret"; }
  metric decrypt_ms "$PHASE" "$(python3 -c "print(round(float('$time_s')*1000, 1))")"
  ok "credential $1 decrypts to the seeded secret (${time_s}s)"
}

raw_value() { # CRED_ID -> raw credentials_entity.data
  db_query "SELECT data FROM credentials_entity WHERE id='$1';"
}

# ---------- one full cycle on one backend --------------------------------------

run_cycle() {
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

  local SECRET_A="up-A-$(date +%s)-$RANDOM" SECRET_B="up-B-$(date +%s)-$RANDOM"
  local SECRET_C="up-C-$(date +%s)-$RANDOM" SECRET_D="up-D-$(date +%s)-$RANDOM"

  if [ "$BACKEND" = "postgres" ]; then
    PG_CONTAINER="n8n-${SPEC_NAME}-pg-$$"
    start_postgres
  fi

  phase "P1 seed"
  step "seeding on the old release ($FROM_IMAGE)"
  start_container
  wait_ready
  local from_version
  from_version="$(docker exec "$CONTAINER" n8n --version 2>/dev/null | tail -1 || echo '?')"
  step "FROM version: $from_version"
  step "creating the owner account"
  local res
  res="$(rest_call POST /rest/owner/setup \
    "{\"email\": \"$OWNER_EMAIL\", \"firstName\": \"Spec\", \"lastName\": \"Owner\", \"password\": \"$OWNER_PASSWORD\"}")"
  [ "${res%% *}" = "200" ] || { echo "owner setup ($res): $(head -c 300 "$OUT_FILE")"; fail "owner setup failed"; }
  ok "owner created"
  step "creating credential A (the seed data)"
  local cred_a cred_b cred_c cred_d
  cred_a="$(create_credential "upgrade-test cred A (seeded on FROM)" "$SECRET_A")" || fail "create credential A"
  ok "credential A = $cred_a"
  assert_decrypts "$cred_a" "$SECRET_A" "baseline on FROM"
  stop_container
  wait_gone

  phase "P2 upgrade"
  step "upgrading to this checkout, rotation flag OFF"
  start_local off
  wait_ready
  login
  assert_decrypts "$cred_a" "$SECRET_A" "old data survives the upgrade"
  step "creating credential B on the upgraded instance"
  cred_b="$(create_credential "upgrade-test cred B (written on TO, flag off)" "$SECRET_B")" || fail "create credential B"
  ok "credential B = $cred_b"
  step "checking B is stored in the LEGACY format (flag off => byte-compatible writes)"
  local raw_b
  raw_b="$(raw_value "$cred_b")"
  case "$raw_b" in
    U2FsdGVkX1*) ok "credential B stored in legacy format (U2FsdGVkX1...)";;
    *) echo "raw value (first 60): $(printf '%s' "$raw_b" | head -c 60)"
       fail "flag OFF but new write is not legacy-format";;
  esac
  assert_decrypts "$cred_b" "$SECRET_B" "fresh write on TO"
  step "checking the key store got seeded (exactly 2 deployment_key rows)"
  local key_rows
  key_rows="$(db_query "SELECT COUNT(*) FROM deployment_key WHERE type='data_encryption';")"
  [ "$key_rows" = "2" ] || fail "expected exactly 2 seeded deployment_key rows, got $key_rows"
  ok "deployment_key has exactly 2 rows"
  stop_local
  wait_gone

  phase "P3 downgrade"
  step "booting the old release on the upgraded data"
  start_container
  wait_ready
  login
  assert_decrypts "$cred_b" "$SECRET_B" "value written by the NEWER instance reads on the OLDER one"
  assert_decrypts "$cred_a" "$SECRET_A" "original data still fine on FROM"
  stop_container
  wait_gone

  phase "P4 write-on"
  step "booting this checkout with the rotation flag ON"
  start_local on
  wait_ready
  login
  assert_decrypts "$cred_a" "$SECRET_A" "mixed: seeded on FROM"
  assert_decrypts "$cred_b" "$SECRET_B" "mixed: legacy written on TO"
  step "reading the active data-encryption key id"
  local active_key_id
  active_key_id="$(db_query "SELECT id FROM deployment_key WHERE type='data_encryption' AND status='active' AND algorithm='aes-256-gcm';")"
  [ -n "$active_key_id" ] || fail "no active aes-256-gcm deployment_key row"
  ok "active key id: $active_key_id"
  step "creating credential C (must be keyId-prefixed)"
  cred_c="$(create_credential "upgrade-test cred C (flag on)" "$SECRET_C")" || fail "create credential C"
  local raw_c
  raw_c="$(raw_value "$cred_c")"
  case "$raw_c" in
    "$active_key_id":*) ok "credential C prefixed with the active key id ($active_key_id)";;
    *) echo "expected prefix: ${active_key_id}:"; echo "raw (first 60): $(printf '%s' "$raw_c" | head -c 60)"
       fail "flag ON but new write is not keyId-prefixed";;
  esac
  assert_decrypts "$cred_c" "$SECRET_C" "prefixed write"
  step "rotating the key via POST /rest/encryption/keys"
  res="$(rest_call POST /rest/encryption/keys '{"type": "data_encryption"}')"
  [ "${res%% *}" = "200" ] || { echo "rotate ($res): $(head -c 300 "$OUT_FILE")"; fail "key rotation via API failed"; }
  local new_key_id
  new_key_id="$(json_get "d['data']['id']")"
  [ -n "$new_key_id" ] && [ "$new_key_id" != "$active_key_id" ] || fail "rotation did not produce a new key id"
  ok "rotated: $active_key_id -> $new_key_id"
  step "creating credential D (must use the NEW key id)"
  cred_d="$(create_credential "upgrade-test cred D (after rotate)" "$SECRET_D")" || fail "create credential D"
  local raw_d
  raw_d="$(raw_value "$cred_d")"
  case "$raw_d" in
    "$new_key_id":*) ok "credential D prefixed with the rotated key id ($new_key_id)";;
    *) echo "expected prefix: ${new_key_id}:"; echo "raw (first 60): $(printf '%s' "$raw_d" | head -c 60)"
       fail "write after rotation does not use the new key id";;
  esac
  step "final sweep: all four generations must decrypt"
  local pair
  for pair in "$cred_a:$SECRET_A" "$cred_b:$SECRET_B" "$cred_c:$SECRET_C" "$cred_d:$SECRET_D"; do
    assert_decrypts "${pair%%:*}" "${pair#*:}" "all generations"
  done
  stop_local
  wait_gone

  if [ -n "$PG_CONTAINER" ]; then
    docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
    PG_CONTAINER=""
  fi

  summary
  echo
  echo "[$(date +%H:%M:%S)] PASS [$BACKEND]: seed($from_version) -> upgrade(read) -> downgrade-read -> write-on+rotate, all decrypts OK"
}

# ---------- main ---------------------------------------------------------------

echo "[$(date +%H:%M:%S)] $SPEC_NAME | work root: $WORK_ROOT"
echo "[$(date +%H:%M:%S)] FROM: $FROM_IMAGE | TO: local checkout at $N8N_REPO | DB: $DB"

case "$DB" in
  sqlite) run_cycle sqlite;;
  postgres) run_cycle postgres;;
  both) run_cycle sqlite; run_cycle postgres;;
  *) echo "FAIL: unknown DB '$DB' (use sqlite | postgres | both)"; exit 1;;
esac

echo
echo "[$(date +%H:%M:%S)] PASS: $SPEC_NAME — all requested backends green ($DB)"
