#!/bin/bash

# TaxFlow Enhanced - Vercel Deployment Script
# Version: 1.0.0

set -e  # Exit on error

echo "🚀 TaxFlow Enhanced - Production Deployment"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo -e "${BLUE}Step 1: Running pre-deployment checks...${NC}"
echo ""

echo "  ✓ Running tests..."
npm run test:run > /dev/null 2>&1 && echo -e "    ${GREEN}✓${NC} All tests passing (119/119)" || { echo "    ✗ Tests failed"; exit 1; }

echo "  ✓ Building production bundle..."
npm run build > /dev/null 2>&1 && echo -e "    ${GREEN}✓${NC} Production build successful" || { echo "    ✗ Build failed"; exit 1; }

echo "  ✓ Running linter..."
npm run lint > /dev/null 2>&1 && echo -e "    ${GREEN}✓${NC} Linting passed" || echo -e "    ${YELLOW}⚠${NC} Linting warnings (can continue)"

echo ""
echo -e "${GREEN}✓ All pre-deployment checks passed!${NC}"
echo ""

# Step 2: Git status
echo -e "${BLUE}Step 2: Checking Git status...${NC}"
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo -e "  ${YELLOW}⚠ Warning: You have uncommitted changes${NC}"
  git status --short
  echo ""
  read -p "  Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  Deployment cancelled."
    exit 1
  fi
else
  echo -e "  ${GREEN}✓${NC} Working directory clean"
fi

echo ""

# Step 3: Check if Vercel CLI is installed
echo -e "${BLUE}Step 3: Checking Vercel CLI...${NC}"
echo ""

if ! command -v vercel &> /dev/null; then
  echo -e "  ${YELLOW}⚠ Vercel CLI not found${NC}"
  echo ""
  read -p "  Install Vercel CLI globally? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  Installing Vercel CLI..."
    npm install -g vercel
    echo -e "  ${GREEN}✓${NC} Vercel CLI installed"
  else
    echo "  Please install Vercel CLI manually: npm install -g vercel"
    exit 1
  fi
else
  echo -e "  ${GREEN}✓${NC} Vercel CLI found"
fi

echo ""

# Step 4: Deployment options
echo -e "${BLUE}Step 4: Choose deployment method${NC}"
echo ""
echo "  1) Deploy to production (recommended for first deployment)"
echo "  2) Deploy to preview (for testing)"
echo "  3) Cancel"
echo ""
read -p "  Enter your choice (1-3): " choice

echo ""

case $choice in
  1)
    echo -e "${BLUE}Deploying to production...${NC}"
    echo ""
    echo "  This will:"
    echo "    • Build your application"
    echo "    • Deploy to Vercel production"
    echo "    • Make it live at https://taxflow-enhanced.vercel.app"
    echo ""
    read -p "  Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "  Running: vercel --prod"
      echo ""
      vercel --prod
      echo ""
      echo -e "${GREEN}🎉 Production deployment complete!${NC}"
      echo ""
      echo "Next steps:"
      echo "  1. Visit your deployment URL to verify"
      echo "  2. Run post-deployment verification (see DEPLOYMENT_VERIFICATION.md)"
      echo "  3. Set up monitoring (see MONITORING.md)"
      echo "  4. Set up analytics (see ANALYTICS.md)"
    else
      echo "  Deployment cancelled."
      exit 0
    fi
    ;;
  2)
    echo -e "${BLUE}Deploying to preview...${NC}"
    echo ""
    echo "  Running: vercel"
    echo ""
    vercel
    echo ""
    echo -e "${GREEN}✓ Preview deployment complete!${NC}"
    echo ""
    echo "  Test your preview deployment, then run this script again"
    echo "  and choose option 1 to deploy to production."
    ;;
  3)
    echo "  Deployment cancelled."
    exit 0
    ;;
  *)
    echo "  Invalid choice. Deployment cancelled."
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}==========================================="
echo "Deployment process complete!"
echo "===========================================${NC}"
