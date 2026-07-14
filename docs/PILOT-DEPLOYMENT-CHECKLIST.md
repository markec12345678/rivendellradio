# Pilot Deployment Checklist

> *This document prepares the first real station connection. It cannot be executed in the development sandbox — there is no real Icecast2, no real listeners, no real radio station. It can only be executed at a real station, on a real day, by a real operator.*

---

## Pre-flight (can be verified in sandbox)

### ✅ Code
- [x] Lint passes (0 errors)
- [x] Typecheck passes (0 errors)
- [x] Tests pass (109/109)
- [x] CI/CD workflow is valid YAML
- [x] All key API endpoints return 200
- [x] Governance endpoint reports Trust Score 0/100, Level 0

### ✅ Database
- [x] Prisma schema includes ListenerSession, DecisionLedgerEntry, DecisionTraceEvent
- [x] `bun run db:push` creates all tables
- [x] ListenerSession table is empty (0 rows — honest state)
- [x] DecisionLedgerEntry table is empty (0 rows — honest state)

### ✅ Pipeline
- [x] `POST /api/v1/listener-pipeline` accepts IngestionBatch
- [x] Rejects raw IPs (SHA-256 salted hash required)
- [x] `GET /api/v1/listener-pipeline` reports 0 sessions honestly
- [x] `firstRealSession` flag is ready to signal the transition

### ✅ Governance
- [x] `POST /api/v1/decision-ledger` creates entries with trace events
- [x] `PATCH /api/v1/decision-ledger` records outcomes, derives lessons mechanically
- [x] `GET /api/v1/decision-ledger/[id]/trace` returns full lifecycle
- [x] `GET /api/v1/governance` returns Trust Score, Autonomy, Calibration, Stability
- [x] `GET /api/v1/epistemic-state` runs invariant checkers against live data

---

## Deployment (requires real station)

### Phase 1: Environment setup

- [ ] Set `LISTENER_HASH_SALT` env var
  ```bash
  openssl rand -hex 32
  # Add to .env: LISTENER_HASH_SALT=<the-generated-salt>
  ```
  *The pipeline refuses to store unhashed IPs. Without this salt, no sessions will be persisted.*

- [ ] Set `DATABASE_URL` to a persistent volume
  ```
  DATABASE_URL=file:/app/db/custom.db
  ```

- [ ] Set `INTERNAL_API_BASE` if the governance endpoint fetches from a different host
  ```
  INTERNAL_API_BASE=http://localhost:3000
  ```

- [ ] Deploy the Next.js app
  ```bash
  bun run build
  bun run start
  ```

- [ ] Start the WebSocket mini-service
  ```bash
  cd mini-services/broadcast-feed
  bun install
  bun run dev  # port 3003
  ```

### Phase 2: Connect Icecast2

- [ ] Identify the Icecast2 admin URL
  ```
  Example: http://stream.rock887.fm:8000/admin/status-json.xsl
  ```

- [ ] Enable listener stats in `icecast.xml` (if not already)
  ```xml
  <listeners>
    <listener-stats>1</listener-stats>
  </listeners>
  ```

- [ ] Write or deploy an Icecast2 adapter that:
  1. Polls `/status-json.xsl` every 30–60 seconds
  2. Diffs successive snapshots to infer session end events
  3. Hashes each listener IP with `LISTENER_HASH_SALT` (SHA-256)
  4. POSTs an `IngestionBatch` to `/api/v1/listener-pipeline`

  *The adapter is deployment-specific. See `src/lib/listener-pipeline/icecast-parser.ts` for the parser contract.*

- [ ] Verify the first POST succeeds
  ```bash
  # The response should include:
  # "firstRealSession": "YES — this was the first real session ever ingested..."
  ```

- [ ] Verify `GET /api/v1/listener-pipeline` now shows `totalSessions > 0`

- [ ] **Write the first entry in `docs/STATION-CHRONICLE.md`** using the First Real Station Day template

### Phase 3: First decisions

- [ ] When the AI Core makes its first real recommendation, record it:
  ```bash
  curl -X POST /api/v1/decision-ledger -H 'Content-Type: application/json' -d '{
    "timestamp": "<ISO>",
    "context": "morning-drive",
    "aiRecommendation": "<what the AI proposed>",
    "aiReasoning": "<why>",
    "aiConfidence": 0.XX,
    "aiPredictedAltDelta": X.X,
    "humanDecision": "approved|overridden|not-consulted",
    "actualAction": "<what was actually done>",
    "decisionDomain": "music|voice-link|ad-strategy|schedule|format"
  }'
  ```

- [ ] When the outcome is measured (next day, after session data accumulates):
  ```bash
  curl -X PATCH /api/v1/decision-ledger -H 'Content-Type: application/json' -d '{
    "id": "DEC-00001",
    "actualAltDelta": X.X
  }'
  ```

- [ ] Verify the trace lifecycle:
  ```bash
  curl /api/v1/decision-ledger/DEC-00001/trace
  ```

- [ ] Check governance state:
  ```bash
  curl /api/v1/governance
  # Trust Score should be > 0 now
  # Autonomy Level should still be 0 (need 50+ decisions for Level 1)
  ```

### Phase 4: First 50 decisions

- [ ] Record 50 decisions (DEC-00001 through DEC-000050)
- [ ] After 50 decisions with measured outcomes:
  - [ ] Check `GET /api/v1/governance` — Autonomy Level should be eligible for promotion to Level 1
  - [ ] Check calibration — are there enough samples per bucket?
  - [ ] Check override analytics — where is the AI strong vs weak?
- [ ] If all Level 1 requirements are met, a human operator must approve the promotion (it is never automatic)

### Phase 5: First A/B experiment

- [ ] Identify one hypothesis to test (e.g., "voice link before track increases ALT")
- [ ] Pre-register the experiment via `/api/v1/ai/experiments`
- [ ] Run the experiment for at least 14 days
- [ ] Record results — if P < 0.05 and d > 0.2, the finding may be promoted from `observed` to `experiment`
- [ ] Write the result in the Station Chronicle and as a GitHub issue in the Operational Learning milestone

---

## What CANNOT be done in the sandbox

- **No real Icecast2 server** — the pipeline is built and tested, but 0 real sessions exist
- **No real listeners** — all listener segments, taste evolution, and decision history are demonstration data (`isReal=false`)
- **No real LLM calls without Puter token** — the LLM provider falls back to keyword mode if Puter is unavailable
- **No real A/B tests** — all experiments are demonstration data
- **No real operational reviews** — the first review happens 30 days after the first real session

This is the honest state. The framework is ready. The operational phase has not begun.

---

## The first 24 hours

On the first day of real operation:

1. **Hour 0** — Deploy, connect Icecast2, verify first session ingested
2. **Hour 1** — Verify WebSocket feed, verify dashboard renders real data
3. **Hour 6** — First decision recorded in the ledger
4. **Hour 24** — First governance check: Trust Score > 0, first stability assessment (ephemeral tier)

Write each milestone in the Station Chronicle. These are the first real entries.

---

## The first signal that the system is working

Not a high Trust Score. Not a high acceptance rate.

The first signal is:

```
GET /api/v1/epistemic-state
→ systemState.realPercent > 0
```

When `realPercent` goes from 0 to anything above 0, the system has transitioned from `simulated` to `observed`. That is the moment the framework becomes a system.

Everything after that is accumulation.
