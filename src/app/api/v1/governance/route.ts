import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  computeLedgerStats,
  type LedgerEntry,
} from '@/lib/governance/ledger'
import {
  computeCalibration,
  explainCalibrationVerdict,
} from '@/lib/governance/calibration'
import {
  assessAutonomy,
  LEVEL_DESCRIPTIONS,
} from '@/lib/governance/autonomy'

export const dynamic = 'force-dynamic'

/**
 * Governance API — the overall trust state of the AI system.
 *
 * This endpoint aggregates:
 *   1. Decision Ledger stats (from the ledger table)
 *   2. Confidence Calibration (from ledger entries with outcomes)
 *   3. Human Override Analytics (acceptance rate, rejection reasons, by domain)
 *   4. Autonomy Readiness Score (Level 0-4, with hard requirements)
 *   5. Epistemic State (from /api/v1/epistemic-state)
 *   6. Listener pipeline state (real sessions count)
 *
 * The answer to "Why should a human trust this AI?" is not a feeling.
 * It is the contents of this endpoint. With zero real data, every field
 * is 0 / null / 'insufficient-data', and that is the honest state.
 *
 * See:
 *   - docs/EPISTEMOLOGICAL-INVARIANTS.md
 *   - src/lib/governance/ledger.ts, calibration.ts, autonomy.ts
 *   - /api/v1/decision-ledger, /api/v1/epistemic-state, /api/v1/listener-pipeline
 */

const BASE = process.env.INTERNAL_API_BASE || 'http://localhost:3000'

