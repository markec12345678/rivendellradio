# Rock 88.7 — Station Chronicle

> *This is not technical documentation.*
> *This is the story of a radio station, written one verified event at a time.*
>
> *It begins almost empty. That is correct.*
> *It will be filled by years of operation, thousands of decisions, and the slow accumulation of verified truth.*
>
> *No sprint can fill this file. Only time and real listeners can.*

---

## The One Rule

**Do not write what the AI thinks happened.**
**Write what actually happened.**

Everything else in this file is secondary to that rule.

If you are tempted to add an entry because the AI "feels" like it is working — stop.
If you are tempted to round a number up — stop.
If you are tempted to skip a failure because it is embarrassing — stop.

This file is the one place in the entire system where honesty is the only metric that matters.

---

## What belongs here

A chronicle entry is **a decision, its evidence, its outcome, and its lesson.**

Not:
- a feature list
- an architecture summary
- a sprint retrospective
- a marketing claim

Yes:
- "On this date, this decision was made, for this reason, with this predicted outcome. The actual outcome was X. Here is what we learned."

### Record victories. Record failures. Record failures especially.

A chronicle of only successes is not a chronicle. It is a press release.

The most valuable entries in this file, five years from now, will be the wrong predictions, the bad experiments, and the false assumptions. They are the only entries that teach anything.

---

## Entry format

Every entry follows the same shape. Precision over prose.

### Good entry

```
2027-03-12

Decision:
AI proposed reordering the morning show block:
News → Weather → Foo Fighters → Traffic

Reason:
Predicted +1.5 min ALT (Average Listening Time).

Result:
ALT: 19.4 → 21.1 (+1.7 min)
Sample: 847 morning sessions.

Human reaction:
Program director confirmed:
"Surprisingly good. I would have chosen differently."

Status:
Rule not yet confirmed.
Re-test required.
```

### Bad entry

```
2027-03-12
AI improved the morning show.
```

The bad entry teaches nothing.
The good entry teaches everything — including the limits of its own certainty.

---

## A failure entry — the most valuable kind

```
2028-04-18

AI error:
Predicted that a shorter ad block would improve ALT.

Result:
ALT +0.4 min.
Revenue -11%.

Lesson:
ALT is not the only objective.
The optimizer increased engagement but ignored business impact.

Change:
Added a larger weight to the revenue guardrail in the multi-objective optimizer.
```

This entry, five years from now, will be worth more than any success entry in the file.

---

## The learning loop this file captures

```
   Decision
      ↓
   Evidence
      ↓
   Outcome
      ↓
    Lesson
      ↓
Future decision
```

If an entry does not connect to a future decision, it is not yet complete.

---

## 2026-07-13 — The Framework Year

**The one real entry.**

We built a system that can observe, think, and propose.
We have not yet proven it can improve radio.

**Most important decision of the year:**
We will not replace simulated results with truth.

**The receipts:**
- 0 real listener data points
- 0 real A/B test results
- 0 real institutional lessons
- 0 days of production operation
- 44 occurrences of `isReal = false`
- 0 occurrences of `isReal = true`

The AI begins its real history only with the first real listener.

---

## The First Real Station Day — template

This is the shape of the first real entry. It will be small. It may be unimpressive. That does not matter — what matters is that it is real.

Fill it in on the day the station connects to a real Icecast2 server, serves a real listener, and measures a real session. Do not fill it in before. Do not fill it in from a simulation.

```
Date:
Station:

AI recommendation:
Human decision:
Actual result:
Evidence level:
Lesson:
```

### What each field means

