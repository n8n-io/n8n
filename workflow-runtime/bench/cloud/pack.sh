#!/usr/bin/env bash
# Packs the source tree for a benchmark VM: the tracked and untracked files
# of the working tree that git does not ignore, as one tarball. It leaves
# out files with data from customer workflows (the warm results and replay
# lists, which name bundle ids) and local logs. On the VM, unpack it and run
# bench/cloud/setup.sh.
#
#   workflow-runtime/bench/cloud/pack.sh [out.tar.gz]
set -euo pipefail
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
OUT=${1:-/tmp/wfrt-bench-src.tar.gz}
cd "$REPO"
list=$(mktemp)
git ls-files -co --exclude-standard -z |
  tr '\0' '\n' |
  grep -v -E '^(install\.log|run)$' |
  grep -v -E '^packages/cli/bin/\.cache/' |
  grep -v -E '^workflow-runtime/bench/warm/(results-.*\.json|replay-.*\.jsonl)$' |
  grep -v -E '^workflow-runtime/bench/mix/replay-.*\.json$' |
  grep -v -E '^workflow-runtime/bench/cloud/results/' |
  while IFS= read -r f; do [ -f "$f" ] && printf '%s\0' "$f"; done > "$list"
# The commit goes in as SOURCE_COMMIT (sysinfo.sh reads it), without a file in the repo.
meta=$(mktemp -d)
git rev-parse --short HEAD > "$meta/SOURCE_COMMIT"
# bsdtar (macOS) would add extended attributes that GNU tar warns about.
nox=; tar --version 2> /dev/null | grep -q bsdtar && nox="--no-xattrs --no-mac-metadata"
COPYFILE_DISABLE=1 tar $nox --null -T "$list" -cf "$meta/src.tar"
COPYFILE_DISABLE=1 tar $nox -rf "$meta/src.tar" -C "$meta" SOURCE_COMMIT
gzip -c "$meta/src.tar" > "$OUT"
rm -rf "$list" "$meta"
echo "$OUT: $(du -h "$OUT" | cut -f1), commit $(git rev-parse --short HEAD) plus the working tree"
