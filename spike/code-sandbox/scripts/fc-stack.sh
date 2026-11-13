#!/usr/bin/env bash
# Runs the sandbox service stack on a Firecracker host: the API and one
# Firecracker runner as host processes (no Docker). It takes the subset of the
# compose.sh arguments that the passes use, so it can replace compose.sh:
#
#   COMPOSE=spike/code-sandbox/scripts/fc-stack.sh RUNNER_BACKEND=firecracker \
#     spike/code-sandbox/scripts/full-pass.sh
#
#   fc-stack.sh up [-d] [--no-deps] [--force-recreate] [api]   (re)start API and runner
#   fc-stack.sh stop [api] | down                                stop both
#   fc-stack.sh status
#
# The runner restarts with the API: its shutdown deletes all microVMs, and the
# API store starts empty, as after a restart of the API container.
#
# Needs: bin/api and bin/runner-firecracker in SANDBOX_SERVICE_DIR (make api
# runner-firecracker), the regular Firecracker template and snapshot, and the
# golden code snapshot (scripts/firecracker.ee/build-code-snapshot.sh).
#
#   SANDBOX_API_PORT     API port (default 8080)
#   FC_DIR               state, logs and TLS material (default $HOME/n8n-spike/fc)
#   FC_DATA_DIR          runner data dir; keep it on the file system of the
#                        templates (XFS with reflink) (default /srv/firecracker/sandboxes)
#   FC_CAPACITY          runner slots (default 128)
#   CPUSET               CPUs for the API, the runner and its microVMs, for
#                        example 0-15 (default: all)
#   SANDBOX_CODE_POOLS, SANDBOX_CODE_POOL_REFILL_CONCURRENCY,
#   SANDBOX_CODE_POOL_REFILL_DELAY, SANDBOX_CODE_IDLE_DELETE_AFTER: passed to the API
set -euo pipefail
cd "$(dirname "$0")/../../.."

SANDBOX_SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"
PORT="${SANDBOX_API_PORT:-8080}"
FC_DIR="${FC_DIR:-$HOME/n8n-spike/fc}"
FC_DATA_DIR="${FC_DATA_DIR:-/srv/firecracker/sandboxes}"
FC_CAPACITY="${FC_CAPACITY:-128}"
CODE_TEMPLATE_DIR="${CODE_TEMPLATE_DIR:-/srv/firecracker/code-template}"
CODE_SNAPSHOT_DIR="${CODE_SNAPSHOT_DIR:-/srv/firecracker/code-snapshot}"
API_GRPC_ADDR=127.0.0.1:19090
RUNNER_ADDR=127.0.0.1:18082
RUNNER_CONTROL_ADDR=127.0.0.1:19091
API_KEY="${N8N_SANDBOX_SERVICE_API_KEY:-test}"
RUNNER_KEY=runner-spike
REG_TOKEN=spike-reg-token
API_TLS_DNS=sandbox-api-spike
TLS="$FC_DIR/tls"
mkdir -p "$FC_DIR"

# Children inherit the CPU affinity, so the jailer and the microVMs of the
# runner run on CPUSET too.
PIN=()
[[ -n "${CPUSET:-}" ]] && PIN=(taskset -c "$CPUSET")

stop_stack() {
	local pid
	if [[ -f "$FC_DIR/runner.pid" ]]; then
		pid="$(cat "$FC_DIR/runner.pid")"
		# SIGTERM: the runner shutdown deletes its microVMs.
		sudo kill "$pid" 2>/dev/null || true
		for _ in $(seq 1 60); do
			sudo kill -0 "$pid" 2>/dev/null || break
			sleep 1
		done
		sudo kill -9 "$pid" 2>/dev/null || true
		rm -f "$FC_DIR/runner.pid"
	fi
	if [[ -f "$FC_DIR/api.pid" ]]; then
		pid="$(cat "$FC_DIR/api.pid")"
		kill "$pid" 2>/dev/null || true
		for _ in $(seq 1 30); do
			kill -0 "$pid" 2>/dev/null || break
			sleep 1
		done
		kill -9 "$pid" 2>/dev/null || true
		rm -f "$FC_DIR/api.pid"
	fi
	# Startup reconcile of the runner removes the rest. Leftover jails and
	# namespaces of a killed runner go here.
	sudo pkill -x firecracker 2>/dev/null || true
	sudo sh -c 'rm -rf /srv/jailer/firecracker/sandbox-*' 2>/dev/null || true
	sudo ip netns list | awk '{print $1}' | grep '^fc-sb-' | xargs -r -n1 sudo ip netns delete 2>/dev/null || true
}

