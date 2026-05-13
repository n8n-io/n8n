#!/usr/bin/env bash
# Cross-compile node_sqlite3.node for android-arm64 + Node 22 ABI inside a
# Linux container. Sidesteps the Darwin→Android gyp issues (Mac flag injection,
# libtool, etc.) that block doing this directly on the host.
#
# Output: /tmp/node_sqlite3.android-arm64.node
# Plug into bundle-for-android.sh via:
#   ANDROID_SQLITE3_NODE=/tmp/node_sqlite3.android-arm64.node \
#     SKIP_BUILD=1 scripts/bundle-for-android.sh
#
# First run builds the Docker image (~1 GB NDK download). Subsequent runs reuse
# the cached image and complete in ~1 min.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG="${IMG:-n8n-spike-android-sqlite3-builder:r26d}"
NODE_TARGET="${NODE_TARGET:-22.22.1}"
ANDROID_API="${ANDROID_API:-24}"
OUT_NODE="${OUT_NODE:-/tmp/node_sqlite3.android-arm64.node}"

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon not reachable. Start Docker Desktop." >&2
  exit 1
fi

# --- detect sqlite3 version from the deployed tree ---
SQLITE_PNPM_DIR="$(find "$ROOT_DIR/compiled/node_modules/.pnpm" -maxdepth 1 -type d -name "sqlite3@*" | head -1)"
if [[ -z "$SQLITE_PNPM_DIR" ]]; then
  echo "ERROR: sqlite3 not found under compiled/node_modules/.pnpm/. Run pnpm build:deploy first." >&2
  exit 1
fi
SQLITE_VER="$(basename "$SQLITE_PNPM_DIR" | sed 's/sqlite3@//' | cut -d_ -f1)"
echo "==> sqlite3:    v$SQLITE_VER"
echo "==> Target:     android-arm64, API $ANDROID_API, Node $NODE_TARGET"

echo "==> building image $IMG (first run downloads ~1 GB NDK; cached after)"
docker build --platform=linux/amd64 -t "$IMG" -f "$ROOT_DIR/scripts/Dockerfile.android-sqlite3" "$ROOT_DIR/scripts"

echo "==> running cross-compile in container"
docker run --rm --platform=linux/amd64 \
  -v "$(dirname "$OUT_NODE"):/out" \
  -e "SQLITE_VER=$SQLITE_VER" \
  -e "NODE_TARGET=$NODE_TARGET" \
  -e "ANDROID_API=$ANDROID_API" \
  -e "OUT_NAME=$(basename "$OUT_NODE")" \
  "$IMG" bash -ec '
    set -euo pipefail
    cd /build
    npm init -y >/dev/null
    npm install --ignore-scripts --no-audit --no-fund "node-gyp@latest" "sqlite3@${SQLITE_VER}"
    GYP=/build/node_modules/node-gyp/bin/node-gyp.js

    cd /build/node_modules/sqlite3
    export CC="${NDK_TOOLCHAIN}/bin/aarch64-linux-android${ANDROID_API}-clang"
    export CXX="${NDK_TOOLCHAIN}/bin/aarch64-linux-android${ANDROID_API}-clang++"
    export AR="${NDK_TOOLCHAIN}/bin/llvm-ar"
    export RANLIB="${NDK_TOOLCHAIN}/bin/llvm-ranlib"
    export STRIP="${NDK_TOOLCHAIN}/bin/llvm-strip"
    export LINK="${CXX}"
    # 16 KB page alignment — newer Android (API 35+) prefers this.
    export LDFLAGS="-Wl,-z,max-page-size=16384"

    node "${GYP}" rebuild \
      --target="${NODE_TARGET}" \
      --target_arch=arm64 \
      --target_platform=android \
      --build-from-source

    cp build/Release/node_sqlite3.node "/out/${OUT_NAME}"
    "${STRIP}" "/out/${OUT_NAME}" || true
    echo
    file "/out/${OUT_NAME}"
  '

if [[ ! -f "$OUT_NODE" ]]; then
  echo "ERROR: build did not produce $OUT_NODE" >&2
  exit 1
fi

echo
echo "==> Output:    $OUT_NODE ($(du -h "$OUT_NODE" | cut -f1))"
echo "==> file says: $(file "$OUT_NODE")"
echo
echo "Plug into the bundler:"
echo "  ANDROID_SQLITE3_NODE=$OUT_NODE SKIP_BUILD=1 scripts/bundle-for-android.sh"
