# Helpers for the pass scripts. Source it from the repository root.

# loadavg prints the 1, 5 and 15 minute load averages (Linux and macOS).
loadavg() {
	if [[ -r /proc/loadavg ]]; then
		cut -d' ' -f1-3 /proc/loadavg
	else
		sysctl -n vm.loadavg | tr -d '{}' | xargs
	fi
}

cpu_count() { nproc 2>/dev/null || sysctl -n hw.ncpu; }

# record_host DIR writes the host facts that the results need to DIR/host.txt.
record_host() {
	{
		echo "date: $(date -u +%FT%TZ)"
		echo "host: $(hostname)"
		echo "os: $(uname -srm)"
		echo "cpus: $(cpu_count)"
		if [[ -r /proc/meminfo ]]; then
			echo "memory: $(awk '/MemTotal/ {printf "%.1f GiB", $2 / 1048576}' /proc/meminfo)"
			echo "cpu model: $(awk -F': ' '/model name/ {print $2; exit}' /proc/cpuinfo)"
		fi
		# EC2 instance type, if the host is an EC2 instance (IMDSv2).
		local token
		token="$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' 2>/dev/null)"
		[[ -n "$token" ]] && echo "instance: $(curl -s -m 2 -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/instance-type)"
		echo "docker: $(docker version --format '{{.Server.Version}}' 2>/dev/null)"
		echo "node: $(node -v)"
		echo "load at start: $(loadavg)"
	} >"$1/host.txt"
}

# start_load_sampler FILE samples the load average every 30 s into FILE, until
# stop_load_sampler.
start_load_sampler() {
	(
		while true; do
			echo "$(date +%H:%M:%S) $(loadavg)"
			sleep 30
		done
	) >>"$1" 2>&1 &
	LOAD_SAMPLER_PID=$!
}

stop_load_sampler() {
	[[ -n "${LOAD_SAMPLER_PID:-}" ]] && kill "$LOAD_SAMPLER_PID" 2>/dev/null
	LOAD_SAMPLER_PID=""
}