start_stack() {
	if [[ ! -f "$TLS/api/ca.crt" ]]; then
		bash "$SANDBOX_SERVICE_DIR/scripts/bootstrap-mtls.sh" --out-dir "$TLS" \
			--api-san "$API_TLS_DNS" --control-sans localhost --force >/dev/null
	fi
	# A restart empties the API store, as with the API container.
	rm -rf "$FC_DIR/api-data"
	mkdir -p "$FC_DIR/api-data"
	sudo mkdir -p "$FC_DATA_DIR"

	local api_env=(
		SANDBOX_API_LISTEN_ADDR="127.0.0.1:${PORT}"
		SANDBOX_API_GRPC_LISTEN_ADDR="$API_GRPC_ADDR"
		SANDBOX_API_DATA_DIR="$FC_DIR/api-data"
		SANDBOX_API_KEYS="$API_KEY"
		SANDBOX_API_RUNNER_REGISTRATION_TOKEN="$REG_TOKEN"
		SANDBOX_API_RUNNER_API_KEY="$RUNNER_KEY"
		SANDBOX_API_GRPC_TLS_CERT_FILE="$TLS/api/grpc-server.crt"
		SANDBOX_API_GRPC_TLS_KEY_FILE="$TLS/api/grpc-server.key"
		SANDBOX_API_GRPC_TLS_CLIENT_CA_FILE="$TLS/api/ca.crt"
		SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CA_FILE="$TLS/api/ca.crt"
		SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_CERT_FILE="$TLS/api/control-grpc-api-client.crt"
		SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_KEY_FILE="$TLS/api/control-grpc-api-client.key"
		SANDBOX_API_RUNNER_CONTROL_GRPC_TLS_SERVER_NAME=localhost
		SANDBOX_CODE_POOLS="${SANDBOX_CODE_POOLS:-}"
		SANDBOX_CODE_POOL_REFILL_CONCURRENCY="${SANDBOX_CODE_POOL_REFILL_CONCURRENCY:-2}"
		SANDBOX_CODE_POOL_REFILL_DELAY="${SANDBOX_CODE_POOL_REFILL_DELAY:-0s}"
		SANDBOX_CODE_IDLE_DELETE_AFTER="${SANDBOX_CODE_IDLE_DELETE_AFTER:-2m}"
	)
	(
		setsid nohup env "${api_env[@]}" "${PIN[@]}" "$SANDBOX_SERVICE_DIR/bin/api" >>"$FC_DIR/api.log" 2>&1 </dev/null &
		echo $! >"$FC_DIR/api.pid"
	)
	for _ in $(seq 1 60); do
		curl -sf "http://127.0.0.1:${PORT}/healthz" >/dev/null && break
		sleep 0.5
	done

	local runner_env=(
		SANDBOX_RUNNER_LISTEN_ADDR="$RUNNER_ADDR"
		SANDBOX_RUNNER_DATA_DIR="$FC_DATA_DIR"
		SANDBOX_RUNNER_API_KEYS="$RUNNER_KEY"
		SANDBOX_RUNNER_API_GRPC_ADDR="$API_GRPC_ADDR"
		SANDBOX_RUNNER_REGISTRATION_TOKEN="$REG_TOKEN"
		SANDBOX_RUNNER_REGISTRATION_GRPC_CA_FILE="$TLS/runner/ca.crt"
		SANDBOX_RUNNER_REGISTRATION_GRPC_CERT_FILE="$TLS/runner/grpc-client.crt"
		SANDBOX_RUNNER_REGISTRATION_GRPC_KEY_FILE="$TLS/runner/grpc-client.key"
		SANDBOX_RUNNER_REGISTRATION_GRPC_SERVER_NAME="$API_TLS_DNS"
		SANDBOX_RUNNER_HTTP_BASE_URL="https://localhost:${RUNNER_ADDR##*:}"
		SANDBOX_RUNNER_CONTROL_GRPC_LISTEN_ADDR="$RUNNER_CONTROL_ADDR"
		SANDBOX_RUNNER_CONTROL_GRPC_ADVERTISE_ADDR="localhost:${RUNNER_CONTROL_ADDR##*:}"
		SANDBOX_RUNNER_CONTROL_GRPC_TLS_CERT_FILE="$TLS/runner/control-grpc-server.crt"
		SANDBOX_RUNNER_CONTROL_GRPC_TLS_KEY_FILE="$TLS/runner/control-grpc-server.key"
		SANDBOX_RUNNER_CONTROL_GRPC_TLS_CLIENT_CA_FILE="$TLS/runner/ca.crt"
		SANDBOX_RUNNER_ID=spike-firecracker-runner
		SANDBOX_RUNNER_CAPACITY_TOTAL="$FC_CAPACITY"
		SANDBOX_RUNNER_FIRECRACKER_PROXY_PORT_START=18100
		SANDBOX_RUNNER_FIRECRACKER_CODE_TEMPLATE_DIR="$CODE_TEMPLATE_DIR"
		SANDBOX_RUNNER_FIRECRACKER_CODE_SNAPSHOT_DIR="$CODE_SNAPSHOT_DIR"
	)
	# The runner log goes to a file the calling user can read.
	# shellcheck disable=SC2024
	sudo -b sh -c 'echo $$ >"$1"; shift; exec "$@"' sh "$FC_DIR/runner.pid" \
		env "${runner_env[@]}" "${PIN[@]}" \
		"$SANDBOX_SERVICE_DIR/bin/runner-firecracker" >>"$FC_DIR/runner.log" 2>&1
	# Admission runs a canary: this can take a while on the first start.
	for _ in $(seq 1 240); do
		curl -skf "https://${RUNNER_ADDR}/readyz" >/dev/null && return 0
		sleep 0.5
	done
	echo "Firecracker runner did not become ready, see $FC_DIR/runner.log" >&2
	return 1
}

cmd="${1:-}"
shift || true
case "$cmd" in
up)
	stop_stack
	start_stack
	;;
stop | down)
	stop_stack
	;;
status)
	for p in api runner; do
		if [[ -f "$FC_DIR/$p.pid" ]] && sudo kill -0 "$(cat "$FC_DIR/$p.pid")" 2>/dev/null; then
			echo "$p: running ($(cat "$FC_DIR/$p.pid"))"
		else
			echo "$p: stopped"
		fi
	done
	;;
*)
	echo "usage: $0 up|stop|down|status" >&2
	exit 1
	;;
esac
