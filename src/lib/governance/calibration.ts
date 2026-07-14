/**
 * Confidence Calibration — the answer to "when the AI says 0.70, is it really 70%?"
 *
 * This is the single most under-built capability in enterprise AI. Most systems
 * report confidence. Almost none verify it. A system whose confidence is
 * uncalibrated is dangerous: it cannot tell when it is wrong, which means it
 * cannot defer to a human at the right moment.
 *
 * Calibration works by bucketing past decisions by the AI's stated confidence
 * and comparing to the actual success rate in each bucket. A perfectly
 * calibrated AI has confidence == success rate in every bucket.
 *
 * Example (well-calibrated):
 *   AI confidence 0.9 → actual success 91%
 *   AI confidence 0.7 → actual success 68%
 *   AI confidence 0.5 → actual success 51%
 *
 * Example (overconfident — the typical failure mode):
 *   AI confidence 0.9 → actual success 62%
 *   AI confidence 0.7 → actual success 51%
 *   AI confidence 0.5 → actual success 38%
 *
 * The overconfident AI claims 0.9 when it is really 0.62. It will not defer
 * when it should. This is the failure mode this module exists to detect.
 *
 * See: docs/EPISTEMOLOGICAL-INVARIANTS.md — Invariant 5 (Honest Confidence)
 *
 * Discipline: with zero measured outcomes, calibration returns null for
 * every bucket. The dashboard must show "insufficient data" honestly.
 * No simulated calibration curves. Ever.
 */

import type { LedgerEntry } from './ledger'

/**
 * A single calibration bucket. confidenceBand is the range [lo, hi) the AI
 * claimed; n is the number of decisions in that band; successRate is the
 * fraction that produced a positive ALT delta (or met the predicted direction).
 */
export interface CalibrationBucket {
  /** Lower bound of the confidence band, inclusive. */
  lo: number
  /** Upper bound of the confidence band, exclusive (1.0 is inclusive). */
  hi: number
  /** Number of decisions in this band with a measured outcome. */
  n: number
  /** Fraction of decisions where actualAltDelta > 0. Null if n=0. */
  successRate: number | null
  /** Mean actualAltDelta in this band. Null if n=0. */
  meanActualDelta: number | null
  /** Mean AI predicted delta in this band. Null if n=0. */
  meanPredictedDelta: number | null
  /**
   * Calibration gap = successRate - midpoint(confidenceBand).
   * Positive = AI is UNDER-confident (better than it claims).
   * Negative = AI is OVER-confident (worse than it claims).
   * Null if n=0.
   */
  calibrationGap: number | null
}

/**
 * The default 10-bucket scheme: [0.0,0.1), [0.1,0.2), ..., [0.9,1.0].
 * Each bucket is 0.10 wide. 1.0 is included in the last bucket.
 */
export const DEFAULT_BUCKETS: Array<{ lo: number; hi: number }> = [
  { lo: 0.0, hi: 0.1 },
  { lo: 0.1, hi: 0.2 },
  { lo: 0.2, hi: 0.3 },
  { lo: 0.3, hi: 0.4 },
  { lo: 0.4, hi: 0.5 },
  { lo: 0.5, hi: 0.6 },
  { lo: 0.6, hi: 0.7 },
  { lo: 0.7, hi: 0.8 },
  { lo: 0.8, hi: 0.9 },
  { lo: 0.9, hi: 1.0 }, // inclusive of 1.0
]

/**
 * Compute calibration buckets from ledger entries.
 *
 * Only entries with a MEASURED outcome (actualAltDelta != null) are included.
 * "Success" is defined as actualAltDelta > 0 — the decision produced a
 * positive ALT delta, regardless of what the AI predicted. This is the
 * simplest definition; richer success criteria (e.g. "met or exceeded
 * prediction") can be added later.
 *
 * Returns the buckets plus an overall calibration summary.
 */
