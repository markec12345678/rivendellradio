/**
 * Decision Ledger — the persistent record of AI-influenced decisions.
 *
 * The ledger answers three questions, end-to-end, per decision:
 *   1. What did the AI propose? (source: 'predicted' — never promoted to fact)
 *   2. What did the human do? (source: 'human-asserted')
 *   3. What actually happened? (source: 'measured')
 *
 * The lesson is DERIVED mechanically from the signed difference between
 * prediction and outcome. It is NEVER written in the AI's voice. This is
 * Invariant 7 (Legend Prevention) applied to the ledger.
 *
 * See:
 *   - docs/EPISTEMOLOGICAL-INVARIANTS.md (the 7 invariants)
 *   - prisma/schema.prisma (DecisionLedgerEntry model)
 *   - src/app/api/v1/decision-ledger/route.ts (the API)
 *
 * Discipline: this module defines the SHAPE and the DERIVED logic.
 * It contains zero demo entries. The first real entry will be the first
 * real AI-influenced decision at a real station.
 */

/**
 * The three roles a party can play in a ledger entry.
 * Used for provenance tracking — every field on a ledger entry is
 * attributable to one of these three sources.
 */
export type LedgerSource = 'predicted' | 'human-asserted' | 'measured'

/**
 * What the human did with the AI's recommendation.
 * - approved: human accepted the AI's recommendation as-is
 * - overridden: human chose differently and recorded why
 * - not-consulted: human made the decision without asking the AI
 *
 * "not-consulted" is a valid and important state — it tracks the gap
 * between what the AI would have suggested and what actually happened,
 * even when the AI was not in the loop.
 */
export type HumanDecision = 'approved' | 'overridden' | 'not-consulted'

/**
 * Why the human overrode the AI. Closed set for clean analytics.
 * - timing: AI's suggestion was right in spirit, wrong in timing
 * - brand: AI's suggestion conflicted with station identity
 * - local-knowledge: AI lacked context about local events/audience
 * - risk: AI's suggestion was too risky for the slot
 * - other: free-text rationale attached, not categorizable
 */
export type RejectionReason =
  | 'timing'
  | 'brand'
  | 'local-knowledge'
  | 'risk'
  | 'other'

/**
 * The domain of the decision. Used for "where is the AI strong vs weak" analytics.
 * - music: track selection, rotation, ordering
 * - voice-link: AI DJ script content, timing, placement
 * - ad-strategy: ad break length, placement, frequency
 * - schedule: daypart structure, show boundaries
 * - format: format-level changes (new segments, dropped segments)
 */
export type DecisionDomain =
  | 'music'
  | 'voice-link'
  | 'ad-strategy'
  | 'schedule'
  | 'format'

/**
 * The epistemic source type, mirroring src/lib/ai-core/invariants.ts.
 * A ledger entry starts as 'simulated' (no outcome yet) and is promoted
 * to 'observed' when the actual outcome is measured. It may be promoted
 * further to 'experiment' or 'validated' through the existing mechanisms.
 */
export type LedgerSourceType =
  | 'simulated'
  | 'observed'
  | 'experiment'
  | 'validated'

/**
 * A ledger entry, as it appears in the DB. All fields are required except
 * those that are filled in later (outcome, lesson) or are optional by nature
 * (human rationale, rejection reason).
 */
export interface LedgerEntry {
  id: string // DEC-00001 format
  timestamp: string // ISO
  context: string // morning-drive, afternoon, etc.

  // AI proposal — source: 'predicted'
  aiRecommendation: string
  aiReasoning: string
  aiConfidence: number // 0-1
  aiPredictedAltDelta: number // min

  // Human decision — source: 'human-asserted'
  humanDecision: HumanDecision
  humanRationale?: string
  actualAction: string

  // Outcome — source: 'measured'. Null until measured.
  actualAltDelta?: number // min
  measuredAt?: string

  // Derived
  predictionError?: number // actual - predicted (signed)
  sourceType: LedgerSourceType
  lesson?: string

  // Categorization
  decisionDomain: DecisionDomain
  rejectionReason?: RejectionReason

  ingestedAt: string
}

/**
 * Generate the next DEC-XXXXX ID. Reads the current highest ID from the
 * DB and increments. The format is human-readable on purpose — this is
 * a ledger, not a UUID. Operators will reference "DEC-00047" in conversation.
 */
