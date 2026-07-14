# Pre-Pilot Hardening Checklist

> *What needs to be in place BEFORE the first real listener tunes in.*

---

## Already in place ✅

These are verified and working:

- [x] **Docker restart policy** — `restart: unless-stopped` in `docker-compose.production.yml`
- [x] **Log rotation** — `max-size: 10m, max-file: 5` configured for all containers
- [x] **Health checks** — web app and feed have Docker healthchecks
- [x] **Security headers** — 7 headers configured in `next.config.ts` (HSTS, X-Content-Type-Options, etc.)
- [x] **Rate limiting** — `src/lib/rate-limit.ts` with sliding window
- [x] **RBAC** — 9 roles with granular permissions
- [x] **API keys** — SHA-256 hashed, permission-scoped
- [x] **Audit trail** — all changes logged with user, action, entity, IP, timestamp
- [x] **Automatic backup** — daily at 03:00, 30-day retention
- [x] **npm audit** — 0 vulnerabilities (as of 2026-07-14)
- [x] **CI/CD** — green (lint + typecheck + tests + security all pass)

## Needs to be configured before pilot ⚠️

### TLS / HTTPS

**Status:** Caddy gateway is configured (`Caddyfile`) but uses port 81 without TLS.

**Before pilot:**
- [ ] Point a domain to the server (e.g., `dashboard.rock887.fm`)
- [ ] Update Caddyfile to use the domain with automatic TLS:
  ```
  dashboard.rock887.fm {
    reverse_proxy localhost:3000
  }
  ```
- [ ] Caddy will automatically provision Let's Encrypt certificates
- [ ] Verify: `curl https://dashboard.rock887.fm/api/v1/health`

### Stream monitoring

**Status:** No alerting when the Icecast2 stream goes down.

**Before pilot:**
- [ ] Add a health check script that polls `http://stream:8000/status-json.xsl` every 60s
- [ ] Alert if no source is connected (Liquidsoap died)
- [ ] Alert if listener count drops to 0 during expected hours (7:00–22:00)
- [ ] Alert if Icecast2 is unreachable

Example alert script (add to `deploy/monitoring/stream-check.sh`):
```bash
#!/bin/bash
STATUS=$(curl -sf http://stream:8000/status-json.xsl 2>/dev/null)
if [ -z "$STATUS" ]; then
  echo "ALERT: Icecast2 unreachable"
  # Send to Alertmanager / Slack / email
fi
```

### Process monitoring

**Status:** Docker restart policy exists, but no external monitoring.

**Before pilot:**
- [ ] Deploy the observability stack: `docker compose -f docker-compose.observability.yml up -d`
- [ ] Grafana: http://server:3001 (admin/admin)
- [ ] Prometheus: scrapes metrics from Rock 88.7 `/api/v1/metrics`
- [ ] Configure alerts in Alertmanager:
  - Container down > 1 min
  - CPU > 90% for 5 min
  - Memory > 90% for 5 min
  - Disk > 85%
  - API 5xx error rate > 1%

### Centralized logging

**Status:** Loki is configured in the observability stack but not required for pilot.

**Before pilot (optional):**
- [ ] Deploy Loki + Promtail
- [ ] Configure Promtail to scrape Docker container logs
- [ ] Create Grafana dashboards for log queries

### Database monitoring

**Status:** No monitoring on SQLite database.

**Before pilot:**
- [ ] Monitor database file size growth
- [ ] Alert if database > 5GB (indicates need for PostgreSQL migration)
- [ ] Verify backup completes successfully (check `rock887-backups` volume)

---

## Deployment day checklist

On the day of the first real broadcast:

### Morning (before going live)

- [ ] Verify all containers are running: `docker compose -f docker-compose.production.yml ps`
- [ ] Health check passes: `curl http://localhost:3000/api/v1/health`
- [ ] Icecast2 is running: `curl http://stream:8000/status-json.xsl`
- [ ] Liquidsoap is connected to Icecast2 (check Icecast2 admin panel)
- [ ] Media Library is populated: `curl http://localhost:3000/api/v1/media-library`
- [ ] Stream is audible: open `http://stream:8000/rock-887.mp3` in VLC
- [ ] `LISTENER_HASH_SALT` is set in `.env`
- [ ] Adapter script is running: `python3 deploy/adapter/adapter.py`
- [ ] Backups are configured and tested
- [ ] Monitoring is receiving metrics

### Going live

- [ ] Announce the stream URL to first listeners
- [ ] Watch the adapter log for the first session
- [ ] When `firstRealSession: "YES"` appears — write the first Station Chronicle entry
- [ ] Verify governance endpoint: `curl http://localhost:3000/api/v1/governance`
- [ ] Trust Score should still be 0/100 (correct — nothing earned yet)

### First 24 hours

- [ ] Monitor for crashes (Docker should auto-restart)
- [ ] Check backup ran at 03:00
- [ ] Record the first AI-influenced decision in the Decision Ledger
- [ ] Verify epistemic state: `curl http://localhost:3000/api/v1/epistemic-state`
- [ ] `realPercent` should be > 0 (the system has transitioned from simulated to observed)

---

## What does NOT need to be done before pilot

- ❌ **Kubernetes** — Docker Compose is sufficient for a single-station pilot
- ❌ **Multi-region replication** — single server is fine
- ❌ **CDN** — Icecast2 can handle 500+ listeners directly; CDN comes later
- ❌ **PostgreSQL migration** — SQLite handles 10,000 sessions/day easily
- ❌ **Custom mobile app** — web player + existing Icecast apps are enough
- ❌ **FM transmitter** — start with web stream, FM requires licensing

---

## The 80/20 rule

For a pilot, you need:
- 80% reliability (Docker restart + health checks) ✅ already have
- 80% monitoring (Prometheus + basic alerts) ⚠️ deploy observability stack
- 80% security (TLS + rate limiting + API keys) ⚠️ add TLS
- 80% backup (daily SQLite copy) ✅ already have

You do NOT need 99.99% uptime for a pilot. You need:
- The stream to be audible
- The system to record listener sessions
- The system to not lose data on restart
- The operator to see what's happening

That's it. Everything else is optimization for scale, which comes later.
