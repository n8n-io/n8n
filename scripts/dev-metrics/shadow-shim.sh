#!/bin/sh
# n8n-shadow-shim-version: 1
#
# n8n dev metrics — binary shim (template). setup.mjs renders this per shadowed
# CLI and installs it in place of the real binary (the original is saved next to
# it as <binary>.n8n-real), filling in the binary name, the saved real binary,
# and its directory. Because it replaces the binary itself, ANY invocation hits
# it — interactive, non-interactive, and AI agents alike. It always runs the real
# binary, never changes its exit code, and reports usage in the background.
#
# Tracking is scoped to n8n checkouts and gated on consent (both in track.mjs).
# N8N_DEV_SHIM_ACTIVE prevents nested calls (turbo -> pnpm, or the tracker's own
# `<bin> --version` probe) from being counted twice. The real binary is baked in
# (not derived from $0), so the shim can never re-invoke itself.

__bin='__N8N_BIN__'
__real='__N8N_REAL__'
__bindir='__N8N_BINDIR__'

# If the baked real binary moved (e.g. corepack/pnpm upgrade), re-resolve it via
# PATH with our own directory removed — never resolving back to this shim.
if [ ! -x "$__real" ]; then
	__cp=$(printf '%s' "${PATH:-}" | tr ':' '\n' | grep -vxF "$__bindir" | paste -sd: -)
	__real=$(PATH="$__cp" command -v "$__bin" 2>/dev/null)
	[ -n "$__real" ] || exec env PATH="$__cp" "$__bin" "$@" # last resort, no loop
fi

# Nested call: run the real binary without tracking, so it isn't counted twice.
if [ -n "${N8N_DEV_SHIM_ACTIVE:-}" ]; then
	exec "$__real" "$@"
fi

# Millisecond clock: GNU date gives ns; otherwise (e.g. macOS) whole seconds.
__now_ms() {
	__t=$(date +%s%N 2>/dev/null)
	case "$__t" in
		*[!0-9]* | '') echo $(( $(date +%s) * 1000 )) ;;
		*) echo $(( __t / 1000000 )) ;;
	esac
}

__start=$(__now_ms)
N8N_DEV_SHIM_ACTIVE=1 "$__real" "$@"
__code=$?
__end=$(__now_ms)

# Locate the tracker by walking up from the current directory (the n8n checkout).
__dir=$PWD
__tracker=
while [ -n "$__dir" ] && [ "$__dir" != "/" ]; do
	if [ -f "$__dir/scripts/dev-metrics/track.mjs" ]; then
		__tracker="$__dir/scripts/dev-metrics/track.mjs"
		break
	fi
	__dir=${__dir%/*}
done

if [ -n "$__tracker" ] && command -v node >/dev/null 2>&1; then
	# Background in a subshell so no "[job] PID" notice reaches the terminal.
	(
		N8N_DEV_TRACK_BIN="$__bin" \
			N8N_DEV_TRACK_MS="$(( __end - __start ))" \
			N8N_DEV_TRACK_CODE="$__code" \
			N8N_DEV_TRACK_ARGS="$*" \
			N8N_DEV_TRACK_CWD="$PWD" \
			nohup node "$__tracker" >/dev/null 2>&1 &
	)
fi

exit $__code
