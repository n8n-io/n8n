#!/usr/bin/env bash
# Push the n8n bundle onto a connected Android emulator/device and try to run it.
#
# Without libnode.so + an Android-built node_sqlite3.node, this will FAIL —
# that is the point. Use it to:
#   1. Verify push + tar extraction work on Android (rules out filesystem issues).
#   2. Capture the exact failure mode (missing Node interpreter) so we have a
#      known-bad baseline to compare against once Luca's binaries arrive.
#
# When Luca delivers libnode.so:
#   - Drop it next to dist/nodejs-project.tar.gz
#   - Set LIBNODE_SO=/path/to/libnode.so before running this script
#   - The script will push it too and exec the bundle via that binary
#
# Requires: adb on PATH (or set $ADB), an emulator running.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
BUNDLE="${BUNDLE:-$ROOT_DIR/dist/nodejs-project.tar.gz}"
LIBNODE_SO="${LIBNODE_SO:-}"
REMOTE_DIR="/data/local/tmp/n8n-spike"
N8N_PORT="${N8N_PORT:-5678}"

if [[ ! -x "$ADB" ]]; then
  echo "ERROR: adb not found at $ADB. Override with ADB=/path/to/adb." >&2
  exit 1
fi

if [[ ! -f "$BUNDLE" ]]; then
  echo "ERROR: bundle not found at $BUNDLE. Run scripts/bundle-for-android.sh first." >&2
  exit 1
fi

if ! "$ADB" get-state 2>/dev/null | grep -q "device"; then
  echo "ERROR: no adb device. Start the emulator first." >&2
  "$ADB" devices >&2
  exit 1
fi

echo "==> device info"
echo "    abi:     $("$ADB" shell getprop ro.product.cpu.abi | tr -d '\r')"
echo "    android: $("$ADB" shell getprop ro.build.version.release | tr -d '\r')"
echo "    api:     $("$ADB" shell getprop ro.build.version.sdk | tr -d '\r')"

echo "==> resetting $REMOTE_DIR on device"
"$ADB" shell "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR"

BUNDLE_SIZE=$(du -h "$BUNDLE" | cut -f1)
echo "==> pushing bundle ($BUNDLE_SIZE)"
time "$ADB" push "$BUNDLE" "$REMOTE_DIR/nodejs-project.tar.gz"

echo "==> extracting on-device"
time "$ADB" shell "cd $REMOTE_DIR && tar xzf nodejs-project.tar.gz && rm nodejs-project.tar.gz"
echo "==> extracted tree"
"$ADB" shell "ls $REMOTE_DIR/nodejs-project/bin"

if [[ -n "$LIBNODE_SO" ]]; then
  if [[ ! -f "$LIBNODE_SO" ]]; then
    echo "ERROR: LIBNODE_SO=$LIBNODE_SO does not exist" >&2
    exit 1
  fi
  echo "==> pushing libnode.so ($(du -h "$LIBNODE_SO" | cut -f1))"
  "$ADB" push "$LIBNODE_SO" "$REMOTE_DIR/libnode.so"
  "$ADB" shell "chmod +x $REMOTE_DIR/libnode.so"
  echo "==> launching n8n via libnode.so on port $N8N_PORT"
  echo "    (Ctrl-C to stop. To reach editor from host: adb forward tcp:$N8N_PORT tcp:$N8N_PORT)"
  "$ADB" shell "cd $REMOTE_DIR/nodejs-project && \
    HOME=$REMOTE_DIR/home \
    N8N_USER_FOLDER=$REMOTE_DIR/n8n-data \
    N8N_PORT=$N8N_PORT \
    $REMOTE_DIR/libnode.so ./node_modules/n8n/bin/n8n start"
else
  echo "==> checking for a node interpreter on device"
  "$ADB" shell "command -v node && node --version || echo '(no node on PATH — expected)'"
  echo
  echo "==> attempting to launch n8n via its #!/usr/bin/env node shebang"
  echo "    Expect failure: Android has no Node interpreter without libnode.so."
  set +e
  "$ADB" shell "cd $REMOTE_DIR/nodejs-project && ./bin/n8n start 2>&1 | head -20"
  rc=$?
  set -e
  echo
  if [[ $rc -ne 0 ]]; then
    echo "==> failed as expected (exit $rc)."
  else
    echo "==> ran to completion — that's unexpected."
  fi
  echo
  echo "Next step: get libnode.so from Luca, re-run with:"
  echo "    LIBNODE_SO=/path/to/libnode.so $0"
fi
