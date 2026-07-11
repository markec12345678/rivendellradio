import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Dynamic Ad Insertion (DAI) — SCTE-35 + HLS per-listener targeting.
 *
 * Per-listener targeting (geo/time-of-day/device) on the online stream.
 * Uses SCTE-35 cue tones in the Icecast source + HLS variant playlists
 * with ad-break splicing.
 *
 * GET  /api/v1/dai         — active campaigns + targeting rules + fill rate
 * POST /api/v1/dai         — create campaign, update targeting, inject cue
 *
 * Spec: SCTE-35 (Ad Insertion Signaling), HLS (RFC 8216 §4.3.2.3 EXT-X-DATERANGE)
 */

interface DaiCampaign {
  id: string
  name: string
  advertiser: string
  creativeTitle: string
  isci: string
  durationSec: number
  // Targeting
  targeting: {
    geo: string[]            // country codes
    dayparts: string[]       // morning-drive, midday, etc.
    devices: string[]        // desktop, mobile, tablet, smartSpeaker, car
    isps: string[]           // empty = all
    listenerSegments: string[] // p1-core, new-listener, etc.
  }
  // Scheduling
  startDate: string
  endDate: string
  // Delivery
  totalImpressions: number
  deliveredImpressions: number
  remainingImpressions: number
  fillRate: number           // 0-100
  cpm: number                // cost per mille (1000 impressions)
  totalSpent: number
  // Creative
  creativeUrl: string
  companionBannerUrl?: string
  // Status
  status: 'active' | 'paused' | 'completed' | 'scheduled'
  priority: number           // 1 = highest
}

interface CuePoint {
  id: string
  timestamp: string
  type: 'ad-break-start' | 'ad-break-end'
  durationSec: number
  scte35Command: 'splice_insert' | 'time_signal'
  scte35Hex: string          // raw SCTE-35 bytes
  hlsTag: string             // EXT-X-DATERANGE or EXT-X-CUE-OUT
  campaignId?: string
  filled: boolean
}

const CAMPAIGNS: DaiCampaign[] = [
  {
    id: 'dai-001',
    name: 'Pepsi Summer Refresh — Mobile Targeting',
    advertiser: 'Pepsi',
    creativeTitle: 'Pepsi Summer Refresh 30s',
    isci: 'PEPSI2026A001H',
    durationSec: 30,
    targeting: { geo: ['SI', 'AT', 'IT'], dayparts: ['morning-drive', 'afternoon-drive'], devices: ['mobile', 'car'], isps: [], listenerSegments: ['p1-core', 'new-listener'] },
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    totalImpressions: 50000,
    deliveredImpressions: 32400,
    remainingImpressions: 17600,
    fillRate: 64.8,
    cpm: 8.50,
    totalSpent: 275.40,
    creativeUrl: 's3://rock887-ads/pepsi-summer-refresh-30s.mp3',
    companionBannerUrl: 'https://rock887.fm/banners/pepsi-300x250.png',
    status: 'active',
    priority: 1,
  },
  {
    id: 'dai-002',
    name: 'City Bank — Desktop Only',
    advertiser: 'City Bank',
    creativeTitle: 'City Bank Mortgage 15s',
    isci: 'CITY2026A002H',
    durationSec: 15,
    targeting: { geo: ['SI'], dayparts: ['midday'], devices: ['desktop'], isps: [], listenerSegments: ['p1-core'] },
    startDate: '2026-07-10',
    endDate: '2026-07-20',
    totalImpressions: 10000,
    deliveredImpressions: 4200,
    remainingImpressions: 5800,
    fillRate: 42.0,
    cpm: 12.00,
    totalSpent: 50.40,
    creativeUrl: 's3://rock887-ads/city-bank-15s.mp3',
    status: 'active',
    priority: 2,
  },
  {
    id: 'dai-003',
    name: 'Local Auto Dealer — Geo-fenced',
    advertiser: 'Local Auto Dealer',
    creativeTitle: 'Weekend Sale Event 30s',
    isci: 'AUTO2026B002H',
    durationSec: 30,
    targeting: { geo: ['SI'], dayparts: ['evening', 'overnight'], devices: ['mobile', 'tablet', 'desktop'], isps: ['Telekom Slovenije', 'A1 Slovenija'], listenerSegments: ['new-listener'] },
    startDate: '2026-07-15',
    endDate: '2026-07-20',
    totalImpressions: 20000,
    deliveredImpressions: 0,
    remainingImpressions: 20000,
    fillRate: 0,
    cpm: 5.00,
    totalSpent: 0,
    creativeUrl: 's3://rock887-ads/auto-dealer-30s.mp3',
    status: 'scheduled',
    priority: 3,
  },
]

