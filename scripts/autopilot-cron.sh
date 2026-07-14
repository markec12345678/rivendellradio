#!/bin/bash
# ============================================================================
# autopilot-cron.sh — generates a new AI show every N minutes
#
# Run this as a cron job:
#   */30 * * * * /path/to/rivendellradio/scripts/autopilot-cron.sh >> /var/log/rock887-autopilot.log 2>&1
#
# Or run manually:
#   ./scripts/autopilot-cron.sh
#
# This script:
#   1. Checks if auto-pilot is enabled
#   2. Generates a new show (music + voice + weather + news)
#   3. Saves the playlist to /playlists/current.m3u
#   4. Liquidsoap reads this file and plays it
# ============================================================================

set -e

# Configuration
ROCK887_URL="${ROCK887_URL:-http://localhost:3000}"
DURATION_MIN="${SHOW_DURATION_MIN:-60}"
LANGUAGE="${SHOW_LANGUAGE:-en}"
STATION_NAME="${STATION_NAME:-Rock 88.7 FM}"

echo "[$(date)] Auto-pilot cron started"
echo "  Server: $ROCK887_URL"
echo "  Duration: $DURATION_MIN min"
echo "  Language: $LANGUAGE"

# Check if auto-pilot is enabled
STATE=$(curl -s "$ROCK887_URL/api/v1/ai/auto-pilot" 2>/dev/null)
ENABLED=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('state',{}).get('enabled', False))" 2>/dev/null || echo "False")

if [ "$ENABLED" != "True" ]; then
  echo "[$(date)] Auto-pilot is DISABLED. Skipping."
  echo "  To enable: curl -X POST $ROCK887_URL/api/v1/ai/auto-pilot -H 'Content-Type: application/json' -d '{\"action\":\"enable\"}'"
  exit 0
fi

# Check if playlist is exhausted
EXHAUSTED=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('state',{}).get('playlistExhausted', True))" 2>/dev/null || echo "True")

if [ "$EXHAUSTED" != "True" ]; then
  echo "[$(date)] Playlist still has content. Skipping generation."
  # Still generate if enough time has passed (force refresh for fresh news/weather)
  LAST_GEN=$(echo "$STATE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('state',{}).get('lastGeneratedAt',''))" 2>/dev/null || echo "")
  if [ -n "$LAST_GEN" ]; then
    # Check if last generation was more than 45 minutes ago
    python3 -c "
from datetime import datetime, timezone
last = datetime.fromisoformat('$LAST_GEN'.replace('Z', '+00:00'))
now = datetime.now(timezone.utc)
diff = (now - last).total_seconds() / 60
if diff < 45:
    print('SKIP')
else:
    print('GENERATE')
" 2>/dev/null | grep -q "SKIP" && exit 0
    echo "[$(date)] Last generation was >45 min ago. Generating fresh show."
  fi
fi

# Generate a new show
echo "[$(date)] Generating new show..."

RESULT=$(curl -s -X POST "$ROCK887_URL/api/v1/ai/auto-pilot" \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"generate\",\"durationMin\":$DURATION_MIN,\"language\":\"$LANGUAGE\",\"stationName\":\"$STATION_NAME\"}" \
  2>/dev/null)

# Parse result
echo "$RESULT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok'):
    print(f'  Show: {d.get(\"showName\")}')
    print(f'  Tracks: {d.get(\"trackCount\")}')
    print(f'  Segments: {d.get(\"segments\")}')
    print(f'  Audio files: {d.get(\"audioFiles\")}')
    print(f'  TTS: {d.get(\"ttsProvider\")}')
    print(f'  Weather: {d.get(\"weather\")}')
    print(f'  News: {d.get(\"news\")}')
    print(f'  Playlist: {d.get(\"playlistPath\")}')
    print(f'  Next: {d.get(\"nextGenerationAt\")}')
    print(f'[$(date)] SUCCESS: show generated and playlist saved')
else:
    print(f'  ERROR: {d.get(\"error\")}')
    sys.exit(1)
" 2>/dev/null

if [ $? -ne 0 ]; then
  echo "[$(date)] FAILED: show generation error"
  echo "$RESULT" | head -c 500
  exit 1
fi
