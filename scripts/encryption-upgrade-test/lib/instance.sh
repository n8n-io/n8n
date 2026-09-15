# shellcheck shell=bash
# instance.sh — database access and instance process control: the postgres
# container, the old-release (FROM) container, the local checkout process.
# Sourced by encryption-cycle.sh; not executable on its own.

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
