import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  reconstructLifecycle,
  deserializeTraceEvent,
  type DecisionStage,
  type TraceSource,
  type TracePayload,
} from '@/lib/governance/trace'

export const dynamic = 'force-dynamic'

/**
 * Decision Trace API — the full lifecycle of a single decision.
 *
 * GET /api/v1/decision-ledger/[id]/trace
 *   Returns every trace event for the decision, reconstructed into a
 *   lifecycle object with stages completed, stages pending, and a summary.
 *
 * POST /api/v1/decision-ledger/[id]/trace
 *   Records a new trace event for the decision. Used by AI Core, the
 *   pipeline, and the governance layer to append lifecycle events as
 *   they occur. The decision does not need to exist in the ledger yet —
 *   trace events may be recorded during planning, before the ledger
 *   entry is created.
 *
 * This is the audit trail. It exists so that "why did the AI suggest X?"
 * is never "I don't know" — it is "open DEC-004182 and read the trace."
 */

const VALID_STAGES: DecisionStage[] = [
  'planner-invoked',
  'tools-called',
  'reasoning-produced',
  'recommendation-made',
  'human-decided',
  'outcome-measured',
  'chronicle-recorded',
  'calibration-updated',
  'autonomy-reassessed',
  'lesson-derived',
  'quarantined',
  'promoted',
  'deprecated',
]

const VALID_SOURCES: TraceSource[] = ['ai-core', 'human', 'pipeline', 'governance']

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const rows = await db.decisionTraceEvent.findMany({
    where: { decisionId: id },
    orderBy: { timestamp: 'asc' },
  })

  const events = rows.map(deserializeTraceEvent)
  const lifecycle = reconstructLifecycle(id, events)

  // Also fetch the ledger entry if it exists, for context
  const ledgerEntry = await db.decisionLedgerEntry.findUnique({
    where: { id },
  }).catch(() => null)

  return NextResponse.json({
    _disclaimer:
      'Decision Trace. The full lifecycle of a single decision, reconstructed from trace events. ' +
      'Each stage (planner → tools → reasoning → recommendation → human → outcome → chronicle → calibration) ' +
      'is recorded as it occurs. This is the audit trail — see docs/EPISTEMOLOGICAL-INVARIANTS.md, Invariant 2.',

    decisionId: id,
    lifecycle,

    // The ledger entry, if it exists (null during planning, before the
    // formal decision is recorded)
    ledgerEntry: ledgerEntry
      ? {
          id: ledgerEntry.id,
          timestamp: ledgerEntry.timestamp instanceof Date ? ledgerEntry.timestamp.toISOString() : ledgerEntry.timestamp,
          context: ledgerEntry.context,
          aiRecommendation: ledgerEntry.aiRecommendation,
          aiConfidence: ledgerEntry.aiConfidence,
          aiPredictedAltDelta: ledgerEntry.aiPredictedAltDelta,
          humanDecision: ledgerEntry.humanDecision,
          actualAction: ledgerEntry.actualAction,
          actualAltDelta: ledgerEntry.actualAltDelta,
          predictionError: ledgerEntry.predictionError,
          sourceType: ledgerEntry.sourceType,
          lesson: ledgerEntry.lesson,
          decisionDomain: ledgerEntry.decisionDomain,
        }
      : null,

    // The canonical stage order, for reference
    stageOrder: STAGE_ORDER_WITH_DESCRIPTIONS,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: decisionId } = await params
  const body = await req.json().catch(() => null)

  if (!body || !body.stage || !body.source) {
    return NextResponse.json(
      { ok: false, error: 'Required fields: stage, source. Optional: payload.' },
      { status: 400 },
    )
  }

  if (!VALID_STAGES.includes(body.stage)) {
    return NextResponse.json(
      { ok: false, error: `stage must be one of: ${VALID_STAGES.join(', ')}` },
      { status: 400 },
    )
  }

  if (!VALID_SOURCES.includes(body.source)) {
    return NextResponse.json(
      { ok: false, error: `source must be one of: ${VALID_SOURCES.join(', ')}` },
      { status: 400 },
    )
  }

  const created = await db.decisionTraceEvent.create({
    data: {
      decisionId,
      stage: body.stage,
      payload: JSON.stringify(body.payload ?? {}),
      source: body.source,
    },
  })

  return NextResponse.json({
    ok: true,
    event: {
      id: created.id,
      decisionId: created.decisionId,
      stage: created.stage,
      timestamp: created.timestamp instanceof Date ? created.timestamp.toISOString() : created.timestamp,
      payload: body.payload ?? {},
      source: created.source,
    },
    message: `Trace event recorded for ${decisionId}: ${body.stage}. The decision's lifecycle is now auditable end-to-end.`,
  })
}

/**
 * Stage descriptions for the trace response. Helps operators understand
 * what each stage means without reading the docs.
 */
const STAGE_ORDER_WITH_DESCRIPTIONS: { stage: string; description: string }[] = [
  { stage: 'planner-invoked', description: 'The AI was asked a question that led to this decision.' },
  { stage: 'tools-called', description: 'One or more tools were invoked to gather evidence.' },
  { stage: 'reasoning-produced', description: 'The AI produced reasoning over the evidence.' },
  { stage: 'recommendation-made', description: 'The AI formulated a concrete recommendation with a prediction.' },
  { stage: 'human-decided', description: 'The human approved, overrode, or was not consulted.' },
  { stage: 'outcome-measured', description: 'The actual outcome was measured and recorded.' },
  { stage: 'lesson-derived', description: 'The mechanical lesson was derived from prediction vs outcome.' },
  { stage: 'chronicle-recorded', description: 'An entry was written to the Station Chronicle.' },
  { stage: 'calibration-updated', description: 'The calibration engine absorbed this outcome.' },
  { stage: 'autonomy-reassessed', description: 'The autonomy score was recomputed.' },
]
