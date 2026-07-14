# ADR-004: Mechanical Lesson Derivation Over AI-Authored Lessons

## Status
Accepted

## Context

When an AI makes a recommendation and the outcome is measured, a lesson is learned. The question: who writes the lesson?

If the AI writes the lesson in its own voice ("I learned that...", "I discovered..."), over years this becomes the AI's autobiography — not the station's memory. This is the "narrator of its own legends" problem.

A specific finding: the Station Journal had `aiSelfReflection: "I predicted 94% retention... My model underestimates..."` — the AI writing in first person, stored as memory.

## Decision

Lessons are **derived mechanically** from the signed difference between prediction and outcome. The `deriveLedgerLesson()` function:
- Accepts only: `aiPredictedAltDelta`, `actualAltDelta`, `humanDecision`, optional `humanRationale`
- Constructs the lesson from those inputs — never from an AI-authored string
- The lesson's source is `human-asserted` (for the rationale) or `measured` (for the delta), never `predicted`

The AI may propose. The human may decide. The system measures. The lesson is derived — never narrated.

## Alternatives Considered

1. **Let the AI write lessons, flag them as AI-authored** — allow it but label the source. Rejected: over years, AI-authored lessons accumulate and blur into the station's memory.
2. **Let the AI write lessons, human edits them** — collaborative. Rejected: editing is labor-intensive; the mechanical derivation is more consistent and auditable.
3. **No lessons at all** — just store predictions and outcomes. Rejected: the lesson is the bridge between a single decision and future decisions; without it, the system cannot learn.

## Consequences

- The Decision Ledger's `lesson` field is never set by the client
- `deriveLedgerLesson()` is the single source of truth for lesson text
- The AI's voice is excluded from long-term memory by construction
- The Station Journal's `aiSelfReflection` field is documented as a violation (Invariant 7)
- Over years, the station's memory is built from measurements and human rationale — not from AI narration
