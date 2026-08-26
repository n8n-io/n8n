#!/usr/bin/env bash
# Two-arm A/B for the activity-awareness surfaces.
#
# The arms differ by a flag on the n8n instance under test, not by a runner argument, so each arm
# needs its own instance start. That is the whole reason this is a script rather than a flag:
#   arm A (control) N8N_INSTANCE_AI_ACTIVITY_LOG_ENABLED unset  — no <recent-activity> block,
#                                                                 no `activity` tool
#   arm B (treated) N8N_INSTANCE_AI_ACTIVITY_LOG_ENABLED=true  — both present
#
# `workflows(action="node-usage")` is NOT gated by that flag: it reads the dependency index, which is
# always there. So the preference case measures the tool, and the two feed cases measure the block.
# Read arm B's win on the feed cases as the block's effect and the preference case as a fixed
# capability present in both arms — a difference there is noise, not signal.
#
# Usage, from the repo root:
#   scripts/ab-activity-eval.sh            # both arms, 5 iterations each
#   ITERATIONS=8 scripts/ab-activity-eval.sh
#   ARM=b scripts/ab-activity-eval.sh      # one arm, if the instance is already up
#
# Requires: an n8n instance you start yourself per the printed instructions, plus the eval env
# (LANGSMITH_API_KEY and a model credential) already in packages/@n8n/instance-ai/.env.
set -euo pipefail

ITERATIONS="${ITERATIONS:-5}"
BASE_URL="${BASE_URL:-http://localhost:5680}"
TIER="${TIER:-activity}"
OUT_DIR="${OUT_DIR:-.eval-ab}"
ARM="${ARM:-both}"

# n≥5 is not a preference. The working notes record the same unchanged case failing 3-of-3 on one
# run and 1-of-3 on the next, so anything below 5 is a sample, not a rate.
if [ "$ITERATIONS" -lt 5 ]; then
	echo "  ITERATIONS=$ITERATIONS is below 5; per-case rates from fewer runs are not quotable." >&2
fi

mkdir -p "$OUT_DIR"

run_arm() {
	local arm="$1" flag="$2"

	cat <<-EOF

	  ─────────────────────────────────────────────────────────────────
	  ARM $arm — activity log ${flag:-OFF}

	  Start the instance under test with this, and wait for it to be ready:

	    $( [ -n "$flag" ] && echo "N8N_INSTANCE_AI_ACTIVITY_LOG_ENABLED=true \\" )
	    N8N_PORT=5680 pnpm start

	  The flag is read once when the relay registers, so a running instance
	  cannot be switched — it has to be restarted between arms.
	EOF

	read -r -p "  Press enter once the instance is up on $BASE_URL (or Ctrl-C to stop): " _

	# --dataset keeps each arm in its own LangSmith cohort so one arm cannot overwrite the other.
	# The runner always writes eval-results.json into --output-dir, so each arm gets its own dir.
	local dir="$OUT_DIR/arm-$arm"
	mkdir -p "$dir"
	pnpm --filter @n8n/instance-ai eval:instance-ai \
		--tier "$TIER" \
		--iterations "$ITERATIONS" \
		--base-url "$BASE_URL" \
		--dataset "instance-ai-activity-ab-arm-$arm" \
		--output-dir "$dir"

	echo "  arm $arm results -> $dir/eval-results.json"
}

case "$ARM" in
	a) run_arm a "" ;;
	b) run_arm b "true" ;;
	both)
		run_arm a ""
		run_arm b "true"
		echo
		echo "  ─────────────────────────────────────────────────────────────────"
		echo "  Comparing arms. What to read, in order:"
		echo "    1. context-ignored — the block was present and changed nothing. If this dominates,"
		echo "       arm B is cost without benefit and the answer is no."
		echo "    2. the negative control — if it regresses in arm B, that is worse than no feed."
		echo "    3. probe-anchored assertions — carried in, or fetched during the turn."
		echo "    4. tokens per turn — the price of the block."
		echo
		pnpm --filter @n8n/instance-ai exec tsx evaluations/cli/build-cost-report.ts \
			--results "$OUT_DIR/arm-a/eval-results.json" --label control \
			--results "$OUT_DIR/arm-b/eval-results.json" --label activity-on || {
			echo "  Cost report failed; both result files are still under $OUT_DIR." >&2
		}
		;;
	*) echo "ARM must be a, b, or both" >&2; exit 1 ;;
esac
