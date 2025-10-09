#!/bin/bash

# Script to replace CSS token names with new double-dash format
# Run from anywhere - uses absolute paths

# Absolute path to frontend directory
FRONTEND_DIR="./packages/frontend"

# Find all files in frontend folder except _tokens.scss (which is already updated)
echo "Finding files to process..."
files=$(find "$FRONTEND_DIR" -type f \( -name "*.css" -o -name "*.scss" -o -name "*.vue" -o -name "*.ts" -o -name "*.snap" -o -name "*.test.ts" -o -name "*.js" -o -name "*.md" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.vite/*" ! -path "*/_tokens.deprecated.scss" ! -path "*/_tokens.dark.deprecated.scss")

file_count=$(echo "$files" | wc -l | xargs)
echo "Found $file_count files to process"
echo ""
echo "Starting token replacements..."
echo ""

# Primary color tokens (including HSL components) - process first as most specific
echo "[1/9] Replacing primary color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-primary-shade-1/--color--primary--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-tint-3/--color--primary--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-tint-2/--color--primary--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-tint-1/--color--primary--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-h/--color--primary-h/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-s/--color--primary-s/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-l/--color--primary-l/g'
echo "$files" | xargs perl -pi -e 's/--color-primary(?!-)/--color--primary/g'
echo "✓ Primary color tokens replaced"
echo ""

# Secondary color tokens
echo "[2/9] Replacing secondary color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-secondary-shade-1/--color--secondary--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-3/--color--secondary--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-1/--color--secondary--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary(?!-)/--color--secondary/g'
echo "✓ Secondary color tokens replaced"
echo ""

# Success color tokens
echo "[3/9] Replacing success color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-success-shade-1/--color--success--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-success-light-2/--color--success--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-success-light/--color--success--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-success-tint-2/--color--success--tint-4/g'
echo "$files" | xargs perl -pi -e 's/--color-success-tint-1/--color--success--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-success(?!-)/--color--success/g'
echo "✓ Success color tokens replaced"
echo ""

# Warning color tokens
echo "[4/9] Replacing warning color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-warning-shade-1/--color--warning--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-warning-tint-2/--color--warning--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-warning-tint-1/--color--warning--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-warning(?!-)/--color--warning/g'
echo "✓ Warning color tokens replaced"
echo ""

# Danger color tokens
echo "[5/9] Replacing danger color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-danger-shade-1/--color--danger--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-light-2/--color--danger--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-light/--color--danger--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-tint-2/--color--danger--tint-4/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-tint-1/--color--danger--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-danger(?!-)/--color--danger/g'
echo "✓ Danger color tokens replaced"
echo ""

# Text color tokens
echo "[6/9] Replacing text color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-text-lighter/--color--text--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-text-xlight/--color--text--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-text-danger/--color--text--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-text-light/--color--text--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-text-base/--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-text-dark/--color--text--shade-1/g'
echo "✓ Text color tokens replaced"
echo ""

# Foreground color tokens
echo "[7/9] Replacing foreground color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-foreground-light/--color--foreground--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-xlight/--color--foreground--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-dark/--color--foreground--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-xdark/--color--foreground--shade-2/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-base/--color--foreground/g'
echo "✓ Foreground color tokens replaced"
echo ""

# Background color tokens
echo "[8/9] Replacing background color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-background-medium/--color--background--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-background-dark/--color--background--shade-2/g'
echo "$files" | xargs perl -pi -e 's/--color-background-xlight/--color--background--light-3/g'
echo "$files" | xargs perl -pi -e 's/--color-background-light-base/--color--background--light-1/g'
echo "$files" | xargs perl -pi -e 's/--color-background-light/--color--background--light-2/g'
echo "$files" | xargs perl -pi -e 's/--color-background-base/--color--background/g'
echo "✓ Background color tokens replaced"
echo ""

echo "[9/9] Verifying replacements..."
remaining=$(echo "$files" | xargs grep -l "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | xargs grep "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | grep -v "\-\-color\-\-" | wc -l | xargs)
echo "Remaining old tokens found: $remaining"
echo ""

echo "✓ Token replacements complete!"
echo "Processed $file_count files"
