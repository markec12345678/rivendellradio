# ADR-003: Earned Autonomy Over Granted Autonomy

## Status
Accepted

## Context

AI systems that operate autonomously without evidence of trustworthiness are dangerous. The question: how much should the AI be allowed to do, and who decides?

Two approaches:
1. Grant autonomy upfront, restrict when problems arise
2. Grant nothing upfront, earn autonomy through evidence

## Decision

The system starts at **Level 0 — Observe only**. It cannot suggest, let alone act. Each of the 5 levels has hard, cumulative requirements:

| Level | Requirements |
|-------|-------------|
| 0 | (default) |
| 1 | 50+ observed decisions |
| 2 | 500+ decisions, <15% error, >70% acceptance, no violations |
| 3 | 1000+ decisions, <10% error, >80% acceptance, 90 violation-free days |
| 4 | 5000+ decisions, <7% error, >85% acceptance, 180 violation-free days |

**Promotions are never automatic.** A human operator must approve each promotion.
**Demotions are automatic.** A single epistemic violation drops the level immediately.

## Alternatives Considered

1. **Full autonomy from day one** — let the AI run, intervene when needed. Rejected: the AI has 0 real data; it cannot be trusted to act.
2. **Manual autonomy only** — an operator flips a switch when they feel comfortable. Rejected: feelings are not evidence; the promotion criteria must be measurable.
3. **Two levels only** — "observe" and "autonomous". Rejected: too coarse; the jump from 0 to full autonomy is dangerous without intermediate checkpoints.

## Consequences

- The system cannot suggest anything until 50 real decisions are recorded
- Operators see exactly which requirements are blocking promotion
- A violation immediately drops the level — no "grace period"
- The autonomy ladder is the operational expression of the epistemological layer
- Trust is earned through accumulated evidence, not granted through optimism
