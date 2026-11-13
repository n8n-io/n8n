#!/usr/bin/env bash
# Builds what the cloud benchmark needs on a fresh Linux VM (x86_64 or
# aarch64): Zig 0.17.0 (downloaded and checked against its SHA-256), `wfrt`
# in ReleaseSafe, the workspace packages, and the fallback host with its
# n8n dependencies. workflow-lang runs from source (Node.js strips types).
#
#   bench/cloud/setup.sh [--install-deps] [--with-gym]
#
# --install-deps  installs the system packages with apt-get (sudo): build
#                 tools, pkg-config, OpenSSL 3 and c-ares headers, git, curl, xz
# --with-gym      also builds the gym from GYM_REPO (default ~/work/ai-gym);
#                 needs Go (downloaded and checked when not on PATH)
#
# Environment:
#   TOOLS         where the tools go (default ~/.cache/wfrt-bench)
#   ZIG_TARBALL   a Zig 0.17.0 tarball already on disk; it is checked too
#   PNPM_STORE    pnpm store folder (default: pnpm's own)
#
# Logs go to $TOOLS/logs. The script stops at the first failure.
set -euo pipefail
KIT=$(cd "$(dirname "$0")" && pwd)
RUNTIME=$(cd "$KIT/../.." && pwd)
REPO=$(cd "$RUNTIME/.." && pwd)
TOOLS=${TOOLS:-$HOME/.cache/wfrt-bench}
LOGS=$TOOLS/logs
mkdir -p "$TOOLS/bin" "$LOGS"
export PATH=$TOOLS/bin:$PATH
INSTALL_DEPS=0 WITH_GYM=0
for a in "$@"; do
  case $a in
    --install-deps) INSTALL_DEPS=1 ;;
    --with-gym) WITH_GYM=1 ;;
    *) echo "unknown option $a" >&2; exit 2 ;;
  esac
done
step() { echo "== $*"; }
fail() { echo "setup: $*" >&2; exit 1; }

case $(uname -m) in
  x86_64) ARCH=x86_64 GOARCH=amd64 NODEARCH=x64
    ZIG_SHA=1cbe9df9f27e6b78d14ccbca43b6703a404ef79ef1c463de901d7f088d4e2026 ;;
  aarch64 | arm64) ARCH=aarch64 GOARCH=arm64 NODEARCH=arm64
    ZIG_SHA=9e8d11661d4ae3bd57702a3832781e23ad151dde5798e16a5ccd503f65234ff8 ;;
  *) fail "unsupported machine $(uname -m)" ;;
esac
[ "$(uname -s)" = Linux ] || fail "this script is for Linux"

if [ "$INSTALL_DEPS" = 1 ]; then
  step "system packages (apt-get)"
  sudo apt-get update -q > "$LOGS/apt.log" 2>&1
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -q build-essential pkg-config libssl-dev libc-ares-dev \
    git curl xz-utils ca-certificates openssl util-linux >> "$LOGS/apt.log" 2>&1
fi
for lib in openssl libcares; do
  pkg-config --exists "$lib" || fail "$lib headers are missing: run with --install-deps, or install libssl-dev and libc-ares-dev"
done
for tool in curl xz sha256sum taskset openssl git; do
  command -v "$tool" > /dev/null || fail "$tool is missing: run with --install-deps"
done

# ---- Zig 0.17.0, checked ----
ZIG_DIR=$TOOLS/zig-$ARCH-linux-0.17.0
if [ ! -x "$ZIG_DIR/zig" ]; then
  step "Zig 0.17.0 ($ARCH)"
  tarball=${ZIG_TARBALL:-$TOOLS/zig-$ARCH-linux-0.17.0.tar.xz}
  if [ ! -f "$tarball" ]; then
    curl -fsSL --retry 3 -o "$tarball.part" "https://ziglang.org/download/0.17.0/zig-$ARCH-linux-0.17.0.tar.xz"
    mv "$tarball.part" "$tarball"
  fi
  echo "$ZIG_SHA  $tarball" | sha256sum -c --quiet - || fail "the Zig tarball $tarball does not have the expected SHA-256"
  tar -C "$TOOLS" -xJf "$tarball"
fi
ln -sf "$ZIG_DIR/zig" "$TOOLS/bin/zig"
echo "zig $(zig version), SHA-256 checked"

