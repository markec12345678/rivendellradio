# Rock 88.7 — Deployment Guide

## Quick Start

### Development
```bash
git clone https://github.com/markec12345678/rivendellradio.git
cd rivendellradio
bun install
bun run db:push
bun run dev  # http://localhost:3000

# In another terminal:
cd mini-services/broadcast-feed
bun install
bun run dev  # port 3003
```

### Docker (single command)
```bash
docker compose up -d
# Web on :3000, broadcast-feed on :3003
```

### Docker + Observability Stack
```bash
docker compose up -d
docker compose -f docker-compose.observability.yml --profile observability up -d
# Grafana on :3001 (admin/admin)
# Prometheus on :9090
# Loki on :3100
# Alertmanager on :9093
```

### Kubernetes
```bash
kubectl apply -f k8s/operator.yaml
kubectl apply -f k8s/rock887-instance.yaml

# Check deployment
kubectl get rock887platform rock887-prod -n rock887
kubectl get pods -n rock887
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `file:./db/custom.db` | Prisma database URL |
| `BROADCAST_FEED_URL` | No | `http://localhost:3003` | WebSocket feed URL |
| `NEXTAUTH_SECRET` | Prod | — | NextAuth.js secret |
| `VAPID_PRIVATE_KEY` | No | — | Web Push VAPID private key |
| `IPAWS_COG_ID` | No | — | FEMA IPAWS COG ID |
| `IPAWS_USER_ID` | No | — | IPAWS user ID |
| `IPAWS_PASSWORD` | No | — | IPAWS password |
| `ACOUSTID_API_KEY` | No | — | AcoustID API key |
| `HIVE_POSTING_KEY` | No | — | Hive blockchain posting key (podping) |
| `DEPLOY_COLOR` | No | `blue` | Blue-green deployment slot |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | — | OpenTelemetry Collector URL |

## Production Checklist

### Security
- [ ] Set `NEXTAUTH_SECRET` to strong random value
- [ ] Configure MFA (TOTP + WebAuthn) for admin/technical-engineer roles
- [ ] Set up SSO (SAML/OIDC) if in enterprise environment
- [ ] Verify CSP headers are active (check `/api/v1/csp-report`)
- [ ] Rate limiting active (check `X-RateLimit-*` headers)
- [ ] API keys created with minimal permissions
- [ ] Audit trail enabled (check `/api/rivendell/audit`)

### Reliability
- [ ] Health probes configured (`/api/v1/health/ready`, `/api/v1/health/live`)
- [ ] Alertmanager routing to PagerDuty/Slack configured
- [ ] Test Harness run (all 12 scenarios passing)
- [ ] Backup strategy active (database + config)
- [ ] DR failover tested (POST `/api/v1/failover { action: "drill" }`)

### Observability
- [ ] OpenTelemetry export to Collector configured
- [ ] Prometheus scraping `/api/v1/metrics` every 10s
- [ ] Grafana dashboards provisioned
- [ ] Loki + Promtail log aggregation active
- [ ] Public status page accessible at `/status`

### Broadcast
- [ ] Rivendell RDXport URL configured
- [ ] Icecast2 mount points accessible
- [ ] SNMP devices responding (check `/api/v1/snmp`)
- [ ] GPIO lines mapped (check `/api/v1/gpio`)
- [ ] RDS encoder updating (check `/api/rivendell/rds`)
- [ ] EAS weekly test scheduled (check `/api/v1/eas/test`)

### Performance
- [ ] Benchmark run (POST `/api/v1/benchmark`)
- [ ] API P95 < 500ms
- [ ] Memory < 512MB heap
- [ ] Event Bus throughput > 10k events/sec

## Upgrade Procedure

### Blue-Green Deploy (zero downtime)
1. CI/CD builds new image → pushes to GHCR
2. Deploy to inactive slot (green if blue is active)
3. Health check (60s warmup, all probes green)
4. Swap Caddy upstream to new slot
5. If health check fails → auto-rollback to previous slot
6. Cleanup old slot

### Rolling Update (K8s)
```bash
kubectl patch rock887platform rock887-prod --type=merge -p '{"spec":{"version":"4.5.0"}}'
# Operator performs rolling update with health checks
```

### Canary Deployment (K8s + Argo Rollouts)
1. 5% traffic to new version → 5min pause → analysis
2. 25% → 5min pause → analysis
3. 50% → 5min pause → analysis
4. 100% → promotion
5. Auto-rollback if error rate >5% or P95 >500ms

## Troubleshooting

### Dashboard won't load
```bash
curl http://localhost:3000/api/v1/health/ready
# Check if DB, Icecast, Event Bus, broadcast-feed are all "ok"
```

### WebSocket not connecting
```bash
# Check broadcast-feed is running
curl http://localhost:3003/  # should return 400 (socket.io only)

# Check Caddy gateway forwarding
curl "http://localhost:81/?XTransformPort=3003"  # should return 400
```

### Database issues
```bash
bun run db:push  # sync schema
bun run db:generate  # regenerate client
```

### EAS not receiving alerts
```bash
# Check IPAWS configuration
curl http://localhost:3000/api/v1/eas/ipaws

# Manual poll
curl -X POST http://localhost:3000/api/v1/eas/ipaws -d '{}'
```
