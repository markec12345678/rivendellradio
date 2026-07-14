#!/bin/bash
# ============================================================================
# pilot.sh — Rock 88.7 One-Command Pilot Setup
#
# Usage:
#   ./pilot.sh              # Full setup (first run)
#   ./pilot.sh status       # Check system status
#   ./pilot.sh stop         # Stop all services
#   ./pilot.sh logs         # Tail logs
#   ./pilot.sh import DIR   # Import MP3 files from directory
#
# Prerequisites:
#   - Docker + Docker Compose installed
#   - MP3 files ready to import
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
print_warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "  ${RED}✗${NC} $1"; }
print_info()  { echo -e "  ${BLUE}ℹ${NC} $1"; }

# ============================================================================
# COMMAND: status
# ============================================================================
cmd_status() {
    print_header "Rock 88.7 — System Status"

    echo "Docker containers:"
    docker compose -f docker-compose.production.yml ps 2>/dev/null || {
        print_error "Docker stack not running"
        echo ""
        echo "Run: ./pilot.sh"
        exit 1
    }

    echo ""
    echo "Health checks:"

    # Web app
    WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null)
    if [ "$WEB_HEALTH" = "200" ]; then
        print_ok "Web app: healthy"
    else
        print_error "Web app: HTTP $WEB_HEALTH"
    fi

    # Icecast2
    ICECAST_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/status-json.xsl 2>/dev/null)
    if [ "$ICECAST_HEALTH" = "200" ]; then
        print_ok "Icecast2: healthy"
    else
        print_error "Icecast2: HTTP $ICECAST_HEALTH"
    fi

    # Governance
    echo ""
    echo "Governance state:"
    curl -s http://localhost:3000/api/v1/governance 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(f'  Trust Score: {d[\"trustSummary\"][\"trustScore\"]}/100')
    print(f'  Autonomy Level: {d[\"autonomy\"][\"currentLevel\"]}')
    print(f'  Real sessions: {d[\"listenerPipeline\"][\"realSessions\"]}')
    print(f'  Ledger entries: {d[\"ledger\"][\"total\"]}')
except:
    print('  (unable to fetch)')
" 2>/dev/null

    echo ""
    echo "Stream URL: http://localhost:8000/rock-887.mp3"
    echo "Dashboard:  http://localhost:3000"
    echo "Listen:     http://localhost:3000/listen"
}

# ============================================================================
# COMMAND: stop
# ============================================================================
cmd_stop() {
    print_header "Stopping Rock 88.7"
    docker compose -f docker-compose.production.yml down
    print_ok "All services stopped"
}

# ============================================================================
# COMMAND: logs
# ============================================================================
cmd_logs() {
    docker compose -f docker-compose.production.yml logs -f --tail=50
}

# ============================================================================
# COMMAND: import
# ============================================================================
cmd_import() {
    DIR="${2:-/music/rock}"
    print_header "Importing MP3 files from $DIR"

    curl -s -X POST http://localhost:3000/api/v1/media-library \
        -H 'Content-Type: application/json' \
        -d "{\"directory\": \"$DIR\"}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f'  Scanned:     {d.get(\"scanned\", 0)}')
print(f'  Tracks:      {d.get(\"tracksCreated\", 0)} created')
print(f'  Assets:      {d.get(\"assetsCreated\", 0)} created')
print(f'  Updated:     {d.get(\"assetsUpdated\", 0)}')
print(f'  Failed:      {d.get(\"failed\", 0)}')
if d.get('errors'):
    print(f'  Errors:      {d[\"errors\"][:3]}')
"

    print_ok "Import complete"
}

