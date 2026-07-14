/**
 * Temporal Stability — "0.82 stable for 3 days" is not the same as
 * "0.82 stable for 18 months".
 *
 * Long-term stability is itself evidence. A finding that has held for 18
 * months across hundreds of observations is qualitatively different from
 * one that was measured once last week. The system must know the difference.
 *
 * This module computes stability tiers for any finding, rule, or decision
 * that has a confidence score and a last-confirmed timestamp. The tiers are:
 *
 *   ephemeral    — confirmed < 7 days ago, or never re-confirmed
 *   recent       — confirmed 7–90 days ago, with ≥ 2 confirmations
 *   established  — confirmed 90–365 days ago, with ≥ 5 confirmations
 *   entrenched   — confirmed > 365 days ago, with ≥ 10 confirmations
 *
 * The tier feeds into the autonomy assessment. A system whose confidence
 * is "entrenched" earns more trust than one whose confidence is "ephemeral",
 * even if the numeric confidence is identical.
 *
 * See: docs/EPISTEMOLOGICAL-INVARIANTS.md — Invariant 5 (Honest Confidence)
 *
 * Discipline: stability is NEVER assumed. A finding with zero confirmations
 * is "ephemeral" no matter how confident the AI claims to be. Stability is
 * earned through repeated measurement, not asserted through optimism.
 */

/**
 * The four stability tiers. Ordered from least to most stable.
 */
export type StabilityTier = 'ephemeral' | 'recent' | 'established' | 'entrenched'

/**
 * A stability assessment for a single finding, rule, or decision.
 */
export interface StabilityAssessment {
  /** The stability tier. */
  tier: StabilityTier
  /** Days since the finding was last confirmed by a real measurement. */
  daysSinceConfirmation: number | null
  /** Number of times this finding has been confirmed by independent measurements. */
  confirmationCount: number
  /** Days between the first and most recent confirmation. Null if < 2 confirmations. */
  spanDays: number | null
  /** Human-readable explanation of the tier. */
  explanation: string
  /**
   * The stability multiplier — a factor in [0.5, 1.0] that scales the
   * finding's influence on decisions. Ephemeral findings have 0.5,
   * entrenched findings have 1.0. This is how stability modulates confidence.
   */
  stabilityMultiplier: number
}

/**
 * The input to a stability assessment. The caller provides:
 *   - lastConfirmedAt: when the finding was last confirmed (null if never)
 *   - firstConfirmedAt: when it was first confirmed (null if never)
 *   - confirmationCount: how many independent confirmations
 *   - now: the reference timestamp (default: current time)
 */
export interface StabilityInput {
  lastConfirmedAt: string | null
  firstConfirmedAt?: string | null
  confirmationCount: number
  now?: string
}

/**
 * Tier thresholds. Tuned for a radio station's operational rhythm:
 *   - 7 days = one weekly cycle
 *   - 90 days = one quarter (seasonal partial)
 *   - 365 days = one full year (full seasonal cycle)
 *
 * A finding must survive a full year to be "entrenched" — because radio
 * listening has seasonal patterns, and a finding that has only been seen
 * in summer may not hold in winter.
 */
export const TIER_THRESHOLDS = {
  ephemeral: { maxDays: 7, minConfirmations: 0 },
  recent: { maxDays: 90, minConfirmations: 2 },
  established: { maxDays: 365, minConfirmations: 5 },
  entrenched: { minDays: 365, minConfirmations: 10 },
} as const

/**
 * The stability multiplier per tier. This is how stability modulates
 * confidence in the autonomy assessment.
 *
 *   ephemeral   → 0.5  (half weight — recent, unconfirmed)
 *   recent      → 0.7  (mostly trusted, but not yet battle-tested)
 *   established → 0.85 (trusted across a season)
 *   entrenched  → 1.0  (full weight — survived a full year)
 */
export const STABILITY_MULTIPLIERS: Record<StabilityTier, number> = {
  ephemeral: 0.5,
  recent: 0.7,
  established: 0.85,
  entrenched: 1.0,
}

/**
 * Compute the stability tier for a finding.
 *
 * The tier is the HIGHEST tier whose requirements are ALL met. A finding
 * with 10 confirmations over 400 days is "entrenched". A finding with
 * 3 confirmations over 100 days is "recent" (not enough confirmations
 * for "established"). A finding with 0 confirmations is "ephemeral"
 * regardless of how long ago it was first seen.
 *
 * This is deliberately conservative. Stability is earned, not granted.
 */
