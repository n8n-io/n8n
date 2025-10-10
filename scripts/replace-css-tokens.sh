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

# Canvas tokens
echo "[17] Replacing canvas tokens..."
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-h/--canvas--color-background-h/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-s/--canvas--color-background-s/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-l/--canvas--color-background-l/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background/--canvas--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-dot/--canvas--dot--color/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-read-only-line/--canvas--read-only-line--color/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-selected-transparent/--canvas--color--selected-transparent/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-selected/--canvas--color--selected/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-label-background/--canvas--label--color-background/g'
echo "✓ Canvas tokens replaced"
echo ""

# Node tokens
echo "[18] Replacing node tokens..."
echo "$files" | xargs perl -pi -e 's/--color-node-background/--node--color-background/g'

# todo?
echo "$files" | xargs perl -pi -e 's/--color-node-executing-background/--node--color-background--executing/g'
echo "$files" | xargs perl -pi -e 's/--color-node-executing-other-background/--node--color-background--executing-1/g'
echo "$files" | xargs perl -pi -e 's/--color-node-pinned-border/--node--border-color--pinned/g'
echo "$files" | xargs perl -pi -e 's/--color-node-running-border/--node--border-color--running/g'
echo "$files" | xargs perl -pi -e 's/--node-type-main-color/--node--type-main--color/g'

echo "✓ Node tokens replaced"
echo ""

# Sticky note tokens
echo "[19] Replacing sticky note tokens..."
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-1/--sticky--color-background--variant-1/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-1/--sticky--border-color--variant-1/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-2/--sticky--color-background--variant-2/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-2/--sticky--border-color--variant-2/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-3/--sticky--color-background--variant-3/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-3/--sticky--border-color--variant-3/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-4/--sticky--color-background--variant-4/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-4/--sticky--border-color--variant-4/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-5/--sticky--color-background--variant-5/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-5/--sticky--border-color--variant-5/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-6/--sticky--color-background--variant-6/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-6/--sticky--border-color--variant-6/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-7/--sticky--color-background--variant-7/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-7/--sticky--border-color--variant-7/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-code-background/--sticky--code--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-code-font/--sticky--code--color-text/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background/--sticky--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border/--sticky--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-font/--sticky--color-text/g'
echo "✓ Sticky note tokens replaced"
echo ""

# AI Assistant tokens
echo "[20] Replacing AI assistant tokens..."
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient-active/--assistant--button--color-background--gradient--active/g'
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient-hover/--assistant--button--color-background--gradient--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient/--assistant--button--color-background--gradient/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-1/--assistant--color--highlight-1/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-2/--assistant--color--highlight-2/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-3/--assistant--color--highlight-3/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-gradient/--assistant--color--highlight-gradient/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-reverse/--assistant--color--highlight-gradient--reverse/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-inner-highlight-hover/--assistant--button--color-background--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-inner-highlight-active/--assistant--button--color-background--active/g'
echo "✓ AI assistant tokens replaced"
echo ""

# Chat tokens
echo "[21] Replacing chat tokens..."
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-messages-background/--lm-chat--messages--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-bot-background/--lm-chat--bot--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-user-background/--lm-chat--user--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-user-color/--lm-chat--user--color/g'
echo "✓ Chat tokens replaced"
echo ""

# Node icon tokens
echo "[22] Replacing node icon tokens..."
echo "$files" | xargs perl -pi -e 's/--color-node-icon-light-blue/--node--icon--color--light-blue/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-dark-blue/--node--icon--color--dark-blue/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-orange-red/--node--icon--color--orange-red/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-pink-red/--node--icon--color--pink-red/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-light-green/--node--icon--color--light-green/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-dark-green/--node--icon--color--dark-green/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-gray/--node--icon--color--gray/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-black/--node--icon--color--black/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-blue/--node--icon--color--blue/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-orange/--node--icon--color--orange/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-red/--node--icon--color--red/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-green/--node--icon--color--green/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-azure/--node--icon--color--azure/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-purple/--node--icon--color--purple/g'
echo "$files" | xargs perl -pi -e 's/--color-node-icon-crimson/--node--icon--color--crimson/g'
echo "✓ Node icon tokens replaced"
echo ""

