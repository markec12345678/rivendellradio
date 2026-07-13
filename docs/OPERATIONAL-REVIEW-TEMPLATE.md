# Operational Review Template

> *This document is a template. It will be filled in at the first review — 30 days after the station goes live. Until then, it stays empty.*

> *Sprints are over. The development phase ended at v1.0.0. What follows are Operational Reviews — honest assessments of what the system learned, what it got wrong, and what it earned the right to claim.*

---

## When to fill this in

| Review | When | Trigger |
|--------|------|---------|
| Operational Review 1 | 30 days after first real session | First real data accumulated |
| Operational Review 2 | 90 days after first real session | First seasonal patterns |
| Operational Review 3 | 6 months after first real session | First long-term trends |
| Operational Review 4 | 1 year after first real session | First full annual cycle |

A review is NOT a sprint retrospective. It does not ask "what did we build?"
It asks: **"What did the system learn — and what did it learn that it was wrong about?"**

---

## The four questions

Every Operational Review answers these four questions, in this order:

### 1. What surprised us?

Things the system (or we) believed that turned out to be wrong, or more nuanced, or context-dependent.

A surprise is not a failure. It is a signal that the model was incomplete. The most valuable entries in the Station Chronicle will come from this section.

```
Example:
The AI predicted that weather mentions in voice links boost ALT by +0.6 min.
After 30 days of real data: +0.1 min on overcast days, -0.2 min on sunny days.
The effect is weather-dependent and smaller than predicted.
The rule has been moved from "observed" back to "quarantined" pending an A/B test.
```

### 2. What failed?

Decisions, rules, or predictions that produced measurable negative outcomes.

Failures are the most valuable data the system can produce. They are never deleted (Invariant 3 — Failure Preservation). They are recorded here, in the Station Chronicle, and in the Decision Ledger.

```
Example:
DEC-000023: AI recommended shortening the ad break from 3:00 to 2:00.
Outcome: ALT +0.4 min, revenue -11%.
Lesson: ALT is not the only objective. Revenue guardrail weight increased from 0.10 to 0.15.
The AI's confidence calibration for ad-strategy decisions dropped from 0.68 to 0.54.
```

### 3. What turned out to be true?

Hypotheses that were confirmed by real data — promoted from `simulated` or `observed` to `experiment` or `validated`.

A confirmation is only recorded here when it has been measured against a counterfactual. Correlation alone is not confirmation.

```
Example:
Hypothesis: "Foo Fighters at 07:15 increases ALT."
A/B test (exp-001, n=412, P=0.003, d=0.42): confirmed.
Rule promoted: observed → experiment.
Confidence: 0.62 → 0.78.
Will be re-tested in winter to check for seasonality before promotion to validated.
```

### 4. What did we remove?

Rules, lessons, or memory entries that were deprecated — superseded by better evidence, or found to be wrong.

Removal here means marking as `deprecated`, never deletion (Invariant 3). The old entry stays in the record; the new one links back to it.

```
Example:
Rule-005 "Weather mentions boost ALT" — deprecated.
Superseded by Rule-012 "Weather mentions boost ALT on overcast days only."
The old rule remains in the Knowledge Engine with status=deprecated and a link to Rule-012.
```

---

## Review format

```
# Operational Review N — [period]

Date of review: YYYY-MM-DD
Period covered: YYYY-MM-DD to YYYY-MM-DD
Reviewer: [name / role]

## System state at review

- Real listener sessions: N
- Real programming decisions: N
- isReal = true: N
- isReal = false: N
- Trust Score: N/100
- Autonomy Level: N
- Calibration verdict: [verdict]
- Dominant stability tier: [tier]

## 1. What surprised us?

[entries]

## 2. What failed?

[entries]

## 3. What turned out to be true?

[entries]

## 4. What did we remove?

[entries]

## Metrics delta (vs previous review)

| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| Trust Score | | | |
| Autonomy Level | | | |
| Acceptance rate | | | |
| Mean abs prediction error | | | |
| Calibration verdict | | | |
| Stability dominant tier | | | |
| Real data % | | | |

## Promotions this period

| Finding | From | To | Evidence |
|---------|------|----|---------|
| | simulated → observed | | |
| | observed → experiment | | |
| | experiment → validated | | |

## Demotions this period

| Finding | From | To | Reason |
|---------|------|----|--------|
| | | deprecated | |

## The one-sentence summary

[One sentence that captures what the system learned this period.]

## Next review

Scheduled for: YYYY-MM-DD
Focus question: [what the next review should investigate]
```

---

## The rule

An Operational Review is never skipped. If the system is running, the review happens.

An Operational Review is never fabricated. If there is no real data, the review says so — and that is itself a finding.

An Operational Review is never about new features. It is about what the existing system learned, failed at, confirmed, and removed.

---

## The first review

Operational Review 1 will be filled in 30 days after the first real listener session flows through the pipeline.

Until then, this template stays empty.

That is correct.
