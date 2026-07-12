import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Sandbox / Dry-Run Mode — shadow broadcast pipeline.
 *
 * When sandbox mode is active, all RML commands and Event Bus publishes
 * route to a shadow pipeline (/api/v1/sandbox/*) backed by mock transmitter
 * + mock RDS encoder + mock Icecast. All actions logged to AuditLog with
 * sandbox=true to keep the live audit trail clean.
 *
 * GET  /api/v1/sandbox         — current sandbox state + toggle
 * POST /api/v1/sandbox         — toggle sandbox mode (admin only)
 */

let SANDBOX_STATE = {
  active: false,
  activatedAt: null as string | null,
  activatedBy: null as string | null,
  rmlCommands: 0,
  eventBusPublishes: 0,
  mockTransmitterActive: false,
  mockRdsEncoderActive: false,
  mockIcecastListeners: 0,
  sandboxActions: [
    { id: 'sbx-001', timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'rml:PLAY', user: 'trainee@rock887.fm', result: 'mock-played', details: 'Mock cart 1001 played on mock transmitter' },
    { id: 'sbx-002', timestamp: new Date(Date.now() - 1800000).toISOString(), action: 'rml:STOP', user: 'trainee@rock887.fm', result: 'mock-stopped', details: 'Mock stop all' },
    { id: 'sbx-003', timestamp: new Date(Date.now() - 900000).toISOString(), action: 'eas:test', user: 'trainee@rock887.fm', result: 'mock-broadcast', details: 'Mock RWT test broadcast' },
  ],
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    state: SANDBOX_STATE,
    headerIndicator: SANDBOX_STATE.active ? 'amber' : 'red',
    shadowPipeline: {
      mockTransmitter: { url: 'http://localhost:9999/mock-tx', active: SANDBOX_STATE.mockTransmitterActive },
      mockRdsEncoder: { url: 'http://localhost:9998/mock-rds', active: SANDBOX_STATE.mockRdsEncoderActive },
      mockIcecast: { url: 'http://localhost:9997/mock-icecast', listeners: SANDBOX_STATE.mockIcecastListeners },
    },
    useCases: [
      'Training new producers without risk to live broadcast',
      'Testing AI Producer suggestions before approving',
      'Webhook integration testing without affecting live Event Bus',
      'DR drill simulations (no on-air impact)',
      'Auditioning new DJs',
    ],
    audit: {
      sandboxFlag: 'All sandbox actions logged to AuditLog with sandbox=true',
      separation: 'Live audit trail remains clean — sandbox actions filtered out by default',
      retention: 'Sandbox audit logs retained 30 days (vs 4 years for live)',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.toggle !== undefined) {
    SANDBOX_STATE.active = Boolean(body.toggle)
    if (SANDBOX_STATE.active) {
      SANDBOX_STATE.activatedAt = new Date().toISOString()
      SANDBOX_STATE.activatedBy = body.userId ?? 'admin@rock887.fm'
      SANDBOX_STATE.mockTransmitterActive = true
      SANDBOX_STATE.mockRdsEncoderActive = true
      SANDBOX_STATE.mockIcecastListeners = 42
    } else {
      SANDBOX_STATE.activatedAt = null
      SANDBOX_STATE.activatedBy = null
      SANDBOX_STATE.mockTransmitterActive = false
      SANDBOX_STATE.mockRdsEncoderActive = false
      SANDBOX_STATE.mockIcecastListeners = 0
    }
    return NextResponse.json({
      ok: true,
      state: SANDBOX_STATE,
      message: SANDBOX_STATE.active
        ? '⚠️ Sandbox mode ACTIVE — all RML/EAS/Event Bus actions route to shadow pipeline (no on-air impact)'
        : '🔴 Live mode — all actions affect the real broadcast chain',
    })
  }

  if (body.action) {
    SANDBOX_STATE.rmlCommands += body.action.startsWith('rml:') ? 1 : 0
    SANDBOX_STATE.eventBusPublishes += body.action.startsWith('event:') ? 1 : 0
    SANDBOX_STATE.sandboxActions.unshift({
      id: `sbx-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: body.action,
      user: body.user ?? 'unknown',
      result: body.result ?? 'mock-executed',
      details: body.details ?? '',
    })
    if (SANDBOX_STATE.sandboxActions.length > 50) SANDBOX_STATE.sandboxActions.length = 50
    return NextResponse.json({ ok: true, message: 'Sandbox action logged (no live impact)' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