export function formatLedgerId(sequenceNumber: number): string {
  return `DEC-${String(sequenceNumber).padStart(5, '0')}`
}

/**
 * Derive the lesson from a completed ledger entry.
 *
 * This function is the operational form of Invariant 7 (Legend Prevention)
 * applied to the ledger. It accepts ONLY:
 *   - the AI's predicted ALT delta
 *   - the actual measured ALT delta
 *   - the human's decision (approved/overridden/not-consulted)
 *   - an optional human rationale
 *
 * It does NOT accept an AI-authored lesson string. The lesson is constructed
 * mechanically from the inputs. The AI may propose, the human may decide,
 * the system measures, the lesson is derived — never narrated.
 *
 * The lesson's source is:
 *   - 'measured' for the numeric outcome
 *   - 'human-asserted' for the rationale if one was provided
 *   - NEVER 'predicted'
 */
export function deriveLedgerLesson(args: {
  humanDecision: HumanDecision
  aiPredictedAltDelta: number
  actualAltDelta: number
  humanRationale?: string
  rejectionReason?: RejectionReason
}): { lesson: string; source: LedgerSource } {
  const { humanDecision, aiPredictedAltDelta, actualAltDelta } = args
  const signedDiff = actualAltDelta - aiPredictedAltDelta
  const sign = signedDiff >= 0 ? '+' : ''

  // Mechanical, measured core — always present
  const measured = `Measured ALT delta ${actualAltDelta.toFixed(2)} min vs AI prediction ${aiPredictedAltDelta.toFixed(2)} min (signed difference ${sign}${signedDiff.toFixed(2)}).`

  // Human-decision context — human-asserted
  let context: string
  switch (humanDecision) {
    case 'approved':
      context = `Human approved AI recommendation. `
      break
    case 'overridden':
      context = `Human overrode AI recommendation. `
      if (args.rejectionReason) {
        context += `Rejection category: ${args.rejectionReason}. `
      }
      break
    case 'not-consulted':
      context = `AI was not consulted; outcome recorded for calibration. `
      break
  }

  // Optional human rationale — human-asserted, quoted verbatim
  const rationale = args.humanRationale
    ? `Operator rationale: "${args.humanRationale}" `
    : ''

  // Verdict — derived, never narrated
  let verdict: string
  if (humanDecision === 'approved') {
    if (signedDiff >= 0) {
      verdict = `AI prediction was conservative (actual ≥ predicted).`
    } else {
      verdict = `AI prediction was optimistic (actual < predicted by ${Math.abs(signedDiff).toFixed(2)} min).`
    }
  } else if (humanDecision === 'overridden') {
    if (signedDiff >= 0) {
      verdict = `Human decision outperformed AI prediction by ${signedDiff.toFixed(2)} min.`
    } else {
      verdict = `Human decision underperformed AI prediction by ${Math.abs(signedDiff).toFixed(2)} min; override may not have been beneficial on this metric.`
    }
  } else {
    verdict = `No AI counterfactual to compare; baseline recorded.`
  }

  const lesson = `${context}${rationale}${measured} ${verdict}`
  return { lesson, source: 'human-asserted' }
}

/**
 * Compute the prediction error for a ledger entry.
 * Returns null if the outcome has not been measured yet.
 *
 * The error is SIGNED — direction matters. Positive means the AI
 * underestimated; negative means it overestimated. The system must
 * never absolute-value this field, because the bias direction is
 * itself a learning signal.
 */
export function computePredictionError(entry: LedgerEntry): number | null {
  if (entry.actualAltDelta === undefined || entry.actualAltDelta === null) {
    return null
  }
  return entry.actualAltDelta - entry.aiPredictedAltDelta
}

/**
 * Aggregate stats over the ledger — used by the governance dashboard.
 *
 * All stats are computed from REAL ledger entries. If the ledger is empty,
 * every field is 0 / null. The dashboard must show this honestly.
 */
export interface LedgerStats {
  total: number
  withOutcome: number // entries where actualAltDelta is filled in
  approved: number
  overridden: number
  notConsulted: number

  // Acceptance rate — the % of AI-consulted decisions that were approved
  // (excludes not-consulted). Null if no AI-consulted decisions exist.
  acceptanceRate: number | null

  // Mean absolute prediction error — how far off the AI was, on average.
  // Null if no outcomes measured.
  meanAbsPredictionError: number | null

