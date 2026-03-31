#!/usr/bin/env bash
# Shared helpers for bootstrap recipe scripts.
# Source this file — do not execute it directly.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/bootstrap-secrets"

mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# read_secret <filename>
#   Prints the contents of bootstrap-secrets/<filename>.
read_secret() {
  local file="$SECRETS_DIR/$1"
  if [[ ! -f "$file" ]]; then
    echo "ERROR: secret file not found: $file" >&2
    echo "Run ./seed-secrets.sh first to create default secret files." >&2
    exit 1
  fi
  cat "$file"
}

# Check that secrets have been seeded.
if [[ ! -f "$SECRETS_DIR/license_tenant_id" ]]; then
  echo "Secret files not found in $SECRETS_DIR."
  echo "Run ./seed-secrets.sh first to create default secret files."
  exit 1
fi
