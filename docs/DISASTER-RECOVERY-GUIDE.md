# Rock 88.7 — Disaster Recovery Guide

## Overview

This guide covers disaster recovery procedures, failover orchestration, and business continuity for Rock 88.7 broadcast platform.

## RTO / RPO Targets

| Component | RPO | RTO | Strategy |
|---|---|---|---|
| Database (SQLite/PostgreSQL) | 5 min | 30 min | Litestream (SQLite) / WAL streaming (PostgreSQL) |
| Event Store | 0 (real-time) | 1 min | Synchronous DB persistence |
| Audio Library | 1 hr | 4 hr | Rivendell replication (rdrepld) |
| Configuration | 24 hr | 5 min | Git versioned + daily snapshot |
| Playout (on-air) | 0 | <60s | Auto-failover to backup studio + AI DJ fill |

## DR Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Primary Site (Ljubljana)               │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ Studio A │───▶│ Omnia 9 │───▶│ RVR T60 │───▶ FM 88.7  │
│  │ (Main)   │    │(Primary)│    │ (Main)  │              │
│  └────┬─────┘    └────┬────┘    └─────────┘              │
│       │                │                                   │
│       │           ┌────┴────┐                              │
│       │           │Stereo  │ (Hot-Spare, warm standby)    │
│       │           │  Tool   │                              │
│       │           └────┬────┘                              │
│       │                │                                   │
│  ┌────┴─────┐    ┌────┴────┐                              │
│  │ Rock 88.7│    │Backup TX│ (RVR T60 #2, lower power)    │
│  │ Server   │    │ (70%)   │                              │
│  └────┬─────┘    └─────────┘                              │
│       │                                                   │
└───────┼───────────────────────────────────────────────────┘
        │ (STL: Microwave + SRT backup)
        │
┌───────┴───────────────────────────────────────────────────┐
│                    DR Site (Maribor)                       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│  │ Studio B │───▶│ Omnia 9 │───▶│ RVR T60 │───▶ FM (DR)  │
│  │ (Backup) │    │(Backup) │    │ (Backup)│              │
│  └─────────┘    └─────────┘    └─────────┘              │
│                                                            │
│  ┌─────────┐                                              │
│  │ Rock 88.7│ (Follower, Raft cluster)                    │
│  │ Server   │                                              │
│  └─────────┘                                              │
└────────────────────────────────────────────────────────────┘
```

## Failover Scenarios

### 1. Audio Processor Failure (Omnia 9 → Stereo Tool)
- **Detection**: Silence sensor >5s OR SNMP Omnia offline
- **Auto-action**: GPIO relay switches to Stereo Tool hot-spare (850ms)
- **RTO**: <2s
- **Manual**: Verify audio quality, schedule Omnia repair

### 2. Transmitter Failure (Primary → Backup TX)
- **Detection**: SNMP forward power = 0 OR VSWR critical
- **Auto-action**: Switch to backup transmitter at 70% power
- **RTO**: <10s
- **Manual**: Notify engineer, dispatch repair

### 3. Studio Failure (Studio A → Studio B)
- **Detection**: Silence sensor >10s + GPIO alarm + SNMP critical
- **Auto-action**: DR orchestrator fires 8-step pipeline:
  1. Detect (silence + SNMP + GPIO)
  2. Validate (cross-check, avoid false positive)
  3. Switch Liquidsoap source (crossfade 500ms)
  4. AI DJ voice-track fills gap
  5. Activate backup studio (Studio B)
  6. Page on-call engineer (PagerDuty + Slack)
  7. Log to Event Bus + Replay Studio
  8. Verify on-air (health checks green)
- **RTO**: <60s (target), 42s (last measured)
- **RPO**: 0 (no data loss, synchronous replication)

### 4. Server Failure (Primary → DR Site)
- **Detection**: Raft heartbeat timeout (3 nodes lost)
- **Auto-action**: DR site node elects itself leader, promotes to primary
- **RTO**: <10s (Raft election)
- **Manual**: Verify DR site handling load, initiate primary repair

### 5. Database Failure
- **Detection**: Prisma query timeout
- **Auto-action**: API returns 503 problem+json, dashboard shows cached data
- **RTO**: <5s (auto-reconnect)
- **Manual**: If persistent, failover to read replica

### 6. Network Partition (Split-Brain)
- **Detection**: Raft quorum lost (DC isolation)
- **Auto-action**: DR site becomes follower (cannot elect leader without quorum), primary DC maintains operations
- **RTO**: 0 (no impact if primary DC has quorum)
- **Manual**: Heal network partition, DR node rejoins + syncs

## DR Drill Procedure

Run monthly DR drills to verify failover works:

```bash
# 1. Run DR drill (sandbox mode, no on-air impact)
curl -X POST http://localhost:3000/api/v1/failover \
  -H "Content-Type: application/json" \
  -d '{"action":"drill"}'

# 2. Check results
# - RTO measured
# - All 8 steps completed
# - No dead air
# - Event Bus logged full sequence

# 3. Review in Replay Studio
# Navigate to System → Replay Studio, select drill timestamp
```

## Backup Strategy

### Database (SQLite)
```bash
# Litestream (continuous WAL replication to S3)
litestream replicate db/custom.db s3://rock887-backups/db/

# Restore
litestream restore -o db/custom.db s3://rock887-backups/db/
```

### Configuration (Git)
```bash
# All config versioned in Git
git add prisma/schema.prisma .env.example next.config.ts
git commit -m "config: update for production"
git push origin main
```

### Audio Library (Rivendell)
```bash
# rdrepld (Rivendell replication daemon) — continuous replication
# Configure in /etc/rd.conf
# Replicates to DR site automatically
```

## Recovery Procedures

### Full Site Recovery (Primary Site Down >1hr)
1. Activate DR site (Studio B + backup server)
2. Verify on-air (FM signal, RDS, streaming)
3. Switch DNS to DR site
4. Notify listeners via social media
5. Begin primary site repair
6. Once repaired: sync data DR → Primary, failback

### Data Recovery (Database Corruption)
1. Stop Rock 88.7 service
2. Restore from Litestream backup: `litestream restore -o db/custom.db s3://rock887-backups/db/`
3. Verify integrity: `sqlite3 db/custom.db "PRAGMA integrity_check;"`
4. Restart service
5. Verify Event Bus replay (check Replay Studio)

## Contact Matrix

| Role | Primary | Secondary | Escalation |
|---|---|---|---|
| On-call Engineer | Mark (+386 41 ...) | Anna (+386 41 ...) | Station Manager |
| Station Manager | Janez (+386 41 ...) | — | CTO |
| Transmitter Vendor | RVR Support | — | — |
| ISP/Network | Telekom SI | — | — |

---

## Scenario: "Server died at 03:00"

The most common production failure. The server crashes (hardware, kernel panic, OOM kill, power loss). This is the recovery procedure.

### What happened

At 03:00, the server died. The backup service was scheduled to run at 03:00 — it may or may not have completed. Docker restarts the containers automatically when the server comes back (restart: unless-stopped).

### Step 1: Assess (5 minutes)

```bash
# Check if server is back
ssh user@your-server

# Check if Docker is running
docker ps

# Check if Rock 88.7 containers are up
docker compose -f docker-compose.production.yml ps
```

**If containers are up:**
```bash
# Check if the web app is healthy
curl http://localhost:3000/api/v1/health

# If healthy — verify data integrity
curl http://localhost:3000/api/v1/governance | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Ledger entries: {d[\"ledger\"][\"total\"]}')"
```

**If containers are down:**
```bash
docker compose -f docker-compose.production.yml up -d
# Wait for health check
sleep 30
curl http://localhost:3000/api/v1/health
```

### Step 2: Verify data (5 minutes)

```bash
# Check listener sessions
curl http://localhost:3000/api/v1/listener-pipeline | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Sessions: {d[\"status\"][\"totalSessions\"]}')"

# Check decision ledger
curl http://localhost:3000/api/v1/decision-ledger | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Decisions: {d[\"stats\"][\"total\"]}')"

# Check epistemic state
curl http://localhost:3000/api/v1/epistemic-state | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Violations: {sum(m[\"violationCount\"] for m in d[\"modules\"].values())}')"
```

If all three return expected values, the system recovered successfully. No further action needed.

### Step 3: Restore from backup (if data is corrupted)

Only if Step 2 shows missing or corrupted data.

```bash
# List available backups
docker compose -f docker-compose.production.yml run --rm backup ls -la /backups

# Find the most recent backup
LATEST=$(docker compose -f docker-compose.production.yml run --rm backup ls /backups | grep rock887_ | sort | tail -1)
echo "Latest backup: $LATEST"

# Stop the web app
docker compose -f docker-compose.production.yml stop web

# Restore the database
docker compose -f docker-compose.production.yml run --rm backup sh -c "gunzip -c /backups/$LATEST > /data/custom.db"

# Restart
docker compose -f docker-compose.production.yml up -d
sleep 30

# Verify
curl http://localhost:3000/api/v1/health
```

### Step 4: Record the incident

Write an entry in `docs/STATION-CHRONICLE.md`:

```
DATE: 2026-XX-XX
EVENT: Server crash at 03:00
DOWNTIME: X minutes
DATA LOSS: 0 (backup was current) / X sessions lost
RECOVERY: Restored from backup YYYYMMDD_HHMMSS
LESSON: [what caused the crash, what to prevent]
```

### Recovery Checklist

- [ ] Server is back online
- [ ] Docker service is running
- [ ] Rock 88.7 containers are up (`docker compose ps`)
- [ ] Health check passes (`curl /api/v1/health`)
- [ ] Listener sessions count is correct
- [ ] Decision ledger count is correct
- [ ] Epistemic state has no new violations
- [ ] Backup service is running
- [ ] Icecast2 adapter is sending sessions again
- [ ] Incident recorded in Station Chronicle

---

## Restore Test (Monthly)

Run this test once a month to verify backups are restorable.

### Procedure

1. **Spin up a test instance:**
   ```bash
   docker compose -f docker-compose.production.yml -p rock887-test up -d
   ```

2. **Restore a backup to the test instance:**
   ```bash
   # Get the latest backup
   LATEST=$(ls /path/to/backups/rock887_*.db.gz | sort | tail -1)

   # Copy to test instance volume
   docker cp $LATEST rock887-test-web:/tmp/backup.db.gz

   # Restore in test container
   docker exec rock887-test-web sh -c "gunzip -c /tmp/backup.db.gz > /app/db/custom.db"
   ```

3. **Verify data:**
   ```bash
   curl http://localhost:3001/api/v1/governance  # test instance on different port
   ```

4. **Tear down test instance:**
   ```bash
   docker compose -f docker-compose.production.yml -p rock887-test down -v
   ```

### Pass Criteria

- [ ] Backup file exists and is non-empty
- [ ] Restore completes without errors
- [ ] Test instance starts and responds to health check
- [ ] Data counts match production (within 24h of backup time)

### If restore fails

- Check if backup file is corrupt: `gzip -t backup.db.gz`
- Check if SQLite database is valid: `sqlite3 backup.db "PRAGMA integrity_check;"`
- If backup is corrupt, investigate why (disk full, concurrent write, etc.)
- Keep the last 3 known-good backups to ensure recoverability

---

## Backup Strategy Summary

| Backup | Frequency | Retention | Location |
|--------|-----------|-----------|----------|
| SQLite database | Daily at 03:00 | 30 days | Docker volume `rock887-backups` |
| Configuration (.env) | On change | Indefinite (git) | Git repository |
| Icecast2 config | On change | Indefinite (git) | Git repository |

**RPO (Recovery Point Objective):** Up to 24 hours (daily backup)
**RTO (Recovery Time Objective):** 15 minutes (restore + restart)

For lower RPO, consider:
- Litestream (continuous SQLite replication to S3)
- PostgreSQL with WAL streaming (for high-traffic deployments)
