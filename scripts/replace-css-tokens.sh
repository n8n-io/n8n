#!/bin/bash

# Script to replace CSS token names with new double-dash format
# Run from anywhere - uses absolute paths

# Absolute path to frontend directory
FRONTEND_DIR="./packages/frontend/editor-ui"

# Find all files in frontend folder except _tokens.scss (which is already updated)
echo "Finding files to process..."
files=$(find "$FRONTEND_DIR" -type f \( -name "*.css" -o -name "*.scss" -o -name "*.vue" -o -name "*.ts" -o -name "*.snap" -o -name "*.test.ts" -o -name "*.js" -o -name "*.md" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.vite/*" ! -path "*/_tokens.scss" ! -path "*/_tokens.dark.scss" ! -path "*/@n8n/chat/**")

# _tokens file only
#files=$(find "$FRONTEND_DIR" -type f \( -name "_tokens.scss" \))

file_count=$(echo "$files" | wc -l | xargs)
echo "Found $file_count files to process"
echo ""
echo "Starting token replacements..."
echo ""

# # Primary color tokens (including HSL components) - process first as most specific
# echo "[1] Replacing primary color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-primary-shade-1/--color--primary--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-tint-3/--color--primary--tint-3/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-tint-2/--color--primary--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-tint-1/--color--primary--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color--primary-h/--color--primary--h/g'
# echo "$files" | xargs perl -pi -e 's/--color--primary-s/--color--primary--s/g'
# echo "$files" | xargs perl -pi -e 's/--color--primary-l/--color--primary--l/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-h/--color--primary--h/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-s/--color--primary--s/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary-l/--color--primary--l/g'
# echo "$files" | xargs perl -pi -e 's/--color-primary(?!-)/--color--primary/g'
# echo "✓ Primary color tokens replaced"
# echo ""

# # Secondary color tokens
# echo "[2] Replacing secondary color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-secondary-shade-1/--color--secondary--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-3/--color--secondary--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-secondary-tint-1/--color--secondary--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-secondary(?!-)/--color--secondary/g'
# echo "✓ Secondary color tokens replaced"
# echo ""

# # Success color tokens
# echo "[3] Replacing success color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-success-shade-1/--color--success--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-success-light-2/--color--success--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-success-light/--color--success--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-success-tint-2/--color--success--tint-4/g'
# echo "$files" | xargs perl -pi -e 's/--color-success-tint-1/--color--success--tint-3/g'
# echo "$files" | xargs perl -pi -e 's/--color-success(?!-)/--color--success/g'
# echo "✓ Success color tokens replaced"
# echo ""

# # Warning color tokens
# echo "[4] Replacing warning color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-warning-shade-1/--color--warning--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-warning-tint-2/--color--warning--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-warning-tint-1/--color--warning--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-warning(?!-)/--color--warning/g'
# echo "✓ Warning color tokens replaced"
# echo ""

# # Danger color tokens
# echo "[5] Replacing danger color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-danger-shade-1/--color--danger--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-danger-light-2/--color--danger--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-danger-light/--color--danger--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-danger-tint-2/--color--danger--tint-4/g'
# echo "$files" | xargs perl -pi -e 's/--color-danger-tint-1/--color--danger--tint-3/g'
# echo "$files" | xargs perl -pi -e 's/--color-danger(?!-)/--color--danger/g'
# echo "✓ Danger color tokens replaced"
# echo ""

# # Text color tokens
# echo "[6] Replacing text color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-text-lighter/--color--text--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-text-xlight/--color--text--tint-3/g'
# echo "$files" | xargs perl -pi -e 's/--color-text-danger/--color--text--danger/g'
# echo "$files" | xargs perl -pi -e 's/--color-text-light/--color--text--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-text-base/--color--text/g'
# echo "$files" | xargs perl -pi -e 's/--color-text-dark/--color--text--shade-1/g'
# echo "✓ Text color tokens replaced"
# echo ""

# # Foreground color tokens
# echo "[7] Replacing foreground color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-foreground-light/--color--foreground--tint-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-foreground-xlight/--color--foreground--tint-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-foreground-dark/--color--foreground--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-foreground-xdark/--color--foreground--shade-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-foreground-base/--color--foreground/g'
# echo "✓ Foreground color tokens replaced"
# echo ""

# # Background color tokens
# echo "[8] Replacing background color tokens..."
# echo "$files" | xargs perl -pi -e 's/--color-background-medium/--color--background--shade-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-background-dark/--color--background--shade-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-background-xlight/--color--background--light-3/g'
# echo "$files" | xargs perl -pi -e 's/--color-background-light-base/--color--background--light-1/g'
# echo "$files" | xargs perl -pi -e 's/--color-background-light/--color--background--light-2/g'
# echo "$files" | xargs perl -pi -e 's/--color-background-base/--color--background/g'
# echo "✓ Background color tokens replaced"
# echo ""

# # Box shadow tokens
# echo "[9] Replacing box shadow tokens..."
# echo "$files" | xargs perl -pi -e 's/--box-shadow-light/--shadow--light/g'
# echo "$files" | xargs perl -pi -e 's/--box-shadow-dark/--shadow--dark/g'
# echo "$files" | xargs perl -pi -e 's/--box-shadow-base/--shadow/g'
# echo "✓ Box shadow tokens replaced"
# echo ""

# # Border radius tokens
# echo "[10] Replacing border radius tokens..."
# echo "$files" | xargs perl -pi -e 's/--border-radius-xlarge/--radius--xl/g'
# echo "$files" | xargs perl -pi -e 's/--border-radius-large/--radius--lg/g'
# echo "$files" | xargs perl -pi -e 's/--border-radius-small/--radius--sm/g'
# echo "$files" | xargs perl -pi -e 's/--border-radius-base/--radius/g'
# echo "✓ Border radius tokens replaced"
# echo ""

# # Border tokens (remove -base suffix)
# echo "[11] Replacing border tokens..."
# echo "$files" | xargs perl -pi -e 's/--border-style-base/--border-style/g'
# echo "$files" | xargs perl -pi -e 's/--border-width-base/--border-width/g'
# echo "$files" | xargs perl -pi -e 's/--border-color-light/--border-color--light/g'
# echo "$files" | xargs perl -pi -e 's/--border-color-base/--border-color/g'
# echo "$files" | xargs perl -pi -e 's/--border-base(?!-)/--border/g'
# echo "✓ Border tokens replaced"
# echo ""

# # Font line height tokens
# echo "[12] Replacing font line height tokens..."
# echo "$files" | xargs perl -pi -e 's/--font-line-height-xsmall/--line-height--xs/g'
# echo "$files" | xargs perl -pi -e 's/--font-line-height-compact/--line-height--sm/g'
# echo "$files" | xargs perl -pi -e 's/--font-line-height-regular/--line-height--md/g'
# echo "$files" | xargs perl -pi -e 's/--font-line-height-loose/--line-height--lg/g'
# echo "$files" | xargs perl -pi -e 's/--font-line-height-xloose/--line-height--xl/g'
# echo "✓ Font line height tokens replaced"
# echo ""

# # Spacing tokens
# echo "[13] Replacing spacing tokens..."
# echo "$files" | xargs perl -pi -e 's/--spacing-5xl/--spacing--5xl/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-4xl/--spacing--4xl/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-3xl/--spacing--3xl/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-2xl/--spacing--2xl/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-xl/--spacing--xl/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-l(?!-)/--spacing--lg/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-m(?!-)/--spacing--md/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-s(?!-)/--spacing--sm/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-xs/--spacing--xs/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-2xs/--spacing--2xs/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-3xs/--spacing--3xs/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-4xs/--spacing--4xs/g'
# echo "$files" | xargs perl -pi -e 's/--spacing-5xs/--spacing--5xs/g'
# echo "✓ Spacing tokens replaced"
# echo ""

# # Font family tokens
# echo "[14] Replacing font family tokens..."
# echo "$files" | xargs perl -pi -e 's/--font-family-monospace/--font-family--monospace/g'
# echo "✓ Font family tokens replaced"
# echo ""

# # Font weight tokens
# echo "[15] Replacing font weight tokens..."
# echo "$files" | xargs perl -pi -e 's/--font-weight-bold/--font-weight--bold/g'
# echo "$files" | xargs perl -pi -e 's/--font-weight-medium/--font-weight--medium/g'
# echo "$files" | xargs perl -pi -e 's/--font-weight-regular/--font-weight--regular/g'
# echo "✓ Font weight tokens replaced"
# echo ""

# # Font size tokens
# echo "[16] Replacing font size tokens..."
# echo "$files" | xargs perl -pi -e 's/--font-size-4xs/--font-size--4xs/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-3xs/--font-size--3xs/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-2xs/--font-size--2xs/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-2xl/--font-size--2xl/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-xl/--font-size--xl/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-xs/--font-size--xs/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-l/--font-size--lg/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-m/--font-size--md/g'
# echo "$files" | xargs perl -pi -e 's/--font-size-s/--font-size--sm/g'
# echo "✓ Font size tokens replaced"
# echo ""

# NOTE: Commenting out - these were already run in previous iterations
# # Z-index tokens
# echo "[New] Replacing z-index tokens..."
# echo "$files" | xargs perl -pi -e 's/--z-index-top-banners/--top-banners--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-app-header/--app-header--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-app-sidebar/--app-sidebar--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-workflow-preview-ndv/--workflow-preview--ndv--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-canvas-add-button/--canvas-add-button--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-codemirror-tooltip/--codemirror-tooltip--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-ask-assistant-chat/--ask-assistant--chat--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-ask-assistant-floating-button/--ask-assistant--floating-button--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-ndv/--ndv--z/g'
# echo "$files" | xargs perl -pi -e 's/--z-index-node-creator/--node-creator--z/g'
# echo "✓ Z-index tokens replaced"
# echo ""

# Height tokens
echo "[New] Replacing height tokens..."
echo "$files" | xargs perl -pi -e 's/--header-height/--header--height/g'
echo "$files" | xargs perl -pi -e 's/--banner-height/--banner--height/g'
echo "$files" | xargs perl -pi -e 's/--dialog-height/--dialog--height/g'
echo "$files" | xargs perl -pi -e 's/--dialog-min-height/--dialog--min-height/g'
echo "$files" | xargs perl -pi -e 's/--dialog-max-height/--dialog--max-height/g'
echo "$files" | xargs perl -pi -e 's/--content-height/--content--height/g'
echo "$files" | xargs perl -pi -e 's/--draggable-height/--draggable--height/g'
echo "$files" | xargs perl -pi -e 's/--expanded-max-height/--embedded-ndv--max-height--expanded/g'
echo "$files" | xargs perl -pi -e 's/--metrics-chart-height/--metrics-chart--height/g'
echo "$files" | xargs perl -pi -e 's/--parameter-input-options-height/--parameter-input-options--height/g'
echo "$files" | xargs perl -pi -e 's/--logs-panel-height/--logs-panel--height/g'
echo "$files" | xargs perl -pi -e 's/--google-auth-btn-height/--google-auth-btn--height/g'
echo "$files" | xargs perl -pi -e 's/--max-height-on-focus/--input--max-height--focus/g'
echo "✓ Height tokens replaced"
echo ""

# Width tokens
echo "[New] Replacing width tokens..."
echo "$files" | xargs perl -pi -e 's/--content-container-width/--content-container--width/g'
echo "$files" | xargs perl -pi -e 's/--dialog-max-width/--dialog--max-width/g'
echo "$files" | xargs perl -pi -e 's/--dialog-min-width/--dialog--min-width/g'
echo "$files" | xargs perl -pi -e 's/--node-creator-width/--node-creator--width/g'
echo "$files" | xargs perl -pi -e 's/--delete-option-width/--delete-option--width/g'
echo "$files" | xargs perl -pi -e 's/--input-issues-width/--resource-locator--input-issues--width/g'
echo "$files" | xargs perl -pi -e 's/--input-override-width/--resource-locator--input-override--width/g'
echo "$files" | xargs perl -pi -e 's/--input-width/--output-item-select--width/g'
echo "$files" | xargs perl -pi -e 's/--max-select-width/--node-input--select--max-width/g'
echo "$files" | xargs perl -pi -e 's/--project-field-width/--project-field--width/g'
echo "$files" | xargs perl -pi -e 's/--canvas-node-border-width/--canvas-node--border-width/g'
echo "✓ Width tokens replaced"
echo ""

# Background tokens (color--background)
echo "[New] Replacing background tokens..."
echo "$files" | xargs perl -pi -e 's/--menu-background/--menu--color--background/g'
echo "$files" | xargs perl -pi -e 's/--execution-list-item-background/--execution-list-item--color--background/g'
echo "$files" | xargs perl -pi -e 's/--execution-list-item-highlight-background/--execution-list-item--color--background--highlight/g'
echo "$files" | xargs perl -pi -e 's/--grid-cell-active-background/--grid-cell--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--trigger-icon-background-color/--trigger-icon--color--background/g'
echo "$files" | xargs perl -pi -e 's/--google-auth-btn-normal/--google-auth-btn--color--background--normal/g'
echo "$files" | xargs perl -pi -e 's/--google-auth-btn-focus/--google-auth-btn--color--background--focus/g'
echo "$files" | xargs perl -pi -e 's/--google-auth-btn-pressed/--google-auth-btn--color--background--pressed/g'
echo "$files" | xargs perl -pi -e 's/--google-auth-btn-disabled/--google-auth-btn--color--background--disabled/g'
echo "✓ Background tokens replaced"
echo ""

# Color tokens
echo "[New] Replacing color tokens..."
echo "$files" | xargs perl -pi -e 's/--canvas-node-icon-color/--canvas-node--icon-color/g'
echo "$files" | xargs perl -pi -e 's/--canvas-edge-color/--canvas-edge--color/g'
echo "$files" | xargs perl -pi -e 's/--edge-highlight-color/--edge--color--highlight/g'
echo "$files" | xargs perl -pi -e 's/--icon-base-color/--icon--color/g'
echo "$files" | xargs perl -pi -e 's/--button-color/--button--color/g'
echo "$files" | xargs perl -pi -e 's/--button-border-color/--button--border-color/g'
echo "$files" | xargs perl -pi -e 's/--trigger-icon-border-color/--trigger-icon--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-node-error-border-color/--canvas-node--border-color--error/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-active-focus-background/--button--color--background--secondary--hover/g'
echo "$files" | xargs perl -pi -e 's/--el-color-primary/--color--primary/g'
echo "✓ Color tokens replaced"
echo ""

# Border tokens - using radius for border-radius, border for border style
echo "[New] Replacing border tokens..."
echo "$files" | xargs perl -pi -e 's/--schema-preview-dashed-border-dark/--schema-preview--border--dashed--dark/g'
echo "$files" | xargs perl -pi -e 's/--schema-preview-dashed-border/--schema-preview--border--dashed/g'
echo "$files" | xargs perl -pi -e 's/--input-border-bottom-right-radius/--input-triple--radius--bottom-right/g'
echo "$files" | xargs perl -pi -e 's/--input-border-top-right-radius/--input-triple--radius--top-right/g'
echo "✓ Border tokens replaced"
echo ""

# Spacing and margin tokens (using margin-left, margin-top, etc)
echo "[New] Replacing spacing/margin tokens..."
echo "$files" | xargs perl -pi -e 's/--spacing-1xl/--spacing--xl/g'
echo "$files" | xargs perl -pi -e 's/--toast-bottom-offset/--toast--margin-bottom/g'
echo "$files" | xargs perl -pi -e 's/--ask-assistant-floating-button-bottom-offset/--ask-assistant--floating-button--margin-bottom/g'
echo "$files" | xargs perl -pi -e 's/--trigger-placeholder-top-position/--trigger-placeholder--margin-top/g'
echo "$files" | xargs perl -pi -e 's/--trigger-placeholder-left-position/--trigger-placeholder--margin-left/g'
echo "$files" | xargs perl -pi -e 's/--search-margin/--search--margin/g'
echo "$files" | xargs perl -pi -e 's/--ndv-spacing/--ndv--spacing/g'
echo "$files" | xargs perl -pi -e 's/--collapsed-offset/--collapsed--spacing/g'
echo "✓ Spacing/margin tokens replaced"
echo ""

# Font weight tokens
echo "[New] Replacing font weight tokens..."
echo "$files" | xargs perl -pi -e 's/--font-weight-normal/--font-weight--regular/g'
echo "✓ Font weight tokens replaced"
echo ""

# Animation/duration tokens
echo "[New] Replacing animation/duration tokens..."
echo "$files" | xargs perl -pi -e 's/--animation-duration/--ndv--sub-connections--duration/g'
echo "✓ Animation/duration tokens replaced"
echo ""

# Size tokens
echo "[New] Replacing size tokens..."
echo "$files" | xargs perl -pi -e 's/--node-size/--node--size/g'
echo "$files" | xargs perl -pi -e 's/--plus-button-size/--plus-button--size/g'
echo "✓ Size tokens replaced"
echo ""

# === New batch of tokens to fix remaining errors (excluding --chat namespace and unsupported properties) ===

# Fix simple text color tokens
echo "[Batch 2] Replacing remaining simple tokens..."
echo "$files" | xargs perl -pi -e 's/--color-text-base/--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-text(?!-)/--color--text/g'
echo "$files" | xargs perl -pi -e 's/--border-base(?!-)/--border/g'
echo "$files" | xargs perl -pi -e 's/--color-foreground-light/--color--foreground--tint-1/g'
echo "✓ Simple tokens replaced"
echo ""

# Fix incorrect conversions that need property adjustments (excluding chat)
echo "[Batch 2] Fixing property vocabulary issues..."
echo "$files" | xargs perl -pi -e 's/--canvas-node--background/--canvas-node--color--background/g'
echo "$files" | xargs perl -pi -e 's/--canvas-node--status-icons-offset/--canvas-node--status-icons--margin/g'
echo "$files" | xargs perl -pi -e 's/--trigger-node--border-radius/--trigger-node--radius/g'
echo "✓ Property vocabulary issues fixed"
echo ""

# GitHub-style diff viewer variables (third-party lib conventions)
echo "[Batch 2] Replacing third-party lib variables..."
echo "$files" | xargs perl -pi -e 's/--fgColor-default/--diff--color--foreground/g'
echo "$files" | xargs perl -pi -e 's/--bgColor-default/--diff--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-fg-subtle/--diff--color--foreground--subtle/g'
echo "$files" | xargs perl -pi -e 's/--color-diff-blob-deletion-num-bg/--diff--blob--deletion-num--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-diff-blob-deletion-num-text/--diff--blob--deletion-num--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-danger-emphasis/--diff--color--danger--emphasis/g'
echo "$files" | xargs perl -pi -e 's/--color-diff-blob-addition-num-text/--diff--blob--addition-num--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-diff-blob-addition-num-bg/--diff--blob--addition-num--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-success-emphasis/--diff--color--success--emphasis/g'
echo "$files" | xargs perl -pi -e 's/--color-diff-blob-hunk-num-bg/--diff--blob--hunk-num--color--background/g'
echo "✓ Third-party lib variables replaced"
echo ""

echo "✓ Token replacements complete!"
echo "Processed $file_count files"
