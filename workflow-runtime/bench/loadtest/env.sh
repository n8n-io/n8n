# Shared settings of the load test on one Linux VM. Source it.
#
# The CPU layout is for a 16-vCPU machine with SMT, where vCPU n and n+8
# are the two threads of one physical core. Each part gets whole physical
# cores where it can:
#   system         vCPU 0
#   load generator vCPU 1,9   (one physical core)
#   gym            vCPU 2,3,10,11,8 (GYM_CPUS; GYM_EXTRA adds 7,15)
#   engine         vCPU 4,12,5,13,6,14,7,15, in that order: a budget of
#                  b vCPUs takes the first b, so 2, 4, 6 and 8 are whole
#                  physical cores. A budget of 1 is one thread of a core
#                  whose other thread stays idle.
LT=${LT:-$HOME/wfrt-loadtest}
KIT=$LT/kit
DATA=$LT/data
SRC=$LT/src
RESULTS=$LT/results
TOOLS=$LT/tools
NODE26=$LT/e2e-cache/node-v26.7.0/bin
N8N_BIN=$LT/e2e-cache/n8n-2.42.2-node26/node_modules/.bin/n8n
GYM_REPO=$LT/ai-gym
CA=$DATA/engine-test/harness/ca
SYS_CPUS=0
LOADGEN_CPUS=1,9
GYM_CPUS=${GYM_CPUS:-2,3,10,11,8}
ENGINE_ORDER=(4 12 5 13 6 14 7 15)
GYM_ADMIN_PORT=47090
GYM_HTTPS_PORT=47443
GYM_DNS_PORT=47053
GYM_PG_PORT=56432
GYM_MYSQL_PORT=53306
export GYM_ADMIN=http://127.0.0.1:$GYM_ADMIN_PORT
export GYM_ADDR=10.255.0.53
export GYM_DNS=127.0.0.1:$GYM_DNS_PORT
export GYM_PORT_MAP=443=$GYM_HTTPS_PORT,5432=$GYM_PG_PORT,3306=$GYM_MYSQL_PORT
export ENGINE_TEST_DIR=$DATA/engine-test
UIDGID="--uid=$(id -u) --gid=$(id -g)"

# engine_cpus <b>: the vCPU list of an engine budget of b vCPUs.
engine_cpus() {
	local b=$1 out=() i
	for ((i = 0; i < b; i++)); do out+=("${ENGINE_ORDER[$i]}"); done
	local IFS=,
	echo "${out[*]}"
}

# unit <name> <cpus> <memory> <workdir> <command...>: starts a command as a
# transient systemd service (as this user) with a CPU set and a memory
# limit. Its output goes to $LT/logs/<name>.log. Stop it with unit_stop.
unit() {
	local name=$1 cpus=$2 mem=$3 dir=$4
	shift 4
	mkdir -p "$LT/logs"
	sudo systemctl reset-failed "lt-$name" > /dev/null 2>&1 || true
	sudo systemd-run --quiet --unit="lt-$name" --slice=lt.slice $UIDGID \
		-p AllowedCPUs="$cpus" -p MemoryMax="$mem" -p MemorySwapMax=0 -p KillMode=control-group \
		-p StandardOutput="append:$LT/logs/$name.log" -p StandardError="append:$LT/logs/$name.log" \
		--working-directory="$dir" -p EnvironmentFile="$LT/logs/$name.env" "$@"
}
# unit_env <name>: writes the environment of the next unit <name> from stdin.
unit_env() { mkdir -p "$LT/logs"; cat > "$LT/logs/$1.env"; }
unit_stop() { sudo systemctl stop "lt-$1" > /dev/null 2>&1 || true; sudo systemctl reset-failed "lt-$1" > /dev/null 2>&1 || true; }
unit_cgroup() { echo "/sys/fs/cgroup/lt.slice/lt-$1.service"; }

wait_http() { # url seconds
	local i
	for ((i = 0; i < $2 * 5; i++)); do curl -fs -o /dev/null "$1" && return 0; sleep 0.2; done
	return 1
}
