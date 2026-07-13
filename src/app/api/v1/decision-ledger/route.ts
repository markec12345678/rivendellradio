import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  formatLedgerId,
  deriveLedgerLesson,
  computeLedgerStats,
  type LedgerEntry,
  type HumanDecision,
  type DecisionDomain,
  type RejectionReason,
} from '@/lib/governance/ledger'

export const dynamic = 'force-dynamic'

/**
 * Decision Ledger API — the persistent record of AI-influenced decisions.
 *
 * GET  — list entries + compute aggregate stats
 * POST — record a new decision (AI proposal + human decision)
 * PATCH — record the measured outcome for an existing entry; the lesson
 *         is DERIVED mechanically, never AI-authored
 *
 * DISCIPLINE:
 *   This endpoint persists only what it receives. It NEVER generates demo
 *   entries. The first POST that succeeds is the first real AI-influenced
 *   decision at a real station. Until then, GET returns total: 0 and that
 *   is the honest state.
 *
 *   The lesson field is NEVER set by the client. It is derived by
 *   deriveLedgerLesson() from the predicted delta, the measured delta,
 *   and the human decision. This is Invariant 7 (Legend Prevention)
 *   applied to the ledger.
 */

const VALID_HUMAN_DECISIONS: HumanDecision[] = ['approved', 'overridden', 'not-consulted']
const VALID_DOMAINS: DecisionDomain[] = ['music', 'voice-link', 'ad-strategy', 'schedule', 'format']
const VALID_REJECTION_REASONS: RejectionReason[] = ['timing', 'brand', 'local-knowledge', 'risk', 'other']

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const domain = url.searchParams.get('domain') as DecisionDomain | null

  const where = domain ? { decisionDomain: domain } : {}
  const rows = await db.decisionLedgerEntry.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
  })

  const allRows = await db.decisionLedgerEntry.findMany()
  const entries: LedgerEntry[] = allRows.map(rowToEntry)
  const stats = computeLedgerStats(entries)

  return NextResponse.json({
    _disclaimer:
      'Decision Ledger. Persists AI-influenced decisions end-to-end: AI proposal (predicted), human decision (human-asserted), measured outcome (measured). The lesson is derived mechanically — never AI-authored. See docs/EPISTEMOLOGICAL-INVARIANTS.md, Invariant 7.',

    entries: rows.map(rowToEntry),
    stats,

    // The shape of what we accept — for client implementers
    recordContract: {
      endpoint: 'POST /api/v1/decision-ledger',
      requiredFields: ['timestamp', 'context', 'aiRecommendation', 'aiReasoning', 'aiConfidence', 'aiPredictedAltDelta', 'humanDecision', 'actualAction', 'decisionDomain'],
      optionalFields: ['humanRationale', 'rejectionReason'],
      humanDecisionValues: VALID_HUMAN_DECISIONS,
      decisionDomainValues: VALID_DOMAINS,
      rejectionReasonValues: VALID_REJECTION_REASONS,
      note: 'The lesson field is NEVER set by the client. It is derived by the server when the outcome is recorded via PATCH.',
    },

    outcomeContract: {
      endpoint: 'PATCH /api/v1/decision-ledger',
      requiredFields: ['id', 'actualAltDelta'],
      note: 'PATCH computes predictionError and derives the lesson mechanically. The client cannot set the lesson.',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  const required = ['timestamp', 'context', 'aiRecommendation', 'aiReasoning', 'aiConfidence', 'aiPredictedAltDelta', 'humanDecision', 'actualAction', 'decisionDomain']
  for (const f of required) {
    if (body[f] === undefined || body[f] === null) {
      return NextResponse.json({ ok: false, error: `Missing required field: ${f}` }, { status: 400 })
    }
  }

  // Validate enums
  if (!VALID_HUMAN_DECISIONS.includes(body.humanDecision)) {
    return NextResponse.json({
      ok: false,
      error: `humanDecision must be one of: ${VALID_HUMAN_DECISIONS.join(', ')}`,
    }, { status: 400 })
  }
  if (!VALID_DOMAINS.includes(body.decisionDomain)) {
    return NextResponse.json({
      ok: false,
      error: `decisionDomain must be one of: ${VALID_DOMAINS.join(', ')}`,
    }, { status: 400 })
  }
  if (body.rejectionReason && !VALID_REJECTION_REASONS.includes(body.rejectionReason)) {
    return NextResponse.json({
      ok: false,
      error: `rejectionReason must be one of: ${VALID_REJECTION_REASONS.join(', ')}`,
    }, { status: 400 })
  }

  // Confidence invariant check — Invariant 5
  if (typeof body.aiConfidence !== 'number' || body.aiConfidence < 0 || body.aiConfidence > 1) {
    return NextResponse.json({
      ok: false,
      error: 'aiConfidence must be a number in [0, 1]. Invariant 5 (Honest Confidence).',
    }, { status: 400 })
  }

  // Generate the next ID
  const count = await db.decisionLedgerEntry.count()
  const id = formatLedgerId(count + 1)

  // If the human decision is "overridden", rejectionReason is recommended
  // but not required (the human may not have categorized it).
  // If "approved" or "not-consulted", rejectionReason must be null.
  let rejectionReason: string | null = body.rejectionReason ?? null
  if (body.humanDecision !== 'overridden') {
    rejectionReason = null
  }

  const created = await db.decisionLedgerEntry.create({
    data: {
      id,
      timestamp: new Date(body.timestamp),
      context: body.context,
      aiRecommendation: body.aiRecommendation,
      aiReasoning: body.aiReasoning,
      aiConfidence: body.aiConfidence,
      aiPredictedAltDelta: body.aiPredictedAltDelta,
      humanDecision: body.humanDecision,
      humanRationale: body.humanRationale ?? null,
      actualAction: body.actualAction,
      actualAltDelta: null, // measured later via PATCH
      measuredAt: null,
      predictionError: null,
      sourceType: 'simulated', // promoted to 'observed' when outcome is measured
      lesson: null, // derived when outcome is recorded
      decisionDomain: body.decisionDomain,
      rejectionReason,
    },
  })

  return NextResponse.json({
    ok: true,
    entry: rowToEntry(created),
    message: `Decision ${id} recorded. Outcome is pending — PATCH /api/v1/decision-ledger with { id, actualAltDelta } when the session data comes in. The lesson will be derived mechanically at that time.`,
  })
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || !body.id || body.actualAltDelta === undefined) {
    return NextResponse.json({
      ok: false,
      error: 'PATCH requires { id, actualAltDelta }. The lesson is derived by the server, never by the client.',
    }, { status: 400 })
  }

  const existing = await db.decisionLedgerEntry.findUnique({ where: { id: body.id } })
  if (!existing) {
    return NextResponse.json({ ok: false, error: `Entry ${body.id} not found` }, { status: 404 })
  }

  if (existing.actualAltDelta !== null) {
    return NextResponse.json({
      ok: false,
      error: `Entry ${body.id} already has a measured outcome (${existing.actualAltDelta} min). Outcomes are immutable once recorded — see Invariant 3 (Failure Preservation).`,
    }, { status: 409 })
  }

  const actualAltDelta = body.actualAltDelta
  const predictionError = actualAltDelta - existing.aiPredictedAltDelta

  // DERIVE the lesson — never accept it from the client
  const { lesson } = deriveLedgerLesson({
    humanDecision: existing.humanDecision as HumanDecision,
    aiPredictedAltDelta: existing.aiPredictedAltDelta,
    actualAltDelta,
    humanRationale: existing.humanRationale ?? undefined,
    rejectionReason: (existing.rejectionReason as RejectionReason) ?? undefined,
  })

  const updated = await db.decisionLedgerEntry.update({
    where: { id: body.id },
    data: {
      actualAltDelta,
      measuredAt: new Date(),
      predictionError,
      sourceType: 'observed', // promoted: simulated → observed
      lesson,
    },
  })

  return NextResponse.json({
    ok: true,
    entry: rowToEntry(updated),
    derivedLesson: lesson,
    lessonSource: 'human-asserted' as const,
    message: `Outcome recorded for ${body.id}. predictionError=${predictionError.toFixed(2)} min. Lesson derived mechanically — never AI-authored (Invariant 7). sourceType promoted: simulated → observed.`,
  })
}

// ---------------------------------------------------------------------------
// Mapper — DB row → LedgerEntry
// ---------------------------------------------------------------------------
function rowToEntry(row: any): LedgerEntry {
  return {
    id: row.id,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
    context: row.context,
    aiRecommendation: row.aiRecommendation,
    aiReasoning: row.aiReasoning,
    aiConfidence: row.aiConfidence,
    aiPredictedAltDelta: row.aiPredictedAltDelta,
    humanDecision: row.humanDecision as HumanDecision,
    humanRationale: row.humanRationale ?? undefined,
    actualAction: row.actualAction,
    actualAltDelta: row.actualAltDelta ?? undefined,
    measuredAt: row.measuredAt ? (row.measuredAt instanceof Date ? row.measuredAt.toISOString() : row.measuredAt) : undefined,
    predictionError: row.predictionError ?? undefined,
    sourceType: row.sourceType as LedgerEntry['sourceType'],
    lesson: row.lesson ?? undefined,
    decisionDomain: row.decisionDomain as DecisionDomain,
    rejectionReason: (row.rejectionReason as RejectionReason) ?? undefined,
    ingestedAt: row.ingestedAt instanceof Date ? row.ingestedAt.toISOString() : row.ingestedAt,
  }
}
