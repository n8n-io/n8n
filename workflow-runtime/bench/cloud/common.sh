# Shared settings and helpers of the cloud benchmark scripts. Source it.
#
# CPU layout on one machine: the last AUX cores (default a quarter, at
# least 2) run the load generator and the stubs; the others are the server
# cores. `wfrt` with S shards gets the first S server cores. With a second
# machine (LOADGEN_SSH=user@host, SERVER_IP=<this machine's private IP>),
# the load generator runs there and the AUX cores only run the stubs.

KIT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
RUNTIME=$(cd "$KIT/../.." && pwd)
REPO=$(cd "$RUNTIME/.." && pwd)
TOOLS=${TOOLS:-$HOME/.cache/wfrt-bench}
export PATH=$TOOLS/bin:$PATH
WFRT=$RUNTIME/zig-out/bin/wfrt
HOST_JS=$REPO/packages/@n8n/workflow-fallback-host/dist/main.js

IS_LINUX=0
[ "$(uname -s)" = Linux ] && IS_LINUX=1
NCPU=$(getconf _NPROCESSORS_ONLN 2> /dev/null || sysctl -n hw.ncpu)
AUX=${AUX:-$(( NCPU / 4 > 2 ? NCPU / 4 : 2 ))}
SERVER_N=$(( NCPU - AUX ))
[ "$SERVER_N" -ge 1 ] || { echo "too few cores ($NCPU) for AUX=$AUX" >&2; exit 2; }
export SERVER_CPUS="0-$(( SERVER_N - 1 ))"
export AUX_CPUS="$SERVER_N-$(( NCPU - 1 ))"
LOADGEN_SSH=${LOADGEN_SSH:-}
SERVER_IP=${SERVER_IP:-127.0.0.1}
# Where the load generator connects and where control APIs listen.
BIND=127.0.0.1
[ -n "$LOADGEN_SSH" ] && BIND=0.0.0.0
NICE=${NICE:-}

# "0-3" for the first n server cores.
first_cpus() { echo "0-$(( $1 - 1 ))"; }

# Runs a command pinned to a CPU list (Linux), or as is (macOS).
pin() {
  local cpus=$1; shift
  if [ "$IS_LINUX" = 1 ]; then $NICE taskset -c "$cpus" "$@"; else $NICE "$@"; fi
}

# The same for a background command: `pinx cpus cmd... &`. A function run
# with & is a subshell; `exec` makes the command take its PID, so `$!` is
# the command itself and `kill $!` stops it.
pinx() {
  local cpus=$1; shift
  if [ "$IS_LINUX" = 1 ]; then exec $NICE taskset -c "$cpus" "$@"; else exec $NICE "$@"; fi
}

# Stops a background process: TERM, then KILL after 5 s.
stop_pid() {
  kill "$1" 2> /dev/null || return 0
  for _ in $(seq 1 50); do kill -0 "$1" 2> /dev/null || return 0; sleep 0.1; done
  kill -9 "$1" 2> /dev/null || true
}

# CPU seconds of a process and all its descendants.
cpu_tree() {
  local root=$1
  if [ "$IS_LINUX" = 1 ]; then
    local tck; tck=$(getconf CLK_TCK)
    # `cat` goes on past a process that ends while it reads /proc (mawk
    # would stop); each stat line starts with the pid.
    { cat /proc/[0-9]*/stat 2> /dev/null || true; } | awk -v root="$root" -v tck="$tck" '
      { pid = $1; line = $0; sub(/.*\) /, "", line); split(line, f, " ");
        ppid[pid] = f[2]; cpu[pid] = (f[12] + f[13]) / tck }
      END { mine[root] = 1; grew = 1
            while (grew) { grew = 0; for (p in ppid) if ((ppid[p] in mine) && !(p in mine)) { mine[p] = 1; grew = 1 } }
            t = 0; for (p in mine) t += cpu[p]; printf "%.2f", t }'
  else
    local pids; pids=$( { echo "$root"; pgrep -P "$root" || true; } | paste -sd, -)
    { ps -o cputime= -p "$pids" 2> /dev/null || true; } | awk -F: '{ s = 0; for (i = 1; i <= NF; i++) s = s * 60 + $i; t += s } END { printf "%.2f", t }'
  fi
}

load1() {
  if [ "$IS_LINUX" = 1 ]; then cut -d' ' -f1 /proc/loadavg; else sysctl -n vm.loadavg | awk '{ print $2 }'; fi
}

# The load generator, here on the AUX cores or on the second machine.
REMOTE_DIR=${REMOTE_DIR:-wfrt-loadgen}
loadgen_setup() {
  [ -z "$LOADGEN_SSH" ] && return 0
  ssh "$LOADGEN_SSH" "mkdir -p $REMOTE_DIR"
  scp -q "$WFRT" "$KIT/synth/drive.mjs" "$LOADGEN_SSH:$REMOTE_DIR/"
}
wfrt_load() { # args of `wfrt load` without --host
  if [ -n "$LOADGEN_SSH" ]; then
    ssh "$LOADGEN_SSH" "$REMOTE_DIR/wfrt load --host $SERVER_IP $*"
  else
    pin "$AUX_CPUS" "$WFRT" load "$@"
  fi
}
drive() { # args of drive.mjs; --control is added
  local control=$1; shift
  if [ -n "$LOADGEN_SSH" ]; then
    ssh "$LOADGEN_SSH" "node $REMOTE_DIR/drive.mjs --control http://$SERVER_IP:$control --target $SERVER_IP --out $REMOTE_DIR/drive.out $*" | tail -n +1
  else
    pin "$AUX_CPUS" node "$KIT/synth/drive.mjs" --control "http://127.0.0.1:$control" "$@"
  fi
}

# Shard counts: SHARDS_LIST, or 1 2 4 8 and all server cores, at most SERVER_N.
shard_list() {
  local list=${SHARDS_LIST:-"1 2 4 8 $SERVER_N"}
  for s in $list; do [ "$s" -le "$SERVER_N" ] && echo "$s"; done | sort -n | uniq
}

wait_for_file() { # file seconds
  for _ in $(seq 1 $(( $2 * 10 ))); do [ -e "$1" ] && return 0; sleep 0.1; done
  return 1
}
