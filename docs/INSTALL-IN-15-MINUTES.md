# Install Rock 88.7 in 15 Minutes

> *A complete production deployment guide. No developer required.*

---

## Prerequisites (2 minutes)

You need a server with:

- **Docker** + **Docker Compose** installed
- **2 GB RAM** minimum (4 GB recommended)
- **10 GB disk** minimum
- **Ports 3000** (web) and **3003** (WebSocket) available

Check Docker is installed:
```bash
docker --version
docker compose version
```

If not installed: [docs.docker.com/get-docker](https://docs.docker.com/get-docker/)

---

## Step 1: Get the code (1 minute)

```bash
git clone https://github.com/markec12345678/rivendellradio.git
cd rivendellradio
```

---

## Step 2: Create environment file (1 minute)

```bash
# Generate a random salt for listener IP hashing
openssl rand -hex 32
```

Copy the output, then create `.env`:
```bash
cat > .env << EOF
LISTENER_HASH_SALT=<paste-the-generated-salt-here>
DATABASE_URL=file:/app/db/custom.db
EOF
```

**Important:** The `LISTENER_HASH_SALT` is required. Without it, the listener pipeline will refuse to store any sessions (privacy guarantee — IPs are never stored unhashed).

---

## Step 3: Start the system (5 minutes)

```bash
docker compose -f docker-compose.production.yml up -d --build
```

This starts:
- **Web application** on port 3000
- **WebSocket feed** on port 3003
- **Automatic backup service** (runs daily at 03:00)

Wait for it to be ready:
```bash
# Check if the web app is responding
curl http://localhost:3000/api/v1/health

# Should return: {"status":"ok",...}
```

---

## Step 4: Verify the system (2 minutes)

Open your browser to `http://YOUR-SERVER-IP:3000`

You should see:
- Dashboard with "OFF AIR" status (normal — no Icecast2 connected yet)
- System tab with AI Trust Center (Trust Score 0/100, Level 0)

Verify the governance API:
```bash
curl http://localhost:3000/api/v1/governance | python3 -m json.tool | head -20
```

Expected: `"trustScore": 0`, `"currentLevel": 0`, `"totalSessions": 0`

This is the correct starting state. Trust is earned, not granted.

---

## Step 5: Connect Icecast2 (4 minutes)

### Option A: If you already have Icecast2

1. Find your Icecast2 admin URL (typically `http://your-icecast:8000/admin/status-json.xsl`)

2. Write a small adapter script that:
   - Polls `/status-json.xsl` every 60 seconds
   - Hashes each listener IP with your `LISTENER_HASH_SALT` (SHA-256)
   - POSTs sessions to `http://localhost:3000/api/v1/listener-pipeline`

   See `src/lib/listener-pipeline/icecast-parser.ts` for the parser contract.

3. Verify the first session was ingested:
   ```bash
   curl http://localhost:3000/api/v1/listener-pipeline
   # Should show totalSessions > 0
   ```

### Option B: If you don't have Icecast2 yet

Install Icecast2:
```bash
# Ubuntu/Debian
sudo apt install icecast2

# Configure /etc/icecast2/icecast.xml
# Enable listener-stats: <listeners><listener-stats>1</listener-stats></listeners>
```

Then follow Option A.

---

## What's running?

| Service | Port | Purpose |
|---------|------|---------|
| Web app | 3000 | Dashboard, API, governance |
| WebSocket feed | 3003 | Real-time broadcast events |
| Backup | — | Daily SQLite backup at 03:00 |

---

## Common operations

### View logs
```bash
docker compose -f docker-compose.production.yml logs -f web
docker compose -f docker-compose.production.yml logs -f feed
```

### Restart
```bash
docker compose -f docker-compose.production.yml restart
```

### Stop
```bash
docker compose -f docker-compose.production.yml down
```

### Update to latest version
```bash
git pull
docker compose -f docker-compose.production.yml up -d --build
```

### Manual backup
```bash
docker compose -f docker-compose.production.yml run --rm backup
```

### Restore from backup
See `docs/DISASTER-RECOVERY-GUIDE.md`

---

## After installation

1. **Write the first entry in `docs/STATION-CHRONICLE.md`** — the deployment date
2. **Record the first AI-influenced decision** in the Decision Ledger
3. **Wait 30 days**, then do the first Operational Review

The system starts at **Trust Score 0/100, Autonomy Level 0**. This is correct. Trust is earned through accumulated evidence, not granted at installation.

---

## Troubleshooting

### Port already in use
```bash
# Check what's using port 3000
sudo lsof -i :3000
# Kill it or change the port in docker-compose.production.yml
```

### Database not persisting
The database is in a Docker volume (`rock887-db`). It persists across restarts. If you need to reset:
```bash
docker compose -f docker-compose.production.yml down -v
# WARNING: -v deletes volumes (all data lost)
```

### Listener pipeline rejecting sessions
Check that `LISTENER_HASH_SALT` is set in `.env`. The pipeline refuses to store unhashed IPs.

### Backup not running
Check backup logs:
```bash
docker compose -f docker-compose.production.yml logs backup
```

---

## Next steps

- Read `docs/PILOT-DEPLOYMENT-CHECKLIST.md` for the full pilot process
- Read `docs/DISASTER-RECOVERY-GUIDE.md` for backup/restore procedures
- Read `docs/EPISTEMOLOGICAL-INVARIANTS.md` to understand the trust model

---

*15 minutes. No developer required. The framework is ready; the operational phase begins now.*
