#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL=${1:-http://localhost:5678/webhook/shopify-new-order}
PAYLOAD_FILE=${2:-$PWD/n8n/fixtures/order-normal.json}

if [ -f "$PAYLOAD_FILE" ]; then
  echo "Posting $PAYLOAD_FILE to $WEBHOOK_URL"
  curl -s -X POST -H "Content-Type: application/json" --data-binary @"$PAYLOAD_FILE" "$WEBHOOK_URL" | jq .
else
  echo "Payload file not found: $PAYLOAD_FILE" >&2
  exit 2
fi