# ============================================================================
# COMMAND: full setup (default)
# ============================================================================
cmd_setup() {
    print_header "Rock 88.7 — Pilot Setup"

    # Step 1: Check prerequisites
    echo "Step 1: Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        print_error "Docker not installed"
        echo "  Install: https://docs.docker.com/get-docker/"
        exit 1
    fi
    print_ok "Docker installed"

    if ! docker compose version &>/dev/null; then
        print_error "Docker Compose not installed"
        exit 1
    fi
    print_ok "Docker Compose installed"

    # Step 2: Create .env
    echo ""
    echo "Step 2: Creating .env file..."

    if [ ! -f .env ]; then
        SALT=$(openssl rand -hex 32)
        cat > .env << EOF
LISTENER_HASH_SALT=$SALT
DATABASE_URL=file:/app/db/custom.db
MUSIC_DIR=./music
ICECAST_PUBLIC_URL=http://localhost:8000/rock-887.mp3
EOF
        print_ok ".env created with random LISTENER_HASH_SALT"
        print_warn "Save the salt — it's needed to correlate listener sessions"
    else
        print_info ".env already exists (skipping)"
    fi

    # Step 3: Create music directory
    echo ""
    echo "Step 3: Preparing music directory..."

    mkdir -p music/rock music/jingles
    if [ -z "$(ls -A music/rock 2>/dev/null)" ]; then
        print_warn "music/rock/ is empty — put your MP3 files there"
        echo "  Then run: ./pilot.sh import music/rock"
    else
        MP3_COUNT=$(find music/rock -name "*.mp3" | wc -l)
        print_ok "music/rock/ has $MP3_COUNT MP3 file(s)"
    fi

    # Step 4: Build and start
    echo ""
    echo "Step 4: Building and starting Docker stack..."
    echo "  (This may take 5-10 minutes on first run)"

    docker compose -f docker-compose.production.yml up -d --build

    # Step 5: Wait for health
    echo ""
    echo "Step 5: Waiting for services to be healthy..."

    for svc in web icecast; do
        echo -n "  Waiting for $svc..."
        for i in $(seq 1 60); do
            if [ "$svc" = "web" ]; then
                CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null)
            else
                CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/status-json.xsl 2>/dev/null)
            fi
            if [ "$CODE" = "200" ]; then
                echo " OK"
                break
            fi
            echo -n "."
            sleep 2
        done
    done

    # Step 6: Import music
    echo ""
    echo "Step 6: Importing music..."
    if [ -n "$(ls -A music/rock 2>/dev/null)" ]; then
        cmd_import "" "music/rock"
    else
        print_warn "No music to import yet — add MP3s to music/rock/ and run: ./pilot.sh import"
    fi

    # Step 7: Show results
    print_header "Rock 88.7 is LIVE!"

    echo -e "  ${GREEN}Dashboard:${NC}  http://localhost:3000"
    echo -e "  ${GREEN}Stream:${NC}     http://localhost:8000/rock-887.mp3"
    echo -e "  ${GREEN}Listen:${NC}     http://localhost:3000/listen"
    echo ""

    echo "Next steps:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Open http://localhost:3000/listen to test the stream"
    echo "  3. Share the stream URL with listeners"
    echo "  4. Watch the first listener session arrive at:"
    echo "     http://localhost:3000/api/v1/listener-pipeline"
    echo ""
    echo "  When firstRealSession: 'YES' appears —"
    echo "  write the first entry in docs/STATION-CHRONICLE.md"
    echo ""
    echo "Commands:"
    echo "  ./pilot.sh status   — check system status"
    echo "  ./pilot.sh logs     — tail logs"
    echo "  ./pilot.sh stop     — stop all services"
    echo "  ./pilot.sh import DIR — import MP3s from directory"
}

# ============================================================================
# Main
# ============================================================================
case "${1:-setup}" in
    setup)   cmd_setup ;;
    status)  cmd_status ;;
    stop)    cmd_stop ;;
    logs)    cmd_logs ;;
    import)  cmd_import "$@" ;;
    *)
        echo "Usage: $0 {setup|status|stop|logs|import [DIR]}"
        echo ""
        echo "Commands:"
        echo "  setup         Full setup (default)"
        echo "  status        Check system status"
        echo "  stop          Stop all services"
        echo "  logs          Tail logs"
        echo "  import [DIR]  Import MP3 files from directory"
        exit 1
        ;;
esac
