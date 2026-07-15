#!/bin/sh
# Self-check for the binary-replacement flow (setup.mjs + shadow-shim.sh),
# against a fake binary in a temp dir — never touches your real pnpm.
#   sh scripts/dev-metrics/test/selfcheck.sh
set -e
SELF=$(cd "$(dirname "$0")" && pwd)
SRC=$(cd "$SELF/.." && pwd)          # scripts/dev-metrics (holds setup.mjs etc.)
REPO=$(cd "$SELF/../../.." && pwd)
PORT=9944
EV=$(mktemp)

node "$SRC/capture-server.mjs" --port "$PORT" --out "$EV" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 0.4

# Apostrophes in both paths exercise shell escaping of the rendered shim: an
# unescaped value would make the shim a syntax error and fail the assertions below.
T=$(mktemp -d); UF="$T/uf-o'brien"; BIN="$T/bin-o'brien"
mkdir -p "$UF" "$BIN"
printf '#!/bin/sh\ncase "$1" in --version) echo 9.9.9; exit 0;; esac\necho "REAL $*"\nexit 7\n' > "$BIN/pnpm"
chmod +x "$BIN/pnpm"
export N8N_USER_FOLDER="$UF" N8N_DEV_METRICS_RUDDERSTACK_URL="http://localhost:$PORT" PATH="$BIN:$PATH"

fail() { echo "FAIL: $1"; exit 1; }

node "$SRC/setup.mjs" --enable >/dev/null
grep -q "n8n-shadow-shim-version" "$BIN/pnpm" || fail "shim not installed"
grep -q "REAL" "$BIN/pnpm.n8n-real" || fail "original not saved"

cd "$REPO"
rc=0; out=$(sh -c "pnpm build \"$HOME/secretpath\"" 2>&1) || rc=$?
[ "$rc" -eq 7 ] || fail "exit code not preserved (got $rc)"
echo "$out" | grep -q "REAL build $HOME/secretpath" || fail "real binary did not run"

N8N_DEV_SHIM_ACTIVE=1 sh -c 'pnpm test' >/dev/null 2>&1 || true   # must not track

# A sensitive subcommand: args up to it are kept, everything after is redacted.
sh -c 'pnpm --filter foo config set //registry.npmjs.org/:_authToken supersecrettoken' >/dev/null 2>&1 || true

# A secret baked into a flag (typo): keep only the flag prefix, drop the value.
sh -c 'pnpm install --config.//registry.npmjs.org/:_authToken=typosecrettoken' >/dev/null 2>&1 || true

node "$SRC/setup.mjs" --enable >/dev/null                        # idempotent
[ -e "$BIN/pnpm.n8n-real.n8n-real" ] && fail "double-saved on re-enable"

sleep 1
n=$(grep -c '"event":"dev:cli_command"' "$EV" || true)
[ "$n" -eq 3 ] || fail "expected 3 events, got $n"
# Home dir stripped to ~; path arg otherwise sent whole (no truncation).
grep -qF '"args":["build","~/secretpath"]' "$EV" || fail "home dir not stripped from args"
# Args up to the subcommand kept, everything after it dropped (secret never seen).
grep -qF '"args":["--filter","foo","config"]' "$EV" || fail "sensitive subcommand not redacted"
grep -qF 'supersecrettoken' "$EV" && fail "secret token leaked into event"
# Inline flag secret: prefix + 4-char hint (".//r") kept, value dropped.
grep -qF '"args":["install","--config.//r"]' "$EV" || fail "inline flag secret not redacted"
grep -qF 'typosecrettoken' "$EV" && fail "inline secret leaked into event"
grep -q '"binary_version":"9.9.9"' "$EV" || fail "version not detected"
grep -q '"cpu_cores"' "$EV" || fail "machine info not captured"

node "$SRC/setup.mjs" --reset >/dev/null
grep -q "REAL" "$BIN/pnpm" || fail "original not restored"
grep -q "n8n-shadow-shim-version" "$BIN/pnpm" && fail "shim left after reset"
[ -e "$BIN/pnpm.n8n-real" ] && fail ".n8n-real left after reset"

# Regression: a package-manager upgrade (a fresh binary dropped over the shim,
# with the previous .n8n-real left behind) must re-shim the NEW binary — not
# silently run the stale sibling and downgrade the developer.
(
	B2="$T/bin2-o'brien"; mkdir -p "$B2"
	printf '#!/bin/sh\necho "OLD $*"\n' > "$B2/pnpm"; chmod +x "$B2/pnpm"
	export N8N_USER_FOLDER="$T/uf2" N8N_DEV_TELEMETRY=0 PATH="$B2:$PATH"
	node "$SRC/setup.mjs" --enable >/dev/null
	printf '#!/bin/sh\necho "NEW $*"\n' > "$B2/pnpm"; chmod +x "$B2/pnpm"  # simulate upgrade
	node "$SRC/setup.mjs" --enable >/dev/null
	out=$(pnpm probe 2>&1) || true
	echo "$out" | grep -q "NEW probe" || fail "upgrade downgraded via stale .n8n-real"
)

rm -rf "$T" "$EV"
echo "ALL PASS"
