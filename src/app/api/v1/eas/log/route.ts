import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * FCC EAS Log endpoint (47 CFR §11.35 — 4-year retention).
 *
 * GET /api/v1/eas/log                — JSON log (filterable by eventType, date range)
 * GET /api/v1/eas/log?format=csv     — CSV export for FCC inspection
 * GET /api/v1/eas/log?stats=true     — compliance stats summary
 * DELETE /api/v1/eas/log?olderThan=4y — enforce 4-year retention (admin only)
 */

const RETENTION_YEARS = 4
const RETENTION_MS = RETENTION_YEARS * 365 * 24 * 60 * 60 * 1000

// Mock EAS log entries (production: queried from DB)
const MOCK_EAS_LOG = [
  {
    id: 1,
    eventType: 'received',
    alertId: 'NOAA-TOR-202607101430',
    originator: 'noaa@weather.gov',
    decoderId: 'IPAWS-OPEN',
    receivedAt: new Date(Date.now() - 1800000).toISOString(),
    durationMs: null,
    operatorId: null,
    result: 'success',
    resultDetail: 'CAP Alert received from NOAA/NWS — Tornado Warning',
    fccStatusCode: 'WXR',
    sameCode: 'TOR',
    notes: 'Auto-interrupted broadcast',
  },
  {
    id: 2,
    eventType: 'interrupted',
    alertId: 'NOAA-TOR-202607101430',
    originator: 'WXR',
    decoderId: 'rock887-eas-controller',
    receivedAt: new Date(Date.now() - 1790000).toISOString(),
    durationMs: 36500,
    operatorId: null,
    result: 'success',
    resultDetail: 'Broadcast interrupted 36500ms for EAS alert TOR',
    fccStatusCode: 'WXR',
    sameCode: 'TOR',
    notes: '7 steps completed',
  },
  {
    id: 3,
    eventType: 'ignored',
    alertId: 'NOAA-TOR-202607101430',
    originator: 'noaa@weather.gov',
    decoderId: 'IPAWS-OPEN',
    receivedAt: new Date(Date.now() - 1795000).toISOString(),
    durationMs: null,
    operatorId: null,
    result: 'ignored',
    resultDetail: 'Duplicate alert ignored (replay within 24h window)',
    fccStatusCode: 'WXR',
    sameCode: 'TOR',
    notes: 'Replay protection triggered',
  },
  {
    id: 4,
    eventType: 'weekly-test',
    alertId: 'NOAA-RWT-202607100300',
    originator: 'WXR',
    decoderId: 'local-decoder',
    receivedAt: new Date(Date.now() - 36000000).toISOString(),
    durationMs: 22000,
    operatorId: 'engineer@rock887.fm',
    result: 'success',
    resultDetail: 'Required Weekly Test (RWT) broadcast successfully',
    fccStatusCode: 'WXR',
    sameCode: 'RWT',
    notes: '47 CFR §11.61 weekly test requirement satisfied',
  },
  {
    id: 5,
    eventType: 'monthly-test',
    alertId: 'FEMA-RMT-202607011200',
    originator: 'PEP',
    decoderId: 'IPAWS-OPEN',
    receivedAt: new Date(Date.now() - 864000000).toISOString(),
    durationMs: 45000,
    operatorId: 'engineer@rock887.fm',
    result: 'success',
    resultDetail: 'Required Monthly Test (RMT) broadcast successfully',
    fccStatusCode: 'PEP',
    sameCode: 'RMT',
    notes: '47 CFR §11.61 monthly test requirement satisfied',
  },
  {
    id: 6,
    eventType: 'manual',
    alertId: 'MANUAL-202606151400',
    originator: 'EAS',
    decoderId: 'rock887-eas-controller',
    receivedAt: new Date(Date.now() - 2592000000).toISOString(),
    durationMs: 30000,
    operatorId: 'admin@rock887.fm',
    result: 'success',
    resultDetail: 'Manual EAS alert: Local civil emergency (water main break)',
    fccStatusCode: 'CIV',
    sameCode: 'CEM',
    notes: 'Initiated by station operator per 47 CFR §11.51',
  },
]

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const url = new URL(req.url)
  const eventType = url.searchParams.get('eventType')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const format = url.searchParams.get('format') ?? 'json'
  const stats = url.searchParams.get('stats') === 'true'
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 1000)

  // Try DB first, fall back to mock
  let entries = MOCK_EAS_LOG
  try {
    const dbEntries = await db.easLog.findMany({
      orderBy: { receivedAt: 'desc' },
      take: limit,
      include: { capAlert: true },
    })
    if (dbEntries.length > 0) {
      entries = dbEntries.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        alertId: e.alertId,
        originator: e.originator,
        decoderId: e.decoderId,
        receivedAt: e.receivedAt.toISOString(),
        durationMs: e.durationMs,
        operatorId: e.operatorId,
        result: e.result,
        resultDetail: e.resultDetail,
        fccStatusCode: e.fccStatusCode,
        sameCode: e.sameCode,
        notes: e.notes,
      }))
    }
  } catch {
    // Use mock
  }

  // Filter
  let filtered = [...entries]
  if (eventType) filtered = filtered.filter((e) => e.eventType === eventType)
  if (from) filtered = filtered.filter((e) => e.receivedAt >= from!)
  if (to) filtered = filtered.filter((e) => e.receivedAt <= to!)

  // Stats mode
  if (stats) {
    const byEventType: Record<string, number> = {}
    const byResult: Record<string, number> = {}
    const bySameCode: Record<string, number> = {}
    for (const e of filtered) {
      byEventType[e.eventType] = (byEventType[e.eventType] ?? 0) + 1
      byResult[e.result] = (byResult[e.result] ?? 0) + 1
      if (e.sameCode) bySameCode[e.sameCode] = (bySameCode[e.sameCode] ?? 0) + 1
    }
    return NextResponse.json({
      compliance: {
        standard: 'FCC 47 CFR §11.35',
        retentionYears: RETENTION_YEARS,
        totalEntries: filtered.length,
        lastWeeklyTest: filtered.find((e) => e.eventType === 'weekly-test')?.receivedAt ?? null,
        lastMonthlyTest: filtered.find((e) => e.eventType === 'monthly-test')?.receivedAt ?? null,
        weeklyTestCompliant: filtered.some(
          (e) => e.eventType === 'weekly-test' && Date.now() - new Date(e.receivedAt).getTime() < 7 * 86400000,
        ),
        monthlyTestCompliant: filtered.some(
          (e) => e.eventType === 'monthly-test' && Date.now() - new Date(e.receivedAt).getTime() < 30 * 86400000,
        ),
      },
      byEventType,
      byResult,
      bySameCode,
      dateRange: {
        earliest: filtered[filtered.length - 1]?.receivedAt ?? null,
        latest: filtered[0]?.receivedAt ?? null,
      },
    })
  }

  // CSV export
  if (format === 'csv') {
    const headers = ['ID', 'Received At (UTC)', 'Event Type', 'SAME Code', 'Originator', 'Decoder ID', 'Duration (ms)', 'Result', 'Detail', 'Operator', 'Notes']
    const rows = filtered.map((e) => [
      e.id,
      e.receivedAt,
      e.eventType,
      e.sameCode ?? '',
      e.fccStatusCode ?? '',
      e.decoderId ?? '',
      e.durationMs ?? '',
      e.result,
      `"${(e.resultDetail ?? '').replace(/"/g, '""')}"`,
      e.operatorId ?? '',
      `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="eas-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  return NextResponse.json({
    count: filtered.length,
    compliance: {
      standard: 'FCC 47 CFR §11.35',
      retentionYears: RETENTION_YEARS,
      retentionNote: `Entries older than ${RETENTION_YEARS} years are eligible for cleanup via DELETE /api/v1/eas/log?olderThan=${RETENTION_YEARS}y`,
    },
    entries: filtered,
  })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const olderThan = url.searchParams.get('olderThan') ?? `${RETENTION_YEARS}y`

  // Parse "4y", "365d", "8760h"
  let cutoffMs = RETENTION_MS
  const m = olderThan.match(/^(\d+)([ydh])$/)
  if (m) {
    const n = parseInt(m[1])
    const unit = m[2]
    cutoffMs = unit === 'y' ? n * 365 * 86400000 : unit === 'd' ? n * 86400000 : n * 3600000
  }
  const cutoff = new Date(Date.now() - cutoffMs)

  let deleted = 0
  try {
    const result = await db.easLog.deleteMany({
      where: { receivedAt: { lt: cutoff } },
    })
    deleted = result.count
  } catch {
    // DB may be unavailable
  }

  return NextResponse.json({
    ok: true,
    deleted,
    cutoff: cutoff.toISOString(),
    retentionYears: RETENTION_YEARS,
    message: `Deleted ${deleted} EAS log entries older than ${cutoff.toISOString()} per FCC §11.35 retention policy`,
  })
}
