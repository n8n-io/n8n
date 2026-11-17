#!/usr/bin/env bash
# Run the Debug unit tests on Linux, in a Docker container, from macOS or
# Linux. The engine runs on Linux, and some failures show only there.
#   bench/linux-tests.sh [runs]      (default 1; more runs find a flaky test)
# The container has the machine's architecture (aarch64 on Apple silicon):
# that finds the errors of the logic. PLATFORM=linux/amd64 names x86_64; on
# Apple silicon it is emulated and slow, and Zig did not find the system
# libraries there (2026-11-17).
# The image has Ubuntu 24.04, Zig 0.17.0 (SHA-256 checked) and the headers of
# OpenSSL 3 and c-ares, as bench/cloud/setup.sh --install-deps installs them.
# The Zig caches and the test binaries stay in the Docker volume wfrt-linux-cache.
set -euo pipefail
cd "$(dirname "$0")/.."
RUNS=${1:-1}
# Always name the platform: a base image of another platform that Docker has
# already would be used without a word.
PLATFORM=${PLATFORM:-linux/$(docker version --format '{{.Server.Arch}}')}
IMAGE=wfrt-linux-tests-${PLATFORM#linux/}
docker build -q --platform "$PLATFORM" -t "$IMAGE" - > /dev/null << 'EOF'
FROM ubuntu:24.04
RUN apt-get update -q && DEBIAN_FRONTEND=noninteractive apt-get install -y -q build-essential pkg-config \
  libssl-dev libc-ares-dev curl xz-utils ca-certificates openssl util-linux > /dev/null
RUN set -e; A=$(uname -m); case "$A" in \
    x86_64) SHA=1cbe9df9f27e6b78d14ccbca43b6703a404ef79ef1c463de901d7f088d4e2026 ;; \
    aarch64) SHA=9e8d11661d4ae3bd57702a3832781e23ad151dde5798e16a5ccd503f65234ff8 ;; \
  esac; \
  curl -fsSL --retry 3 -o /tmp/zig.tar.xz "https://ziglang.org/download/0.17.0/zig-$A-linux-0.17.0.tar.xz"; \
  echo "$SHA  /tmp/zig.tar.xz" | sha256sum -c --quiet -; \
  mkdir /opt/zig; tar -C /opt/zig --strip-components=1 -xJf /tmp/zig.tar.xz; rm /tmp/zig.tar.xz; \
  ln -s /opt/zig/zig /usr/local/bin/zig
EOF
# The caches are apart from those of the host: its .zig-cache and zig-out stay as they are.
docker run --rm --platform "$PLATFORM" \
  -e ZIG_GLOBAL_CACHE_DIR=/cache/${PLATFORM#linux/}/global -e ZIG_LOCAL_CACHE_DIR=/cache/${PLATFORM#linux/}/local -e RUNS="$RUNS" \
  -v "$PWD":/wfrt -v wfrt-linux-cache:/cache -w /wfrt "$IMAGE" bash -c '
    set -euo pipefail
    zig build install-tests --prefix /cache/out-$(uname -m)
    for run in $(seq 1 "$RUNS"); do bench/run-tests.sh /cache/out-$(uname -m)/bin; done'
