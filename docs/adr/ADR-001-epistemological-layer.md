# ADR-001: Epistemological Layer Over Feature Accumulation

## Status
Accepted

## Context

By Sprint 29, the project had 140+ API endpoints, 12 AI modules, and extensive broadcast infrastructure. The question arose: should Sprint 30+ continue adding AI capabilities (more agents, more memory types, more tools), or should it address a different question — "when can we trust the AI?"

The team observed that most AI systems report confidence but almost none verify it. Adding more features would increase capability but not trustworthiness.

## Decision

Stop adding AI capabilities. Build an **epistemological layer** — 7 invariants that govern what the AI is allowed to claim, and 3 enforcement mechanisms that make those invariants checkable.

The distinguishing feature of the system is not what the AI *can* do — it is what the AI is *allowed* to do, based on accumulated evidence.

## Alternatives Considered

1. **Continue adding AI modules** — more agents, more memory types. Rejected: capability without trustworthiness is dangerous in production.
2. **Add a "trust score" widget** — a UI metric without enforcement. Rejected: a score without invariants is decoration.
3. **Wait for production data first** — build trust features only after real operation. Rejected: by then, the AI would have accumulated unverified claims in memory.

## Consequences

- The system starts at Trust Score 0/100 and Autonomy Level 0
- Every memory entry carries a `source` field (measured | human-asserted | predicted)
- Predicted entries are quarantined — they cannot influence decisions
- The system can honestly say "I don't know" — and that is a feature
- Future development must answer: "which real operational problem does this solve?"
