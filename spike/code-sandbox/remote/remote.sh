#!/usr/bin/env bash
# Runs the spike passes on a remote Linux VM: copies the code, prepares the VM,
# starts a pass in the background, and fetches the results.
#
#   spike/code-sandbox/remote/remote.sh sync
#   spike/code-sandbox/remote/remote.sh setup [all|tools|n8n|service|image|stack|spike]
#   spike/code-sandbox/remote/remote.sh run <name> <script> [VAR=value ...]
#   spike/code-sandbox/remote/remote.sh status [name]
#   spike/code-sandbox/remote/remote.sh stop <name>
#   spike/code-sandbox/remote/remote.sh fetch <name>
#   spike/code-sandbox/remote/remote.sh ssh [command]
#   REMOTE=user@small-vm spike/code-sandbox/remote/remote.sh clone user@built-vm
#
# Example (warm pool pass, results in $LOCAL_RESULTS/run5):
#   remote.sh sync && remote.sh setup && remote.sh run run5 pool-pass.sh
#
#   REMOTE         user@host of the VM (required)
#   SSH_KEY        private key (optional; without it, ssh uses its usual keys)
#   REMOTE_DIR     folder on the VM for the repositories (default: spike, in the home folder)
#   LOCAL_RESULTS  local folder for fetched results (default: /tmp/n8n-spike/remote)
set -euo pipefail
cd "$(dirname "$0")/../../.."
N8N_DIR="$(pwd)"
SERVICE_DIR="$(cd "${SANDBOX_SERVICE_DIR:-../n8n-sandbox-service-opus}" && pwd)"

REMOTE="${REMOTE:?set REMOTE=user@host of the VM}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_DIR="${REMOTE_DIR:-spike}"
LOCAL_RESULTS="${LOCAL_RESULTS:-/tmp/n8n-spike/remote}"
SSH=(ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
if [[ -n "$SSH_KEY" ]]; then SSH+=(-i "$SSH_KEY"); fi
RSYNC_SSH="ssh ${SSH_KEY:+-i $SSH_KEY} -o StrictHostKeyChecking=accept-new"

# Results of a pass are in $SPIKE_DIR/<name> on the VM ($HOME/n8n-spike by default).
remote() { "${SSH[@]}" "$REMOTE" "cd $REMOTE_DIR/n8n-opus && source ../env.sh && $*"; }

cmd="${1:-}"
shift || true
case "$cmd" in
sync)
	"${SSH[@]}" "$REMOTE" "mkdir -p $REMOTE_DIR"
	excludes=(--exclude node_modules --exclude .turbo --exclude coverage --exclude .git --exclude '*.log')
	echo "==> n8n"
	# dist folders are build output: the VM builds its own.
	rsync -az --delete -e "$RSYNC_SSH" "${excludes[@]}" --exclude dist --exclude .agent-setup \
		"$N8N_DIR/" "$REMOTE:$REMOTE_DIR/n8n-opus/"
	echo "==> sandbox service"
	rsync -az --delete -e "$RSYNC_SSH" "${excludes[@]}" --exclude .tls --exclude bin \
		"$SERVICE_DIR/" "$REMOTE:$REMOTE_DIR/n8n-sandbox-service-opus/"
	;;
setup)
	# setup-vm.sh writes env.sh, so it cannot use remote() for the first run.
	"${SSH[@]}" "$REMOTE" "cd $REMOTE_DIR/n8n-opus && spike/code-sandbox/remote/setup-vm.sh ${1:-all}"
	;;
run)
	name="${1:?usage: run <name> <script> [VAR=value ...]}"
	script="${2:?usage: run <name> <script> [VAR=value ...]}"
	shift 2
	# AB_DIR is the result folder of the A/B pass scripts. setsid keeps the
	# pass alive when the SSH session ends.
	# The subshell exits at once, so the SSH session does not wait for the pass.
	remote "mkdir -p \$SPIKE_DIR/$name && (setsid nohup env AB_DIR=\$SPIKE_DIR/$name $* spike/code-sandbox/scripts/$script \
		>\$SPIKE_DIR/$name/pass.log 2>&1 < /dev/null &) && echo started $name"
	;;
status)
	name="${1:-}"
	remote "uptime; pgrep -fa 'pass.sh' | grep -v pgrep || echo 'no pass runs'; \
		[ -n '$name' ] && tail -5 \$SPIKE_DIR/$name/progress.log 2>/dev/null || true"
	;;
stop)
	name="${1:?usage: stop <name>}"
	# The pass script stops n8n and the load sampler in its EXIT trap.
	remote "for p in \$(pgrep -f 'pass.sh'); do kill -- -\$(ps -o pgid= \$p | tr -d ' ') 2>/dev/null; done; sleep 3; \
		pgrep -fa 'pass.sh|bin/n8n' | grep -v pgrep || echo stopped"
	;;
fetch)
	name="${1:?usage: fetch <name>}"
	mkdir -p "$LOCAL_RESULTS/$name"
	rsync -az -e "$RSYNC_SSH" --exclude '*.bin' \
		"$REMOTE:n8n-spike/$name/" "$LOCAL_RESULTS/$name/"
	echo "fetched to $LOCAL_RESULTS/$name"
	;;
ssh)
	if (($#)); then remote "$@"; else "${SSH[@]}" "$REMOTE"; fi
	;;
clone)
	# Copies a built VM to REMOTE, so that a small VM does not build n8n or the
	# images. It runs at low priority, because a pass can run on the source. The
	# images are the amd64 builds. The data goes from VM to VM: SSH agent forwarding lets the source
	# VM log in to REMOTE without a key file on it.
	src="${1:?usage: REMOTE=<target> clone <source user@host>}"
	if [[ -n "$SSH_KEY" ]]; then
		ssh-add -l 2>/dev/null | grep -q "$(ssh-keygen -lf "$SSH_KEY" | awk '{print $2}')" || {
			echo "add the key to your SSH agent first: ssh-add $SSH_KEY" >&2
			exit 1
		}
	fi
	target_host="$REMOTE"
	"${SSH[@]}" -A "$src" "ssh -o StrictHostKeyChecking=accept-new $target_host true"
	echo "==> repositories, node_modules, build output and tools"
	"${SSH[@]}" -A "$src" "nice -n 19 rsync -aH --delete --info=stats1 -e 'ssh -o StrictHostKeyChecking=accept-new' \
		$REMOTE_DIR/ $target_host:$REMOTE_DIR/"
	echo "==> Docker on the target"
	"${SSH[@]}" "$REMOTE" "(command -v docker >/dev/null || curl -fsSL https://get.docker.com | sudo sh >/dev/null) && \
		(id -nG | grep -qw docker || sudo usermod -aG docker \$(whoami)) && \
		(command -v zstd >/dev/null || sudo apt-get install -y -q zstd >/dev/null)"
	echo "==> Docker images"
	images="n8n-sandbox-service-api:latest-amd64 n8n-sandbox-service-runner-dind:latest-amd64 n8n-code-sandbox:local registry:2 docker:29.3.1-cli"
	"${SSH[@]}" -A "$src" "docker save $images | nice -n 19 zstd -1 -T2 | ssh $target_host 'zstd -d | docker load'"
	echo "Next: remote.sh sync (the scripts of this checkout), then remote.sh setup <tools|publish|stack|spike>"
	;;
*)
	sed -n '2,25p' "$0"
	exit 1
	;;
esac
