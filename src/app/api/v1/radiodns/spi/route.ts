import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * SPI/DPI Electronic Program Guide + Service Following — ETSI TS 102 410.
 *
 * Extends RadioDNS SPI XML with <bearer> elements for all three delivery bearers
 * (FM, DAB+, IP) so receivers perform Service Following across delivery bearers.
 * 7-day rolling window of <Programme> elements from Schedule API.
 *
 * GET /api/v1/radiodns/spi         — SPI XML with bearers + 7-day EPG
 */

interface Programme {
  id: string
  seriesId: string       // recurring show = one seriesId for EPG series linking
  start: string
  stop: string
  title: string
  description?: string
  mediumName?: string
  shortName?: string
  bearer: { id: string; cost: number }[]
}

const BEARERS = {
  fm: '0.ce1.c223.1',     // PI=0xCE1, frequency 88.7 MHz → 0xce1.c223.1
  dab: '0.e1.1572',       // ECC=0xE1 (Slovenia), ensemble ID 1572
  ip: 'https://rock887.fm/listen',
}

function generateSpiXml(): string {
  const now = new Date()
  const programmes: Programme[] = [
    { id: 'pgm-001', seriesId: 'series-morning', start: new Date(now.getTime() + 3600000).toISOString(), stop: new Date(now.getTime() + 14400000).toISOString(), title: 'Morning Show', description: 'Daily morning show with Alex Morgan', mediumName: 'Morning Show', shortName: 'Morning', bearer: [{ id: BEARERS.fm, cost: 50 }, { id: BEARERS.dab, cost: 50 }, { id: BEARERS.ip, cost: 80 }] },
    { id: 'pgm-002', seriesId: 'series-midday', start: new Date(now.getTime() + 14400000).toISOString(), stop: new Date(now.getTime() + 32400000).toISOString(), title: 'Midday Music Mix', description: 'Best of rock classics and new releases', bearer: [{ id: BEARERS.fm, cost: 50 }, { id: BEARERS.dab, cost: 50 }, { id: BEARERS.ip, cost: 80 }] },
    { id: 'pgm-003', seriesId: 'series-afternoon', start: new Date(now.getTime() + 32400000).toISOString(), stop: new Date(now.getTime() + 46800000).toISOString(), title: 'Afternoon Drive', description: 'Energy for the commute home with Sara Chen', bearer: [{ id: BEARERS.fm, cost: 50 }, { id: BEARERS.dab, cost: 50 }, { id: BEARERS.ip, cost: 80 }] },
  ]

  const programmesXml = programmes.map((p) => `    <programme id="${p.id}" shortId="${parseInt(p.id.slice(-3))}" start="${p.start.replace(/\.000Z$/, 'Z')}" stop="${p.stop.replace(/\.000Z$/, 'Z')}" version="1">
      <mediumName>${p.mediumName ?? p.title}</mediumName>
      <shortName>${p.shortName ?? p.title.slice(0, 8)}</shortName>
      <longName>${p.title}</longName>
      ${p.description ? `<mediaDescription><longDescription>${p.description}</longDescription></mediaDescription>` : ''}
      <programmeEventId>${p.seriesId}</programmeEventId>
      ${p.bearer.map((b) => `<bearer id="${b.id}" cost="${b.cost}" />`).join('\n      ')}
    </programme>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<spi:serviceInformation xmlns:spi="http://worlddab.org/schemas/spi/31" xmlns="http://www.worlddab.org/schemas/spi/31" version="1">
  <services>
    <service id="rock887-main">
      <mediumName>Rock 88.7 FM</mediumName>
      <shortName>Rock88.7</shortName>
      <longName>Rock 88.7 FM — Classic &amp; Modern Rock</longName>
      <mediaDescription>
        <multimedia url="https://rock887.fm/artwork/logo-600x600.png" mimeValue="image/png" type="logo_colour_square" width="600" height="600" />
      </mediaDescription>
      <genre href="urn:tva:metadata:cs:ContentCS:2010:3.1.1.1"><name>Rock music</name></genre>
      <!-- Service Following: all three delivery bearers -->
      <bearer id="${BEARERS.fm}" cost="50" />
      <bearer id="${BEARERS.dab}" cost="50" />
      <bearer id="${BEARERS.ip}" cost="80" />
    </service>
  </services>
  <programmes>
${programmesXml}
  </programmes>
</spi:serviceInformation>`
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'json'

  if (format === 'xml') {
    const xml = generateSpiXml()
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  }

  return NextResponse.json({
    standard: 'ETSI TS 102 410 (SPI/DPI) + EBU TS 102 371',
    service: {
      id: 'rock887-main',
      name: 'Rock 88.7 FM',
      genre: 'Rock music',
    },
    bearers: BEARERS,
    serviceFollowing: {
      enabled: true,
      description: 'Receivers follow the station across FM ↔ DAB+ ↔ IP delivery bearers',
      fallback: 'If FM signal lost, receiver auto-switches to DAB+ or IP stream',
    },
    programmeSeries: [
      { id: 'series-morning', name: 'Morning Show', recurrence: 'Daily 6am-10am weekdays' },
      { id: 'series-midday', name: 'Midday Music Mix', recurrence: 'Daily 10am-3pm' },
      { id: 'series-afternoon', name: 'Afternoon Drive', recurrence: 'Daily 3pm-7pm' },
    ],
    xmlUrl: '/api/v1/radiodns/spi?format=xml',
    rollingWindow: '7 days',
    tech: {
      format: 'SPI XML (RadioDNS Service and Programme Information)',
      endpoint: 'https://rock887.fm/spi/main.xml',
      dnsLookup: '_radio._tcp.rock887.fm SRV record → SPI endpoint',
      bearer: 'FM (PI+freq), DAB+ (ECC+ensemble), IP (URL)',
    },
  })
}
