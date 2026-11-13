#!/usr/bin/env bash
# Starts one n8n 2.42.2 process as a systemd unit, with vendor traffic sent
# to the gym (as engine-test/harness/up.sh does).
#
#   n8n.sh <name> <command> <port> <cpus> <memory> < extra-env
#
# command: start | worker | webhook | engine (the n8n CLI command)
# extra-env: more KEY=VALUE lines (database, queue mode, engine-v2 ...)
# The user folder is $LT/n8n-home/<name>.
set -euo pipefail
source "$(dirname "$0")/env.sh"
name=$1 cmd=$2 port=$3 cpus=$4 mem=$5
home=$LT/n8n-home/$name
mkdir -p "$home"
hosts_file=$LT/logs/gym-hosts.txt
if [ ! -s "$hosts_file" ]; then
	curl -fs -X POST -H 'authorization: Bearer harness' -H 'content-type: application/json' -d '{}' "$GYM_ADMIN/_gym/v1/ops/list_services" |
		"$NODE26/node" -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=new Set(["postgres.sim","mysql.sim"]);for(const v of JSON.parse(s).services||[])for(const h of v.hosts||[])o.add(h);console.log([...o].join(","))})' > "$hosts_file"
fi
extra=$(cat)
unit_env "$name" << EOF
PATH=$NODE26:/usr/bin:/bin
HOME=$home
TZ=UTC
LANG=C.UTF-8
NODE_EXTRA_CA_CERTS=$CA/ca.pem
NODE_OPTIONS=--require=$GYM_REPO/deploy/e2e/host/resolve.cjs --max-old-space-size=4096
GYM_ADDR=$GYM_ADDR
GYM_HOSTS=$(cat "$hosts_file")
GYM_DNS=$GYM_DNS
GYM_PORT_MAP=$GYM_PORT_MAP
N8N_PORT=$port
N8N_LISTEN_ADDRESS=127.0.0.1
N8N_USER_FOLDER=$home
N8N_DIAGNOSTICS_ENABLED=false
N8N_VERSION_NOTIFICATIONS_ENABLED=false
N8N_PERSONALIZATION_ENABLED=false
N8N_SECURE_COOKIE=false
N8N_ENCRYPTION_KEY=gymtest-encryption-key
N8N_RUNNERS_ENABLED=true
N8N_RUNNERS_BROKER_PORT=$((port + 1000))
WEBHOOK_URL=http://127.0.0.1:$port/
NODE_FUNCTION_ALLOW_BUILTIN=*
NODE_FUNCTION_ALLOW_EXTERNAL=*
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
EXECUTIONS_TIMEOUT=300
N8N_CONCURRENCY_PRODUCTION_LIMIT=-1
N8N_LOG_LEVEL=warn
N8N_LOG_OUTPUT=console
$extra
EOF
# The engine-v2 data plane must not see the control plane's database or key.
if [ "$cmd" = engine ]; then
	sed -i -E '/^(N8N_ENCRYPTION_KEY|DB_[A-Z_]+)=/d' "$LT/logs/$name.env"
fi
unit "$name" "$cpus" "$mem" "$home" "$N8N_BIN" "$cmd"
