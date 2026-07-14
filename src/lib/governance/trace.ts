/**
 * Decision Traceability — the lifecycle of a single decision.
 *
 * A decision ID (DEC-XXXXX) is not just a row in the ledger. It is a thread
 * that runs through the entire system:
 *
 *   planner-invoked → tools-called → reasoning-produced →
 *   recommendation-made → human-decided → outcome-measured →
 *   chronicle-recorded → calibration-updated
 *
 * Each stage is recorded as a trace event. At any time, an operator can
 * open DEC-004182 and see the full life of that one decision: what the
 * planner was asked, which tools were called, what the reasoning was,
 * what was recommended, what the human did, what actually happened,
 * whether it was written to the chronicle, and whether calibration
 * absorbed the result.
 *
 * This is the audit trail. It exists so that the answer to "why did the
 * AI suggest X?" is never "I don't know" — it is "open DEC-004182 and
 * read the trace."
 *
 * See:
 *   - prisma/schema.prisma (DecisionTraceEvent model)
 *   - src/app/api/v1/decision-ledger/[id]/trace/route.ts (the API)
 *   - docs/EPISTEMOLOGICAL-INVARIANTS.md (Invariant 2 — Prediction-Reality Separation)
 */

/**
 * The lifecycle stages of a decision, in order.
 *
 * Not every decision will pass through every stage. A decision may be
 * abandoned after planning, or after the human declines. The trace
 * records what actually happened, not what should have happened.
 */
export type DecisionStage =
  | 'planner-invoked'        // the AI was asked a question that led to this decision
  | 'tools-called'           // one or more tools were invoked to gather evidence
  | 'reasoning-produced'     // the AI produced reasoning over the evidence
  | 'recommendation-made'    // the AI formulated a concrete recommendation
  | 'human-decided'          // the human approved, overrode, or was not consulted
  | 'outcome-measured'       // the actual outcome was measured and recorded
  | 'chronicle-recorded'     // an entry was written to the Station Chronicle
  | 'calibration-updated'    // the calibration engine absorbed this outcome
  | 'autonomy-reassessed'    // the autonomy score was recomputed
  | 'lesson-derived'         // the mechanical lesson was derived
  | 'quarantined'            // the finding was held aside (insufficient evidence)
  | 'promoted'               // the finding was promoted to a higher sourceType
  | 'deprecated'             // the finding was superseded (Invariant 3 — kept, not deleted)

/**
 * The source of a trace event — who or what produced it.
 * Used for provenance tracking, same as the ledger's source field.
 */
export type TraceSource = 'ai-core' | 'human' | 'pipeline' | 'governance'

/**
 * A single trace event, as stored in the DB.
 */
export interface TraceEvent {
  id: number
  decisionId: string
  stage: DecisionStage
  timestamp: string
  /** Stage-specific data, parsed from the JSON payload. */
  payload: TracePayload
  source: TraceSource
}

/**
 * The union of payload shapes across all stages.
 * Each stage has its own payload type — this keeps the trace
 * self-describing without needing a separate schema per stage.
 */
export type TracePayload =
  | PlannerInvokedPayload
  | ToolsCalledPayload
  | ReasoningProducedPayload
  | RecommendationMadePayload
  | HumanDecidedPayload
  | OutcomeMeasuredPayload
  | ChronicleRecordedPayload
  | CalibrationUpdatedPayload
  | AutonomyReassessedPayload
  | LessonDerivedPayload
  | QuarantinedPayload
  | PromotedPayload
  | DeprecatedPayload
  | GenericPayload

export interface PlannerInvokedPayload {
  question: string
  context: string
  intent?: string
}

export interface ToolsCalledPayload {
  tools: { name: string; success: boolean; durationMs?: number; summary?: string }[]
}

export interface ReasoningProducedPayload {
  reasoning: string
  evidenceCited: string[]
  confidenceFactors?: { factor: string; weight: number }[]
}

export interface RecommendationMadePayload {
  recommendation: string
  predictedAltDelta: number
  confidence: number
  alternativesConsidered?: string[]
}

export interface HumanDecidedPayload {
  decision: 'approved' | 'overridden' | 'not-consulted'
  rationale?: string
  rejectionReason?: string
  operatorId?: string
}

export interface OutcomeMeasuredPayload {
  actualAltDelta: number
  predictionError: number
  sampleSize?: number
  measuredAt: string
}

export interface ChronicleRecordedPayload {
  chronicleDate: string
  chronicleEntry: string
}

export interface CalibrationUpdatedPayload {
  bucketAffected: string
  oldSuccessRate?: number
  newSuccessRate?: number
  verdictChange?: string
}

export interface AutonomyReassessedPayload {
  oldLevel: number
  newLevel: number
  reason: string
}

export interface LessonDerivedPayload {
  lesson: string
  source: 'measured' | 'human-asserted'
}

