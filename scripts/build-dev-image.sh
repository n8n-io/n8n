#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Build and Push Development Docker Image
# ============================================
# This script triggers the GitHub Action to build
# a Docker image for your current branch
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed"
    echo "Install it with: brew install gh"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub"
    echo "Run: gh auth login"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BRANCH="${1:-$CURRENT_BRANCH}"

# Sanitize branch name for Docker tag
SAFE_BRANCH=$(echo "$BRANCH" | tr '/' '-' | tr -cd '[:alnum:]-_')

# Get repository info
REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
REPO_NAME=$(gh repo view --json name --jq '.name')

log_info "Repository: $REPO_OWNER/$REPO_NAME"
log_info "Branch: $BRANCH"
log_info "Docker tag: ghcr.io/$REPO_OWNER/n8n:branch-$SAFE_BRANCH"
echo ""

# Confirm
read -p "$(echo -e "${YELLOW}?${NC} Trigger Docker build for branch '$BRANCH'? [y/N] ")" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Build cancelled"
    exit 0
fi

log_info "Triggering GitHub Action workflow..."
echo ""

# Trigger the workflow
gh workflow run docker-build-dev.yml \
    --ref "$BRANCH" \
    -f branch="$BRANCH" \
    -f push_to_registry=true

log_success "Workflow triggered!"
echo ""
log_info "Monitor the build progress:"
echo "  gh run watch"
echo ""
log_info "Or view in browser:"
echo "  gh workflow view docker-build-dev.yml --web"
echo ""

# Wait a moment for the run to appear
sleep 3

# Try to get the latest run
log_info "Latest workflow runs:"
gh run list --workflow=docker-build-dev.yml --limit 3

echo ""
log_info "Once the build completes, update your .env file:"
echo "  export GITHUB_REPOSITORY_OWNER=$REPO_OWNER"
echo "  export BRANCH_NAME=$SAFE_BRANCH"
echo ""
log_info "Then pull the image:"
echo "  docker compose -f docker-compose.dev.yml pull"
echo "  docker compose -f docker-compose.dev.yml up -d"
