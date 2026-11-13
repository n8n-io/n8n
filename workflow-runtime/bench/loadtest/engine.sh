#!/usr/bin/env bash
# Starts and stops one engine setup of the load test on an engine CPU
# budget, and writes the component list (cgroups) that drive.mjs samples.
#
#   engine.sh start v1 <budget> [workers]     n8n 2.42.2: regular mode at budget 1 (or workers=0),
#                                             else queue mode: main (webhooks) + <workers> workers + Redis
#   engine.sh start v2 <budget> [planes]      n8n 2.42.2 with engine-v2: in-process at planes=0,
#                                             else N8N_ENGINE_MODE=remote with <planes> data planes + Redis
#   engine.sh start compiled <budget> <shards> <workers> [native|host]
#   engine.sh stop
#   engine.sh components <file>               writes the components of the running setup
#
# Every process of the setup (n8n, workers, Postgres, Redis; wfrt and the
# host) runs on the budget's CPUs. The n8n database is Postgres 17 in Docker
# (container lt-n8n-pg), on the same CPUs. The workflows stay in it across
# budgets: n8n-load.mjs loads them once per engine.
set -euo pipefail
source "$(dirname "$0")/env.sh"
STATE=$LT/engine/state
mkdir -p "$LT/engine"
pg_url() { echo "postgresql://postgres:pg@127.0.0.1:55432/$1"; }

db_up() { # cpus
	if docker inspect lt-n8n-pg > /dev/null 2>&1; then
		docker update --cpuset-cpus="$1" lt-n8n-pg > /dev/null
		docker start lt-n8n-pg > /dev/null
	else
		docker run -d --name lt-n8n-pg --cpuset-cpus="$1" -m 8g --shm-size=1g -p 127.0.0.1:55432:5432 -e POSTGRES_PASSWORD=pg \
			-v "$LT/engine/pgdata:/var/lib/postgresql/data" postgres:17 -c max_connections=500 -c shared_buffers=1GB > /dev/null
	fi
	for _ in $(seq 120); do docker exec lt-n8n-pg pg_isready -q 2> /dev/null && break; sleep 1; done
	sleep 1
	for db in n8n_v1 n8n_v2 engine_v2; do
		docker exec lt-n8n-pg psql -U postgres -tAc "select 1 from pg_database where datname='$db'" | grep -q 1 ||
			docker exec lt-n8n-pg createdb -U postgres "$db"
	done
}
redis_up() { # cpus
	docker rm -f lt-redis > /dev/null 2>&1 || true
	docker run -d --name lt-redis --cpuset-cpus="$1" -m 2g -p 127.0.0.1:56379:6379 redis:7.4 --save '' --appendonly no > /dev/null
	for _ in $(seq 60); do docker exec lt-redis redis-cli ping 2> /dev/null | grep -q PONG && break; sleep 0.5; done
}
db_env() { # database
	cat << EOF
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=127.0.0.1
DB_POSTGRESDB_PORT=55432
DB_POSTGRESDB_DATABASE=$1
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=pg
DB_POSTGRESDB_POOL_SIZE=10
EOF
}
queue_env() {
	cat << EOF
EXECUTIONS_MODE=queue
QUEUE_BULL_REDIS_HOST=127.0.0.1
QUEUE_BULL_REDIS_PORT=56379
OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true
EOF
}
v2_env() { # mode
	cat << EOF
N8N_ENABLED_MODULES=engine-v2
N8N_ENGINE_MODE=$1
N8N_ENGINE_DATABASE_URL=$(pg_url engine_v2)
N8N_ENGINE_PORT=5700
N8N_ENGINE_HOST=127.0.0.1
N8N_ENGINE_BASE_URL=http://127.0.0.1:5700
N8N_ENGINE_AUTH_SECRET=loadtest-engine-v2-shared-secret-0123456789abcdef
N8N_ENGINE_CONTROL_PLANE_PORT=5701
N8N_ENGINE_CONTROL_PLANE_HOST=127.0.0.1
N8N_ENGINE_CONTROL_PLANE_BASE_URL=http://127.0.0.1:5701
QUEUE_BULL_REDIS_HOST=127.0.0.1
QUEUE_BULL_REDIS_PORT=56379
EOF
}
wait_n8n() { # port
	for _ in $(seq 1800); do curl -fs -o /dev/null "http://127.0.0.1:$1/healthz/readiness" && return 0; sleep 0.5; done
	echo "n8n on $1 did not start" >&2
	return 1
}

stop_all() {
	if [ -f "$STATE" ]; then
		# shellcheck disable=SC1090
		source "$STATE"
		for u in ${UNITS:-}; do unit_stop "$u"; done
		[ -n "${COMPILED_PID:-}" ] && kill "$COMPILED_PID" 2> /dev/null || true
		for _ in $(seq 50); do [ -n "${COMPILED_PID:-}" ] && kill -0 "$COMPILED_PID" 2> /dev/null && sleep 0.2 || break; done
		rm -f "$STATE"
	fi
	docker rm -f lt-redis > /dev/null 2>&1 || true
	docker stop lt-n8n-pg > /dev/null 2>&1 || true
}

