#!/usr/bin/env bash
# Copilot-generated script (Raptor mini)
# Description: generate a bcrypt hash of an n8n password using the current
# custom image and write it to a file.  Useful when you need to update the
# `user` table directly or provide a hash in environment variables.
#
# Usage:
#   ./scripts/hash-password.sh <password> [output-file]
#
# If output-file is omitted the hash is printed to stdout. When provided it will
# be written to that path (overwriting if it exists).

set -euo pipefail

if [[ "$#" -lt 1 || "$#" -gt 2 ]]; then
  echo "Usage: $0 <password> [output-file]"
  exit 1
fi

PASSWORD=$1
OUTFILE=${2:-}

# resolve script's own directory so relative paths work from anywhere
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# if no output file specified, write to script's directory
if [[ -z "$OUTFILE" ]]; then
  OUTFILE="$SCRIPT_DIR/n8n-password-hash.txt"
fi

# make relative paths relative to script directory, not cwd
if [[ "$OUTFILE" != /* ]]; then
  OUTFILE="$SCRIPT_DIR/$OUTFILE"
fi

# generate bcrypt hash without using a container
if ! command -v node >/dev/null; then
  echo "Error: node is required to hash passwords" >&2
  exit 1
fi

# Generate hash using node directly
HASH=$(node -e "const bcrypt = require('bcryptjs'); const salt = bcrypt.genSaltSync(10); console.log(bcrypt.hashSync('$PASSWORD', salt));")

if [[ -n "$OUTFILE" ]]; then
  echo "$HASH" >"$OUTFILE"
  echo "Hash written to $OUTFILE"
else
  echo "$HASH"
fi