# ---- Node.js: the system one from 22.18 (type stripping), else the latest 24.x, checked ----
node_ok() { command -v node > /dev/null && node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=18)?0:1)"; }
if ! node_ok; then
  step "Node.js 24 ($NODEARCH)"
  base=https://nodejs.org/dist/latest-v24.x
  curl -fsSL --retry 3 -o "$TOOLS/SHASUMS256.txt" "$base/SHASUMS256.txt"
  file=$(awk "/node-v[0-9.]+-linux-$NODEARCH.tar.xz\$/ { print \$2 }" "$TOOLS/SHASUMS256.txt")
  [ -n "$file" ] || fail "no Node.js 24 tarball for $NODEARCH in SHASUMS256.txt"
  curl -fsSL --retry 3 -o "$TOOLS/$file" "$base/$file"
  (cd "$TOOLS" && grep " $file\$" SHASUMS256.txt | sha256sum -c --quiet -) || fail "$file does not match SHASUMS256.txt"
  tar -C "$TOOLS" -xJf "$TOOLS/$file"
  ln -sf "$TOOLS/${file%.tar.xz}/bin/node" "$TOOLS/bin/node"
  ln -sf "$TOOLS/${file%.tar.xz}/bin/corepack" "$TOOLS/bin/corepack"
  node_ok || fail "Node.js setup failed"
fi
echo "node $(node --version)"

# ---- pnpm: the version of package.json, through corepack when missing ----
want_pnpm=$(node -p "require('$REPO/package.json').packageManager.split('@')[1]")
if ! command -v pnpm > /dev/null; then
  step "pnpm $want_pnpm (corepack)"
  export COREPACK_HOME=$TOOLS/corepack
  corepack enable --install-directory "$TOOLS/bin" pnpm
  COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version > /dev/null
fi
echo "pnpm $(pnpm --version)"

# ---- wfrt ----
step "wfrt (ReleaseSafe)"
(cd "$RUNTIME" && nice zig build -Drelease=true > "$LOGS/zig-build.log" 2>&1) || { tail -20 "$LOGS/zig-build.log"; fail "zig build failed; see $LOGS/zig-build.log"; }
"$RUNTIME/zig-out/bin/wfrt" bench-w1 --seconds 1 --threads 1 > /dev/null || fail "wfrt does not run"

# ---- workspace and fallback host ----
step "pnpm install"
(cd "$REPO" && CI=true nice pnpm install --frozen-lockfile ${PNPM_STORE:+--store-dir "$PNPM_STORE"} > "$LOGS/pnpm-install.log" 2>&1) || { tail -20 "$LOGS/pnpm-install.log"; fail "pnpm install failed; see $LOGS/pnpm-install.log"; }
step "fallback host and its n8n packages (turbo; this takes a while)"
(cd "$REPO" && nice pnpm turbo run build --filter=@n8n/workflow-fallback-host... > "$LOGS/host-build.log" 2>&1) || { tail -30 "$LOGS/host-build.log"; fail "host build failed; see $LOGS/host-build.log"; }
[ -f "$REPO/packages/@n8n/workflow-fallback-host/dist/main.js" ] || fail "no host build output"

# ---- optional: the gym ----
if [ "$WITH_GYM" = 1 ]; then
  GYM_REPO=${GYM_REPO:-$HOME/work/ai-gym}
  [ -d "$GYM_REPO/services/gym" ] || fail "GYM_REPO=$GYM_REPO has no services/gym"
  if ! command -v go > /dev/null; then
    step "Go (latest stable, $GOARCH)"
    curl -fsSL --retry 3 -o "$TOOLS/go.json" 'https://go.dev/dl/?mode=json'
    read -r gofile gosha < <(node -e "
      const r=JSON.parse(require('fs').readFileSync('$TOOLS/go.json','utf8'))[0];
      const f=r.files.find(f=>f.os==='linux'&&f.arch==='$GOARCH'&&f.kind==='archive');
      console.log(f.filename, f.sha256)")
    curl -fsSL --retry 3 -o "$TOOLS/$gofile" "https://go.dev/dl/$gofile"
    echo "$gosha  $TOOLS/$gofile" | sha256sum -c --quiet - || fail "$gofile does not have the expected SHA-256"
    tar -C "$TOOLS" -xzf "$TOOLS/$gofile"
    ln -sf "$TOOLS/go/bin/go" "$TOOLS/bin/go"
  fi
  step "gym"
  (cd "$GYM_REPO/services/gym" && nice go build -trimpath -o "$TOOLS/bin/gym" ./cmd/gym > "$LOGS/gym-build.log" 2>&1) || fail "gym build failed; see $LOGS/gym-build.log"
fi

echo "setup done. Tools in $TOOLS/bin; add it to PATH, or let run.sh do it."
