#!/bin/sh
# n8n-shadow-shim-version: 1
#
# n8n dev metrics — PATH shim (template). setup.mjs renders this into
# ~/.n8n/bin/<binary> (one per shadowed CLI), filling in the binary name, the
# resolved real binary, and this directory. Placed ahead of the real binary on
# PATH, it is hit by ANY process that resolves the binary through PATH —
# non-interactive shells and AI agents included — so it broadens coverage beyond
# the interactive shell function. It always runs the real binary, never changes
# its exit code, and reports usage in the background.
#
# Tracking is scoped to n8n checkouts and gated on consent (both in track.mjs).
# N8N_DEV_SHIM_ACTIVE prevents nested calls (shell function -> here, or
# turbo -> pnpm) from being counted twice. The real binary is baked in (not
# derived from $0), so the shim can never re-invoke itself.

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

# Millisecond clock: GNU date (ns), else perl, else whole seconds.
__now_ms() {
	__t=$(date +%s%N 2>/dev/null)
	case "$__t" in
		*[!0-9]* | '')
			if command -v perl >/dev/null 2>&1; then
				perl -MTime::HiRes=time -e 'printf "%d", time() * 1000'
			else
				echo $(( $(date +%s) * 1000 ))
			fi
			;;
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
