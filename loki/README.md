# Rock 88.7 — Loki Log Aggregation

Loki + Promtail stack za agregacijo logov iz vseh Rock 88.7 servisor:

- **Next.js web** (`dev.log`) — API requests, Prisma queries, errors
- **broadcast-feed** (`broadcast-feed.log`) — socket.io events, connection logs
- **Docker containers** (rock887-*) — container stdout/stderr
- **System journald** — systemd unit logs (icecast2, snmptrapd, liquidsoap)

## LogQL query examples

```logql
# Vse error napake iz Next.js (zadnja ura)
{service="rock887-web"} |= "error" | json | level="error"

# Vsi Prisma queryji, ki so trajali > 100ms
{service="rock887-web"} |= "prisma" | regexp "render: (?P<ms>\\d+)ms" | ms > 100

# Broadcast-feed connection events
{service="rock887-feed"} |= "connected" or |= "disconnected"

# Failover-related events (cross-service)
{service=~"rock887.*"} |= "failover" or |= "silence" or |= "GPIO"

# Count error rate per service (5m buckets)
sum by (service) (count_over_time({source=~"nextjs|socketio"} |= "error" [5m]))

# Top 10 log sources by volume
topk(10, sum by (service) (count_over_time({service=~"rock887.*"} [1h])))
```

## Bring-up

```bash
# Add the observability profile (loki + promtail added to existing stack)
docker compose -f docker-compose.observability.yml --profile observability up -d
```

- Grafana: http://localhost:3001 (admin/admin)
- Loki API: http://localhost:3100
- Promtail: http://localhost:9080/metrics

## Correlation

Loki datasource je konfiguriran z `derivedFields`, ki samodejno ekstrakta
`correlationId` iz log vrstic in poveže do Replay Studia (`/api/v1/replay?correlationId=X`)
za cross-service event tracing.

## Retention

- 30 dni (720h) — konfigurirano v `loki.yml`
- Compactor briše stare chunke vsake 2 uri
- Starejši logi od 7 dni so zavrnjeni pri ingestu (`reject_old_samples_max_age: 168h`)
