# ADR-006: Internal HTTP Fetch for Module Isolation

## Status
Accepted

## Context

The governance endpoint (`/api/v1/governance`) needs data from station-memory, knowledge-engine, learning-loop, and the listener pipeline. Two approaches:

1. Call the modules' internal functions directly
2. Fetch the modules' HTTP endpoints internally

## Decision

Use **internal HTTP fetch** (`fetch('http://localhost:3000/api/v1/ai/station-memory')`).

This adds ~100ms latency per fetch (governance takes ~140ms total) but provides:
- **Module isolation** — each module is independently deployable and testable
- **Honest latency** — the governance endpoint sees what an external client would see
- **No circular dependencies** — modules don't import each other's internals
- **Future microservice extraction** — if a module needs to scale independently, the fetch URL changes, nothing else

## Alternatives Considered

1. **Direct function calls** — import the module's handler and call it. Faster (~10ms) but creates tight coupling. Rejected: the modules are designed as independent services.
2. **Shared in-memory cache** — modules write to a shared store, governance reads from it. Rejected: introduces cache invalidation complexity and race conditions.
3. **Message bus** — modules publish events, governance subscribes. Rejected: overkill for a read-heavy aggregation endpoint.

## Consequences

- Governance endpoint latency is ~140ms (acceptable for a dashboard, not a hot path)
- Each module can be tested in isolation by hitting its endpoint
- The `INTERNAL_API_BASE` env var allows splitting modules onto different servers in production
- If latency becomes a problem in production, the fetch can be replaced with direct function calls without changing the module APIs

## Performance Note

Benchmarked on 2026-07-14:
- `/api/v1/health` (no internal fetch): 12ms
- `/api/v1/governance` (4 internal fetches): 140ms
- Overhead: ~128ms for 4 fetches = ~32ms per fetch

This is acceptable for a dashboard endpoint. If it becomes a bottleneck, the first optimization is to parallelize the fetches (currently sequential in some paths).
