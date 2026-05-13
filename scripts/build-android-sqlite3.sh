#!/usr/bin/env bash
# Cross-compile node_sqlite3.node for android-arm64, targeting the Node ABI
# Luca's runtime uses (currently v22.22.1 → NODE_MODULE_VERSION 127).
#
# Output: /tmp/node_sqlite3.android-arm64.node
# Plug into bundle-for-android.sh via:
#   ANDROID_SQLITE3_NODE=/tmp/node_sqlite3.android-arm64.node \
#     SKIP_BUILD=1 scripts/bundle-for-android.sh
#
# Requires:
#   - Android NDK at $HOME/Library/Android/sdk/ndk/<version>/
#   - Node + npm on host (any recent version — only used to drive node-gyp;
#     the compiled binary targets Node $NODE_TARGET, not the host)
#   - The pristine compiled/ tree from `pnpm build:deploy`

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Target ABI — bump if Luca's runtime version changes.
NODE_TARGET="${NODE_TARGET:-22.22.1}"
# Android API to target. 24 (Nougat 7.0) is safely below Luca's min SDK 26.
ANDROID_API="${ANDROID_API:-24}"
OUT_NODE="${OUT_NODE:-/tmp/node_sqlite3.android-arm64.node}"

# --- locate NDK ---
NDK_BASE="$HOME/Library/Android/sdk/ndk"
if [[ ! -d "$NDK_BASE" ]]; then
  echo "ERROR: no NDK under $NDK_BASE. Install via Android Studio → SDK Manager → SDK Tools → 'NDK (Side by side)'." >&2
  exit 1
fi
NDK_VERSION="$(ls "$NDK_BASE" | sort -V | tail -1)"
NDK="$NDK_BASE/$NDK_VERSION"
TOOLCHAIN_BASE="$NDK/toolchains/llvm/prebuilt"
HOST_TC="$(ls "$TOOLCHAIN_BASE" | head -1)"  # darwin-x86_64
TOOLCHAIN="$TOOLCHAIN_BASE/$HOST_TC"

CC_BIN="$TOOLCHAIN/bin/aarch64-linux-android${ANDROID_API}-clang"
CXX_BIN="$TOOLCHAIN/bin/aarch64-linux-android${ANDROID_API}-clang++"
AR_BIN="$TOOLCHAIN/bin/llvm-ar"
RANLIB_BIN="$TOOLCHAIN/bin/llvm-ranlib"
STRIP_BIN="$TOOLCHAIN/bin/llvm-strip"

for bin in "$CC_BIN" "$CXX_BIN" "$AR_BIN"; do
  [[ -x "$bin" ]] || { echo "ERROR: $bin not found or not executable" >&2; exit 1; }
done

echo "==> NDK:        $NDK"
echo "==> Toolchain:  $HOST_TC"
echo "==> Target:     android-arm64, API $ANDROID_API, Node $NODE_TARGET"

# --- detect sqlite3 version from the deployed tree ---
SQLITE_PNPM_DIR="$(find "$ROOT_DIR/compiled/node_modules/.pnpm" -maxdepth 1 -type d -name "sqlite3@*" | head -1)"
if [[ -z "$SQLITE_PNPM_DIR" ]]; then
  echo "ERROR: could not find sqlite3 under compiled/node_modules/.pnpm/" >&2
  echo "       Run 'pnpm build:deploy' first." >&2
  exit 1
fi
SQLITE_VER="$(basename "$SQLITE_PNPM_DIR" | sed 's/sqlite3@//' | cut -d_ -f1)"
echo "==> sqlite3:    v$SQLITE_VER"

# --- fresh install of sqlite3 + its build deps into a scratch dir ---
# We can't just copy from compiled/ because its node-addon-api is a pnpm
# symlink that would dangle outside the original tree.
BUILD_DIR="$(mktemp -d -t sqlite-android-XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT
echo "==> Build dir:  $BUILD_DIR"

cd "$BUILD_DIR"
npm init -y >/dev/null
# --ignore-scripts so npm doesn't try to download a prebuild or run gyp now.
# Use `nodejs-mobile-gyp` — a fork of node-gyp tuned for Android cross-compile
# from Darwin/Linux. Stock node-gyp always injects Mac-only flags
# (-arch, -mmacosx-version-min) into the makefile when run on Darwin, which
# fail under aarch64-linux-android-clang.
echo "==> installing sqlite3@$SQLITE_VER + nodejs-mobile-gyp (no scripts)"
npm install --ignore-scripts --no-audit --no-fund "nodejs-mobile-gyp" "sqlite3@$SQLITE_VER" >/dev/null

