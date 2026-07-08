#!/bin/bash
# Start broadcast-feed WebSocket mini-service
cd "$(dirname "$0")"
pkill -9 -f "broadcast-feed/index.ts" 2>/dev/null
sleep 1
exec bun index.ts
