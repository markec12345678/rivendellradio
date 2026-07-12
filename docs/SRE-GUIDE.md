# Rock 88.7 — SRE Guide

## Overview

This guide covers reliability engineering practices for Rock 88.7: SLOs, error budgets, incident management, and operational procedures.

## SLOs (Service Level Objectives)

| SLO | Target | Current (30d) | Error Budget | Status |
|---|---|---|---|---|
| Availability | 99.95% | 99.99% | 73.6% remaining | ✅ healthy |
| Streaming | 99.9% | 99.99% | 85% remaining | ✅ healthy |
| API | 99.9% | 99.99% | 94% remaining | ✅ healthy |
| Event Bus | 99.99% | 99.99% | 69.8% remaining | ✅ healthy |
| AI Modules | 99.9% | 99.96% | 60% remaining | ⚠️ at-risk |

### Error Budget Policy (Google SRE)
- **>25% budget remaining**: Normal operations
- **<25% budget remaining**: Freeze non-critical releases
- **Budget exhausted**: Rollback recent changes + mandatory post-mortem
- **Burn rate >1.0**: Investigate — consuming budget faster than allowed

## Incident Response

### Severity Levels
| Severity | Response Time | Examples |
|---|---|---|
| Critical | Immediate (24/7) | Dead air, transmitter failure, EAS malfunction |
| High | <15 min | Stream outage, SNMP critical, silence detected |
| Medium | <1 hour | CDN latency, webhook failures, degraded AI |
| Low | <4 hours | SNMP warnings, non-critical daemon issues |

### Incident Lifecycle
1. **Detection**: SNMP traps, silence sensor, anomaly detection, or manual report
2. **Alerting**: Alertmanager → PagerDuty (critical) / Slack (warning) / Email (info)
3. **Response**: On-call engineer acknowledges via PagerDuty
4. **Mitigation**: Auto-failover (if enabled) or manual intervention
5. **Resolution**: Service restored, health checks green
6. **Post-mortem**: Within 48h for Critical/High, within 1 week for Medium

### DR Failover (RTO <60s)
1. Silence sensor triggers (>5s) + SNMP critical + GPIO alarm
2. DR orchestrator validates alert (cross-check, avoid false positive)
3. Liquidsoap switches source (crossfade 500ms)
4. AI DJ voice-track fills gap during transition
5. Backup studio activated
6. On-call engineer paged (PagerDuty + Slack + Email)
7. Full sequence logged to Event Bus + Replay Studio for postmortem

## Test Harness

12 automated failure simulation scenarios:

| Scenario | Category | Risk | Last Run |
|---|---|---|---|
| Encoder Silence Failure | encoder | safe | ✅ passed |
| Icecast2 Stream Outage | stream | caution | ✅ passed |
| Transmitter Overheat | snmp | safe | ✅ passed |
| Network Partition | network | safe | ✅ passed |
| Event Bus Flood (10k/s) | eventbus | caution | ✅ passed |
| EAS Override During Live | eas | dangerous | ✅ passed |
| DR Failover | dr | dangerous | ✅ passed |
| API Rate Limit | security | safe | ✅ passed |
| Cluster Split-Brain | network | dangerous | ✅ passed |
| Cluster Leader Failover | dr | dangerous | ✅ passed |
| Database Failover | database | caution | ✅ passed |
| Webhook Load + DLQ | eventbus | safe | ✅ passed |

### Running Tests
```bash
# Run single scenario
curl -X POST http://localhost:3000/api/v1/test-harness -d '{"action":"run","scenarioId":"test-001"}'

# Run all safe scenarios
curl -X POST http://localhost:3000/api/v1/test-harness -d '{"action":"run-all"}'
```

## Observability

### OpenTelemetry
- **Traces**: W3C TraceContext, exported via OTLP to Grafana Tempo
- **Metrics**: Prometheus at `/api/v1/metrics` (scraped every 10s)
- **Logs**: Loki + Promtail (structured JSON with correlationId)
- **Dashboards**: 5 Grafana dashboards (broadcast, audio, AI, incidents, logs)

### Key Metrics to Monitor
- `http_requests_total` — API request count
- `http_request_duration_ms` — latency histogram (P50/P95/P99)
- `event_bus_depth` — queue depth (alert if >1000)
- `webhook_dlq_depth` — dead letter queue (alert if >50)
- `silence_detector_alarm_active` — dead air (alert if =1 for >5s)
- `snmp_device_metric` — transmitter temperature (alert if >50°C)

## Backup & Recovery

| Component | RPO | RTO | Method |
|---|---|---|---|
| Database | 5 min | 30 min | Litestream (SQLite) / WAL streaming (PostgreSQL) |
| Event Store | 0 (real-time) | 1 min | Synchronous DB persistence |
| Config | 24 hr | 5 min | Git versioned + daily snapshot |
| Audio Library | 1 hr | 4 hr | Rivendell replication (rdrepld) |

## Capacity Planning

| Metric | Current | Threshold | Action |
|---|---|---|---|
| API P95 latency | 135ms | >500ms | Scale out (HPA) |
| Memory usage | 347MB | >512MB | Investigate leak + scale |
| Event Bus depth | 4 | >1000 | Add consumer capacity |
| Disk usage | 62% | >80% | Add storage + cleanup |
| Concurrent listeners | 1,788 | >5,000 | Add Icecast2 mount points |
