import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * SMPTE 2021 BXF v3.1 Import/Export — Traffic ↔ Playout exchange.
 *
 * BXF (Broadcast Exchange Format) is the industry-standard XML protocol for
 * exchanging schedules, as-runs, and content metadata between traffic systems
 * (WideOrbit, Marketron, Natural Log) and playout systems (Rivendell, etc.).
 *
 * GET  /api/v1/traffic/bxf         — sample BXF schedule XML
 * POST /api/v1/traffic/bxf         — ingest BXF XML (import schedule)
 *
 * Message types supported:
 *   - BXF-Message type="schedule"    (traffic → playout: today's schedule)
 *   - BXF-Message type="asRun"       (playout → traffic: what actually aired)
 *   - BXF-Message type="contentMetadata"  (traffic → playout: ISCI/Creative metadata)
 */

interface BxfScheduleItem {
  id: string
  startTime: string
  duration: string
  title: string
  isci: string
  advertiser: string
  agency?: string
  trafficCode: string
  type: 'commercial' | 'promo' | 'psa' | 'program' | 'break'
}

const SAMPLE_SCHEDULE: BxfScheduleItem[] = [
  { id: 'bxf-001', startTime: '2026-07-10T06:00:00Z', duration: 'PT30S', title: 'Pepsi Summer Refresh 30s', isci: 'PEPSI2026A001H', advertiser: 'Pepsi', agency: 'Ogilvy', trafficCode: 'PEP30A', type: 'commercial' },
  { id: 'bxf-002', startTime: '2026-07-10T06:00:30Z', duration: 'PT15S', title: 'Station ID', isci: 'ROCK887ID001', advertiser: 'Rock 88.7', trafficCode: 'SID15', type: 'promo' },
  { id: 'bxf-003', startTime: '2026-07-10T06:00:45Z', duration: 'PT30S', title: 'Coca-Cola Classic 30s', isci: 'COKE2026A003H', advertiser: 'Coca-Cola', agency: 'Wieden+Kennedy', trafficCode: 'COK30A', type: 'commercial' },
  { id: 'bxf-004', startTime: '2026-07-10T06:15:00Z', duration: 'PT30S', title: 'Local Auto Dealer Sale', isci: 'AUTO2026B002H', advertiser: 'Local Auto Dealer', trafficCode: 'AUT30B', type: 'commercial' },
  { id: 'bxf-005', startTime: '2026-07-10T06:30:00Z', duration: 'PT30S', title: 'PSA: Safe Driving', isci: 'PSA2026SD001', advertiser: 'National Safety Council', trafficCode: 'PSA30S', type: 'psa' },
  { id: 'bxf-006', startTime: '2026-07-10T07:00:00Z', duration: 'PT30S', title: 'City Bank Mortgage', isci: 'CITY2026A002H', advertiser: 'City Bank', trafficCode: 'CTY30A', type: 'commercial' },
]

function generateBxfXml(items: BxfScheduleItem[], type: 'schedule' | 'asRun' = 'schedule'): string {
  const date = new Date().toISOString()
  const messageId = `BXF-${Date.now()}`
  const origin = 'ROCK887-TRAFFIC'

  const itemsXml = items.map((item) => `      <bxf:ScheduleElement>
        <bxf:ElementID>${item.id}</bxf:ElementID>
        <bxf:StartTime>${item.startTime}</bxf:StartTime>
        <bxf:Duration>${item.duration}</bxf:Duration>
        <bxf:Title>${escapeXml(item.title)}</bxf:Title>
        <bxf:TrafficCode>${item.trafficCode}</bxf:TrafficCode>
        <bxf:Type>${item.type}</bxf:Type>
        <bxf:ContentMetadata>
          <bxf:ISCI>${item.isci}</bxf:ISCI>
          <bxf:Advertiser>${escapeXml(item.advertiser)}</bxf:Advertiser>
          ${item.agency ? `<bxf:Agency>${escapeXml(item.agency)}</bxf:Agency>` : ''}
        </bxf:ContentMetadata>
      </bxf:ScheduleElement>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<bxf:BXFMessage xmlns:bxf="urn:smpte:bxf:2021:3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:smpte:bxf:2021:3.1 bxf-3.1.xsd">
  <bxf:MessageID>${messageId}</bxf:MessageID>
  <bxf:MessageDate>${date}</bxf:MessageDate>
  <bxf:MessageOrigin>${origin}</bxf:MessageOrigin>
  <bxf:MessageType>${type}</bxf:MessageType>
  <bxf:Schedule>
    <bxf:ScheduleName>Daily Schedule ${date.slice(0, 10)}</bxf:ScheduleName>
    <bxf:Owner>Rock 88.7 FM</bxf:Owner>
    <bxf:Channel>main-fm</bxf:Channel>
${itemsXml}
  </bxf:Schedule>
</bxf:BXFMessage>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'json'

  if (format === 'xml') {
    const xml = generateBxfXml(SAMPLE_SCHEDULE, 'schedule')
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="bxf-schedule-${new Date().toISOString().slice(0, 10)}.xml"`,
      },
    })
  }

  return NextResponse.json({
    standard: 'SMPTE 2021 BXF v3.1',
    messageId: `BXF-${Date.now()}`,
    messageType: 'schedule',
    scheduleDate: new Date().toISOString().slice(0, 10),
    itemCount: SAMPLE_SCHEDULE.length,
    items: SAMPLE_SCHEDULE,
    xmlUrl: '/api/v1/traffic/bxf?format=xml',
    supportedMessageTypes: ['schedule', 'asRun', 'contentMetadata'],
    compatibleSystems: ['WideOrbit AFR', 'Marketron', 'Natural Log', 'OSI', 'Floro', 'RadioTraffic'],
    asRunExport: {
      endpoint: 'POST /api/v1/traffic/bxf',
      description: 'Export as-run log back to traffic system for billing reconciliation',
    },
  })
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''
  let body: any
  let rawXml = ''

  try {
    if (contentType.includes('application/json')) {
      body = await req.json()
      rawXml = body.xml ?? ''
    } else {
      rawXml = await req.text()
    }
  } catch {
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 })
  }

  if (!rawXml || !rawXml.trim()) {
    return NextResponse.json({ error: 'Empty BXF XML' }, { status: 400 })
  }

  // Basic BXF validation
  if (!/<bxf:BXFMessage/i.test(rawXml)) {
    return NextResponse.json(
      { error: 'Invalid BXF — missing <bxf:BXFMessage> root element', standard: 'SMPTE 2021 BXF v3.1' },
      { status: 400 },
    )
  }

  // Extract message type
  const typeMatch = rawXml.match(/<bxf:MessageType>([^<]+)<\/bxf:MessageType>/i)
  const messageType = typeMatch?.[1] ?? 'unknown'

  // Extract schedule elements
  const itemMatches = rawXml.matchAll(/<bxf:ScheduleElement>([\s\S]*?)<\/bxf:ScheduleElement>/gi)
  const items: any[] = []
  for (const m of itemMatches) {
    const block = m[1]
    const id = block.match(/<bxf:ElementID>([^<]+)<\/bxf:ElementID>/i)?.[1]
    const startTime = block.match(/<bxf:StartTime>([^<]+)<\/bxf:StartTime>/i)?.[1]
    const duration = block.match(/<bxf:Duration>([^<]+)<\/bxf:Duration>/i)?.[1]
    const title = block.match(/<bxf:Title>([^<]+)<\/bxf:Title>/i)?.[1]
    const isci = block.match(/<bxf:ISCI>([^<]+)<\/bxf:ISCI>/i)?.[1]
    const advertiser = block.match(/<bxf:Advertiser>([^<]+)<\/bxf:Advertiser>/i)?.[1]
    items.push({ id, startTime, duration, title, isci, advertiser })
  }

  return NextResponse.json({
    ok: true,
    ingested: true,
    messageType,
    itemCount: items.length,
    items,
    standard: 'SMPTE 2021 BXF v3.1',
    message: `BXF ${messageType} ingested successfully — ${items.length} schedule elements parsed`,
  })
}
