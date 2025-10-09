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
echo "[1] Replacing primary color tokens..."
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
echo "[2] Replacing secondary color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-secondary-shade-1/--color--secondary--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-3/--color--secondary--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-1/--color--secondary--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary(?!-)/--color--secondary/g'
echo "✓ Secondary color tokens replaced"
echo ""

# Success color tokens
echo "[3] Replacing success color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-success-shade-1/--color--success--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-success-light-2/--color--success--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-success-light/--color--success--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-success-tint-2/--color--success--tint-4/g'
echo "$files" | xargs perl -pi -e 's/--color-success-tint-1/--color--success--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-success(?!-)/--color--success/g'
echo "✓ Success color tokens replaced"
echo ""

# Warning color tokens
echo "[4] Replacing warning color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-warning-shade-1/--color--warning--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-warning-tint-2/--color--warning--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-warning-tint-1/--color--warning--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-warning(?!-)/--color--warning/g'
echo "✓ Warning color tokens replaced"
echo ""

# Danger color tokens
echo "[5] Replacing danger color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-danger-shade-1/--color--danger--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-light-2/--color--danger--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-light/--color--danger--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-tint-2/--color--danger--tint-4/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-tint-1/--color--danger--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-danger(?!-)/--color--danger/g'
echo "✓ Danger color tokens replaced"
echo ""

# Text color tokens
echo "[6] Replacing text color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-text-lighter/--color--text--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-text-xlight/--color--text--tint-3/g'
echo "$files" | xargs perl -pi -e 's/--color-text-danger/--color--text--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-text-light/--color--text--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-text-base/--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-text-dark/--color--text--shade-1/g'
echo "✓ Text color tokens replaced"
echo ""

# Foreground color tokens
echo "[7] Replacing foreground color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-foreground-light/--color--foreground--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-xlight/--color--foreground--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-dark/--color--foreground--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-xdark/--color--foreground--shade-2/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-base/--color--foreground/g'
echo "✓ Foreground color tokens replaced"
echo ""

# Background color tokens
echo "[8] Replacing background color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-background-medium/--color--background--shade-1/g'
echo "$files" | xargs perl -pi -e 's/--color-background-dark/--color--background--shade-2/g'
echo "$files" | xargs perl -pi -e 's/--color-background-xlight/--color--background--light-3/g'
echo "$files" | xargs perl -pi -e 's/--color-background-light-base/--color--background--light-1/g'
echo "$files" | xargs perl -pi -e 's/--color-background-light/--color--background--light-2/g'
echo "$files" | xargs perl -pi -e 's/--color-background-base/--color--background/g'
echo "✓ Background color tokens replaced"
echo ""

# Box shadow tokens
echo "[9] Replacing box shadow tokens..."
echo "$files" | xargs perl -pi -e 's/--box-shadow-light/--shadow--light/g'
echo "$files" | xargs perl -pi -e 's/--box-shadow-dark/--shadow--dark/g'
echo "$files" | xargs perl -pi -e 's/--box-shadow-base/--shadow/g'
echo "✓ Box shadow tokens replaced"
echo ""

# Border radius tokens
echo "[10] Replacing border radius tokens..."
echo "$files" | xargs perl -pi -e 's/--border-radius-xlarge/--radius--xl/g'
echo "$files" | xargs perl -pi -e 's/--border-radius-large/--radius--lg/g'
echo "$files" | xargs perl -pi -e 's/--border-radius-small/--radius--sm/g'
echo "$files" | xargs perl -pi -e 's/--border-radius-base/--radius/g'
echo "✓ Border radius tokens replaced"
echo ""

# Border tokens (remove -base suffix)
echo "[11] Replacing border tokens..."
echo "$files" | xargs perl -pi -e 's/--border-style-base/--border-style/g'
echo "$files" | xargs perl -pi -e 's/--border-width-base/--border-width/g'
echo "$files" | xargs perl -pi -e 's/--border-color-light/--border-color--light/g'
echo "$files" | xargs perl -pi -e 's/--border-color-base/--border-color/g'
echo "$files" | xargs perl -pi -e 's/--border-base(?!-)/--border/g'
echo "✓ Border tokens replaced"
echo ""

