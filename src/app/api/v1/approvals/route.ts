import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Multi-Stage Approval Workflows — draft → submitted → in_review → approved → live.
 *
 * Shows go live without formal sign-off. This kanban-style workflow auto-routes
 * by genre/daypart to role-specific reviewers (PD for music, traffic for sponsor
 * carts, technical-engineer for EAS-bearing hours). Past-due review (>24h) fires
 * approval.overdue Event Bus event.
 *
 * GET  /api/v1/approvals         — kanban board + overdue + stats
 * POST /api/v1/approvals         — submit/approve/reject/withdraw
 */

interface ApprovalItem {
  id: string
  entityType: 'show' | 'log' | 'cart' | 'voice-track' | 'playlist'
  entityId: string
  entityName: string
  stage: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'live'
  submittedBy: string
  submittedAt: string
  // Routing
  reviewerRole: 'admin' | 'program-director' | 'technical-engineer' | 'traffic' | 'producer'
  assignedReviewer?: string
  // Decision
  decidedAt: string | null
  decidedBy: string | null
  decision: 'approved' | 'rejected' | 'changes-requested' | null
  comment: string | null
  // SLA
  dueAt: string
  isOverdue: boolean
  // Metadata
  genre?: string
  daypart?: string
  hasEasWindow?: boolean
  hasSponsorCarts?: boolean
}

