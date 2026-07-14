# Architecture Decision Records (ADRs)

> *Each ADR documents a key architectural decision: what was decided, why, and what the alternatives were.*

## Index

| # | Title | Status | Date |
|---|-------|--------|------|
| [001](ADR-001-epistemological-layer.md) | Epistemological Layer Over Feature Accumulation | Accepted | 2026-07-13 |
| [002](ADR-002-simulated-vs-observed.md) | Honest isReal Flag Over Simulated Confidence | Accepted | 2026-07-13 |
| [003](ADR-003-autonomy-ladder.md) | Earned Autonomy Over Granted Autonomy | Accepted | 2026-07-13 |
| [004](ADR-004-mechanical-lesson-derivation.md) | Mechanical Lesson Derivation Over AI-Authored Lessons | Accepted | 2026-07-13 |
| [005](ADR-005-sqlite-over-postgres.md) | SQLite for Framework Phase, PostgreSQL for Scale | Accepted | 2026-07-13 |
| [006](ADR-006-internal-http-over-function-calls.md) | Internal HTTP Fetch for Module Isolation | Accepted | 2026-07-13 |
| [007](ADR-007-v1.0-release-as-architectural-boundary.md) | v1.0 as Architectural Boundary, Not Feature Completion | Accepted | 2026-07-13 |

## Format

Each ADR follows:

```
# ADR-NNN: Title

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Context
What is the issue being addressed?

## Decision
What was decided?

## Alternatives Considered
What other options were on the table?

## Consequences
What are the implications of this decision?
```

## Principles

1. **ADRs are immutable** — once accepted, an ADR is never edited. If a decision changes, a new ADR supersedes it.
2. **ADRs are honest** — they document what was actually decided, not what looks good in retrospect.
3. **ADRs are brief** — one page maximum. If it needs more, it's not a decision, it's a design document.
