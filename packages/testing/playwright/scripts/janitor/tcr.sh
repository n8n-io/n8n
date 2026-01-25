#!/bin/bash
# TCR (Test && Commit || Revert) - Micro-refactor workflow
#
# Usage:
#   ./scripts/janitor/tcr.sh ClassName.methodName "commit message"
#   ./scripts/janitor/tcr.sh WorkflowsPage.addFolder "refactor: simplify addFolder"
#
# Prerequisites:
#   - n8n running locally on port 5680 (pnpm dev from cli package)
#
# What it does:
#   1. Finds tests affected by the method change
#   2. Runs only those tests against local n8n
#   3. Pass → commits with your message
#   4. Fail → reverts all uncommitted changes

set -e

METHOD=$1
MESSAGE=$2

if [ -z "$METHOD" ] || [ -z "$MESSAGE" ]; then
  echo "Usage: ./scripts/janitor/tcr.sh ClassName.methodName \"commit message\""
  echo "Example: ./scripts/janitor/tcr.sh WorkflowsPage.addFolder \"refactor: simplify addFolder\""
  exit 1
fi

echo "=== TCR: $METHOD ==="
echo ""

# Find affected tests
echo "Finding affected tests..."
TESTS=$(npx tsx scripts/janitor/index.ts --method-impact="$METHOD" --tests 2>/dev/null)

if [ -z "$TESTS" ]; then
  echo "No tests found for $METHOD"
  echo "Committing without test validation..."
  git commit -am "$MESSAGE"
  exit 0
fi

TEST_COUNT=$(echo "$TESTS" | wc -l | tr -d ' ')
echo "Found $TEST_COUNT test file(s):"
echo "$TESTS" | sed 's/^/  /'
echo ""

# Run tests directly with playwright (pnpm scripts don't pass multiple file args well)
echo "Running tests..."
# Convert newlines to spaces for proper argument passing
TESTS_ARGS=$(echo "$TESTS" | tr '\n' ' ')
if N8N_BASE_URL=http://localhost:5680 RESET_E2E_DB=true npx playwright test --project=e2e --reporter=line $TESTS_ARGS; then
  echo ""
  echo "✓ Tests passed - committing"
  git add -A
  git commit -m "$MESSAGE"
  echo "✓ Committed: $MESSAGE"
else
  echo ""
  echo "✗ Tests failed - reverting"
  git checkout -- .
  echo "✗ All changes reverted"
  exit 1
fi