const ITEMS: ApprovalItem[] = [
  { id: 'apv-001', entityType: 'show', entityId: 'show-003', entityName: 'Morning Show — July 12', stage: 'in_review', submittedBy: 'sara@rock887.fm', submittedAt: new Date(Date.now() - 7200000).toISOString(), reviewerRole: 'program-director', assignedReviewer: 'pd@rock887.fm', decidedAt: null, decidedBy: null, decision: null, comment: null, dueAt: new Date(Date.now() + 36000000).toISOString(), isOverdue: false, genre: 'rock', daypart: 'morning-drive', hasEasWindow: false, hasSponsorCarts: true },
  { id: 'apv-002', entityType: 'log', entityId: 'log-afternoon-drive', entityName: 'Afternoon Drive Log — July 11', stage: 'submitted', submittedBy: 'sara@rock887.fm', submittedAt: new Date(Date.now() - 1800000).toISOString(), reviewerRole: 'program-director', decidedAt: null, decidedBy: null, decision: null, comment: null, dueAt: new Date(Date.now() + 86400000).toISOString(), isOverdue: false, daypart: 'afternoon-drive', hasSponsorCarts: true },
  { id: 'apv-003', entityType: 'voice-track', entityId: 'vt-001', entityName: 'Morning Show VT — Block 1', stage: 'in_review', submittedBy: 'alex@rock887.fm', submittedAt: new Date(Date.now() - 10800000).toISOString(), reviewerRole: 'producer', assignedReviewer: 'sara@rock887.fm', decidedAt: null, decidedBy: null, decision: null, comment: null, dueAt: new Date(Date.now() - 3600000).toISOString(), isOverdue: true, daypart: 'morning-drive' },
  { id: 'apv-004', entityType: 'show', entityId: 'show-005', entityName: 'Overnight Mix — July 11', stage: 'approved', submittedBy: 'dj@rock887.fm', submittedAt: new Date(Date.now() - 86400000).toISOString(), reviewerRole: 'program-director', assignedReviewer: 'pd@rock887.fm', decidedAt: new Date(Date.now() - 82800000).toISOString(), decidedBy: 'pd@rock887.fm', decision: 'approved', comment: 'Good track selection, energy curve looks great.', dueAt: new Date(Date.now() - 79200000).toISOString(), isOverdue: false, daypart: 'overnight' },
  { id: 'apv-005', entityType: 'cart', entityId: 'cart-pepsi-30', entityName: 'Pepsi Summer Refresh 30s (updated)', stage: 'in_review', submittedBy: 'traffic@rock887.fm', submittedAt: new Date(Date.now() - 3600000).toISOString(), reviewerRole: 'traffic', assignedReviewer: 'traffic-lead@rock887.fm', decidedAt: null, decidedBy: null, decision: null, comment: null, dueAt: new Date(Date.now() + 82800000).toISOString(), isOverdue: false, hasSponsorCarts: true },
  { id: 'apv-006', entityType: 'show', entityId: 'show-007', entityName: 'EAS-Bearing Show — July 11 10:30', stage: 'submitted', submittedBy: 'sara@rock887.fm', submittedAt: new Date(Date.now() - 900000).toISOString(), reviewerRole: 'technical-engineer', decidedAt: null, decidedBy: null, decision: null, comment: null, dueAt: new Date(Date.now() + 84600000).toISOString(), isOverdue: false, hasEasWindow: true },
  { id: 'apv-007', entityType: 'playlist', entityId: 'pl-weekend-rock', entityName: 'Weekend Rock Playlist', stage: 'rejected', submittedBy: 'scheduler@rock887.fm', submittedAt: new Date(Date.now() - 172800000).toISOString(), reviewerRole: 'program-director', assignedReviewer: 'pd@rock887.fm', decidedAt: new Date(Date.now() - 86400000).toISOString(), decidedBy: 'pd@rock887.fm', decision: 'rejected', comment: 'Too many ballads back-to-back in hour 2. Apply separation rules and resubmit.', dueAt: new Date(Date.now() - 86400000).toISOString(), isOverdue: false, genre: 'rock' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const byStage = {
    draft: ITEMS.filter((i) => i.stage === 'draft').length,
    submitted: ITEMS.filter((i) => i.stage === 'submitted').length,
    in_review: ITEMS.filter((i) => i.stage === 'in_review').length,
    approved: ITEMS.filter((i) => i.stage === 'approved').length,
    rejected: ITEMS.filter((i) => i.stage === 'rejected').length,
    live: ITEMS.filter((i) => i.stage === 'live').length,
  }
  const overdue = ITEMS.filter((i) => i.isOverdue && i.stage === 'in_review')
  const avgDecisionMs = ITEMS.filter((i) => i.decidedAt).reduce((s, i) => s + (new Date(i.decidedAt!).getTime() - new Date(i.submittedAt).getTime()), 0) / Math.max(1, ITEMS.filter((i) => i.decidedAt).length)

  return NextResponse.json({
    items: ITEMS,
    kanban: {
      draft: ITEMS.filter((i) => i.stage === 'draft'),
      submitted: ITEMS.filter((i) => i.stage === 'submitted'),
      in_review: ITEMS.filter((i) => i.stage === 'in_review'),
      approved: ITEMS.filter((i) => i.stage === 'approved'),
      rejected: ITEMS.filter((i) => i.stage === 'rejected'),
      live: ITEMS.filter((i) => i.stage === 'live'),
    },
    stats: {
      total: ITEMS.length,
      byStage,
      overdue: overdue.length,
      avgDecisionHours: Math.round((avgDecisionMs / 3600000) * 10) / 10,
      slaCompliance: Math.round(((ITEMS.filter((i) => i.decidedAt).length - overdue.length) / Math.max(1, ITEMS.filter((i) => i.decidedAt).length)) * 1000) / 10,
    },
    routing: {
      music: 'program-director reviews music logs',
      sponsor: 'traffic reviews carts with sponsor content',
      eas: 'technical-engineer reviews shows with EAS windows',
      voiceTrack: 'producer reviews VT takes',
      default: 'program-director is default reviewer',
    },
    overdueItems: overdue,
    webhook: 'approval.overdue fires every hour for items past dueAt',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'submit' && body.entityId) {
    const item: ApprovalItem = {
      id: `apv-${Date.now()}`,
      entityType: body.entityType ?? 'show',
      entityId: body.entityId,
      entityName: body.entityName ?? 'Untitled',
      stage: 'submitted',
      submittedBy: body.submittedBy ?? 'user@rock887.fm',
      submittedAt: new Date().toISOString(),
      reviewerRole: body.reviewerRole ?? 'program-director',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      isOverdue: false,
      decidedAt: null, decidedBy: null, decision: null, comment: null,
      hasEasWindow: body.hasEasWindow,
      hasSponsorCarts: body.hasSponsorCarts,
    }
    ITEMS.unshift(item)
    return NextResponse.json({ ok: true, item, message: `Submitted for ${item.reviewerRole} review — due ${item.dueAt}` })
  }

  if (body.action === 'decide' && body.itemId) {
    const i = ITEMS.find((x) => x.id === body.itemId)
    if (!i) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    i.decision = body.decision // approved | rejected | changes-requested
    i.decidedAt = new Date().toISOString()
    i.decidedBy = body.reviewerId ?? 'reviewer@rock887.fm'
    i.comment = body.comment ?? null
    i.stage = body.decision === 'approved' ? 'approved' : body.decision === 'rejected' ? 'rejected' : 'draft'
    return NextResponse.json({ ok: true, item: i, message: `Decision: ${i.decision}${i.comment ? ` — ${i.comment}` : ''}` })
  }

  if (body.action === 'withdraw' && body.itemId) {
    const i = ITEMS.find((x) => x.id === body.itemId)
    if (i) {
      i.stage = 'draft'
      return NextResponse.json({ ok: true, item: i })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