# Expression editor tokens
echo "[23] Replacing expression editor tokens..."
echo "$files" | xargs perl -pi -e 's/--color-valid-resolvable-foreground/--expression-editor--resolvable--color-foreground--valid/g'
echo "$files" | xargs perl -pi -e 's/--color-valid-resolvable-background/--expression-editor--resolvable--color-background--valid/g'
echo "$files" | xargs perl -pi -e 's/--color-invalid-resolvable-foreground/--expression-editor--resolvable--color-foreground--invalid/g'
echo "$files" | xargs perl -pi -e 's/--color-invalid-resolvable-background/--expression-editor--resolvable--color-background--invalid/g'
echo "$files" | xargs perl -pi -e 's/--color-pending-resolvable-foreground/--expression-editor--resolvable--color-foreground--pending/g'
echo "$files" | xargs perl -pi -e 's/--color-pending-resolvable-background/--expression-editor--resolvable--color-background--pending/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-editor-modal-background/--expression-editor--modal--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-editor-background/--expression-editor--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-syntax-example/--expression-editor--syntax-example--color/g'

## autocomplete
echo "$files" | xargs perl -pi -e 's/--color-autocomplete-section-header-border/--autocomplete--section-header--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-autocomplete-item-selected/--autocomplete--item--color--selected/g'
echo "$files" | xargs perl -pi -e 's/--color-infobox-examples-border-color/--autocomplete--infobox--examples--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-infobox-background/--autocomplete--infobox--color-background/g'
echo "✓ Expression editor tokens replaced"
echo ""

# Code syntax tokens
echo "[24] Replacing code syntax tokens..."
echo "$files" | xargs perl -pi -e 's/--color-code-tags-string/--code-tags--string--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-regex/--code-tags--regex--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-primitive/--code-tags--primitive--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-keyword/--code-tags--keyword--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-variable/--code-tags--variable--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-parameter/--code-tags--parameter--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-function/--code-tags--function--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-constant/--code-tags--constant--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-property/--code-tags--property--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-type/--code-tags--type--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-class/--code-tags--class--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-heading/--code-tags--heading--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-invalid/--code-tags--invalid--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-tags-comment/--code-tags--comment--color/g'
echo "✓ Code syntax tokens replaced"
echo ""

# JSON tokens
echo "[25] Replacing JSON tokens..."
echo "$files" | xargs perl -pi -e 's/--color-json-brackets-hover/--json--brackets--color--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-json-null/--json--null--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-boolean/--json--boolean--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-number/--json--number--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-string/--json--string--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-key/--json--key--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-brackets/--json--brackets--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-line/--json--line--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-highlight/--json--highlight--color/g'
echo "$files" | xargs perl -pi -e 's/--color-json-default/--json--color/g'
echo "✓ JSON tokens replaced"
echo ""

# Code editor tokens
echo "[26] Replacing code editor tokens..."
echo "$files" | xargs perl -pi -e 's/--color-code-background-readonly/--code--color-background--readonly/g'
echo "$files" | xargs perl -pi -e 's/--color-code-background/--code--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-code-lineHighlight/--code--line-highlight--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-foreground/--code--color-foreground/g'
echo "$files" | xargs perl -pi -e 's/--color-code-caret/--code--caret--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-selection-highlight/--code--selection--color--highlight/g'
echo "$files" | xargs perl -pi -e 's/--color-code-selection/--code--selection--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-foreground-active/--code--gutter--color-foreground--active/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-background/--code--gutter--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-foreground/--code--gutter--color-foreground/g'
echo "$files" | xargs perl -pi -e 's/--color-code-indentation-marker-active/--code--indentation-marker--color--active/g'
echo "$files" | xargs perl -pi -e 's/--color-code-indentation-marker/--code--indentation-marker--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-line-break/--code--line-break--color/g'
echo "$files" | xargs perl -pi -e 's/--color-line-break/--code--line-break--color/g'
echo "✓ Code editor tokens replaced"
echo ""

