#!/usr/bin/env bash
# Scope nodes-base Jest runs to in-package diffs when MERGE_BASE is set.
# Falls back to a full run when diff context is missing or when changes
# affect inputs that Jest's import-graph walk can't see.
set -euo pipefail

# Full: no diff context (master/nightly/release — MERGE_BASE unset).
if [ -z "${MERGE_BASE:-}" ]; then
	echo "[test-changed] MERGE_BASE unset → full run"
	exec jest "$@"
fi

# Full: nothing in this package changed. Turbo may have invoked us because
# of an upstream change; --changedSince here would walk an empty diff and
# run zero tests.
CHANGED_IN_PACKAGE=$(git diff --name-only "$MERGE_BASE"...HEAD -- packages/nodes-base/)
if [ -z "$CHANGED_IN_PACKAGE" ]; then
	echo "[test-changed] in-package diff empty (upstream-only change) → full run"
	exec jest "$@"
fi

# Full: in-package files Jest's import graph can't follow.
if echo "$CHANGED_IN_PACKAGE" | grep -qE '/(jest\.config\.js|test/(setup|globalSetup)\.ts|package\.json)$'; then
	echo "[test-changed] config/setup change in-package → full run"
	exec jest "$@"
fi

# Full: cross-cutting deps that affect runtime.
if git diff --name-only "$MERGE_BASE"...HEAD | grep -qE '^(pnpm-lock\.yaml|package\.json|packages/cli/src/public-api/v1/)'; then
	echo "[test-changed] cross-cutting diff (lockfile/root package/public-api) → full run"
	exec jest "$@"
fi

echo "[test-changed] scoping via jest --changedSince=$MERGE_BASE"
exec jest --changedSince="$MERGE_BASE" "$@"