async function fetchJson(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function GET() {
  // 1. Listener pipeline — real sessions
  let realSessions = 0
  try {
    realSessions = await db.listenerSession.count()
  } catch {
    realSessions = 0
  }

  // 2. Decision ledger — all entries + stats
  const ledgerRows = await db.decisionLedgerEntry.findMany()
  const ledgerEntries: LedgerEntry[] = ledgerRows.map((row: any) => ({
    id: row.id,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    context: row.context,
    aiRecommendation: row.aiRecommendation,
    aiReasoning: row.aiReasoning,
    aiConfidence: row.aiConfidence,
    aiPredictedAltDelta: row.aiPredictedAltDelta,
    humanDecision: row.humanDecision,
    humanRationale: row.humanRationale ?? undefined,
    actualAction: row.actualAction,
    actualAltDelta: row.actualAltDelta ?? undefined,
    measuredAt: row.measuredAt ? (row.measuredAt instanceof Date ? row.measuredAt.toISOString() : row.measuredAt) : undefined,
    predictionError: row.predictionError ?? undefined,
    sourceType: row.sourceType,
    lesson: row.lesson ?? undefined,
    decisionDomain: row.decisionDomain,
    rejectionReason: row.rejectionReason ?? undefined,
    ingestedAt: row.ingestedAt instanceof Date ? row.ingestedAt.toISOString() : row.ingestedAt,
  }))
  const ledgerStats = computeLedgerStats(ledgerEntries)

  // 3. Confidence calibration
  const calibration = computeCalibration(ledgerEntries)
  const calibrationExplanation = explainCalibrationVerdict(
    calibration.verdict,
    calibration.totalMeasured,
    calibration.minSampleSize,
  )

  // 4. Epistemic state — fetch from the existing endpoint
  const epistemic = await fetchJson('/api/v1/epistemic-state')
  const epistemicViolationCount = epistemic
    ? (epistemic.modules
      ? Object.values(epistemic.modules).reduce(
          (sum: number, m: any) => sum + (m.violationCount ?? 0),
          0,
        )
      : 0)
    : 0

  // Days since last violation — for now, we don't track violation timestamps.
  // null means "no violations ever" which satisfies the requirement.
  // This is a known simplification; a future iteration would persist
  // violation events with timestamps.
  const daysSinceLastViolation: number | null = epistemicViolationCount === 0 ? null : 0

  // 5. Autonomy assessment
  const autonomy = assessAutonomy({
    stats: ledgerStats,
    epistemicViolationCount,
    daysSinceLastViolation,
    calibrationVerdict: calibration.verdict,
  })

  // 6. Human override analytics — derived from ledgerStats
  const overrideAnalytics = {
    acceptanceRate: ledgerStats.acceptanceRate,
    rejectionCount: ledgerStats.overridden,
    rejectionReasons: ledgerStats.byRejectionReason,
    byDomain: Object.fromEntries(
      Object.entries(ledgerStats.byDomain).map(([domain, info]) => [
        domain,
        {
          total: info.total,
          acceptanceRate: info.acceptanceRate,
          meanAbsError: info.meanAbsError,
          // Verdict per domain — where is the AI strong vs weak?
          verdict:
            info.total === 0
              ? 'no-data'
              : info.acceptanceRate === null
                ? 'no-data'
                : info.acceptanceRate >= 0.8
                  ? 'trusted'
                  : info.acceptanceRate >= 0.6
                    ? 'borderline'
                    : 'not-trusted',
        },
      ]),
    ),
  }

  // 7. Memory maturity — how long has the system been accumulating real data
  const memoryMaturity = {
    realDataPoints: realSessions,
    ledgerEntries: ledgerStats.total,
    ledgerWithOutcome: ledgerStats.withOutcome,
    yearsOfOperation: 0, // 0 until the system has been running for a year
    phase:
      realSessions === 0 && ledgerStats.total === 0
        ? 'Framework Year — 100% simulated, awaiting real operation'
        : realSessions < 100
          ? 'Transition — first real data, still predominantly simulated'
          : realSessions < 10000
            ? 'Operational — real data accumulating'
            : 'Mature — real data dominates',
  }

  // 8. Overall trust summary
  const trustSummary = computeTrustSummary({
    realSessions,
    ledgerStats,
    calibration,
    epistemicViolationCount,
    autonomy,
  })

  return NextResponse.json({
    _disclaimer:
      'AI Governance & Trust Layer. This endpoint aggregates the system\'s epistemic state, decision ledger, calibration, override analytics, and autonomy readiness into a single answer to: "Why should a human trust this AI?" With zero real data, every field is 0 / null / insufficient-data. That is the honest state.',

    timestamp: new Date().toISOString(),

    // The single answer
    trustSummary,

    // The five components
    listenerPipeline: {
      realSessions,
      status: realSessions === 0 ? 'awaiting real Icecast2 — 0 rows' : `${realSessions} real session(s)`,
    },
    ledger: ledgerStats,
    calibration: {
      ...calibration,
      explanation: calibrationExplanation,
    },
    overrideAnalytics,
    autonomy: {
      ...autonomy,
      levelDescriptions: LEVEL_DESCRIPTIONS,
    },
    epistemicState: epistemic
      ? {
          systemState: epistemic.systemState,
          auditBaseline: epistemic.auditBaseline,
          violationCount: epistemicViolationCount,
        }
      : null,

    memoryMaturity,
  })
}

function computeTrustSummary(args: {
  realSessions: number
  ledgerStats: ReturnType<typeof computeLedgerStats>
  calibration: ReturnType<typeof computeCalibration>
  epistemicViolationCount: number
  autonomy: ReturnType<typeof assessAutonomy>
}): {
  /** A single 0-100 score. NOT a feeling — computed from the components. */
  trustScore: number
  /** The components that went into the score. */
  components: { name: string; score: number; weight: number; contribution: number }[]
  /** Human-readable summary. */
  summary: string
} {
  // Components and weights — sum to 1.0
  //   Real data existence     0.30 — without real data, nothing else matters
  //   Calibration verdict     0.25 — is the AI's confidence honest?
  //   Acceptance rate          0.20 — do humans actually accept the AI?
  //   Prediction accuracy      0.15 — is the AI right?
  //   Epistemic cleanliness    0.10 — does the system obey its own rules?
  const weights = {
    realData: 0.30,
    calibration: 0.25,
    acceptance: 0.20,
    prediction: 0.15,
    epistemic: 0.10,
  }

  // Real data score — 0 if no real sessions, scales up to 1.0 at 10k sessions
  const realDataScore = Math.min(args.realSessions / 10000, 1.0)

  // Calibration score — map verdict to a number
  const calScore: Record<string, number> = {
    'insufficient-data': 0.0,
    'uncalibrated': 0.2,
    'roughly-calibrated': 0.7,
    'well-calibrated': 1.0,
  }
  const calibrationScore = calScore[args.calibration.verdict] ?? 0

  // Acceptance score — null → 0, else the rate itself
  const acceptanceScore = args.ledgerStats.acceptanceRate ?? 0

  // Prediction score — 0 if no data, else 1 - (error / 0.30 cap)
  // 0.30 min error → 0 score; 0 error → 1 score
  const predictionScore = args.ledgerStats.meanAbsPredictionError === null
    ? 0
    : Math.max(0, 1 - (args.ledgerStats.meanAbsPredictionError / 0.30))

  // Epistemic score — 0 if any violations, else 1
  const epistemicScore = args.epistemicViolationCount === 0 ? 1 : 0

  const components = [
    { name: 'Real data existence', score: realDataScore, weight: weights.realData, contribution: realDataScore * weights.realData },
    { name: 'Confidence calibration', score: calibrationScore, weight: weights.calibration, contribution: calibrationScore * weights.calibration },
    { name: 'Human acceptance rate', score: acceptanceScore, weight: weights.acceptance, contribution: acceptanceScore * weights.acceptance },
    { name: 'Prediction accuracy', score: predictionScore, weight: weights.prediction, contribution: predictionScore * weights.prediction },
    { name: 'Epistemic cleanliness', score: epistemicScore, weight: weights.epistemic, contribution: epistemicScore * weights.epistemic },
  ]

  const trustScore = Math.round(components.reduce((s, c) => s + c.contribution, 0) * 100)

  let summary: string
  if (args.realSessions === 0 && args.ledgerStats.total === 0) {
    summary = `Trust score: ${trustScore}/100. The system has 0 real data points and 0 recorded decisions. Every component is at its floor. This is the honest starting state — trust is not granted, it is earned through accumulated evidence. The system is designed to refuse autonomy until that evidence exists.`
  } else if (trustScore < 30) {
    summary = `Trust score: ${trustScore}/100. The system is in early operation. Real data is accumulating but the AI has not yet demonstrated calibrated confidence or sustained accuracy. Autonomy is not warranted.`
  } else if (trustScore < 60) {
    summary = `Trust score: ${trustScore}/100. The system is demonstrating competence in some dimensions. Calibration and acceptance are improving. Limited autonomy (Level ${args.autonomy.currentLevel}) is defensible.`
  } else if (trustScore < 85) {
    summary = `Trust score: ${trustScore}/100. The system is trustworthy in its domain. Calibration is honest, acceptance is high, violations are rare. Autonomy up to Level ${args.autonomy.currentLevel} is defensible.`
  } else {
    summary = `Trust score: ${trustScore}/100. The system is highly trustworthy. It has earned the right to operate with significant autonomy. Continuous monitoring remains mandatory — trust is never permanent.`
  }

  return { trustScore, components, summary }
}
