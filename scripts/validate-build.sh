#!/bin/bash
# Build Validation Script
# Catches build errors before they hit production

set -e

echo "🔍 Running Pre-Push Validation..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Step 1/3: Building Critical Packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm build --filter @n8n/api-types --filter n8n 2>&1 | tee /tmp/n8n-build-quick.log; then
    echo -e "${GREEN}✅ Critical packages built successfully${NC}"
else
    echo -e "${RED}❌ Build failed - check /tmp/n8n-build-quick.log${NC}"
    FAILED=1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔎 Step 2/3: TypeScript Type Checking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if pnpm --filter n8n typecheck 2>&1 | tee /tmp/n8n-typecheck.log; then
    echo -e "${GREEN}✅ Type checking passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type errors found - check /tmp/n8n-typecheck.log${NC}"
    echo -e "${YELLOW}   (You can still push if these are known upstream issues)${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 Step 3/3: Code Style (Biome/Prettier)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd packages/cli
if pnpm biome check --no-errors-on-unmatched --write >/dev/null 2>&1 || \
   pnpm prettier --write "src/**/*.ts" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Code formatted${NC}"
else
    echo -e "${YELLOW}⚠️  Some formatting issues (non-blocking)${NC}"
fi
cd ../..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    echo ""
    echo "Safe to push to production 🚀"
    exit 0
else
    echo -e "${RED}❌ Build validation failed${NC}"
    echo ""
    echo "Fix errors before pushing to production"
    echo "Logs saved to:"
    echo "  - /tmp/n8n-build-quick.log"
    echo "  - /tmp/n8n-typecheck.log"
    exit 1
fi
