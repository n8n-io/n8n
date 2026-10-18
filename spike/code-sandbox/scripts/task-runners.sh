#!/usr/bin/env bash
# Starts or stops the task runners container for the baseline in external
# mode (N8N_RUNNERS_MODE=external in start-n8n.sh). The image version must
# match n8n.
#
#   spike/code-sandbox/scripts/task-runners.sh start|stop|status
#
#   RUNNERS_IMAGE  default n8nio/runners:<version of packages/cli>
set -euo pipefail
cd "$(dirname "$0")/../../.."
NAME=n8n-spike-task-runners
VERSION="$(node -p 'require("./packages/cli/package.json").version')"
IMAGE="${RUNNERS_IMAGE:-n8nio/runners:$VERSION}"
TOKEN="${N8N_RUNNERS_AUTH_TOKEN:-spike-runners-token}"

case "${1:-}" in
start)
	docker rm -f "$NAME" >/dev/null 2>&1 || true
	docker pull -q "$IMAGE" >/dev/null
	# Bridge network: the launcher and runner health ports (5680, 5681) would
	# collide with the echo server on the host network.
	docker run -d --name "$NAME" --add-host=host.docker.internal:host-gateway \
		-e N8N_RUNNERS_TASK_BROKER_URI=http://host.docker.internal:5679 \
		-e N8N_RUNNERS_AUTH_TOKEN="$TOKEN" \
		"$IMAGE" javascript >/dev/null
	echo "started $NAME ($IMAGE)"
	;;
stop)
	docker rm -f "$NAME" >/dev/null 2>&1 || true
	;;
status)
	docker ps --filter "name=$NAME" --format '{{.Names}} {{.Image}} {{.Status}}'
	;;
*)
	sed -n '2,9p' "$0"
	exit 1
	;;
esac