# Font line height tokens
echo "[12] Replacing font line height tokens..."
echo "$files" | xargs perl -pi -e 's/--font-line-height-xsmall/--line-height--xs/g'
echo "$files" | xargs perl -pi -e 's/--font-line-height-compact/--line-height--sm/g'
echo "$files" | xargs perl -pi -e 's/--font-line-height-regular/--line-height--md/g'
echo "$files" | xargs perl -pi -e 's/--font-line-height-loose/--line-height--lg/g'
echo "$files" | xargs perl -pi -e 's/--font-line-height-xloose/--line-height--xl/g'
echo "✓ Font line height tokens replaced"
echo ""

# Spacing tokens
echo "[13] Replacing spacing tokens..."
echo "$files" | xargs perl -pi -e 's/--spacing-5xl/--spacing--5xl/g'
echo "$files" | xargs perl -pi -e 's/--spacing-4xl/--spacing--4xl/g'
echo "$files" | xargs perl -pi -e 's/--spacing-3xl/--spacing--3xl/g'
echo "$files" | xargs perl -pi -e 's/--spacing-2xl/--spacing--2xl/g'
echo "$files" | xargs perl -pi -e 's/--spacing-xl/--spacing--xl/g'
echo "$files" | xargs perl -pi -e 's/--spacing-l(?!-)/--spacing--lg/g'
echo "$files" | xargs perl -pi -e 's/--spacing-m(?!-)/--spacing--md/g'
echo "$files" | xargs perl -pi -e 's/--spacing-s(?!-)/--spacing--sm/g'
echo "$files" | xargs perl -pi -e 's/--spacing-xs/--spacing--xs/g'
echo "$files" | xargs perl -pi -e 's/--spacing-2xs/--spacing--2xs/g'
echo "$files" | xargs perl -pi -e 's/--spacing-3xs/--spacing--3xs/g'
echo "$files" | xargs perl -pi -e 's/--spacing-4xs/--spacing--4xs/g'
echo "$files" | xargs perl -pi -e 's/--spacing-5xs/--spacing--5xs/g'
echo "✓ Spacing tokens replaced"
echo ""

# Font family tokens
echo "[14] Replacing font family tokens..."
echo "$files" | xargs perl -pi -e 's/--font-family-monospace/--font-family--monospace/g'
echo "✓ Font family tokens replaced"
echo ""

# Font weight tokens
echo "[15] Replacing font weight tokens..."
echo "$files" | xargs perl -pi -e 's/--font-weight-bold/--font-weight--bold/g'
echo "$files" | xargs perl -pi -e 's/--font-weight-medium/--font-weight--medium/g'
echo "$files" | xargs perl -pi -e 's/--font-weight-regular/--font-weight--regular/g'
echo "✓ Font weight tokens replaced"
echo ""

# Font size tokens
echo "[16] Replacing font size tokens..."
echo "$files" | xargs perl -pi -e 's/--font-size-4xs/--font-size--4xs/g'
echo "$files" | xargs perl -pi -e 's/--font-size-3xs/--font-size--3xs/g'
echo "$files" | xargs perl -pi -e 's/--font-size-2xs/--font-size--2xs/g'
echo "$files" | xargs perl -pi -e 's/--font-size-2xl/--font-size--2xl/g'
echo "$files" | xargs perl -pi -e 's/--font-size-xl/--font-size--xl/g'
echo "$files" | xargs perl -pi -e 's/--font-size-xs/--font-size--xs/g'
echo "$files" | xargs perl -pi -e 's/--font-size-l/--font-size--lg/g'
echo "$files" | xargs perl -pi -e 's/--font-size-m/--font-size--md/g'
echo "$files" | xargs perl -pi -e 's/--font-size-s/--font-size--sm/g'
echo "✓ Font size tokens replaced"
echo ""

echo "[17] Verifying replacements..."
remaining=$(echo "$files" | xargs grep -l "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | xargs grep "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | grep -v "\-\-color\-\-" | wc -l | xargs)
echo "Remaining old tokens found: $remaining"
echo ""

echo "✓ Token replacements complete!"
echo "Processed $file_count files"
