#!/usr/bin/env bash
# Prints the facts about this machine that a benchmark result needs, as
# JSON: CPU model, cores, kernel, governor, memory, load, and the CPU
# lists of the run. Linux; on macOS it prints what it can.
#   bench/cloud/sysinfo.sh <label> > sysinfo-<label>.json
set -uo pipefail
label=${1:-now}
os=$(uname -s)
kernel=$(uname -r)
cores=$(getconf _NPROCESSORS_ONLN 2> /dev/null || sysctl -n hw.ncpu)
if [ "$os" = Linux ]; then
  model=$(awk -F: '/model name/ { sub(/^ /, "", $2); print $2; exit }' /proc/cpuinfo)
  [ -z "$model" ] && model=$(lscpu 2> /dev/null | awk -F: '/Model name/ { gsub(/^ +/, "", $2); print $2; exit }')
  governor=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2> /dev/null || echo "none (no cpufreq: VM or fixed clock)")
  mem_gb=$(awk '/MemTotal/ { printf "%.1f", $2 / 1048576 }' /proc/meminfo)
  load=$(cut -d' ' -f1-3 /proc/loadavg)
  smt=$(cat /sys/devices/system/cpu/smt/active 2> /dev/null || echo unknown)
  numa=$(lscpu 2> /dev/null | awk -F: '/NUMA node\(s\)/ { gsub(/ /, "", $2); print $2 }')
  affinity=$(taskset -pc $$ 2> /dev/null | sed 's/.*: //')
  virt=$(systemd-detect-virt 2> /dev/null || echo unknown)
else
  model=$(sysctl -n machdep.cpu.brand_string)
  governor=n/a
  mem_gb=$(sysctl -n hw.memsize | awk '{ printf "%.1f", $1 / 1073741824 }')
  load=$(sysctl -n vm.loadavg | awk '{ print $2, $3, $4 }')
  smt=n/a numa=n/a affinity=n/a virt=n/a
fi
cat << EOF
{
 "label": "$label",
 "time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
 "os": "$os",
 "kernel": "$kernel",
 "cpu_model": "$model",
 "cores_online": $cores,
 "smt_active": "$smt",
 "numa_nodes": "${numa:-unknown}",
 "virtualization": "$virt",
 "governor": "$governor",
 "memory_gb": $mem_gb,
 "load_avg_1_5_15": "$load",
 "shell_affinity": "$affinity",
 "server_cpus": "${SERVER_CPUS:-}",
 "aux_cpus": "${AUX_CPUS:-}",
 "loadgen_ssh": "${LOADGEN_SSH:+set}",
 "zig": "$(zig version 2> /dev/null || "${ZIG:-zig}" version 2> /dev/null || echo unknown)",
 "node": "$(node --version 2> /dev/null)",
 "git_commit": "$(git -C "$(dirname "$0")" rev-parse --short HEAD 2> /dev/null || cat "$(dirname "$0")/../../../SOURCE_COMMIT" 2> /dev/null || echo unknown)"
}
EOF