export interface QuarantinedPayload {
  reason: string
  promotionRequires: string
}

export interface PromotedPayload {
  fromSourceType: string
  toSourceType: string
  evidence: string
}

export interface DeprecatedPayload {
  supersededBy: string
  reason: string
}

export interface GenericPayload {
  [key: string]: unknown
}

/**
 * The full lifecycle of a decision, reconstructed from its trace events.
 * This is what the /api/v1/decision-ledger/[id]/trace endpoint returns.
 */
export interface DecisionLifecycle {
  decisionId: string
  events: TraceEvent[]
  /** The stages that have occurred, in canonical order. */
  stagesCompleted: DecisionStage[]
  /** The stages that have NOT occurred, in canonical order. */
  stagesPending: DecisionStage[]
  /** Whether the decision has reached a terminal state. */
  isComplete: boolean
  /** Total duration from first event to last, in ms. Null if only one event. */
  totalDurationMs: number | null
  /** Human-readable summary of the lifecycle. */
  summary: string
}

/**
 * The canonical order of stages. A decision's lifecycle is considered
 * "complete" when it has passed through outcome-measured (and ideally
 * chronicle-recorded + calibration-updated).
 *
 * Not all stages are required for every decision. For example, a decision
 * that was overridden may not produce a chronicle-recorded event if the
 * override produced no measurable ALT change. The trace records what
 * happened, not what should have happened.
 */
export const STAGE_ORDER: DecisionStage[] = [
  'planner-invoked',
  'tools-called',
  'reasoning-produced',
  'recommendation-made',
  'human-decided',
  'outcome-measured',
  'lesson-derived',
  'chronicle-recorded',
  'calibration-updated',
  'autonomy-reassessed',
]

/**
 * The terminal stages — once any of these is reached, the lifecycle
 * may or may not continue, but the decision is considered "resolved"
 * for audit purposes.
 */
export const TERMINAL_STAGES: DecisionStage[] = [
  'chronicle-recorded',
  'quarantined',
  'deprecated',
]

/**
 * Reconstruct the lifecycle of a decision from its trace events.
 *
 * Pure function — takes events, returns a lifecycle. No I/O.
 * Used by the trace endpoint.
 */
export function reconstructLifecycle(
  decisionId: string,
  events: TraceEvent[],
): DecisionLifecycle {
  const sorted = [...events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  )

  const stagesCompleted = STAGE_ORDER.filter((stage) =>
    sorted.some((e) => e.stage === stage),
  )

  const allStagesSeen = new Set(sorted.map((e) => e.stage))
  const stagesPending = STAGE_ORDER.filter((stage) => !allStagesSeen.has(stage))

  const isComplete =
    sorted.some((e) => TERMINAL_STAGES.includes(e.stage)) ||
    (stagesCompleted.includes('outcome-measured') &&
      stagesCompleted.includes('calibration-updated'))

  const totalDurationMs =
    sorted.length >= 2
      ? Date.parse(sorted[sorted.length - 1].timestamp) -
        Date.parse(sorted[0].timestamp)
      : null

  let summary: string
  if (sorted.length === 0) {
    summary = `Decision ${decisionId} has no trace events. It may not exist, or tracing was not enabled when it was created.`
  } else {
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const stageList = stagesCompleted.join(' → ')
    summary = `Decision ${decisionId}: ${sorted.length} event(s) over ${
      totalDurationMs !== null ? `${Math.round(totalDurationMs / 1000)}s` : 'instant'
    }. Stages: ${stageList}. Last activity: ${last.stage} at ${last.timestamp}.`
    if (isComplete) {
      summary += ` Lifecycle complete.`
    } else {
      summary += ` Pending: ${stagesPending.join(', ')}.`
    }
  }

  return {
    decisionId,
    events: sorted,
    stagesCompleted,
    stagesPending,
    isComplete,
    totalDurationMs,
    summary,
  }
}

/**
 * Serialize a trace event for DB storage. The payload becomes a JSON string.
 */
export function serializeTraceEvent(args: {
  decisionId: string
  stage: DecisionStage
  payload: TracePayload
  source: TraceSource
}): { decisionId: string; stage: string; payload: string; source: string } {
  return {
    decisionId: args.decisionId,
    stage: args.stage,
    payload: JSON.stringify(args.payload),
    source: args.source,
  }
}

/**
 * Deserialize a trace event from DB storage. The JSON payload is parsed
 * back into the appropriate shape. Type narrowing is the caller's job —
 * the payload is returned as the generic union.
 */
export function deserializeTraceEvent(row: {
  id: number
  decisionId: string
  stage: string
  timestamp: Date | string
  payload: string
  source: string
}): TraceEvent {
  return {
    id: row.id,
    decisionId: row.decisionId,
    stage: row.stage as DecisionStage,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    payload: JSON.parse(row.payload) as TracePayload,
    source: row.source as TraceSource,
  }
}
