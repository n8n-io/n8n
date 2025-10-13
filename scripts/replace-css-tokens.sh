#!/bin/bash

# Script to replace CSS token names with new double-dash format
# Run from anywhere - uses absolute paths

# Absolute path to frontend directory
FRONTEND_DIR="./packages/frontend"

# Find all files in frontend folder except _tokens.scss (which is already updated)
echo "Finding files to process..."
files=$(find "$FRONTEND_DIR" -type f \( -name "*.css" -o -name "*.scss" -o -name "*.vue" -o -name "*.ts" -o -name "*.snap" -o -name "*.test.ts" -o -name "*.js" -o -name "*.md" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.vite/*" ! -path "*/_tokens.deprecated.scss" ! -path "*/_tokens.dark.deprecated.scss" ! -path "*/@n8n/chat/**")

# _tokens file only
#files=$(find "$FRONTEND_DIR" -type f \( -name "_tokens.scss" \))

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
echo "$files" | xargs perl -pi -e 's/--color--primary-h/--color--primary--h/g'
echo "$files" | xargs perl -pi -e 's/--color--primary-s/--color--primary--s/g'
echo "$files" | xargs perl -pi -e 's/--color--primary-l/--color--primary--l/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-h/--color--primary--h/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-s/--color--primary--s/g'
echo "$files" | xargs perl -pi -e 's/--color-primary-l/--color--primary--l/g'
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
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-h/--canvas--color--background--h/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-s/--canvas--color--background--s/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background-l/--canvas--color--background--l/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-background/--canvas--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-dot/--canvas--dot--color/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-read-only-line/--canvas--read-only-line--color/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-selected-transparent/--canvas--color--selected-transparent/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-selected/--canvas--color--selected/g'
echo "$files" | xargs perl -pi -e 's/--color-canvas-label-background/--canvas--label--color--background/g'
echo "✓ Canvas tokens replaced"
echo ""

# Node tokens
echo "[18] Replacing node tokens..."
echo "$files" | xargs perl -pi -e 's/--color-node-background/--node--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-node-executing-background/--node--color--background--executing/g'
echo "$files" | xargs perl -pi -e 's/--color-node-executing-other-background/--node--color--background--executing-1/g'
echo "$files" | xargs perl -pi -e 's/--color-node-pinned-border/--node--border-color--pinned/g'
echo "$files" | xargs perl -pi -e 's/--color-node-running-border/--node--border-color--running/g'
echo "$files" | xargs perl -pi -e 's/--node-type-main-color/--node--type-main--color/g'

echo "✓ Node tokens replaced"
echo ""

# Sticky note tokens
echo "[19] Replacing sticky note tokens..."
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-1/--sticky--color--background--variant-1/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-1/--sticky--border-color--variant-1/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-2/--sticky--color--background--variant-2/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-2/--sticky--border-color--variant-2/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-3/--sticky--color--background--variant-3/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-3/--sticky--border-color--variant-3/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-4/--sticky--color--background--variant-4/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-4/--sticky--border-color--variant-4/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-5/--sticky--color--background--variant-5/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-5/--sticky--border-color--variant-5/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-6/--sticky--color--background--variant-6/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-6/--sticky--border-color--variant-6/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background-7/--sticky--color--background--variant-7/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border-7/--sticky--border-color--variant-7/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-code-background/--sticky--code--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-code-font/--sticky--code--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-background/--sticky--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-border/--sticky--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-sticky-font/--sticky--color--text/g'
echo "✓ Sticky note tokens replaced"
echo ""

# AI Assistant tokens
echo "[20] Replacing AI assistant tokens..."
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient-active/--assistant--button--color--background--gradient--active/g'
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient-hover/--assistant--button--color--background--gradient--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-askAssistant-button-background-gradient/--assistant--button--color--background--gradient/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-1/--assistant--color--highlight-1/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-2/--assistant--color--highlight-2/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-3/--assistant--color--highlight-3/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-gradient/--assistant--color--highlight-gradient/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-highlight-reverse/--assistant--color--highlight-gradient--reverse/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-inner-highlight-hover/--assistant--button--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-assistant-inner-highlight-active/--assistant--button--color--background--active/g'
echo "✓ AI assistant tokens replaced"
echo ""

# Chat tokens
echo "[21] Replacing chat tokens..."
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-messages-background/--lm-chat--messages--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-bot-background/--lm-chat--bot--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-user-background/--lm-chat--user--color--background/g'
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
echo "$files" | xargs perl -pi -e 's/--color-valid-resolvable-foreground/--expression-editor--resolvable--color--foreground--valid/g'
echo "$files" | xargs perl -pi -e 's/--color-valid-resolvable-background/--expression-editor--resolvable--color--background--valid/g'
echo "$files" | xargs perl -pi -e 's/--color-invalid-resolvable-foreground/--expression-editor--resolvable--color--foreground--invalid/g'
echo "$files" | xargs perl -pi -e 's/--color-invalid-resolvable-background/--expression-editor--resolvable--color--background--invalid/g'
echo "$files" | xargs perl -pi -e 's/--color-pending-resolvable-foreground/--expression-editor--resolvable--color--foreground--pending/g'
echo "$files" | xargs perl -pi -e 's/--color-pending-resolvable-background/--expression-editor--resolvable--color--background--pending/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-editor-modal-background/--expression-editor--modal--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-editor-background/--expression-editor--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-expression-syntax-example/--expression-editor--syntax-example--color/g'

## autocomplete
echo "$files" | xargs perl -pi -e 's/--color-autocomplete-section-header-border/--autocomplete--section-header--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-autocomplete-item-selected/--autocomplete--item--color--selected/g'
echo "$files" | xargs perl -pi -e 's/--color-infobox-examples-border-color/--autocomplete--infobox--examples--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-infobox-background/--autocomplete--infobox--color--background/g'
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
echo "$files" | xargs perl -pi -e 's/--color-code-background-readonly/--code--color--background--readonly/g'
echo "$files" | xargs perl -pi -e 's/--color-code-background/--code--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-code-lineHighlight/--code--line-highlight--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-foreground/--code--color--foreground/g'
echo "$files" | xargs perl -pi -e 's/--color-code-caret/--code--caret--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-selection-highlight/--code--selection--color--highlight/g'
echo "$files" | xargs perl -pi -e 's/--color-code-selection/--code--selection--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-foreground-active/--code--gutter--color--foreground--active/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-background/--code--gutter--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-code-gutter-foreground/--code--gutter--color--foreground/g'
echo "$files" | xargs perl -pi -e 's/--color-code-indentation-marker-active/--code--indentation-marker--color--active/g'
echo "$files" | xargs perl -pi -e 's/--color-code-indentation-marker/--code--indentation-marker--color/g'
echo "$files" | xargs perl -pi -e 's/--color-code-line-break/--code--line-break--color/g'
echo "$files" | xargs perl -pi -e 's/--color-line-break/--line-break--color/g'
echo "✓ Code editor tokens replaced"
echo ""

# Tag tokens
echo "[27] Replacing tag tokens..."
echo "$files" | xargs perl -pi -e 's/--tag-background-hover-color/--tag--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--tag-background-color/--tag--color--background/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-hover-color/--tag--border-color--hover/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-color/--tag--border-color/g'
echo "$files" | xargs perl -pi -e 's/--tag-border-radius/--tag--radius/g'
echo "$files" | xargs perl -pi -e 's/--tag-text-color/--tag--color--text/g'
echo "$files" | xargs perl -pi -e 's/--tag-font-size/--tag--font-size/g'
echo "$files" | xargs perl -pi -e 's/--tag-font-weight/--tag--font-weight/g'
echo "$files" | xargs perl -pi -e 's/--tag-line-height/--tag--line-height/g'
echo "$files" | xargs perl -pi -e 's/--tag-height/--tag--height/g'
echo "$files" | xargs perl -pi -e 's/--tag-padding/--tag--padding/g'
echo "✓ Tag tokens replaced"
echo ""

# Variables usage tokens
echo "[28] Replacing variables usage tokens..."
echo "$files" | xargs perl -pi -e 's/--color-variables-usage-syntax-bg/--variables-usage--syntax--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-variables-usage-font/--variables-usage--color--text/g'
echo "✓ Variables usage tokens replaced"
echo ""

# Button primary tokens
echo "[29] Replacing button primary tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-primary-hover-active-focus-background/--button--color--background--primary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-hover-active-border/--button--border-color--primary--hover-active/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-background/--button--color--background--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-border/--button--border-color--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-disabled-font/--button--color--text--primary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-focus-outline/--button--outline-color--primary--focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-background/--button--color--background--primary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-border/--button--border-color--primary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-primary-font/--button--color--text--primary/g'
echo "✓ Button primary tokens replaced"
echo ""

# Button secondary tokens
echo "[30] Replacing button secondary tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-active-focus-border/--button--border-color--secondary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-active-focus-font/--button--color--text--secondary--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-active-focus-background/--button--color--background--secondary--active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-background/--button--color--background--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-border/--button--border-color--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-disabled-font/--button--color--text--secondary--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-hover-background/--button--color--background--secondary--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-background/--button--color--background--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-border/--button--border-color--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-font/--button--color--text--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-focus-outline/--button--outline-color--secondary--focus/g'
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
echo "$files" | xargs perl -pi -e 's/--input-disabled-background/--input--color--background--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-border/--input--border-color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-disabled-color/--input--color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--input-placeholder-color/--input--placeholder--color/g'
echo "$files" | xargs perl -pi -e 's/--input-background-color/--input--color--background/g'
echo "$files" | xargs perl -pi -e 's/--input-border-radius/--input--radius/g'
echo "$files" | xargs perl -pi -e 's/--input-border-color/--input--border-color/g'
echo "$files" | xargs perl -pi -e 's/--input-label-color/--input--label--color/g'
echo "$files" | xargs perl -pi -e 's/--input-font-size/--input--font-size/g'
echo "$files" | xargs perl -pi -e 's/--input-height/--input--height/g'
echo "✓ Input tokens replaced"
echo ""

# Button highlight tokens
echo "[33] Replacing button highlight tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-hover-active-focus-font/--button--color--text--highlight--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-hover-active-focus-border/--button--border-color--highlight--hover-active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-hover-background/--button--color--background--highlight--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-active-focus-background/--button--color--background--highlight--active-focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-focus-outline/--button--outline-color--highlight--focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-disabled-font/--button--color--text--highlight--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-disabled-border/--button--border-color--highlight--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-disabled-background/--button--color--background--highlight--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-font/--button--color--text--highlight/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-border/--button--border-color--highlight/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-background/--button--color--background--highlight/g'
echo "✓ Button highlight tokens replaced"
echo ""

# Button success, warning, danger tokens
echo "[34] Replacing button success, warning, danger tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-success-disabled-font/--button--color--text--success--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-success-font/--button--color--text--success/g'
echo "$files" | xargs perl -pi -e 's/--color-button-warning-disabled-font/--button--color--text--warning--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-warning-font/--button--color--text--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-focus-outline/--button--outline-color--danger--focus/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-disabled-background/--button--color--background--danger--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-disabled-border/--button--border-color--danger--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-disabled-font/--button--color--text--danger--disabled/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-border/--button--border-color--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-button-danger-font/--button--color--text--danger/g'
echo "✓ Button success, warning, danger tokens replaced"
echo ""

# Text button tokens
echo "[35] Replacing text button tokens..."
echo "$files" | xargs perl -pi -e 's/--color-text-button-secondary-font/--text-button--color--text--secondary/g'
echo "✓ Text button tokens replaced"
echo ""

# Node Creator Button tokens
echo "[36] Replacing node creator button tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-node-creator-hover-border/--node-creator--button--border-color--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-button-node-creator-hover-font/--node-creator--button--color--text--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-button-node-creator-border-font/--node-creator--button--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-button-node-creator-background/--node-creator--button--color--background/g'
echo "✓ Node Creator Button tokens replaced"
echo ""

# Table tokens
echo "[37] Replacing table tokens..."
echo "$files" | xargs perl -pi -e 's/--color-table-row-highlight-background/--table--row--color--background--highlight/g'
echo "$files" | xargs perl -pi -e 's/--color-table-row-hover-background/--table--row--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-table-row-even-background/--table--row--color--background--even/g'
echo "$files" | xargs perl -pi -e 's/--color-table-row-background/--table--row--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-table-header-background/--table--header--color--background/g'
echo "✓ Table tokens replaced"
echo ""

# Notification tokens
echo "[38] Replacing notification tokens..."
echo "$files" | xargs perl -pi -e 's/--color-notification-background/--notification--color--background/g'
echo "✓ Notification tokens replaced"
echo ""

# Execution tokens
echo "[39] Replacing execution tokens..."
echo "$files" | xargs perl -pi -e 's/--execution-card-background-hover/--execution-card--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-background/--execution-card--color--background/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-unknown/--execution-card--border-color--unknown/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-running/--execution-card--border-color--running/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-waiting/--execution-card--border-color--waiting/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-error/--execution-card--border-color--error/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-success/--execution-card--border-color--success/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-border-new/--execution-card--border-color--new/g'
echo "$files" | xargs perl -pi -e 's/--execution-card-text-waiting/--execution-card--color--text--waiting/g'
echo "$files" | xargs perl -pi -e 's/--execution-selector-background/--execution-selector--color--background/g'
echo "$files" | xargs perl -pi -e 's/--execution-selector-text/--execution-selector--color--text/g'
echo "$files" | xargs perl -pi -e 's/--execution-select-all-text/--execution-select-all--color--text/g'
echo "✓ Execution tokens replaced"
echo ""

# NDV tokens
echo "[40] Replacing NDV tokens..."
echo "$files" | xargs perl -pi -e 's/--color-ndv-droppable-parameter-active-background/--ndv--droppable-parameter--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--color-ndv-droppable-parameter-background/--ndv--droppable-parameter--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-ndv-droppable-parameter/--ndv--droppable-parameter--color/g'
echo "$files" | xargs perl -pi -e 's/--color-ndvv2-run-data-background/--ndvv2--run-data--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-run-data-background/--run-data--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-ndv-back-font/--ndv--back--color--text/g'
echo "✓ NDV tokens replaced"
echo ""

# Notice tokens
echo "[41] Replacing notice tokens..."
echo "$files" | xargs perl -pi -e 's/--color-notice-warning-background/--notice--color--background--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-notice-warning-border/--notice--border-color--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-notice-font/--notice--color--text/g'
echo "✓ Notice tokens replaced"
echo ""

# Callout tokens
echo "[42] Replacing callout tokens..."
echo "$files" | xargs perl -pi -e 's/--color-callout-info-background/--callout--color--background--info/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-info-border/--callout--border-color--info/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-info-font/--callout--color--text--info/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-info-icon/--callout--icon-color--info/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-success-background/--callout--color--background--success/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-success-border/--callout--border-color--success/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-success-font/--callout--color--text--success/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-success-icon/--callout--icon-color--success/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-warning-background/--callout--color--background--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-warning-border/--callout--border-color--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-warning-font/--callout--color--text--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-warning-icon/--callout--icon-color--warning/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-danger-background/--callout--color--background--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-danger-border/--callout--border-color--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-danger-font/--callout--color--text--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-danger-icon/--callout--icon-color--danger/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-secondary-background/--callout--color--background--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-secondary-border/--callout--border-color--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-secondary-font/--callout--color--text--secondary/g'
echo "$files" | xargs perl -pi -e 's/--color-callout-secondary-icon/--callout--icon-color--secondary/g'
echo "✓ Callout tokens replaced"
echo ""

# Dialog and overlay tokens
echo "[43] Replacing dialog and overlay tokens..."
echo "$files" | xargs perl -pi -e 's/--color-dialog-overlay-background-dark/--dialog--overlay--color--background--dark/g'
echo "$files" | xargs perl -pi -e 's/--color-dialog-overlay-background/--dialog--overlay--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-dialog-background/--dialog--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-block-ui-overlay/--block-ui--overlay--color/g'
echo "✓ Dialog and overlay tokens replaced"
echo ""

# Avatar tokens
echo "[44] Replacing avatar tokens..."
echo "$files" | xargs perl -pi -e 's/--color-avatar-font/--avatar--color--text/g'
echo "✓ Avatar tokens replaced"
echo ""

# NPS Survey tokens
echo "[45] Replacing NPS Survey tokens..."
echo "$files" | xargs perl -pi -e 's/--color-nps-survey-background/--nps-survey--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-nps-survey-font/--nps-survey--color--text/g'
echo "✓ NPS Survey tokens replaced"
echo ""

# Action Dropdown tokens
echo "[46] Replacing Action Dropdown tokens..."
echo "$files" | xargs perl -pi -e 's/--color-action-dropdown-item-active-background/--action-dropdown--item--color--background--active/g'
echo "✓ Action Dropdown tokens replaced"
echo ""

# Switch tokens
echo "[47] Replacing Switch tokens..."
echo "$files" | xargs perl -pi -e 's/--color-switch-active-background/--switch--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--color-switch-background/--switch--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-switch-border-color/--switch--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-switch-toggle/--switch--toggle--color/g'
echo "✓ Switch tokens replaced"
echo ""

# Feature Request tokens
echo "[48] Replacing Feature Request tokens..."
echo "$files" | xargs perl -pi -e 's/--color-feature-request-font/--feature-request--color--text/g'
echo "✓ Feature Request tokens replaced"
echo ""

# Input Triple tokens
echo "[49] Replacing Input Triple tokens..."
echo "$files" | xargs perl -pi -e 's/--color-background-input-triple/--input-triple--color--background/g'
echo "✓ Input Triple tokens replaced"
echo ""

# Node error tokens
echo "[50] Replacing Node error tokens..."
echo "$files" | xargs perl -pi -e 's/--color-node-error-output-text-color/--node--error-output--color--text/g'
echo "✓ Node error tokens replaced"
echo ""

# MFA tokens
echo "[51] Replacing MFA tokens..."
echo "$files" | xargs perl -pi -e 's/--color-mfa-recovery-code-background/--mfa--recovery-code--color--background/g'
echo "$files" | xargs perl -pi -e 's/--color-mfa-recovery-code-color/--mfa--recovery-code--color/g'
echo "$files" | xargs perl -pi -e 's/--color-mfa-lose-access-text-color/--mfa--lose-access--color--text/g'
echo "$files" | xargs perl -pi -e 's/--color-qr-code-border/--qr-code--border-color/g'
echo "✓ MFA tokens replaced"
echo ""

# Text highlight tokens
echo "[52] Replacing text highlight tokens..."
echo "$files" | xargs perl -pi -e 's/--color-text-highlight-background/--text-highlight--color--background/g'
echo "✓ Text highlight tokens replaced"
echo ""

# AI Node type tokens (these are special - need to keep underscores in node type names)
echo "[53] Replacing AI Node type tokens..."
echo "$files" | xargs perl -pi -e 's/--node-type-background-l/--node-type--color--background--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-label-color-h/--node-type--supplemental--label--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-label-color-s/--node-type--supplemental--label--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-label-color-l/--node-type--supplemental--label--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-color-h/--node-type--supplemental--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-color-s/--node-type--supplemental--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-color-l/--node-type--supplemental--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-label-color/--node-type--supplemental--label--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-icon/--node-type--supplemental--icon--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-color/--node-type--supplemental--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-background/--node-type--supplemental--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-supplemental-connector-color/--node-type--supplemental--connector--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_chain-color-h/--node-type--ai-chain--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_chain-color-s/--node-type--ai-chain--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_chain-color-l/--node-type--ai-chain--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_chain-color/--node-type--ai-chain--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-chain-background/--node-type--chain--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_document-color-h/--node-type--ai-document--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_document-color-s/--node-type--ai-document--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_document-color-l/--node-type--ai-document--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_document-color/--node-type--ai-document--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_document-background/--node-type--ai-document--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_embedding-color-h/--node-type--ai-embedding--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_embedding-color-s/--node-type--ai-embedding--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_embedding-color-l/--node-type--ai-embedding--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_embedding-color/--node-type--ai-embedding--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_embedding-background/--node-type--ai-embedding--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_languageModel-color-h/--node-type--ai-language-model--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_languageModel-color-s/--node-type--ai-language-model--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_languageModel-color-l/--node-type--ai-language-model--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_languageModel-color/--node-type--ai-language-model--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_languageModel-background/--node-type--ai-language-model--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_memory-color-h/--node-type--ai-memory--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_memory-color-s/--node-type--ai-memory--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_memory-color-l/--node-type--ai-memory--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_memory-color/--node-type--ai-memory--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_memory-background/--node-type--ai-memory--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_outputParser-color-h/--node-type--ai-output-parser--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_outputParser-color-s/--node-type--ai-output-parser--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_outputParser-color-l/--node-type--ai-output-parser--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_outputParser-color/--node-type--ai-output-parser--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_outputParser-background/--node-type--ai-output-parser--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_tool-color-h/--node-type--ai-tool--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_tool-color-s/--node-type--ai-tool--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_tool-color-l/--node-type--ai-tool--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_tool-color/--node-type--ai-tool--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_tool-background/--node-type--ai-tool--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_retriever-color-h/--node-type--ai-retriever--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_retriever-color-s/--node-type--ai-retriever--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_retriever-color-l/--node-type--ai-retriever--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_retriever-color/--node-type--ai-retriever--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_retriever-background/--node-type--ai-retriever--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_textSplitter-color-h/--node-type--ai-text-splitter--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_textSplitter-color-s/--node-type--ai-text-splitter--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_textSplitter-color-l/--node-type--ai-text-splitter--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_textSplitter-color/--node-type--ai-text-splitter--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_textSplitter-background/--node-type--ai-text-splitter--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorRetriever-color-h/--node-type--ai-vector-retriever--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorRetriever-color-s/--node-type--ai-vector-retriever--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorRetriever-color-l/--node-type--ai-vector-retriever--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorRetriever-color/--node-type--ai-vector-retriever--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorRetriever-background/--node-type--ai-vector-retriever--color--background/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorStore-color-h/--node-type--ai-vector-store--color--h/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorStore-color-s/--node-type--ai-vector-store--color--s/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorStore-color-l/--node-type--ai-vector-store--color--l/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorStore-color/--node-type--ai-vector-store--color/g'
echo "$files" | xargs perl -pi -e 's/--node-type-ai_vectorStore-background/--node-type--ai-vector-store--color--background/g'
echo "✓ AI Node type tokens replaced"
echo ""

# Diff color tokens
echo "[54] Replacing diff color tokens..."
echo "$files" | xargs perl -pi -e 's/--diff-modified-light/--diff--color--modified--light/g'
echo "$files" | xargs perl -pi -e 's/--diff-modified-faint/--diff--color--modified--faint/g'
echo "$files" | xargs perl -pi -e 's/--diff-modified/--diff--color--modified/g'
echo "$files" | xargs perl -pi -e 's/--diff-new-light/--diff--color--new--light/g'
echo "$files" | xargs perl -pi -e 's/--diff-new-faint/--diff--color--new--faint/g'
echo "$files" | xargs perl -pi -e 's/--diff-new/--diff--color--new/g'
echo "$files" | xargs perl -pi -e 's/--diff-del-light/--diff--color--deleted--light/g'
echo "$files" | xargs perl -pi -e 's/--diff-del-faint/--diff--color--deleted--faint/g'
echo "$files" | xargs perl -pi -e 's/--diff-del/--diff--color--deleted/g'
echo "✓ Diff color tokens replaced"
echo ""

# Various color tokens
echo "[55] Replacing various color tokens..."
echo "$files" | xargs perl -pi -e 's/--color-avatar-accent-1/--avatar--color--accent-1/g'
echo "$files" | xargs perl -pi -e 's/--color-avatar-accent-2/--avatar--color--accent-2/g'
echo "$files" | xargs perl -pi -e 's/--color-info-tint-2/--color--info--tint-2/g'
echo "$files" | xargs perl -pi -e 's/--color-info-tint-1/--color--info--tint-1/g'
echo "$files" | xargs perl -pi -e 's/--color-info/--color--info/g'
echo "$files" | xargs perl -pi -e 's/--color-light-grey/--color--gray--light/g'
echo "$files" | xargs perl -pi -e 's/--color-grey/--color--gray/g'
echo "$files" | xargs perl -pi -e 's/--color-configurable-node-name/--node--configurable-name--color/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-link-hover/--link--color--secondary--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-secondary-link/--link--color--secondary/g'
echo "✓ Various color tokens replaced"
echo ""

# Menu tokens
echo "[56] Replacing menu tokens..."
echo "$files" | xargs perl -pi -e 's/--color-menu-hover-background/--menu--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-menu-active-background/--menu--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--color-menu-background/--menu--color--background/g'
echo "✓ Menu tokens replaced"
echo ""

# Icon tokens
echo "[57] Replacing icon tokens..."
echo "$files" | xargs perl -pi -e 's/--color-icon-hover/--icon--color--hover/g'
echo "$files" | xargs perl -pi -e 's/--color-icon-base/--icon--color/g'
echo "✓ Icon tokens replaced"
echo ""

# Grid tokens
echo "[58] Replacing grid tokens..."
echo "$files" | xargs perl -pi -e 's/--grid-row-selected-background/--grid--row--color--background--selected/g'
echo "$files" | xargs perl -pi -e 's/--grid-cell-editing-border/--grid--cell--border-color--editing/g'
echo "✓ Grid tokens replaced"
echo ""

# Primitive color tokens
echo "[59] Replacing primitive color tokens..."
echo "$files" | xargs perl -pi -e 's/--prim-color-white/--p--color--white/g'
echo "$files" | xargs perl -pi -e 's/--prim-color-secondary/--color--secondary/g'
echo "$files" | xargs perl -pi -e 's/--prim-gray-740/--p--color--gray-740/g'
echo "✓ Primitive color tokens replaced"
echo ""

# Button generic state tokens (used in Button.scss mixins)
echo "[60] Replacing button generic state tokens..."
echo "$files" | xargs perl -pi -e 's/--button-loading-font-color/--button--color--text--loading/g'
echo "$files" | xargs perl -pi -e 's/--button-loading-border-color/--button--border-color--loading/g'
echo "$files" | xargs perl -pi -e 's/--button-loading-background-color/--button--color--background--loading/g'
echo "$files" | xargs perl -pi -e 's/--button-disabled-font-color/--button--color--text--disabled/g'
echo "$files" | xargs perl -pi -e 's/--button-disabled-border-color/--button--border-color--disabled/g'
echo "$files" | xargs perl -pi -e 's/--button-disabled-background-color/--button--color--background--disabled/g'
echo "$files" | xargs perl -pi -e 's/--button-focus-font-color/--button--color--text--focus/g'
echo "$files" | xargs perl -pi -e 's/--button-focus-border-color/--button--border-color--focus/g'
echo "$files" | xargs perl -pi -e 's/--button-focus-background-color/--button--color--background--focus/g'
echo "$files" | xargs perl -pi -e 's/--button-focus-outline-color/--button--outline-color--focus/g'
echo "$files" | xargs perl -pi -e 's/--button-active-font-color/--button--color--text--active/g'
echo "$files" | xargs perl -pi -e 's/--button-active-border-color/--button--border-color--active/g'
echo "$files" | xargs perl -pi -e 's/--button-active-background-color/--button--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--button-active-color/--button--color--active/g'
echo "$files" | xargs perl -pi -e 's/--button-hover-font-color/--button--color--text--hover/g'
echo "$files" | xargs perl -pi -e 's/--button-hover-border-color/--button--border-color--hover/g'
echo "$files" | xargs perl -pi -e 's/--button-hover-background-color/--button--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--button-hover-color/--button--color--hover/g'
echo "$files" | xargs perl -pi -e 's/--button-border-radius/--button--radius/g'
echo "$files" | xargs perl -pi -e 's/--button-padding-horizontal/--button--padding--horizontal/g'
echo "$files" | xargs perl -pi -e 's/--button-padding-vertical/--button--padding--vertical/g'
echo "$files" | xargs perl -pi -e 's/--button-font-size/--button--font-size/g'
echo "$files" | xargs perl -pi -e 's/--button-font-color/--button--color--text/g'
echo "$files" | xargs perl -pi -e 's/--button-border-color/--button--border-color/g'
echo "$files" | xargs perl -pi -e 's/--button-background-color/--button--color--background/g'
echo "✓ Button generic state tokens replaced"
echo ""

# Button loading state tokens (for highlight and secondary)
echo "[61] Replacing button loading state tokens..."
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-loading-font/--button--color--text--highlight--loading/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-loading-border/--button--border-color--highlight--loading/g'
echo "$files" | xargs perl -pi -e 's/--color-button-highlight-loading-background/--button--color--background--highlight--loading/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-loading-font/--button--color--text--secondary--loading/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-loading-border/--button--border-color--secondary--loading/g'
echo "$files" | xargs perl -pi -e 's/--color-button-secondary-loading-background/--button--color--background--secondary--loading/g'
echo "✓ Button loading state tokens replaced"
echo ""

# Chat border tokens
echo "[62] Replacing chat border tokens..."
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-bot-border/--lm-chat--bot--border-color/g'
echo "$files" | xargs perl -pi -e 's/--color-lm-chat-user-border/--lm-chat--user--border-color/g'
echo "✓ Chat border tokens replaced"
echo ""

# Select component tokens
echo "[63] Replacing select component tokens..."
echo "$files" | xargs perl -pi -e 's/--select-option-padding/--select--option--padding/g'
echo "$files" | xargs perl -pi -e 's/--select-option-line-height/--select--option--line-height/g'
echo "✓ Select component tokens replaced"
echo ""

# Menu component tokens
echo "[64] Replacing menu component tokens..."
echo "$files" | xargs perl -pi -e 's/--menu-item-hover-font-color/--menu--item--color--text--hover/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-hover-fill/--menu--item--color--background--hover/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-active-font-color/--menu--item--color--text--active/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-active-background-color/--menu--item--color--background--active/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-font-color/--menu--item--color--text/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-border-radius/--menu--item--radius/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-font-weight/--menu--item--font-weight/g'
echo "$files" | xargs perl -pi -e 's/--menu-item-height/--menu--item--height/g'
echo "$files" | xargs perl -pi -e 's/--menu-background-color/--menu--color--background/g'
echo "$files" | xargs perl -pi -e 's/--menu-font-color/--menu--color--text/g'
echo "✓ Menu component tokens replaced"
echo ""

# Input additional tokens
echo "[65] Replacing input additional tokens..."
echo "$files" | xargs perl -pi -e 's/--input-border-top-left-radius/--input--radius--top-left/g'
echo "$files" | xargs perl -pi -e 's/--input-border-bottom-left-radius/--input--radius--bottom-left/g'
echo "$files" | xargs perl -pi -e 's/--input-border-style/--input--border-style/g'
echo "$files" | xargs perl -pi -e 's/--input-font-color/--input--color--text/g'
echo "✓ Input additional tokens replaced"
echo ""

# Dialog tokens
echo "[66] Replacing dialog tokens..."
echo "$files" | xargs perl -pi -e 's/--dialog-close-top/--dialog--close--spacing--top/g'
echo "✓ Dialog tokens replaced"
echo ""

# Node creator tokens
echo "[67] Replacing node creator tokens..."
echo "$files" | xargs perl -pi -e 's/--node-creator-description-colos/--node-creator--description--color/g'
echo "$files" | xargs perl -pi -e 's/--node-creator-name-size/--node-creator--name--font-size/g'
echo "$files" | xargs perl -pi -e 's/--node-creator-name-weight/--node-creator--name--font-weight/g'
echo "✓ Node creator tokens replaced"
echo ""

# Node icon tokens (additional)
echo "[68] Replacing node icon additional tokens..."
echo "$files" | xargs perl -pi -e 's/--node-icon-size/--node--icon--size/g'
echo "$files" | xargs perl -pi -e 's/--node-icon-margin-right/--node--icon--margin-right/g'
echo "$files" | xargs perl -pi -e 's/--node-icon-color/--node--icon--color/g'
echo "✓ Node icon additional tokens replaced"
echo ""

# Icon tokens (additional)
echo "[69] Replacing icon additional tokens..."
echo "$files" | xargs perl -pi -e 's/--n8n-icon-stroke-width/--icon--stroke-width/g'
echo "✓ Icon additional tokens replaced"
echo ""

# Tabs tokens
echo "[70] Replacing tabs tokens..."
echo "$files" | xargs perl -pi -e 's/--color-tabs-arrow-buttons/--tabs--arrow-buttons--color/g'
echo "$files" | xargs perl -pi -e 's/--active-tab-border-width/--tabs--tab--border-width--active/g'
echo "✓ Tabs tokens replaced"
echo ""

# Notice tokens (additional)
echo "[71] Replacing notice additional tokens..."
echo "$files" | xargs perl -pi -e 's/--notice-margin/--notice--margin/g'
echo "✓ Notice additional tokens replaced"
echo ""

# NDV tokens (additional)
echo "[73] Replacing NDV additional tokens..."
echo "$files" | xargs perl -pi -e 's/--color-ndv-background/--ndv--color--background/g'
echo "✓ NDV additional tokens replaced"
echo ""

# Background node icon badge token
echo "[74] Replacing background node icon badge token..."
echo "$files" | xargs perl -pi -e 's/--color-background-node-icon-badge/--node--icon--badge--color--background/g'
echo "✓ Background node icon badge token replaced"
echo ""

# Action arrow tokens
echo "[75] Replacing action arrow tokens..."
echo "$files" | xargs perl -pi -e 's/--action-arrow-color-hover/--action--arrow--color--hover/g'
echo "$files" | xargs perl -pi -e 's/--action-arrow-color/--action--arrow--color/g'
echo "✓ Action arrow tokens replaced"
echo ""

# Text color dark token
echo "[76] Replacing text color dark token..."
echo "$files" | xargs perl -pi -e 's/--text-color-dark/--color--text--shade-1/g'
echo "✓ Text color dark token replaced"
echo ""

# Font line height tight token
echo "[77] Replacing font line height tight token..."
echo "$files" | xargs perl -pi -e 's/--font-line-height-tight/--line-height--xs/g'
echo "✓ Font line height tight token replaced"
echo ""

# Resizer tokens
echo "[79] Fixing Resizer tokens..."
echo "$files" | xargs perl -pi -e 's/--resizer--side-offset/--resizer--spacing--side/g'
echo "$files" | xargs perl -pi -e 's/--resizer--corner-offset/--resizer--spacing--corner/g'
echo "✓ Resizer tokens fixed"
echo ""

echo "✓ Token replacements complete!"
echo "Processed $file_count files"