  // Signed mean prediction error — positive = AI underestimates,
  // negative = AI overestimates. The BIAS direction.
  meanSignedPredictionError: number | null

  // Breakdown by domain — for "where is the AI strong vs weak"
  byDomain: Record<DecisionDomain, {
    total: number
    acceptanceRate: number | null
    meanAbsError: number | null
  }>

  // Breakdown by rejection reason — for "why do humans reject the AI"
  byRejectionReason: Partial<Record<RejectionReason, number>>

  // Source-type distribution
  bySourceType: Record<LedgerSourceType, number>
}

/**
 * Compute aggregate stats from a list of ledger entries.
 * Pure function — no I/O. Used by the governance endpoint.
 */
export function computeLedgerStats(entries: LedgerEntry[]): LedgerStats {
  const total = entries.length
  if (total === 0) {
    return {
      total: 0,
      withOutcome: 0,
      approved: 0,
      overridden: 0,
      notConsulted: 0,
      acceptanceRate: null,
      meanAbsPredictionError: null,
      meanSignedPredictionError: null,
      byDomain: {
        music: { total: 0, acceptanceRate: null, meanAbsError: null },
        'voice-link': { total: 0, acceptanceRate: null, meanAbsError: null },
        'ad-strategy': { total: 0, acceptanceRate: null, meanAbsError: null },
        schedule: { total: 0, acceptanceRate: null, meanAbsError: null },
        format: { total: 0, acceptanceRate: null, meanAbsError: null },
      },
      byRejectionReason: {},
      bySourceType: {
        simulated: 0,
        observed: 0,
        experiment: 0,
        validated: 0,
      },
    }
  }

  const withOutcome = entries.filter((e) => e.actualAltDelta != null)
  const approved = entries.filter((e) => e.humanDecision === 'approved').length
  const overridden = entries.filter((e) => e.humanDecision === 'overridden').length
  const notConsulted = entries.filter((e) => e.humanDecision === 'not-consulted').length

  // Acceptance rate excludes "not-consulted" — those aren't AI decisions
  const aiConsulted = approved + overridden
  const acceptanceRate = aiConsulted > 0 ? approved / aiConsulted : null

  // Prediction errors (only for entries with measured outcomes)
  const errors = entries
    .filter((e) => e.actualAltDelta != null)
    .map((e) => (e.actualAltDelta! - e.aiPredictedAltDelta))
  const meanAbs =
    errors.length > 0
      ? errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length
      : null
  const meanSigned =
    errors.length > 0 ? errors.reduce((s, e) => s + e, 0) / errors.length : null

  // By domain
  const domains: DecisionDomain[] = ['music', 'voice-link', 'ad-strategy', 'schedule', 'format']
  const byDomain = {} as LedgerStats['byDomain']
  for (const d of domains) {
    const domainEntries = entries.filter((e) => e.decisionDomain === d)
    const domainApproved = domainEntries.filter((e) => e.humanDecision === 'approved').length
    const domainOverridden = domainEntries.filter((e) => e.humanDecision === 'overridden').length
    const domainConsulted = domainApproved + domainOverridden
    const domainErrors = domainEntries
      .filter((e) => e.actualAltDelta != null)
      .map((e) => Math.abs(e.actualAltDelta! - e.aiPredictedAltDelta))
    byDomain[d] = {
      total: domainEntries.length,
      acceptanceRate: domainConsulted > 0 ? domainApproved / domainConsulted : null,
      meanAbsError: domainErrors.length > 0
        ? domainErrors.reduce((s, e) => s + e, 0) / domainErrors.length
        : null,
    }
  }

  // By rejection reason
  const byRejectionReason: Partial<Record<RejectionReason, number>> = {}
  for (const e of entries) {
    if (e.rejectionReason) {
      byRejectionReason[e.rejectionReason] = (byRejectionReason[e.rejectionReason] ?? 0) + 1
    }
  }

  // By source type
  const bySourceType: Record<LedgerSourceType, number> = {
    simulated: 0,
    observed: 0,
    experiment: 0,
    validated: 0,
  }
  for (const e of entries) {
    bySourceType[e.sourceType]++
  }

  return {
    total,
    withOutcome: withOutcome.length,
    approved,
    overridden,
    notConsulted,
    acceptanceRate,
    meanAbsPredictionError: meanAbs,
    meanSignedPredictionError: meanSigned,
    byDomain,
    byRejectionReason,
    bySourceType,
  }
}