# Tag tokens
echo "[27] Replacing tag tokens..."
echo "$files" | xargs perl -pi -e 's/--tag-background-hover-color/--tag--color-background--hover/g'
echo "$files" | xargs perl -pi -e 's/--tag-background-color/--tag--color-background/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-hover-color/--tag--border-color--hover/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-color/--tag--border-color/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-radius/--tag--border-radius/g'
echo "$files" | xargs perl -pi -e 's/--tag-text-color/--tag--color-text/g'
echo "$files" | xargs perl -pi -e 's/--tag-font-size/--tag--font-size/g'
echo "$files" | xargs perl -pi -e 's/--tag-font-weight/--tag--font-weight/g'
echo "$files" | xargs perl -pi -e 's/--tag-line-height/--tag--line-height/g'
echo "$files" | xargs perl -pi -e 's/--tag-height/--tag--height/g'
echo "$files" | xargs perl -pi -e 's/--tag-padding/--tag--padding/g'
echo "✓ Tag tokens replaced"
echo ""

# Variables usage tokens
echo "[28] Replacing variables usage tokens..."
echo "$files" | xargs perl -pi -e 's/--color-variables-usage-syntax-bg/--variables-usage--syntax--color-background/g'
echo "$files" | xargs perl -pi -e 's/--color-variables-usage-font/--variables-usage--color-text/g'
echo "✓ Variables usage tokens replaced"
echo ""

# Button primary tokens
echo "[29] Replacing button primary tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-primary-hover-active-focus-background/--button--color-background--primary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-hover-active-border/--button--border-color--primary--hover-active/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-background/--button--color-background--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-border/--button--border-color--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-font/--button--color-text--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-focus-outline/--button--outline-color--primary--focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-background/--button--color-background--primary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-border/--button--border-color--primary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-font/--button--color-text--primary/g'
echo "✓ Button primary tokens replaced"
echo ""

# Button secondary tokens
echo "[30] Replacing button secondary tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-active-focus-border/--button--border-color--secondary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-active-focus-font/--button--color-text--secondary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-active-focus-background/--button--color-background--secondary--active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-background/--button--color-background--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-border/--button--border-color--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-font/--button--color-text--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-background/--button--color-background--secondary--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-background/--button--color-background--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-border/--button--border-color--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-font/--button--color-text--secondary/g'
echo "✓ Button secondary tokens replaced"
echo ""

# Input tokens
echo "[31] Replacing input tokens..."
echo "$files" | xargs perl -pi -e 's/--input-border-bottom-color/--input--border-bottom-color/g'
echo "$files" | xargs perl -pi -e 's/--input-border-top-color/--input--border-top-color/g'
echo "$files" | xargs perl -pi -e 's/--input-border-right-color/--input--border-right-color/g'
echo "$files" | xargs perl -pi -e 's/--input-border-left-color/--input--border-left-color/g'
echo "$files" | xargs perl -pi -e 's/--input-focus-border-color/--input--border-color--focus/g'
echo "$files" | xargs perl -pi -e 's/--input-hover-border-color/--input--border-color--hover/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-placeholder/--input--placeholder--color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-background/--input--color-background--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-border/--input--border-color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-color/--input--color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-placeholder-color/--input--placeholder--color/g'
echo "$files" | xargs perl -pi -e 's/--input-background-color/--input--color-background/g'
echo "$files" | xargs perl -pi -e 's/--input-border-radius/--input--border-radius/g'
echo "$files" | xargs perl -pi -e 's/--input-border-color/--input--border-color/g'
echo "$files" | xargs perl -pi -e 's/--input-label-color/--input--label--color/g'
echo "$files" | xargs perl -pi -e 's/--input-font-size/--input--font-size/g'
echo "$files" | xargs perl -pi -e 's/--input-height/--input--height/g'
echo "✓ Input tokens replaced"
echo ""

echo "[32] Verifying replacements..."
remaining=$(echo "$files" | xargs grep -l "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | xargs grep "--color-primary\|--color-secondary\|--color-success\|--color-warning\|--color-danger\|--color-text\|--color-foreground\|--color-background" 2>/dev/null | grep -v "\-\-color\-\-" | wc -l | xargs)
echo "Remaining old tokens found: $remaining"
echo ""

echo "✓ Token replacements complete!"
echo "Processed $file_count files"
