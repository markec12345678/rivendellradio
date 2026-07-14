/**
 * Autonomy Readiness Score — the gate that decides what the AI is allowed to do.
 *
 * This is the operational form of the question: "How much should we trust this AI?"
 * The answer is not a feeling. It is a level, with hard requirements, computed
 * from real evidence in the Decision Ledger.
 *
 * The five levels:
 *
 *   Level 0 — Observe only
 *     The AI watches, records predictions, and learns. It cannot suggest.
 *     This is the default. The system starts here.
 *
 *   Level 1 — Suggest
 *     The AI may propose actions to operators. Operators decide.
 *     Requirement: 50+ observed decisions in the ledger.
 *
 *   Level 2 — Human approval
 *     The AI may execute, but every action requires explicit human approval.
 *     Requirement: 500+ observed decisions, prediction error <15%,
 *     human acceptance >70%, no epistemic violations.
 *
 *   Level 3 — Automatic overnight
 *     The AI may run autonomously during low-risk windows (overnight).
 *     Requirement: 1000+ observed decisions, prediction error <10%,
 *     human acceptance >80%, no violations for 90 days.
 *
 *   Level 4 — Full autonomous programming
 *     The AI may run autonomously at all times, with human oversight.
 *     Requirement: 5000+ observed decisions, prediction error <7%,
 *     human acceptance >85%, no violations for 180 days.
 *
 * Promotions are NEVER automatic. Each promotion is a human decision,
 * recorded in the ledger, with the evidence that justified it.
 * Demotions ARE automatic — a violation or a calibration collapse drops
 * the level immediately, by design.
 *
 * See: docs/EPISTEMOLOGICAL-INVARIANTS.md — Invariant 5 (Honest Confidence)
 *
 * Discipline: with zero observed decisions, the level is 0. Always.
 * The system has not earned the right to suggest, let alone act.
 */

import type { LedgerStats } from './ledger'

/**
 * The five autonomy levels. Each level permits a strictly larger set of
 * AI actions than the one before. The level is a floor, not a ceiling —
 * an operator may always restrict the AI below its earned level.
 */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4

/**
 * The requirements for each level. A level is "earned" when ALL its
 * requirements are met. Requirements are cumulative — Level 2 requires
 * everything Level 1 requires, plus its own.
 */
export interface LevelRequirements {
  level: AutonomyLevel
  /** Minimum number of observed decisions in the ledger. */
  minObservedDecisions: number
  /** Maximum mean absolute prediction error (min ALT). */
  maxPredictionError: number
  /** Minimum human acceptance rate (excludes not-consulted). */
  minAcceptanceRate: number
  /** Maximum number of active epistemic violations. */
  maxEpistemicViolations: number
  /** Minimum days since last epistemic violation (0 for low levels). */
  minDaysSinceViolation: number
  /** Minimum calibration verdict. */
  minCalibration: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated'
}

/**
 * The full requirement table. This is the constitution of autonomy.
 * Changing these numbers is a governance decision, not a code change.
 */
export const LEVEL_REQUIREMENTS: LevelRequirements[] = [
  {
    level: 0,
    minObservedDecisions: 0,
    maxPredictionError: Infinity,
    minAcceptanceRate: 0,
    maxEpistemicViolations: Infinity,
    minDaysSinceViolation: 0,
    minCalibration: 'insufficient-data',
  },
  {
    level: 1,
    minObservedDecisions: 50,
    maxPredictionError: Infinity,
    minAcceptanceRate: 0,
    maxEpistemicViolations: Infinity,
    minDaysSinceViolation: 0,
    minCalibration: 'insufficient-data',
  },
  {
    level: 2,
    minObservedDecisions: 500,
    maxPredictionError: 0.15,
    minAcceptanceRate: 0.70,
    maxEpistemicViolations: 0,
    minDaysSinceViolation: 30,
    minCalibration: 'roughly-calibrated',
  },
  {
    level: 3,
    minObservedDecisions: 1000,
    maxPredictionError: 0.10,
    minAcceptanceRate: 0.80,
    maxEpistemicViolations: 0,
    minDaysSinceViolation: 90,
    minCalibration: 'well-calibrated',
  },
  {
    level: 4,
    minObservedDecisions: 5000,
    maxPredictionError: 0.07,
    minAcceptanceRate: 0.85,
    maxEpistemicViolations: 0,
    minDaysSinceViolation: 180,
    minCalibration: 'well-calibrated',
  },
]

/**
 * A single requirement check, with the actual value and whether it passed.
 * Used by the dashboard to show EXACTLY which requirement is blocking
 * promotion to the next level.
 */
