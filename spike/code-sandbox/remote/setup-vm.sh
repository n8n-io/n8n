#!/usr/bin/env bash
# Prepares an Ubuntu VM (x86_64 or arm64) for the spike passes. It runs on the
# VM. remote.sh copies the two repositories first:
#
#   $REMOTE_DIR/n8n-opus                   this repository
#   $REMOTE_DIR/n8n-sandbox-service-opus   the sandbox service
#
# It is safe to run again. Steps that are done already are fast.
#
#   spike/code-sandbox/remote/setup-vm.sh [all|docker|tools|n8n|service|image|publish|stack|spike]
#
# A VM that got a copy of a built VM (remote.sh clone) needs only:
#   docker, tools, publish, stack, spike
set -euo pipefail
cd "$(dirname "$0")/../../.."
N8N_DIR="$(pwd)"
REMOTE_DIR="$(dirname "$N8N_DIR")"
SERVICE_DIR="$REMOTE_DIR/n8n-sandbox-service-opus"
ENV_FILE="$REMOTE_DIR/env.sh"
NODE_MAJOR="${NODE_MAJOR:-24}"
K6_VERSION="${K6_VERSION:-v2.3.0}"
API_PORT="${API_PORT:-18080}"
STEP="${1:-all}"

log() { echo "==> [$(date +%H:%M:%S)] $*"; }
want() { [[ "$STEP" == "all" || "$STEP" == "$1" ]]; }

if [[ "$STEP" == "docker" ]]; then
	if ! command -v docker >/dev/null; then
		log "Docker"
		curl -fsSL https://get.docker.com | sudo sh >/dev/null
	fi
	if ! id -nG | grep -qw docker; then
		sudo usermod -aG docker "$(whoami)"
		log "added $(whoami) to the docker group: the next SSH session has it"
	fi
	log "done (docker)"
	exit 0
fi

