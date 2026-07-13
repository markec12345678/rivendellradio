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
