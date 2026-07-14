# ADR-005: SQLite for Framework Phase, PostgreSQL for Scale

## Status
Accepted

## Context

The project needs a database for:
- Configuration (RivendellConfig, ActiveStation, ThemePreference)
- RBAC (User, AuditLog)
- Event Store
- EAS/CAP alerts
- Listener sessions (Sprint 30+)
- Decision Ledger + Trace Events (Sprint 31+)

The development sandbox supports SQLite. Production may need PostgreSQL for scale.

## Decision

Use **Prisma ORM** with **SQLite** as the default. The schema is Prisma-compatible — switching to PostgreSQL requires only changing `datasource db { provider = "postgresql" }` and running `prisma migrate`.

SQLite is sufficient for:
- Framework phase (0 real data)
- Small stations (< 10,000 listener sessions/day)
- Single-server deployments

PostgreSQL is recommended for:
- Large stations (> 10,000 sessions/day)
- Multi-server deployments
- High-concurrency write workloads

## Alternatives Considered

1. **PostgreSQL from the start** — production-ready but adds operational complexity (separate server, connection pooling, backups). Rejected for framework phase: SQLite is simpler and the schema is portable.
2. **MySQL** — widely available, but Prisma's SQLite → MySQL migration is less smooth than SQLite → PostgreSQL.
3. **No database** — in-memory only. Rejected: the Decision Ledger and listener sessions must persist across restarts.

## Consequences

- `DATABASE_URL=file:./db/custom.db` in development
- `docker-compose.production.yml` mounts a persistent volume for `/app/db`
- Daily SQLite backups via the backup service
- Migration to PostgreSQL is a configuration change, not a code change
- The production deployment guide documents both options