export function assessStability(input: StabilityInput): StabilityAssessment {
  const now = input.now ? Date.parse(input.now) : Date.now()
  const lastMs = input.lastConfirmedAt ? Date.parse(input.lastConfirmedAt) : null
  const firstMs = input.firstConfirmedAt ? Date.parse(input.firstConfirmedAt) : null

  const daysSinceConfirmation =
    lastMs !== null ? Math.floor((now - lastMs) / 86400000) : null

  const spanDays =
    firstMs !== null && lastMs !== null
      ? Math.floor((lastMs - firstMs) / 86400000)
      : null

  const confirmations = input.confirmationCount

  // Determine the tier — the highest tier whose requirements are ALL met.
  let tier: StabilityTier
  let explanation: string

  if (
    daysSinceConfirmation !== null &&
    daysSinceConfirmation >= TIER_THRESHOLDS.entrenched.minDays &&
    confirmations >= TIER_THRESHOLDS.entrenched.minConfirmations
  ) {
    tier = 'entrenched'
    explanation = `Entrenched: confirmed ${confirmations} times over ${spanDays ?? daysSinceConfirmation} days. This finding has survived a full seasonal cycle and may be treated as durable knowledge. Stability multiplier: 1.0.`
  } else if (
    daysSinceConfirmation !== null &&
    daysSinceConfirmation <= TIER_THRESHOLDS.established.maxDays &&
    confirmations >= TIER_THRESHOLDS.established.minConfirmations
  ) {
    tier = 'established'
    explanation = `Established: confirmed ${confirmations} times, last ${daysSinceConfirmation} days ago. Trusted across a season but not yet a full year. Stability multiplier: 0.85.`
  } else if (
    daysSinceConfirmation !== null &&
    daysSinceConfirmation <= TIER_THRESHOLDS.recent.maxDays &&
    confirmations >= TIER_THRESHOLDS.recent.minConfirmations
  ) {
    tier = 'recent'
    explanation = `Recent: confirmed ${confirmations} times, last ${daysSinceConfirmation} days ago. Promising but not yet battle-tested. Stability multiplier: 0.7.`
  } else {
    tier = 'ephemeral'
    if (daysSinceConfirmation === null) {
      explanation = `Ephemeral: never confirmed by a real measurement. This is a prediction, not a finding. Stability multiplier: 0.5.`
    } else if (confirmations < 2) {
      explanation = `Ephemeral: only ${confirmations} confirmation(s), last ${daysSinceConfirmation} days ago. A single observation is not a pattern. Stability multiplier: 0.5.`
    } else {
      explanation = `Ephemeral: last confirmed ${daysSinceConfirmation} days ago — too long without re-confirmation. Stability decays without re-measurement. Stability multiplier: 0.5.`
    }
  }

  return {
    tier,
    daysSinceConfirmation,
    confirmationCount: confirmations,
    spanDays,
    explanation,
    stabilityMultiplier: STABILITY_MULTIPLIERS[tier],
  }
}

/**
 * Aggregate stability across a set of findings — used by the governance
 * dashboard to show the system's overall stability profile.
 *
 * Returns the distribution of findings across tiers, plus the weighted
 * average stability multiplier.
 */
export interface StabilityProfile {
  total: number
  byTier: Record<StabilityTier, number>
  /** Weighted average of stabilityMultiplier across all findings. */
  averageMultiplier: number
  /** The dominant tier — the one with the most findings. */
  dominantTier: StabilityTier
  /** Human-readable summary. */
  summary: string
}

/**
 * Compute a stability profile from a list of individual assessments.
 */
export function computeStabilityProfile(
  assessments: StabilityAssessment[],
): StabilityProfile {
  const total = assessments.length
  if (total === 0) {
    return {
      total: 0,
      byTier: { ephemeral: 0, recent: 0, established: 0, entrenched: 0 },
      averageMultiplier: 0,
      dominantTier: 'ephemeral',
      summary: 'No findings to assess. The system has no accumulated stability — this is the honest starting state.',
    }
  }

  const byTier: Record<StabilityTier, number> = {
    ephemeral: 0,
    recent: 0,
    established: 0,
    entrenched: 0,
  }
  for (const a of assessments) {
    byTier[a.tier]++
  }

  const averageMultiplier =
    assessments.reduce((s, a) => s + a.stabilityMultiplier, 0) / total

  // Dominant tier — the one with the most findings
  let dominantTier: StabilityTier = 'ephemeral'
  let max = 0
  for (const tier of ['entrenched', 'established', 'recent', 'ephemeral'] as StabilityTier[]) {
    if (byTier[tier] > max) {
      max = byTier[tier]
      dominantTier = tier
    }
  }

  let summary: string
  if (dominantTier === 'ephemeral' && byTier.ephemeral === total) {
    summary = `All ${total} finding(s) are ephemeral — no finding has been confirmed by repeated measurement. The system is in its earliest phase. Stability must be earned.`
  } else if (dominantTier === 'entrenched') {
    summary = `${byTier.entrenched} of ${total} finding(s) are entrenched — survived a full year. The system has durable knowledge. Average stability multiplier: ${averageMultiplier.toFixed(2)}.`
  } else {
    summary = `${total} finding(s): ${byTier.ephemeral} ephemeral, ${byTier.recent} recent, ${byTier.established} established, ${byTier.entrenched} entrenched. Dominant tier: ${dominantTier}. Average multiplier: ${averageMultiplier.toFixed(2)}.`
  }

  return {
    total,
    byTier,
    averageMultiplier,
    dominantTier,
    summary,
  }
}

/**
 * Apply the stability multiplier to a confidence score.
 *
 * This is how stability modulates confidence in practice: a finding with
 * 0.82 confidence and "ephemeral" stability has an effective confidence of
 * 0.41 (0.82 × 0.5). The same finding with "entrenched" stability keeps
 * its full 0.82.
 *
 * This function does NOT change the stored confidence — it computes the
 * effective confidence that downstream consumers should use when weighing
 * the finding against alternatives. The stored confidence remains the AI's
 * original claim; the effective confidence is what the system actually
 * trusts.
 */
export function applyStabilityMultiplier(
  confidence: number,
  tier: StabilityTier,
): number {
  return confidence * STABILITY_MULTIPLIERS[tier]
}
