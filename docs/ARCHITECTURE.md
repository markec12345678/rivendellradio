# Rock 88.7 — Architecture Guide

## Overview

Rock 88.7 is a broadcast control center built on Next.js 16 with a modular, event-driven architecture. This document describes the system architecture, design decisions, and component relationships.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (Client)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │Library   │  │Schedule  │  │System    │        │
│  │(7 tabs)  │  │(tracks)  │  │(clocks)  │  │(22 panels)│       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│       └──────────────┴──────┬───────┴──────────────┘              │
│                             │                                     │
│                ┌────────────┴────────────┐                       │
│                │  TanStack Query + Zustand│                      │
│                │  (server state + client) │                      │
│                └────────────┬────────────┘                       │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Caddy Gateway   │
                    │   (port 81)       │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
    ┌─────────┴─────────┐         ┌──────────┴──────────┐
    │  Next.js :3000    │         │  broadcast-feed     │
    │  (App Router)     │         │  :3003 (socket.io)  │
    │                   │         │                     │
    │  124 API routes   │         │  Real-time events:  │
    │  22 UI panels     │         │  - now-playing      │
    │  Server Actions   │         │  - VU meter         │
    │  OpenTelemetry    │         │  - listener counts  │
    │                   │         │  - collab sync      │
    └────────┬──────────┘         └─────────────────────┘
             │
    ┌────────┴──────────┐
    │   Prisma ORM      │
    │   SQLite (prod:   │
    │   PostgreSQL)     │
    └────────┬──────────┘
             │
    ┌────────┴──────────┐
    │   Event Bus       │
    │   (in-memory +    │
    │    DB persist)    │
    └───────────────────┘
```

## Core Design Principles

### 1. Event-Driven Architecture
All system events flow through a central Event Bus with persistence:
- Events are typed (track.started, rds.updated, snmp.warning, etc.)
- Each event has correlationId for distributed tracing
- Events persist to EventStore (Prisma) for replay
- Webhooks deliver events to external systems (HMAC-SHA256 signed)
- Dead Letter Queue (DLQ) for failed deliveries

### 2. API-First Design
Every feature exposes a REST API before UI:
- 124 API endpoints under `/api/v1/*` and `/api/rivendell/*`
- OpenAPI 3.1 spec at `/api/v1/openapi`
- Scalar interactive docs at `/api/docs`
- Rate limiting (RFC 7807 problem+json) via middleware
- RBAC with 9 roles + audit trail

### 3. Modular Panels
System tab consists of 22 independent panels, each:
- Fetches its own data (no coupling)
- Has its own API endpoint(s)
- Can be developed/deployed independently
- Plugin SDK allows third-party panels

### 4. Honest Separation
Every API clearly labels its implementation status:
- ✅ Real: Rivendell RDX, WebSocket feed, Event Bus, RBAC, EAS/CAP
- ⚠️ Simulation: ATSC 3.0, Dolby Atmos, Blockchain, XGBoost
- 🧩 Architecture: Cluster HA, Plugin Marketplace

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.3 |
| Language | TypeScript | 5.x |
| UI | React + shadcn/ui + Tailwind 4 | 19.2.3 |
| State | TanStack Query + Zustand | 5.x / 5.x |
| ORM | Prisma | 6.19.2 |
| Database | SQLite (dev) / PostgreSQL (prod) | — |
| Real-time | Socket.io | 4.8.3 |
| Observability | OpenTelemetry | 1.36 |
| Auth | NextAuth.js v4 | 4.24.11 |
| Validation | Zod | 4.0.2 |
| Runtime | Bun (dev) / Node.js (prod) | 1.x / 24.x |

## Data Flow Examples

### Track Playback
1. Rivendell RDXport starts track → Event Bus publishes `track.started`
2. WebSocket feed broadcasts to all connected dashboards
3. AI modules react: AI Social posts, AI DJ Assistant prepares show prep
4. RDS encoder updates PI/PS/RT (cascading event `rds.updated`)
5. Event persists to EventStore for replay
6. Webhooks fire to subscribed external systems

### EAS/CAP Alert
1. CAP XML received (IPAWS-OPEN or local decoder) → `/api/v1/eas/cap`
2. Signature verification (RFC 3275 XMLDSig) + replay protection (24h window)
3. If Extreme/Severe + Immediate → auto-interrupt pipeline fires
4. 7-step interrupt: fade → header → attention signal → SAME burst → TTS → EOM → restore
5. FCC EasLog entry created (4-year retention per 47 CFR §11.35)
6. AI Incident Commander correlates signals + proposes remediation

## Deployment Options

### Development
```bash
bun run dev          # Next.js on :3000
cd mini-services/broadcast-feed && bun run dev  # Feed on :3003
```

### Docker
```bash
docker compose up -d  # web + broadcast-feed + persistent volume
```

### Kubernetes
```bash
kubectl apply -f k8s/operator.yaml
kubectl apply -f k8s/rock887-instance.yaml
```

### Observability Stack
```bash
docker compose -f docker-compose.observability.yml --profile observability up -d
# Grafana :3001, Prometheus :9090, Loki :3100, Alertmanager :9093
```

## Security Architecture

- **CSP + Security Headers**: HSTS, nosniff, X-Frame-Options, Referrer-Policy
- **Rate Limiting**: Per-IP/Key sliding window (RFC 7807 on 429)
- **RBAC**: 9 roles with granular permissions
- **MFA**: TOTP RFC 6238 + WebAuthn passkeys (NIST AAL2)
- **SSO**: SAML 2.0 + OIDC with JIT provisioning
- **Audit Trail**: All mutations logged with userId + timestamp
- **API Keys**: SHA-256 hashed with prefix display

## Scalability

- **Horizontal**: K8s HPA (2-10 web pods based on CPU/memory)
- **Stateless**: Web pods share no in-memory state (Redis in prod)
- **Database**: SQLite (dev) → PostgreSQL (prod) with read replicas
- **WebSocket**: Socket.io with Redis adapter for multi-node
- **CDN**: HLS adaptive streaming for web listeners

## Implementation Status

See the "Implementation Status" card in System tab for transparent labeling of:
- ✅ Real implementation (Rivendell RDX, WebSocket, Event Bus, RBAC, EAS/CAP)
- ⚠️ Simulation (ATSC 3.0, Dolby Atmos, Blockchain, XGBoost predictions)
- 🧩 Architecture ready (Cluster HA, Plugin Marketplace, K8s Operator)
