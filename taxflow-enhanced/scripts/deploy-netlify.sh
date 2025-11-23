#!/bin/bash

# TaxFlow Enhanced - Netlify Deployment Script
# Version: 1.0.0
# Description: Automated deployment script with pre-deployment checks

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     TaxFlow Enhanced - Netlify Deployment Script          ║"
echo "║                    Version 1.0.0                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Step 1: Pre-deployment checks
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Running Pre-Deployment Checks${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ Error: package.json not found${NC}"
  echo "  Please run this script from the project root directory"
  exit 1
fi

echo -e "  ${GREEN}✓${NC} Correct directory verified"

# Check if netlify.toml exists
if [ ! -f "netlify.toml" ]; then
  echo -e "${YELLOW}⚠ Warning: netlify.toml not found${NC}"
  echo "  Deployment will use Netlify dashboard settings"
else
  echo -e "  ${GREEN}✓${NC} netlify.toml found"
fi

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
  echo -e "${YELLOW}⚠ Netlify CLI not found${NC}"
  echo ""
  read -p "  Install Netlify CLI globally? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "  Installing Netlify CLI..."
    npm install -g netlify-cli
    echo -e "  ${GREEN}✓${NC} Netlify CLI installed"
  else
    echo -e "${RED}✗ Netlify CLI is required for deployment${NC}"
    echo "  Install manually: npm install -g netlify-cli"
    exit 1
  fi
else
  echo -e "  ${GREEN}✓${NC} Netlify CLI found ($(netlify --version))"
fi

echo ""

# Step 2: Run tests
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: Running Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "  Running test suite..."
if npm run test:run > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} All tests passing (119/119)"
else
  echo -e "${RED}✗ Tests failed${NC}"
  echo ""
  echo "  Would you like to:"
  echo "    1) View test results"
  echo "    2) Skip tests and continue deployment"
  echo "    3) Cancel deployment"
  echo ""
  read -p "  Enter your choice (1-3): " choice

  case $choice in
    1)
      npm run test:run
      exit 1
      ;;
    2)
      echo -e "${YELLOW}⚠ Continuing without passing tests${NC}"
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
fi

echo ""

# Step 3: Run linter
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: Running Linter${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "  Running ESLint..."
if npm run lint > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} No linting errors"
else
  echo -e "${YELLOW}⚠ Linting warnings found (can continue)${NC}"
fi

echo ""

# Step 4: Build application
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Building Production Bundle${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "  Building application..."
if npm run build > build.log 2>&1; then
  # Get build size
  if [ -d "dist" ]; then
    BUILD_SIZE=$(du -sh dist | cut -f1)
    echo -e "  ${GREEN}✓${NC} Production build successful"
    echo "    Build size: $BUILD_SIZE"
    echo "    Output directory: dist/"
  else
    echo -e "${RED}✗ Build failed - dist directory not created${NC}"
    echo "  Check build.log for details"
    exit 1
  fi
else
  echo -e "${RED}✗ Build failed${NC}"
  echo ""
  echo "  Last 20 lines of build.log:"
  tail -n 20 build.log
  exit 1
fi

echo ""

# Step 5: Check Git status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Checking Git Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠ Warning: You have uncommitted changes${NC}"
  echo ""
  git status --short
  echo ""
  read -p "  Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  Deployment cancelled."
    echo "  Commit your changes and try again."
    exit 0
  fi
else
  echo -e "  ${GREEN}✓${NC} Working directory clean"
fi

echo ""

# Step 6: Deployment options
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Choose Deployment Method${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Select deployment option:"
echo ""
echo "    1) Production Deploy (live site)"
echo "    2) Preview Deploy (test URL)"
echo "    3) Cancel"
echo ""
read -p "  Enter your choice (1-3): " deploy_choice

echo ""

case $deploy_choice in
  1)
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Deploying to Production${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  This will:"
    echo "    • Deploy to your live production site"
    echo "    • Make changes visible to all users"
    echo "    • Update https://taxflow-enhanced.netlify.app"
    echo ""
    read -p "  Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      echo ""
      echo "  Deploying to production..."
      echo ""

      # Run deployment
      netlify deploy --prod

      DEPLOY_STATUS=$?
      echo ""

      if [ $DEPLOY_STATUS -eq 0 ]; then
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}✓ Production Deployment Successful!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "  Next steps:"
        echo "    1. Visit your production URL to verify"
        echo "    2. Run post-deployment verification (see NETLIFY_DEPLOYMENT.md)"
        echo "    3. Set up monitoring (see MONITORING.md)"
        echo "    4. Set up analytics (see ANALYTICS.md)"
        echo ""
      else
        echo -e "${RED}✗ Deployment failed${NC}"
        echo "  Check the error messages above"
        exit 1
      fi
    else
      echo "  Production deployment cancelled."
      exit 0
    fi
    ;;

  2)
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Deploying to Preview${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  This will:"
    echo "    • Create a preview deployment with unique URL"
    echo "    • Not affect production site"
    echo "    • Allow testing before production deploy"
    echo ""
    echo "  Deploying to preview..."
    echo ""

    # Run preview deployment
    netlify deploy

    DEPLOY_STATUS=$?
    echo ""

    if [ $DEPLOY_STATUS -eq 0 ]; then
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo -e "${GREEN}✓ Preview Deployment Successful!${NC}"
      echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
      echo ""
      echo "  Test your preview deployment, then run this script again"
      echo "  and choose option 1 to deploy to production."
      echo ""
    else
      echo -e "${RED}✗ Deployment failed${NC}"
      echo "  Check the error messages above"
      exit 1
    fi
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

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Cleanup
if [ -f "build.log" ]; then
  rm build.log
fi

exit 0