GYP="$BUILD_DIR/node_modules/nodejs-mobile-gyp/bin/node-gyp.js"
[[ -f "$GYP" ]] || { echo "ERROR: nodejs-mobile-gyp didn't land at $GYP" >&2; exit 1; }
echo "==> gyp:        $(node "$GYP" -v 2>&1 | head -1)"

cd "$BUILD_DIR/node_modules/sqlite3"

# When node-gyp runs on Darwin, the stock Node common.gypi injects Mac-only
# flags (-arch X, -mmacosx-version-min=X) that fail under NDK clang. Wrap the
# NDK compiler with a shim that strips those flags before exec.
WRAPPER_DIR="$BUILD_DIR/.wrapper"
mkdir -p "$WRAPPER_DIR"
cat > "$WRAPPER_DIR/clang-shim.sh" <<'SHIM_EOF'
#!/usr/bin/env bash
REAL="$1"; shift
ARGS=()
skip=0
for a in "$@"; do
  if [[ $skip -eq 1 ]]; then skip=0; continue; fi
  case "$a" in
    -arch) skip=1 ;;
    -mmacosx-version-min=*) ;;
    *) ARGS+=("$a") ;;
  esac
done
exec "$REAL" "${ARGS[@]}"
SHIM_EOF
chmod +x "$WRAPPER_DIR/clang-shim.sh"
cat > "$WRAPPER_DIR/cc" <<EOF
#!/usr/bin/env bash
exec "$WRAPPER_DIR/clang-shim.sh" "$CC_BIN" "\$@"
EOF
cat > "$WRAPPER_DIR/cxx" <<EOF
#!/usr/bin/env bash
exec "$WRAPPER_DIR/clang-shim.sh" "$CXX_BIN" "\$@"
EOF
chmod +x "$WRAPPER_DIR/cc" "$WRAPPER_DIR/cxx"

# node-gyp respects these. LINK is used in place of LD for C++.
export CC="$WRAPPER_DIR/cc"
export CXX="$WRAPPER_DIR/cxx"
export AR="$AR_BIN"
export RANLIB="$RANLIB_BIN"
export STRIP="$STRIP_BIN"
export LINK="$WRAPPER_DIR/cxx"
# 16 KB page alignment — newer Android (API 35+) prefers this for native libs.
export LDFLAGS="${LDFLAGS:-} -Wl,-z,max-page-size=16384"

# node-gyp downloads Node $NODE_TARGET headers automatically into ~/Library/Caches/node-gyp/.
# Split configure + build so we can patch the generated Makefiles between them:
# gyp's Mac generator hardcodes /Library/Developer/CommandLineTools/usr/bin/libtool
# for static archives, but libtool is Mach-O only — fails on cross-compiled ELF.
# llvm-ar with `rcs` args matches the libtool -static invocation signature.
LLVM_AR="$TOOLCHAIN/bin/llvm-ar"

node "$GYP" configure \
  --target="$NODE_TARGET" \
  --target_arch=arm64 \
  --target_platform=android \
  --build-from-source

echo "==> patching Makefile to use llvm-ar instead of Mac libtool"
find build -type f \( -name "Makefile" -o -name "*.mk" -o -name "*.target.mk" \) -print0 |
  xargs -0 sed -i.bak \
    -e "s|/Library/Developer/CommandLineTools/usr/bin/libtool -static|$LLVM_AR rcs|g" \
    -e "s|/usr/bin/libtool -static|$LLVM_AR rcs|g"

node "$GYP" build

OUT_SRC="$BUILD_DIR/node_modules/sqlite3/build/Release/node_sqlite3.node"
if [[ ! -f "$OUT_SRC" ]]; then
  echo "ERROR: build did not produce $OUT_SRC" >&2
  exit 1
fi

cp "$OUT_SRC" "$OUT_NODE"
echo
echo "==> Output:    $OUT_NODE"
echo "==> file says: $(file "$OUT_NODE")"
echo
echo "Plug into the bundler:"
echo "  ANDROID_SQLITE3_NODE=$OUT_NODE SKIP_BUILD=1 scripts/bundle-for-android.sh"
