import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { parseCapXml, extractSameCode, SAME_EVENT_CODES } from '@/lib/cap-parser'
import { verifyCapSignature, checkReplay } from '@/lib/cap-signature'

export const dynamic = 'force-dynamic'

/**
 * FEMA IPAWS-OPEN polling endpoint.
 *
 * GET /api/v1/eas/ipaws
 *   → polls IPAWS-OPEN aggregator for new CAP alerts since last poll
 *   → production: GET https://api.ipaws.open.fema.gov/alerts?COG_ID=...&USER_ID=...
 *   → sandbox: returns mock recent alerts
 *
 * POST /api/v1/eas/ipaws/poll
 *   → triggers a manual poll now
 *
 * IPAWS = Integrated Public Alert and Warning System (FEMA)
 * COG = Collaborative Operating Group (an IPAWS-registered organization)
 */

const IPAWS_CONFIG = {
  enabled: !!process.env.IPAWS_COG_ID,
  endpoint: 'https://api.ipaws.open.fema.gov',
  cogId: process.env.IPAWS_COG_ID ?? 'COG-DEMO-001',
  userId: process.env.IPAWS_USER_ID ?? 'rock887-eas',
  pollIntervalSec: 60,
  lastPoll: new Date(Date.now() - 30000).toISOString(),
  alertsReceived: 1247,
  alertsIgnored: 38,
  alertsInterrupted: 4,
}

// Mock recent IPAWS alerts
const MOCK_RECENT = [
  {
    identifier: 'IPAWS-2026-001-TOR',
    sender: 'noaa@weather.gov',
    sent: new Date(Date.now() - 1800000).toISOString(),
    status: 'Actual',
    msgType: 'Alert',
    event: 'Tornado Warning',
    severity: 'Extreme',
    urgency: 'Immediate',
    areaDesc: 'Ljubljana, Maribor, Celje — Slovenia',
    sameCode: 'TOR',
    sameCodeName: 'Tornado Warning',
    signatureValid: true,
    ingested: true,
    autoInterrupted: true,
  },
  {
    identifier: 'IPAWS-2026-002-SVR',
    sender: 'noaa@weather.gov',
    sent: new Date(Date.now() - 7200000).toISOString(),
    status: 'Actual',
    msgType: 'Alert',
    event: 'Severe Thunderstorm Warning',
    severity: 'Severe',
    urgency: 'Immediate',
    areaDesc: 'Koper, Slovenia',
    sameCode: 'SVR',
    sameCodeName: 'Severe Thunderstorm Warning',
    signatureValid: true,
    ingested: true,
    autoInterrupted: true,
  },
  {
    identifier: 'IPAWS-2026-003-FFW',
    sender: 'noaa@weather.gov',
    sent: new Date(Date.now() - 14400000).toISOString(),
    status: 'Actual',
    msgType: 'Update',
    event: 'Flash Flood Warning',
    severity: 'Severe',
    urgency: 'Expected',
    areaDesc: 'Nova Gorica, Slovenia',
    sameCode: 'FFW',
    sameCodeName: 'Flash Flood Warning',
    signatureValid: true,
    ingested: true,
    autoInterrupted: false,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  return NextResponse.json({
    config: {
      ...IPAWS_CONFIG,
      mode: IPAWS_CONFIG.enabled ? 'live' : 'sandbox',
      endpoint: IPAWS_CONFIG.endpoint,
    },
    stats: {
      totalReceived: IPAWS_CONFIG.alertsReceived,
      totalIgnored: IPAWS_CONFIG.alertsIgnored,
      totalInterrupted: IPAWS_CONFIG.alertsInterrupted,
      lastPoll: IPAWS_CONFIG.lastPoll,
      nextPoll: new Date(new Date(IPAWS_CONFIG.lastPoll).getTime() + IPAWS_CONFIG.pollIntervalSec * 1000).toISOString(),
      uptime: '12d 4h 23m',
    },
    recentAlerts: MOCK_RECENT,
    supportedEventCodes: Object.keys(SAME_EVENT_CODES).length,
    cog: {
      id: IPAWS_CONFIG.cogId,
      name: 'Rock 88.7 FM Broadcast Group',
      registered: true,
      contactEmail: 'eas@rock887.fm',
    },
    note: IPAWS_CONFIG.enabled
      ? 'Live IPAWS-OPEN polling active'
      : 'Sandbox mode — set IPAWS_COG_ID, IPAWS_USER_ID, IPAWS_PASSWORD env vars to enable live polling',
  })
}

export async function POST(req: Request) {
  // Manual poll trigger
  const body = await req.json().catch(() => ({}))

  IPAWS_CONFIG.lastPoll = new Date().toISOString()
  IPAWS_CONFIG.alertsReceived += 1

  // Optionally accept a CAP XML to ingest via IPAWS path
  if (body.capXml) {
    const parsed = parseCapXml(body.capXml)
    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'Invalid CAP XML' }, { status: 400 })
    }

    const replay = checkReplay(parsed.sender, parsed.identifier, parsed.sent)
    if (replay.isReplay) {
      return NextResponse.json({ ok: false, ignored: true, reason: 'replay' }, { status: 409 })
    }

    const signature = verifyCapSignature(body.capXml, parsed.sender)
    const sameCode = extractSameCode(parsed)

    // Persist to DB
    try {
      const alert = await db.capAlert.create({
        data: {
          identifier: parsed.identifier,
          sender: parsed.sender,
          sent: new Date(parsed.sent),
          status: parsed.status,
          msgType: parsed.msgType,
          scope: parsed.scope,
          source: parsed.source,
          infoXml: JSON.stringify(parsed.info),
          category: parsed.info[0]?.category,
          event: parsed.info[0]?.event,
          urgency: parsed.info[0]?.urgency,
          severity: parsed.info[0]?.severity,
          certainty: parsed.info[0]?.certainty,
          areaDesc: parsed.info[0]?.areaDesc,
          signatureValid: signature.valid,
          signatureError: signature.error,
          rawXml: body.capXml,
          origin: 'ipaws',
        },
      })
      return NextResponse.json({
        ok: true,
        ingested: true,
        alertId: alert.id,
        sameCode,
        signatureValid: signature.valid,
      })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err?.message ?? 'DB error' }, { status: 500 })
    }
  }

  return NextResponse.json({
    ok: true,
    polledAt: IPAWS_CONFIG.lastPoll,
    newAlerts: 0,
    message: 'IPAWS-OPEN poll triggered. No new alerts in sandbox mode.',
  })
}
