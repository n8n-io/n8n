#!/bin/bash

# Test script to flood webhook with requests and kill n8n
# Usage: ./test-webhook-flood.sh

WEBHOOK_URL="http://localhost:5678/webhook/db4f6334-b4a1-4130-90db-530680ecefea"
REQUEST_COUNT=20

echo "Flooding $REQUEST_COUNT webhook requests..."

# Send multiple requests in background
for i in $(seq 1 $REQUEST_COUNT); do
    echo "Sending webhook request $i..."
    curl -X GET "$WEBHOOK_URL" \
         -H "Content-Type: application/json" \
         -d '{"test": "data", "request": '$i'}' \
         --silent \
         --output /dev/null &
done


echo "Killing n8n process..."
pkill -f "n8n" || echo "No n8n process found"

echo "Done! Check for queued executions on restart."
