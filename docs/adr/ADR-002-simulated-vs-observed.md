# ADR-002: Honest isReal Flag Over Simulated Confidence

## Status
Accepted

## Context

The system contains 44 demonstration entries across station-memory, knowledge-engine, and learning-loop. All carry `isReal = false`. Without this flag, simulated data would be indistinguishable from real observations — and over time, the system would treat its own simulations as fact.

A specific finding: `lesson-001` had `confidence: 'very-high'` with `timesObserved: 847` and `isReal: false`. This is epistemologically incoherent — very-high confidence in something never really observed.

## Decision

Every long-term memory entry carries an `isReal` boolean. When `false`:
- Confidence caps at `medium` (Invariant 5)
- The entry is quarantined — it cannot influence decisions
- The entry is visible to operators (transparency) but not to the optimizer/scheduler

The `sourceType` hierarchy (`simulated → observed → experiment → validated`) replaces the binary `isReal` with a graded scale, each level permitting a higher maximum confidence.

## Alternatives Considered

1. **Delete all simulated data** — clean slate. Rejected: the framework needs demonstration data to show how the system works.
2. **Hide simulated data from the UI** — pretend it doesn't exist. Rejected: operators need to see the system's state honestly.
3. **Label data as "demo" in the UI only** — no backend enforcement. Rejected: UI labels without backend invariants are cosmetic.

## Consequences

- 44 entries honestly labeled `isReal = false`
- `lesson-001` confidence is documented as a violation (Invariant 5)
- The `/api/v1/epistemic-state` endpoint runs checkers against live data and reports violations
- The system can never accidentally promote a simulation to a fact
- New entries from real operation will carry `isReal = true` and be immediately distinguishable
