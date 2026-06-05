#!/usr/bin/env bash
# Launch the A2A demo page with proxy to local n8n
# Usage: ./scripts/a2a-demo.sh [n8n-url]
#        ./scripts/a2a-demo.sh http://localhost:5678

N8N_URL="${1:-http://localhost:5678}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Starting A2A demo proxy..."
echo ""
node "$SCRIPT_DIR/a2a-proxy.mjs" "$N8N_URL" &
PROXY_PID=$!

sleep 1
echo ""
echo "Opening browser..."
open "http://localhost:8889" 2>/dev/null || xdg-open "http://localhost:8889" 2>/dev/null || echo "Open http://localhost:8889 in your browser"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $PROXY_PID 2>/dev/null; exit 0" INT TERM
wait $PROXY_PID
