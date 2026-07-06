#!/bin/sh
# Self-check for the binary-replacement flow (setup.mjs + shadow-shim.sh),
# against a fake binary in a temp dir — never touches your real pnpm.
#   sh scripts/dev-metrics/selfcheck.sh
# ponytail: fixed capture port; if 9944 is busy, change PORT below.
set -e
SELF=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$SELF/../.." && pwd)
PORT=9944
EV=$(mktemp)

node "$SELF/capture-server.mjs" --port "$PORT" --out "$EV" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 0.4

UF=$(mktemp -d); BIN=$(mktemp -d)
printf '#!/bin/sh\ncase "$1" in --version) echo 9.9.9; exit 0;; esac\necho "REAL $*"\nexit 7\n' > "$BIN/pnpm"
chmod +x "$BIN/pnpm"
export N8N_USER_FOLDER="$UF" N8N_DEV_METRICS_RUDDERSTACK_URL="http://localhost:$PORT" PATH="$BIN:$PATH"

fail() { echo "FAIL: $1"; exit 1; }

node "$SELF/setup.mjs" --enable >/dev/null
grep -q "n8n-shadow-shim-version" "$BIN/pnpm" || fail "shim not installed"
grep -q "REAL" "$BIN/pnpm.n8n-real" || fail "original not saved"

cd "$REPO"
rc=0; out=$(sh -c 'pnpm build --filter x' 2>&1) || rc=$?
[ "$rc" -eq 7 ] || fail "exit code not preserved (got $rc)"
echo "$out" | grep -q "REAL build --filter x" || fail "real binary did not run"

N8N_DEV_SHIM_ACTIVE=1 sh -c 'pnpm test' >/dev/null 2>&1 || true   # must not track

node "$SELF/setup.mjs" --enable >/dev/null                        # idempotent
[ -e "$BIN/pnpm.n8n-real.n8n-real" ] && fail "double-saved on re-enable"

sleep 1
n=$(grep -c '"event":"dev:cli_command"' "$EV" || true)
[ "$n" -eq 1 ] || fail "expected 1 event, got $n"
grep -q '"command":"build"' "$EV" || fail "command!=build"
grep -q '"binary_version":"9.9.9"' "$EV" || fail "version not detected"

node "$SELF/setup.mjs" --reset >/dev/null
grep -q "REAL" "$BIN/pnpm" || fail "original not restored"
grep -q "n8n-shadow-shim-version" "$BIN/pnpm" && fail "shim left after reset"
[ -e "$BIN/pnpm.n8n-real" ] && fail ".n8n-real left after reset"

rm -rf "$UF" "$BIN" "$EV"
echo "ALL PASS"
