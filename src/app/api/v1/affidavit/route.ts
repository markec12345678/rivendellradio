import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Automated Affidavit (Proof-of-Play) Generator for advertisers.
 *
 * Generates a tamper-evident PDF affidavit listing every as-run ad play for a
 * given advertiser + date range, with HMAC-SHA256 signature for verification.
 *
 * GET /api/v1/affidavit?advertiser=Pepsi&from=2026-07-01&to=2026-07-10
 *   → JSON summary
 * GET /api/v1/affidavit?...&format=pdf
 *   → application/pdf download
 */

interface AsRunPlay {
  timestamp: string
  isci: string           // ISCI / Ad-ID creative identifier
  creativeTitle: string
  advertiser: string
  durationSec: number
  stationId: string
  makeGood: boolean      // was this a make-good for a missed spot?
  contractId: string
  rate: number           // USD per play
}

// Mock as-run log (production: queried from Rivendell RDXport as-run reports)
const mockAsRuns: AsRunPlay[] = [
  { timestamp: '2026-07-10T06:00:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 125 },
  { timestamp: '2026-07-10T07:15:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 150 },
  { timestamp: '2026-07-10T08:30:00Z', isci: 'PEPSI2026A002H', creativeTitle: 'Pepsi Max Energy 15s', advertiser: 'Pepsi', durationSec: 15, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 85 },
  { timestamp: '2026-07-10T10:00:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 175 },
  { timestamp: '2026-07-10T12:00:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: true, contractId: 'CNT-2026-042', rate: 0 },
  { timestamp: '2026-07-10T14:00:00Z', isci: 'PEPSI2026A003H', creativeTitle: 'Pepsi Cola Classic 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 200 },
  { timestamp: '2026-07-10T16:30:00Z', isci: 'PEPSI2026A002H', creativeTitle: 'Pepsi Max Energy 15s', advertiser: 'Pepsi', durationSec: 15, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 95 },
  { timestamp: '2026-07-10T18:45:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 225 },
  { timestamp: '2026-07-10T20:00:00Z', isci: 'PEPSI2026A003H', creativeTitle: 'Pepsi Cola Classic 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 180 },
  { timestamp: '2026-07-10T22:15:00Z', isci: 'PEPSI2026A001H', creativeTitle: 'Pepsi Summer Refresh 30s', advertiser: 'Pepsi', durationSec: 30, stationId: 'main-fm', makeGood: false, contractId: 'CNT-2026-042', rate: 140 },
]

async function generatePdfAffidavit(plays: AsRunPlay[], advertiser: string, from: string, to: string): Promise<Buffer> {
  // Minimal valid PDF (no external deps) — production would use pdfkit / ReportLab
  const totalPlays = plays.length
  const totalMakeGoods = plays.filter((p) => p.makeGood).length
  const totalBillable = plays.filter((p) => !p.makeGood).reduce((sum, p) => sum + p.rate, 0)
  const totalDurationSec = plays.reduce((sum, p) => sum + p.durationSec, 0)

  const lines: string[] = []
  lines.push('ROCK 88.7 FM - ADVERTISER AFFIDAVIT (PROOF-OF-PLAY)')
  lines.push('=' .repeat(60))
  lines.push('')
  lines.push(`Advertiser:   ${advertiser}`)
  lines.push(`Date Range:   ${from} to ${to}`)
  lines.push(`Contract ID:  ${plays[0]?.contractId ?? 'N/A'}`)
  lines.push(`Station:      ${plays[0]?.stationId ?? 'N/A'}`)
  lines.push(`Generated:    ${new Date().toISOString()}`)
  lines.push('')
  lines.push('AS-RUN LOG:')
  lines.push('-' .repeat(60))
  lines.push('Timestamp (UTC)         ISCI             Title                          Dur   Rate  MG')
  lines.push('-' .repeat(60))
  for (const p of plays) {
    lines.push(
      `${p.timestamp.padEnd(23)} ${p.isci.padEnd(16)} ${(p.creativeTitle.slice(0, 30)).padEnd(31)} ${String(p.durationSec).padStart(3)}s  $${String(p.rate).padStart(4)}  ${p.makeGood ? 'Y' : 'N'}`
    )
  }
  lines.push('-' .repeat(60))
  lines.push('')
  lines.push(`Total Plays:       ${totalPlays}`)
  lines.push(`Make-Goods:        ${totalMakeGoods}`)
  lines.push(`Billable Plays:    ${totalPlays - totalMakeGoods}`)
  lines.push(`Total Duration:    ${totalDurationSec}s (${Math.floor(totalDurationSec / 60)}m ${totalDurationSec % 60}s)`)
  lines.push(`Total Billed:      $${totalBillable.toFixed(2)}`)
  lines.push('')
  lines.push('CERTIFICATION:')
  lines.push('I certify that the above advertisements were broadcast on')
  lines.push('Rock 88.7 FM as listed, in accordance with contract terms.')
  lines.push('')
  lines.push('Authorized Signature: ____________________________')
  lines.push('Title:                Station Manager')
  lines.push(`Date:                 ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('Tamper-evidence: HMAC-SHA256 signature included in JSON response.')
  lines.push('Verify with: POST /api/v1/affidavit/verify')

  const content = lines.join('\n')

  // Build a minimal valid PDF wrapping the text content
  // (Simplified — production uses pdfkit for proper typography)
  const escapedContent = content.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${escapedContent.length + 60} >>
stream
BT
/F1 9 Tf
50 740 Td
14 TL
(${escapedContent.replace(/\n/g, ') Tj T* (')}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
${String(escapedContent.length + 380).padStart(10, '0')} 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${escapedContent.length + 450}
%%EOF`
  return Buffer.from(pdf, 'latin1')
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const url = new URL(req.url)
  const advertiser = url.searchParams.get('advertiser') ?? 'Pepsi'
  const from = url.searchParams.get('from') ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const to = url.searchParams.get('to') ?? new Date().toISOString().slice(0, 10)
  const format = url.searchParams.get('format') ?? 'json'

  const plays = mockAsRuns.filter(
    (p) => p.advertiser.toLowerCase() === advertiser.toLowerCase() && p.timestamp.slice(0, 10) >= from && p.timestamp.slice(0, 10) <= to,
  )

  const totalPlays = plays.length
  const totalMakeGoods = plays.filter((p) => p.makeGood).length
  const totalBillable = plays.filter((p) => !p.makeGood).reduce((sum, p) => sum + p.rate, 0)
  const totalDurationSec = plays.reduce((sum, p) => sum + p.durationSec, 0)

  // Tamper-evident HMAC signature over the play data (production: import crypto, secret from env)
  const signaturePayload = JSON.stringify({ advertiser, from, to, plays, totalPlays, totalBillable })
  const signature = `${signaturePayload.length}:${totalPlays}:${totalBillable}:${totalDurationSec}` // mock; production = HMAC-SHA256 hex

  if (format === 'pdf') {
    const pdf = await generatePdfAffidavit(plays, advertiser, from, to)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="affidavit-${advertiser.toLowerCase().replace(/\s/g, '-')}-${from}-to-${to}.pdf"`,
        'X-Affidavit-Signature': signature,
      },
    })
  }

  return NextResponse.json({
    advertiser,
    from,
    to,
    contractId: plays[0]?.contractId ?? null,
    stationId: plays[0]?.stationId ?? null,
    generatedAt: new Date().toISOString(),
    summary: {
      totalPlays,
      makeGoods: totalMakeGoods,
      billablePlays: totalPlays - totalMakeGoods,
      totalDurationSec,
      totalBilledUsd: totalBillable,
      averageRate: totalPlays - totalMakeGoods > 0 ? Math.round((totalBillable / (totalPlays - totalMakeGoods)) * 100) / 100 : 0,
    },
    signature,
    signatureAlgorithm: 'HMAC-SHA256 (mock — production signs with server secret)',
    plays,
    _links: {
      pdf: `/api/v1/affidavit?advertiser=${encodeURIComponent(advertiser)}&from=${from}&to=${to}&format=pdf`,
      verify: '/api/v1/affidavit/verify',
    },
  })
}
