#!/usr/bin/env bash
# The regression gate of the performance model (docs/perf-model.md, section 10).
# For each corpus case, `wfrt perf-model --gate` gives the counts of one
# execution: bytecode instructions, memory reads, memory writes, dependent
# loads, and cache lines touched. `perf-record` holds the accepted counts.
#   bench/perf-gate.sh            fail when a count of a case is above its record
#   bench/perf-gate.sh --update   write perf-record from this build
# The gate needs the recorder build. It makes one when zig-out/perf has none:
#   zig build -Drelease=true -Dperf-model=true --prefix zig-out/perf
# The counts do not depend on the cost table or on the machine. `lines` can
# move by a few with the alignment of a buffer, so it has a tolerance.
set -uo pipefail
cd "$(dirname "$0")/.."
WFRT=${WFRT:-zig-out/perf/bin/wfrt}
CORPUS=${CORPUS:-../packages/@n8n/workflow-lang/corpus}
RECORD=perf-record
LINES_TOLERANCE=${LINES_TOLERANCE:-4}
if [ ! -x "$WFRT" ]; then
  zig build -Drelease=true -Dperf-model=true --prefix zig-out/perf || exit 2
fi
new=$(mktemp)
trap 'rm -f "$new"' EXIT
for dir in "$CORPUS"/*/; do
  name=$(basename "$dir")
  [ -f "$dir/module.wfm" ] && [ -f "$dir/fixture.json" ] || continue
  # Through a pipe: wfrt writes a file at its own offset, so `>>` would not append.
  if ! line=$("$WFRT" perf-model "$dir/module.wfm" "$dir/fixture.json" 5 --gate "$name" 2> /dev/null); then
    echo "perf-gate: $name did not run" >&2
    exit 2
  fi
  echo "$line" >> "$new"
done
if [ "${1:-}" = "--update" ]; then
  {
    echo "# The accepted counts of the performance model for one execution of each corpus case."
    echo "# A count may only go down. bench/perf-gate.sh checks it; --update writes this file."
    echo "# case instructions reads writes dependent_loads lines"
    cat "$new"
  } > "$RECORD"
  echo "perf-gate: wrote $RECORD ($(wc -l < "$new" | tr -d ' ') cases)"
  exit 0
fi
awk -v tol="$LINES_TOLERANCE" '
  BEGIN { split("instructions reads writes dependent_loads lines", col, " ") }
  FNR == NR { if ($1 !~ /^#/) { for (i = 2; i <= 6; i++) rec[$1, i] = $i; known[$1] = 1 } next }
  {
    if (!($1 in known)) { printf "perf-gate: %s has no line in perf-record; run --update\n", $1; bad = 1; next }
    seen[$1] = 1
    for (i = 2; i <= 6; i++) {
      limit = rec[$1, i] + (i == 6 ? tol : 0)
      if ($i > limit) { printf "perf-gate: %s: %s rose from %s to %s\n", $1, col[i - 1], rec[$1, i], $i; bad = 1 }
      else if ($i < rec[$1, i] - (i == 6 ? tol : 0)) { printf "perf-gate: %s: %s fell from %s to %s; run --update to keep the gain\n", $1, col[i - 1], rec[$1, i], $i }
    }
  }
  END {
    for (k in known) if (!(k in seen)) { printf "perf-gate: %s is in perf-record but did not run\n", k; bad = 1 }
    if (bad) { print "perf-gate: FAIL"; exit 1 }
    print "perf-gate: PASS"
  }' "$RECORD" "$new"
