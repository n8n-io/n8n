#!/usr/bin/env bash
# Produce a self-contained nodejs-project/ tarball for the Android APK.
#
# Flow:
#   1. Run the existing pnpm build:deploy → ./compiled
#   2. Swap in the Android arm64 sqlite3 binding (provided by Track B)
#   3. Remove .node files for native deps that won't run on Android
#      (their JS code paths are lazy-imported and never invoked in our config)
#   4. Tar the result for hand-off
#
# Required env:
#   ANDROID_SQLITE3_NODE  path to node_sqlite3.node built for android-arm64
#
# Usage:
#   ANDROID_SQLITE3_NODE=/tmp/node_sqlite3.android-arm64.node \
#     scripts/bundle-for-android.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPILED_DIR="$ROOT_DIR/compiled"
OUT_TARBALL="$ROOT_DIR/dist/nodejs-project.tar.gz"

cd "$ROOT_DIR"

: "${ANDROID_SQLITE3_NODE:?set ANDROID_SQLITE3_NODE to the Android arm64 node_sqlite3.node path}"
if [[ ! -f "$ANDROID_SQLITE3_NODE" ]]; then
  echo "ERROR: $ANDROID_SQLITE3_NODE does not exist" >&2
  exit 1
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> pnpm build:deploy (this takes a few minutes)"
  pnpm build:deploy
fi

if [[ ! -d "$COMPILED_DIR" ]]; then
  echo "ERROR: $COMPILED_DIR missing — build:deploy did not produce output" >&2
  exit 1
fi

SQLITE_TARGET="$(find "$COMPILED_DIR/node_modules" -path "*/sqlite3/build/Release/node_sqlite3.node" -print -quit)"
if [[ -z "$SQLITE_TARGET" ]]; then
  echo "ERROR: could not find node_sqlite3.node under $COMPILED_DIR/node_modules" >&2
  exit 1
fi
echo "==> swapping sqlite3 binding"
echo "    from: $ANDROID_SQLITE3_NODE"
echo "    to:   $SQLITE_TARGET"
cp "$ANDROID_SQLITE3_NODE" "$SQLITE_TARGET"

echo "==> stripping host-arch .node files for deps we never invoke"
# Code paths lazy-import these; they are never required in our boot path.
# Leaving the orphaned host binaries would bloat the APK and is confusing.
for pkg in isolated-vm @parcel; do
  matches=$(find "$COMPILED_DIR/node_modules" -path "*$pkg*" -name "*.node" 2>/dev/null || true)
  if [[ -n "$matches" ]]; then
    echo "$matches" | xargs rm -v
  fi
done

mkdir -p "$(dirname "$OUT_TARBALL")"
echo "==> producing $OUT_TARBALL"
# Rename compiled/ → nodejs-project/ inside the archive without dereferencing
# pnpm symlinks. BSD tar (macOS) uses -s for substitution; GNU tar uses --transform.
if tar --version 2>&1 | grep -q "bsdtar\|BSD"; then
  tar czf "$OUT_TARBALL" -C "$ROOT_DIR" -s ',^compiled,nodejs-project,' compiled
else
  tar czf "$OUT_TARBALL" -C "$ROOT_DIR" --transform 's,^compiled,nodejs-project,' compiled
fi

SIZE=$(du -h "$OUT_TARBALL" | cut -f1)
echo
echo "Bundle ready: $OUT_TARBALL ($SIZE)"
echo "Inside: nodejs-project/  -- drop into APK assets/"