export function computeCalibration(
  entries: LedgerEntry[],
  buckets: Array<{ lo: number; hi: number }> = DEFAULT_BUCKETS,
): {
  buckets: CalibrationBucket[]
  totalMeasured: number
  /**
   * Mean absolute calibration gap across buckets with n >= minSampleSize.
   * Lower is better. 0.0 = perfectly calibrated.
   * Null if no buckets meet the minimum sample size.
   */
  meanAbsCalibrationGap: number | null
  /**
   * Overall bias: positive = under-confident, negative = over-confident.
   * Null if insufficient data.
   */
  overallBias: number | null
  /**
   * Honest verdict on the calibration. One of:
   *   - 'insufficient-data' — fewer than minSampleSize total measured
   *   - 'uncalibrated' — mean abs gap > 0.15
   *   'roughly-calibrated' — mean abs gap in [0.05, 0.15]
   *   'well-calibrated' — mean abs gap < 0.05
   */
  verdict: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated'
  /** Minimum sample size per bucket for it to count toward the summary. */
  minSampleSize: number
} {
  const minSampleSize = 30 // per bucket — statistical floor

  const measured = entries.filter(
    (e) => e.actualAltDelta != null && e.aiConfidence != null,
  )

  const computed: CalibrationBucket[] = buckets.map((b) => {
    const inBand = measured.filter(
      (e) =>
        e.aiConfidence >= b.lo &&
        (b.hi === 1.0 ? e.aiConfidence <= b.hi : e.aiConfidence < b.hi),
    )
    const n = inBand.length
    if (n === 0) {
      return {
        lo: b.lo,
        hi: b.hi,
        n: 0,
        successRate: null,
        meanActualDelta: null,
        meanPredictedDelta: null,
        calibrationGap: null,
      }
    }
    const successes = inBand.filter((e) => (e.actualAltDelta ?? 0) > 0).length
    const successRate = successes / n
    const meanActual = inBand.reduce((s, e) => s + (e.actualAltDelta ?? 0), 0) / n
    const meanPredicted = inBand.reduce((s, e) => s + e.aiPredictedAltDelta, 0) / n
    const midpoint = (b.lo + b.hi) / 2
    return {
      lo: b.lo,
      hi: b.hi,
      n,
      successRate,
      meanActualDelta: meanActual,
      meanPredictedDelta: meanPredicted,
      calibrationGap: successRate - midpoint,
    }
  })

  // Overall stats — only buckets with sufficient sample size
  const validBuckets = computed.filter((b) => b.n >= minSampleSize)
  const totalMeasured = measured.length

  let meanAbsCalibrationGap: number | null = null
  let overallBias: number | null = null
  let verdict: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated'

  if (validBuckets.length === 0) {
    verdict = 'insufficient-data'
  } else {
    const gaps = validBuckets.map((b) => b.calibrationGap!)
    const absGaps = gaps.map((g) => Math.abs(g))
    meanAbsCalibrationGap = absGaps.reduce((s, g) => s + g, 0) / absGaps.length
    overallBias = gaps.reduce((s, g) => s + g, 0) / gaps.length

    if (meanAbsCalibrationGap < 0.05) {
      verdict = 'well-calibrated'
    } else if (meanAbsCalibrationGap < 0.15) {
      verdict = 'roughly-calibrated'
    } else {
      verdict = 'uncalibrated'
    }
  }

  return {
    buckets: computed,
    totalMeasured,
    meanAbsCalibrationGap,
    overallBias,
    verdict,
    minSampleSize,
  }
}

/**
 * Render a calibration verdict as a human-readable explanation.
 * Used by the dashboard so the verdict is not just a label.
 */
export function explainCalibrationVerdict(
  verdict: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated',
  totalMeasured: number,
  minSampleSize: number,
): string {
  switch (verdict) {
    case 'insufficient-data':
      return `Insufficient data for calibration. ${totalMeasured} measured outcome(s); need at least ${minSampleSize} per confidence bucket. The system cannot yet say whether its confidence scores are honest. This is the correct state — calibration claims without data would be another form of legend.`
    case 'uncalibrated':
      return `AI confidence is uncalibrated. The gap between claimed confidence and actual success rate exceeds 15 percentage points on average. The AI does not know when it is wrong. Do not grant autonomy.`
    case 'roughly-calibrated':
      return `AI confidence is roughly calibrated (within 5–15 percentage points). Useful as a signal but not a guarantee. Humans should still double-check high-stakes decisions.`
    case 'well-calibrated':
      return `AI confidence is well-calibrated (within 5 percentage points on average). When the AI says 0.7, it is right about 70% of the time. This is the threshold at which autonomy becomes defensible.`
  }
}