export interface RequirementCheck {
  name: string
  required: string
  actual: string
  passed: boolean
}

/**
 * The full autonomy assessment.
 */
export interface AutonomyAssessment {
  /** The highest level whose requirements are ALL met. */
  currentLevel: AutonomyLevel
  /** The next level the system is working toward. */
  nextLevel: AutonomyLevel | null
  /** Per-requirement checks for the next level. Empty if at Level 4. */
  nextLevelRequirements: RequirementCheck[]
  /** Whether the system is ready to be promoted (all next-level reqs met). */
  readyForPromotion: boolean
  /** The earned level may differ from the configured level. */
  earnedLevel: AutonomyLevel
  /**
   * The configured level — set by an operator. May be below the earned
   * level (operator is conservative) but never above it.
   */
  configuredLevel: AutonomyLevel
  /** Human-readable summary. */
  summary: string
  /** Per-level requirement checks, for the full ladder view. */
  ladder: Array<{
    level: AutonomyLevel
    earned: boolean
    requirements: RequirementCheck[]
  }>
}

/**
 * Compute the autonomy assessment from current evidence.
 *
 * @param stats — aggregate ledger stats
 * @param epistemicViolationCount — from /api/v1/epistemic-state
 * @param daysSinceLastViolation — null if no violations ever, else days
 * @param calibrationVerdict — from computeCalibration()
 * @param configuredLevel — what the operator has set (default 0)
 */