arch_node() { uname -m | sed 's/x86_64/x64/' | sed 's/aarch64/arm64/'; }
arch_go() { uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/'; }

write_env() {
	cat >"$ENV_FILE" <<EOF
# Environment of the spike passes on this VM. Source it before a pass.
export PATH="$REMOTE_DIR/tools/node/bin:$REMOTE_DIR/tools/bin:\$PATH"
export SPIKE_DIR="\${SPIKE_DIR:-\$HOME/n8n-spike}"
export SANDBOX_SERVICE_DIR="$SERVICE_DIR"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Host port of the sandbox API. Another service can hold 8080 on the VM.
export SANDBOX_API_PORT="\${SANDBOX_API_PORT:-$API_PORT}"
export N8N_SANDBOX_SERVICE_URL="http://127.0.0.1:\$SANDBOX_API_PORT"
export BASE_URL="\$N8N_SANDBOX_SERVICE_URL"
EOF
}

if want tools; then
	log "System packages"
	missing=()
	for p in build-essential python3 sqlite3 jq openssl rsync tmux zstd; do
		dpkg -s "$p" >/dev/null 2>&1 || missing+=("$p")
	done
	if ((${#missing[@]})); then
		sudo apt-get update -q
		sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${missing[@]}"
	fi
	docker info >/dev/null 2>&1 || {
		echo "docker is not usable by $(whoami). Install Docker and add the user to the docker group." >&2
		exit 1
	}

	mkdir -p "$REMOTE_DIR/tools/bin"
	if ! "$REMOTE_DIR/tools/node/bin/node" -v 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
		log "Node.js $NODE_MAJOR"
		base="https://nodejs.org/dist/latest-v$NODE_MAJOR.x"
		file="$(curl -fsSL "$base/SHASUMS256.txt" | awk -v a="linux-$(arch_node).tar.xz" '$2 ~ a"$" {print $2}')"
		rm -rf "$REMOTE_DIR/tools/node" && mkdir -p "$REMOTE_DIR/tools/node"
		curl -fsSL "$base/$file" | tar -xJ -C "$REMOTE_DIR/tools/node" --strip-components=1
	fi
	write_env
	# shellcheck disable=SC1090
	source "$ENV_FILE"
	log "pnpm (corepack)"
	corepack enable --install-directory "$REMOTE_DIR/tools/bin"
	(cd "$N8N_DIR" && corepack install >/dev/null)

	if ! "$REMOTE_DIR/tools/bin/k6" version 2>/dev/null | grep -q "$K6_VERSION"; then
		log "k6 $K6_VERSION"
		url="https://github.com/grafana/k6/releases/download/$K6_VERSION/k6-$K6_VERSION-linux-$(arch_go).tar.gz"
		curl -fsSL "$url" | tar -xz -C "$REMOTE_DIR/tools/bin" --strip-components=1 --wildcards '*/k6'
	fi
	node -v && pnpm -v && k6 version | head -1
fi

# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

if want n8n; then
	log "n8n: pnpm install"
	# The copy has no .git folder. CI=true skips the git hook install.
	CI=true pnpm install --frozen-lockfile >"$REMOTE_DIR/pnpm-install.log" 2>&1 || {
		tail -30 "$REMOTE_DIR/pnpm-install.log"
		exit 1
	}
	log "n8n: build (n8n, @n8n/n8n-benchmark, @n8n/code-runtime)"
	pnpm build --filter=n8n... --filter=@n8n/n8n-benchmark... --filter=@n8n/code-runtime... \
		>"$REMOTE_DIR/pnpm-build.log" 2>&1 || {
		tail -40 "$REMOTE_DIR/pnpm-build.log"
		exit 1
	}
fi

if want service; then
	log "Sandbox service: mTLS material and images"
	(
		cd "$SERVICE_DIR"
		bash scripts/bootstrap-mtls.sh \
			--api-san n8n-sandbox-service-api-local \
			--control-sans "n8n-sandbox-service-runner-dind-local-1,n8n-sandbox-service-runner-dind-local-2,localhost"
		# The API and runner containers run as other users. On Linux the file
		# modes apply (Docker Desktop ignores them). Test keys only.
		chmod -R a+rX .tls
		ARCH="$(arch_go)" docker compose -f compose.yaml --profile build build >"$REMOTE_DIR/service-build.log" 2>&1 || {
			tail -40 "$REMOTE_DIR/service-build.log"
			exit 1
		}
	)
fi

if [[ "$STEP" != "tools" && -z "${N8N_SANDBOX_SERVICE_URL:-}" ]]; then
	echo "run the tools step first: $ENV_FILE has no N8N_SANDBOX_SERVICE_URL" >&2
	exit 1
fi

if want image || want publish || want stack; then
	log "Sandbox service: registry"
	spike/code-sandbox/scripts/compose.sh up -d registry >/dev/null
fi

if want image; then
	log "Code sandbox image"
	SANDBOX_SERVICE_DIR="$SERVICE_DIR" docker/images/code-sandbox/build.sh n8n-code-sandbox:local \
		>"$REMOTE_DIR/image-build.log" 2>&1 || {
		tail -40 "$REMOTE_DIR/image-build.log"
		exit 1
	}
fi

if want image || want publish; then
	log "Push the code sandbox image to the local registry"
	docker tag n8n-code-sandbox:local localhost:5050/n8n-code-sandbox:latest
	docker push -q localhost:5050/n8n-code-sandbox:latest
	# The runners also need a general sandbox image. The passes do not use it.
	# A copied VM has no such image: use the code image, which costs no disk.
	if ! docker image inspect "n8n-sandbox:latest-$(arch_go)" >/dev/null 2>&1; then
		docker tag n8n-code-sandbox:local "n8n-sandbox:latest-$(arch_go)"
	fi
fi

if want stack; then
	log "Sandbox service: start the stack"
	spike/code-sandbox/scripts/compose.sh up -d >/dev/null
	for r in 1 2; do
		c="n8n-sandbox-service-runner-dind-local-$r"
		until [[ "$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null)" == "healthy" ]]; do sleep 2; done
		# A runner pulls the code image only when it does not have the tag.
		docker exec "$c" docker pull -q registry:5000/n8n-code-sandbox:latest >/dev/null
	done
	until curl -sf "$N8N_SANDBOX_SERVICE_URL/healthz" >/dev/null; do sleep 1; done
	log "API is up at $N8N_SANDBOX_SERVICE_URL"
fi

if want spike; then
	log "n8n for the spike: files, workflows"
	mkdir -p "$SPIKE_DIR"
	# W5_SIZES="1mb:1" skips the 100 MB and 1 GiB files on a small disk.
	SPIKE_DIR="$SPIKE_DIR" spike/code-sandbox/scripts/setup.sh
fi

log "done ($STEP)"
