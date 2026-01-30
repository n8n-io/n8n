#!/bin/bash

# Script to update repository URLs after migration
# From: kcribb14/test-n8n
# To: kcribb14/taxflow-enhanced

set -e

echo "🔄 Updating repository URLs..."
echo ""

# Update README.md
echo "📝 Updating README.md..."
sed -i 's|github.com/kcribb14/test-n8n|github.com/kcribb14/taxflow-enhanced|g' README.md

# Update DEPLOYMENT_GUIDE.md
echo "📝 Updating DEPLOYMENT_GUIDE.md..."
sed -i 's|github.com/kcribb14/test-n8n|github.com/kcribb14/taxflow-enhanced|g' DEPLOYMENT_GUIDE.md

# Update NETLIFY_DEPLOYMENT.md
echo "📝 Updating NETLIFY_DEPLOYMENT.md..."
sed -i 's|github.com/kcribb14/test-n8n|github.com/kcribb14/taxflow-enhanced|g' NETLIFY_DEPLOYMENT.md

# Update PRIVATE_REPO_MIGRATION.md
echo "📝 Updating PRIVATE_REPO_MIGRATION.md..."
sed -i 's|kcribb14/test-n8n|kcribb14/taxflow-enhanced|g' PRIVATE_REPO_MIGRATION.md

# Update CONTRIBUTING.md (if exists)
if [ -f "CONTRIBUTING.md" ]; then
  echo "📝 Updating CONTRIBUTING.md..."
  sed -i 's|github.com/kcribb14/test-n8n|github.com/kcribb14/taxflow-enhanced|g' CONTRIBUTING.md
fi

# Update package.json repository field (if exists)
if [ -f "package.json" ]; then
  echo "📝 Updating package.json..."
  sed -i 's|kcribb14/test-n8n|kcribb14/taxflow-enhanced|g' package.json
fi

echo ""
echo "✅ All URLs updated!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Commit changes: git add . && git commit -m 'docs: Update repository URLs after migration'"
echo "3. Push to new repository: git push origin <your-branch>"