- **Date** — the calendar day. Precision matters.
- **Station** — which station. If this chronicle ever serves more than one, this field is why.
- **AI recommendation** — what the AI proposed, in its own words, quoted. This is a prediction (`source: predicted`). It is never promoted to fact.
- **Human decision** — what the operator actually did, including "followed the AI", "overrode the AI", or "the AI was not consulted". All three are valid.
- **Actual result** — what was measured, with the sample size. "ALT 18.4 → 19.1, n = 312" is a result. "ALT improved" is not.
- **Evidence level** — one of `simulated / observed / experiment / validated` (see `docs/EPISTEMOLOGICAL-INVARIANTS.md`). The first real day will almost always be `observed` with a small `n`. That is correct. Say so.
- **Lesson** — derived from the signed difference between the AI's prediction and the actual outcome. Never written in the AI's voice. Never "the AI learned…". Always "the measured outcome was X versus prediction Y; the difference is Z."

### A reasonable first entry might look like this

```
Date: 2027-02-18
Station: Rock 88.7 FM

AI recommendation:
Play Foo Fighters — Everlong at 07:15 (predicted +1.5 min ALT)

Human decision:
Followed AI recommendation.

Actual result:
ALT 18.2 → 18.9 (+0.7 min), n = 47 morning sessions.
Below AI prediction of +1.5.

Evidence level:
observed (n=47, no experiment)

Lesson:
AI overpredicted by +0.8 min. The track helped, but less than predicted.
Possible confounders: track was played at 07:08 yesterday (24h fatigue),
weather was overcast (lower mood boost than typical Foo Fighters slot).
Re-observe for 7 days before promoting to experiment status.
```

### Why the first entry will be the most valuable one in this file

Not because it will be impressive. It probably will not be.
Because it will be the first line in this file that is `source: observed` instead of `source: simulated`.

Every line above it is framework.
The first line below it is history.

That single transition — from `simulated` to `observed` — is the moment the system begins to deserve trust. Not because the AI became smarter. Because the system started telling the truth about what it actually knows.

### How the first entry is triggered — technically

The pipeline at `src/app/api/v1/listener-pipeline/route.ts` is the reception point. It is built. It is empty. It will stay empty until a real Icecast2 server is connected and an adapter POSTs a real `IngestionBatch`.

The day the first POST succeeds:
1. The `ListenerSession` table goes from 0 rows to 1 row.
2. `GET /api/v1/listener-pipeline` flips from `totalSessions: 0` to `totalSessions: 1`.
3. The response's `firstRealSession` field says: *"YES — this was the first real session ever ingested."*
4. The operator on duty writes the first entry in this chronicle, using the template above.

That day is not a sprint. It is a deployment. It cannot happen in this sandbox — there is no real Icecast2, no real listeners, no real radio station. It can only happen at a real station, on a real day, with real people tuning in.

Until then, this file stays as it is. The pipeline waits. The table is empty. The honesty is intact.

---

## What comes next

*Nothing.*

The next entry in this file will be the first real one.
It will be written when the station connects to a real Icecast2 server,
serves a real listener, and measures a real session.

Until then, this file stays exactly as it is.

That is not a gap. That is the point.

---

## Maintenance rules

1. **Never delete an entry** — even superseded ones. This is a chronicle, not a database.
2. **Date every entry** — precision matters. Which day, which session.
3. **Be honest** — if the AI failed, record it. If a decision was wrong, say so. Especially then.
4. **Include numbers** — "ALT improved" is weak. "ALT 18.9 → 22.3, n = 847" is strong.
5. **Include sample size** — a result without a sample is an anecdote.
6. **Include human reactions** — "Operator said the AI is usually right about afternoon drive" is more valuable than any metric.
7. **Include status** — confirmed? needs re-test? superseded? Say so.
8. **Review annually** — at the end of each year, read the whole chronicle aloud. Notice what is missing.

---

## The final measure

This file will stay nearly empty for a long time. That is correct.

When it contains three years of real entries — real decisions, real outcomes, real lessons — it will be worth more than any line of code in this repository.

Not because the code is bad.
Because code is the framework.
The chronicle is the wisdom.

*"An experienced program director carries twenty years of memory in their head.*
*When they leave, it leaves with them.*
*Station Memory keeps it.*
*Station Chronicle tells the story of how that memory was earned.*

*But first, the station must operate."*
