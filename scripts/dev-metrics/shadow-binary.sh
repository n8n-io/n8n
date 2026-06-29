# n8n-shadow-binary-version: 1
#
# n8n dev metrics — generic command-shadowing library. This file is copied to
# ~/.n8n/bin/shadow-binary.sh at install time and sourced from there (a stable,
# repo-independent location) so it survives short-lived checkouts. Bump the
# version marker above whenever this file changes; setup.mjs replaces the
# installed copy when the version differs.
#
# Source it, then call `shadow_binary <name>` for each CLI you want to track:
#
#   . /path/to/shadow-binary.sh
#   shadow_binary pnpm
#   shadow_binary turbo     # future: shadow more binaries the same way
#
# `shadow_binary <name>` replaces <name> with a shell function that runs the real
# binary, times it, and reports anonymous usage to scripts/dev-metrics/track.mjs
# in the background. It is intentionally defensive: it always runs the real
# binary, never changes its exit code, and never blocks the prompt.
#
# Tracking is scoped to n8n checkouts (the tracker is located by walking up from
# the current directory) and only sends data once consent has been granted via
# scripts/dev-metrics/setup.mjs.

# zsh exposes EPOCHREALTIME only after loading this module; harmless in bash.
if [ -n "${ZSH_VERSION:-}" ]; then
	zmodload zsh/datetime 2>/dev/null
fi

# Millisecond clock. Prefers the shell's high-res EPOCHREALTIME (zsh module /
# bash 5); falls back to whole-second `date` (e.g. macOS /bin/bash 3.2).
__n8n_now_ms() {
	if [ -n "${EPOCHREALTIME:-}" ]; then
		awk "BEGIN { printf \"%.0f\", ${EPOCHREALTIME} * 1000 }"
	else
		echo $(( $(date +%s) * 1000 ))
	fi
}

# Locate scripts/dev-metrics/track.mjs by walking up from the current directory.
# Returns non-zero when not inside an n8n checkout (so nothing is tracked).
__n8n_find_tracker() {
	__n8n_dir="$PWD"
	while [ -n "$__n8n_dir" ] && [ "$__n8n_dir" != "/" ]; do
		if [ -f "$__n8n_dir/scripts/dev-metrics/track.mjs" ]; then
			printf '%s\n' "$__n8n_dir/scripts/dev-metrics/track.mjs"
			unset __n8n_dir
			return 0
		fi
		__n8n_dir="${__n8n_dir%/*}"
	done
	unset __n8n_dir
	return 1
}

# Run a shadowed binary: time it, run the real binary, report it. Args are the
# binary name, then the call-time argv. The binary's own version isn't passed in
# — the tracker detects it at runtime via `<bin> --version`.
__n8n_shadow_run() {
	__shadow_bin="$1"
	shift
	# Already inside a shadowed call (e.g. via the ~/.n8n/bin PATH shim): just run
	# the real binary, so the same command isn't counted twice.
	if [ -n "${N8N_DEV_SHIM_ACTIVE:-}" ]; then
		command "$__shadow_bin" "$@"
		return $?
	fi
	__shadow_start="$(__n8n_now_ms)"
	# Mark the call so a PATH shim we pass through doesn't also track it.
	N8N_DEV_SHIM_ACTIVE=1 command "$__shadow_bin" "$@"
	__shadow_code=$?
	__shadow_end="$(__n8n_now_ms)"

	__shadow_tracker="$(__n8n_find_tracker)"
	if [ -n "$__shadow_tracker" ] && command -v node >/dev/null 2>&1; then
		# Background the tracker inside a subshell so an interactive shell never
		# prints a "[job] PID" start notice or a completion message for it.
		(
			N8N_DEV_TRACK_BIN="$__shadow_bin" \
				N8N_DEV_TRACK_MS="$(( __shadow_end - __shadow_start ))" \
				N8N_DEV_TRACK_CODE="$__shadow_code" \
				N8N_DEV_TRACK_ARGS="$*" \
				N8N_DEV_TRACK_CWD="$PWD" \
				nohup node "$__shadow_tracker" >/dev/null 2>&1 &
		)
	fi

	unset __shadow_bin __shadow_start __shadow_end __shadow_tracker
	return $__shadow_code
}

# Replace `<name>` with a wrapper function that routes through __n8n_shadow_run.
# The name is baked in at definition time; "$@" is the call-time argv.
shadow_binary() {
	[ -n "$1" ] || return 0
	eval "$1() { __n8n_shadow_run $1 \"\$@\"; }"
}