const CUE_POINTS: CuePoint[] = [
  {
    id: 'cue-001',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    type: 'ad-break-start',
    durationSec: 90,
    scte35Command: 'splice_insert',
    scte35Hex: '/DA0AAAAAAAAAP/wDwUAAdDJpgAfAESv+wAAAP/wAAAAAH+Nabw=',
    hlsTag: '#EXT-X-CUE-OUT:90',
    campaignId: 'dai-001',
    filled: true,
  },
  {
    id: 'cue-002',
    timestamp: new Date(Date.now() - 1785000).toISOString(),
    type: 'ad-break-end',
    durationSec: 0,
    scte35Command: 'splice_insert',
    scte35Hex: '/DA0AAAAAAAAAP/wDwUAAAeDIpgAfAESv+wAAAP/wAAAAAH+Nabw=',
    hlsTag: '#EXT-X-CUE-IN',
    campaignId: 'dai-001',
    filled: true,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalImpressions = CAMPAIGNS.reduce((s, c) => s + c.deliveredImpressions, 0)
  const totalSpent = CAMPAIGNS.reduce((s, c) => s + c.totalSpent, 0)
  const activeCampaigns = CAMPAIGNS.filter((c) => c.status === 'active')

  return NextResponse.json({
    campaigns: CAMPAIGNS,
    activeCampaigns,
    cuePoints: CUE_POINTS,
    stats: {
      totalCampaigns: CAMPAIGNS.length,
      activeCampaigns: activeCampaigns.length,
      totalImpressions,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgFillRate: Math.round(CAMPAIGNS.reduce((s, c) => s + c.fillRate, 0) / CAMPAIGNS.length * 10) / 10,
      avgCpm: Math.round(CAMPAIGNS.reduce((s, c) => s + c.cpm, 0) / CAMPAIGNS.length * 100) / 100,
    },
    hlsManifest: {
      endpoint: '/api/v1/dai/manifest.m3u8',
      description: 'Per-listener HLS manifest z ad-break splicing',
      example: `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:1234
#EXT-X-DATERANGE:ID="ad-break-1",START-DATE="${new Date().toISOString()}",PLANNED-DURATION=90,SCTE35-OUT=0xFC...
#EXTINF:10.0,
segment-1234.aac
...
#EXT-X-DATERANGE:ID="ad-break-1",END-DATE="${new Date().toISOString()}",SCTE35-IN=0xFC...`,
    },
    targeting: {
      dimensions: ['geo (country/city)', 'daypart', 'device', 'ISP', 'listener segment'],
      listenerSegments: ['p1-core (Diamond/Platinum)', 'new-listener (Bronze)', 'returning (Silver/Gold)'],
      frequencyCapping: 'Max 3 ads per listener per hour',
    },
    tech: {
      scte35: 'SCTE-35 (Digital Program Insertion Cueing Message)',
      hls: 'RFC 8216 §4.3.2.3 (EXT-X-DATERANGE)',
      segmenter: 'FFmpeg HLS segmenter z SCTE-35 passthrough',
      adServer: 'VAST 4.2 compatible (optional)',
      fallback: 'PSA/promo fill when no campaign matches',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'create-campaign' && body.campaign) {
    const c: DaiCampaign = {
      ...body.campaign,
      id: `dai-${Date.now()}`,
      deliveredImpressions: 0,
      remainingImpressions: body.campaign.totalImpressions ?? 10000,
      fillRate: 0,
      totalSpent: 0,
      status: body.campaign.status ?? 'scheduled',
    }
    CAMPAIGNS.push(c)
    return NextResponse.json({ ok: true, campaign: c, message: `Campaign "${c.name}" created` })
  }

  if (body.action === 'inject-cue') {
    const cue: CuePoint = {
      id: `cue-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: body.type ?? 'ad-break-start',
      durationSec: body.durationSec ?? 60,
      scte35Command: body.scte35Command ?? 'splice_insert',
      scte35Hex: body.scte35Hex ?? '/DA0AAAAAAAAAP/wDwUAAdDJpgAfAESv+wAAAP/wAAAAAH+Nabw=',
      hlsTag: body.type === 'ad-break-end' ? '#EXT-X-CUE-IN' : `#EXT-X-CUE-OUT:${body.durationSec ?? 60}`,
      campaignId: body.campaignId,
      filled: !!body.campaignId,
    }
    CUE_POINTS.unshift(cue)
    if (CUE_POINTS.length > 100) CUE_POINTS.pop()
    return NextResponse.json({ ok: true, cue, message: `SCTE-35 ${cue.type} injected` })
  }

  if (body.action === 'pause' && body.campaignId) {
    const c = CAMPAIGNS.find((x) => x.id === body.campaignId)
    if (c) {
      c.status = 'paused'
      return NextResponse.json({ ok: true, campaign: c })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