export function assessAutonomy(args: {
  stats: LedgerStats
  epistemicViolationCount: number
  daysSinceLastViolation: number | null
  calibrationVerdict: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated'
  configuredLevel?: AutonomyLevel
}): AutonomyAssessment {
  const observedDecisions = args.stats.withOutcome
  const meanError = args.stats.meanAbsPredictionError ?? Infinity
  const acceptanceRate = args.stats.acceptanceRate ?? 0
  const violations = args.epistemicViolationCount
  const daysSince = args.daysSinceLastViolation ?? Infinity

  // Calibration verdict rank — higher is better
  const calRank: Record<string, number> = {
    'insufficient-data': 0,
    'uncalibrated': 1,
    'roughly-calibrated': 2,
    'well-calibrated': 3,
  }

  // Find the highest level whose requirements are ALL met
  let earnedLevel: AutonomyLevel = 0
  for (const req of LEVEL_REQUIREMENTS) {
    const passes =
      observedDecisions >= req.minObservedDecisions &&
      meanError <= req.maxPredictionError &&
      acceptanceRate >= req.minAcceptanceRate &&
      violations <= req.maxEpistemicViolations &&
      daysSince >= req.minDaysSinceViolation &&
      calRank[args.calibrationVerdict] >= calRank[req.minCalibration]
    if (passes) {
      earnedLevel = req.level
    } else {
      break // levels are cumulative — stop at the first failure
    }
  }

  // The configured level may be below earned but never above
  const configured = args.configuredLevel ?? 0
  const currentLevel: AutonomyLevel = Math.min(configured, earnedLevel) as AutonomyLevel

  // Next level
  const nextLevel: AutonomyLevel | null = earnedLevel < 4 ? (earnedLevel + 1) as AutonomyLevel : null

  // Build requirement checks for the next level
  let nextLevelRequirements: RequirementCheck[] = []
  let readyForPromotion = false
  if (nextLevel !== null) {
    const req = LEVEL_REQUIREMENTS.find((r) => r.level === nextLevel)!
    nextLevelRequirements = [
      {
        name: 'Observed decisions',
        required: `≥ ${req.minObservedDecisions}`,
        actual: `${observedDecisions}`,
        passed: observedDecisions >= req.minObservedDecisions,
      },
      {
        name: 'Mean prediction error',
        required: `≤ ${req.maxPredictionError === Infinity ? '∞' : req.maxPredictionError.toFixed(2) + ' min'}`,
        actual: meanError === Infinity ? 'no data' : meanError.toFixed(2) + ' min',
        passed: meanError <= req.maxPredictionError,
      },
      {
        name: 'Human acceptance rate',
        required: `≥ ${(req.minAcceptanceRate * 100).toFixed(0)}%`,
        actual: args.stats.acceptanceRate === null ? 'no data' : (args.stats.acceptanceRate * 100).toFixed(1) + '%',
        passed: acceptanceRate >= req.minAcceptanceRate,
      },
      {
        name: 'Epistemic violations',
        required: `≤ ${req.maxEpistemicViolations}`,
        actual: `${violations}`,
        passed: violations <= req.maxEpistemicViolations,
      },
      {
        name: 'Days since last violation',
        required: `≥ ${req.minDaysSinceViolation}`,
        actual: daysSince === Infinity ? 'no violations ever' : `${daysSince} days`,
        passed: daysSince >= req.minDaysSinceViolation,
      },
      {
        name: 'Calibration',
        required: req.minCalibration,
        actual: args.calibrationVerdict,
        passed: calRank[args.calibrationVerdict] >= calRank[req.minCalibration],
      },
    ]
    readyForPromotion = nextLevelRequirements.every((r) => r.passed)
  }

  // Build the full ladder view
  const ladder = LEVEL_REQUIREMENTS.map((req) => {
    const checks: RequirementCheck[] = [
      {
        name: 'Observed decisions',
        required: `≥ ${req.minObservedDecisions}`,
        actual: `${observedDecisions}`,
        passed: observedDecisions >= req.minObservedDecisions,
      },
      {
        name: 'Mean prediction error',
        required: `≤ ${req.maxPredictionError === Infinity ? '∞' : req.maxPredictionError.toFixed(2) + ' min'}`,
        actual: meanError === Infinity ? 'no data' : meanError.toFixed(2) + ' min',
        passed: meanError <= req.maxPredictionError,
      },
      {
        name: 'Human acceptance rate',
        required: `≥ ${(req.minAcceptanceRate * 100).toFixed(0)}%`,
        actual: args.stats.acceptanceRate === null ? 'no data' : (args.stats.acceptanceRate * 100).toFixed(1) + '%',
        passed: acceptanceRate >= req.minAcceptanceRate,
      },
      {
        name: 'Epistemic violations',
        required: `≤ ${req.maxEpistemicViolations}`,
        actual: `${violations}`,
        passed: violations <= req.maxEpistemicViolations,
      },
      {
        name: 'Days since last violation',
        required: `≥ ${req.minDaysSinceViolation}`,
        actual: daysSince === Infinity ? 'no violations' : `${daysSince} days`,
        passed: daysSince >= req.minDaysSinceViolation,
      },
      {
        name: 'Calibration',
        required: req.minCalibration,
        actual: args.calibrationVerdict,
        passed: calRank[args.calibrationVerdict] >= calRank[req.minCalibration],
      },
    ]
    return {
      level: req.level,
      earned: checks.every((c) => c.passed),
      requirements: checks,
    }
  })

  // Human-readable summary
  let summary: string
  if (earnedLevel === 0 && observedDecisions === 0) {
    summary = `Level 0 — Observe only. The system has 0 observed decisions. It has not earned the right to suggest, let alone act. This is the correct state at the start. Autonomy is earned through accumulated evidence, not granted through optimism.`
  } else if (readyForPromotion) {
    summary = `Level ${currentLevel} — earned Level ${nextLevel}. All requirements for promotion are met. A human operator must approve the promotion; it is never automatic.`
  } else {
    const blocking = nextLevelRequirements.filter((r) => !r.passed).map((r) => r.name)
    summary = `Level ${currentLevel} — earned ${earnedLevel}. Not ready for Level ${nextLevel}. Blocking requirements: ${blocking.join(', ')}.`
  }

  return {
    currentLevel,
    nextLevel,
    nextLevelRequirements,
    readyForPromotion,
    earnedLevel,
    configuredLevel: configured,
    summary,
    ladder,
  }
}

/**
 * The label and description for each level. Used by the dashboard
 * to render the ladder without embedding strings in the UI component.
 */
export const LEVEL_DESCRIPTIONS: Record<AutonomyLevel, { label: string; description: string }> = {
  0: {
    label: 'Observe only',
    description: 'The AI watches, records predictions, and learns. It cannot suggest. This is the default.',
  },
  1: {
    label: 'Suggest',
    description: 'The AI may propose actions to operators. Operators decide. Requires 50+ observed decisions.',
  },
  2: {
    label: 'Human approval',
    description: 'The AI may execute, but every action requires explicit human approval. Requires 500+ decisions, <15% error, >70% acceptance.',
  },
  3: {
    label: 'Automatic overnight',
    description: 'The AI may run autonomously during low-risk overnight windows. Requires 1000+ decisions, <10% error, >80% acceptance, 90 violation-free days.',
  },
  4: {
    label: 'Full autonomous programming',
    description: 'The AI may run autonomously at all times, with human oversight. Requires 5000+ decisions, <7% error, >85% acceptance, 180 violation-free days.',
  },
}