start() {
	local engine=$1 budget=$2
	local cpus
	# CPUS_OVERRIDE: another CPU list, for unmeasured work such as loading.
	cpus=${CPUS_OVERRIDE:-$(engine_cpus "$budget")}
	stop_all
	case $engine in
		v1)
			local workers=${3:-$([ "$budget" = 1 ] && echo 0 || echo "$budget")}
			db_up "$cpus"
			if [ "$workers" = 0 ]; then
				db_env n8n_v1 | "$KIT/n8n.sh" v1-main start 5678 "$cpus" 8G
				echo "UNITS='v1-main' ENGINE=v1 BUDGET=$budget CPUS=$cpus MODE=regular WORKERS=0 PORT=5678" > "$STATE"
			else
				redis_up "$cpus"
				{ db_env n8n_v1; queue_env; } | "$KIT/n8n.sh" v1-main start 5678 "$cpus" 8G
				local units="v1-main" i
				for ((i = 1; i <= workers; i++)); do
					{ db_env n8n_v1; queue_env; echo "N8N_RUNNERS_BROKER_PORT=$((6800 + i))"; echo "QUEUE_HEALTH_CHECK_PORT=$((6900 + i))"; echo "N8N_CONCURRENCY_PRODUCTION_LIMIT=${WORKER_CONC:-50}"; } |
						"$KIT/n8n.sh" "v1-w$i" worker $((5800 + i)) "$cpus" 4G
					units="$units v1-w$i"
				done
				echo "UNITS='$units' ENGINE=v1 BUDGET=$budget CPUS=$cpus MODE=queue WORKERS=$workers PORT=5678" > "$STATE"
			fi
			wait_n8n 5678
			;;
		v2)
			local planes=${3:-0}
			db_up "$cpus"
			if [ "$planes" = 0 ]; then
				{ db_env n8n_v2; v2_env in-process; } | "$KIT/n8n.sh" v2-main start 5679 "$cpus" 8G
				echo "UNITS='v2-main' ENGINE=v2 BUDGET=$budget CPUS=$cpus MODE=in-process WORKERS=0 PORT=5679" > "$STATE"
			else
				redis_up "$cpus"
				{ db_env n8n_v2; v2_env remote; } | "$KIT/n8n.sh" v2-main start 5679 "$cpus" 8G
				local units="v2-main" i
				for ((i = 1; i <= planes; i++)); do
					v2_env remote | sed "s/^N8N_ENGINE_PORT=.*/N8N_ENGINE_PORT=$((5700 + 10 * (i - 1)))/" |
						"$KIT/n8n.sh" "v2-e$i" engine $((5900 + i)) "$cpus" 6G
					units="$units v2-e$i"
				done
				echo "UNITS='$units' ENGINE=v2 BUDGET=$budget CPUS=$cpus MODE=remote WORKERS=$planes PORT=5679" > "$STATE"
			fi
			wait_n8n 5679
			;;
		compiled)
			local shards=$3 workers=$4 code=${5:-native}
			rm -f "$LT/engine/compiled/manifest.json"
			taskset -c "$LOADGEN_CPUS" "$NODE26/node" "$KIT/compiled.mjs" --pool "$DATA/pool.jsonl" --shards "$shards" --workers "$workers" \
				--cpus "$cpus" --code "$code" --work "$LT/engine/compiled" ${KEYS:+--keys "$KEYS"} > "$LT/logs/compiled.log" 2>&1 &
			local pid=$!
			local units="host svc" i
			for ((i = 0; i < shards; i++)); do units="$units wfrt-$i"; done
			echo "UNITS='$units' COMPILED_PID=$pid ENGINE=compiled-$code BUDGET=$budget CPUS=$cpus MODE=s${shards}w${workers} WORKERS=$workers SHARDS=$shards" > "$STATE"
			for _ in $(seq 1800); do [ -f "$LT/engine/compiled/manifest.json" ] && break; kill -0 $pid 2> /dev/null || break; sleep 1; done
			[ -f "$LT/engine/compiled/manifest.json" ] || { tail -20 "$LT/logs/compiled.log"; exit 1; }
			tail -1 "$LT/logs/compiled.log"
			;;
		*) echo "unknown engine $engine" >&2; exit 2 ;;
	esac
}

docker_cg() { local id; id=$(docker inspect -f '{{.Id}}' "$1" 2> /dev/null) && echo "/sys/fs/cgroup/system.slice/docker-$id.scope"; }

components() { # file
	# shellcheck disable=SC1090
	source "$STATE"
	local n out=() ncpu
	ncpu=$(echo "$CPUS" | tr ',' '\n' | wc -l)
	local gcpu
	gcpu=$(echo "$GYM_CPUS" | tr ',' '\n' | wc -l)
	{
		echo "{"
		for u in $UNITS; do echo "\"$u\": {\"cgroups\": [\"$(unit_cgroup "$u")\"], \"cpus\": $ncpu, \"role\": \"engine\"},"; done
		for c in lt-n8n-pg lt-redis; do
			n=$(docker_cg "$c") && docker inspect -f '{{.State.Running}}' "$c" 2> /dev/null | grep -q true &&
				echo "\"${c#lt-}\": {\"cgroups\": [\"$n\"], \"cpus\": $ncpu, \"role\": \"engine\"},"
		done
		echo "\"gym\": {\"cgroups\": [\"$(unit_cgroup gym)\"], \"cpus\": $gcpu, \"role\": \"gym\"},"
		echo "\"gym-db\": {\"cgroups\": [\"$(docker_cg lt-gym-pg)\", \"$(docker_cg lt-gym-mysql)\"], \"cpus\": $gcpu, \"role\": \"gym\"}"
		echo "}"
	} > "$1"
}

case ${1:-} in
	start) shift; start "$@" ;;
	stop) stop_all ;;
	components) components "$2" ;;
	state) cat "$STATE" ;;
	*) echo "usage: engine.sh start|stop|components|state" >&2; exit 2 ;;
esac
