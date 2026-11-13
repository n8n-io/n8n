#!/usr/bin/env bash
# Starts or stops the test bed of the load test: the gym, and the Postgres
# and MySQL servers of its database vendors, all on the gym CPU set.
#
#   bed.sh up [procs]   procs: GOMAXPROCS of the gym (default: the size of GYM_CPUS)
#   bed.sh down
#   bed.sh restart [procs]
set -euo pipefail
source "$(dirname "$0")/env.sh"
cmd=${1:-up}
ncpu=$(echo "$GYM_CPUS" | tr ',' '\n' | wc -l)
procs=${2:-$ncpu}

down() {
	unit_stop gym
	docker rm -f lt-gym-pg lt-gym-mysql > /dev/null 2>&1 || true
}

up() {
	mkdir -p "$LT/gym-data" "$LT/logs"
	if ! docker inspect lt-gym-pg > /dev/null 2>&1; then
		docker run -d --name lt-gym-pg --cpuset-cpus="$GYM_CPUS" -m 4g -p 127.0.0.1:$GYM_PG_PORT:5432 \
			-e POSTGRES_HOST_AUTH_METHOD=trust postgres:17 -c max_connections=400 -c fsync=off > /dev/null
	fi
	if ! docker inspect lt-gym-mysql > /dev/null 2>&1; then
		docker run -d --name lt-gym-mysql --cpuset-cpus="$GYM_CPUS" -m 4g -p 127.0.0.1:$GYM_MYSQL_PORT:3306 \
			-e MYSQL_ROOT_PASSWORD=gymmy mysql:8.4 --skip-log-bin --default-time-zone=+00:00 --max-connections=500 > /dev/null
	fi
	for _ in $(seq 120); do docker exec lt-gym-pg pg_isready -q 2> /dev/null && break; sleep 1; done
	for _ in $(seq 120); do docker exec lt-gym-mysql mysqladmin -uroot -pgymmy ping > /dev/null 2>&1 && break; sleep 1; done
	unit_env gym << EOF
SIM_HARNESS_TOKEN=harness
SIM_PG_ADMIN_HOST=127.0.0.1
SIM_PG_ADMIN_PORT=$GYM_PG_PORT
SIM_PG_ADMIN_USER=postgres
SIM_PG_ADMIN_PASSWORD=unused
SIM_PG_TEMPLATE_EXTENSIONS=" "
SIM_PG_PUBLIC_HOST=postgres.sim
SIM_PG_PUBLIC_PORT=5432
SIM_MYSQL_ADMIN_HOST=127.0.0.1
SIM_MYSQL_ADMIN_PORT=$GYM_MYSQL_PORT
SIM_MYSQL_ADMIN_PASSWORD=gymmy
SIM_MYSQL_PUBLIC_HOST=mysql.sim
SIM_MYSQL_PUBLIC_PORT=3306
EOF
	unit gym "$GYM_CPUS" 16G "$LT" "$TOOLS/gym" -data-dir="$LT/gym-data" -dns-listen=127.0.0.1:$GYM_DNS_PORT \
		-dns-answer=$GYM_ADDR -bind-https=127.0.0.1:$GYM_HTTPS_PORT -admin=127.0.0.1:$GYM_ADMIN_PORT -ca-dir="$CA" \
		-egress-allow=127.0.0.1 -mem-limit 12288 -procs "$procs" -log-level=warn
	wait_http "$GYM_ADMIN/readyz" 60 || { tail -20 "$LT/logs/gym.log"; exit 1; }
	echo "gym up on $GYM_CPUS (procs $procs)"
}

case $cmd in
	up) up ;;
	down) down ;;
	restart) unit_stop gym; up ;;
	*) echo "usage: bed.sh up|down|restart [procs]" >&2; exit 2 ;;
esac
