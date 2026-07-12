import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Cohort Retention Heatmap + Listener Journey Funnel + ATS/TTL metrics.
 *
 * - Weekly-cohort retention heatmap (rows=cohort week, cols=week N, cells=% still listening)
 * - Listener-journey Sankey funnel (first tune-in → first request → first share → tune-out)
 * - ATS (Average Time Spent Listening) per daypart/show/track
 * - TTL (Time-To-Leave) per track — single most-cited radio KPI
 *
 * GET /api/v1/analytics/retention         — heatmap + funnel + ATS/TTL
 */

interface CohortCell {
  cohortWeek: string       // '2026-W27'
  weekN: number            // 0 (signup), 1, 2, ... 12
  retentionPct: number     // 0-100
  listeners: number
}

interface FunnelStage {
  stage: string
  listeners: number
  pctOfFirst: number        // 0-100
  avgDaysFromFirst: number  // avg days from first tune-in to reach this stage
}

interface AtsByDaypart {
  daypart: string
  avgSessionMin: number
  vsTrailing7d: number      // +5.2 or -3.1
  vsTrailing28d: number
}

interface TtlByTrack {
  trackId: string
  title: string
  artist: string
  medianTtlSec: number      // median seconds before listener tunes out after this track starts
  skipRate: number          // %
}

const COHORT_WEEKS = ['2026-W24', '2026-W25', '2026-W26', '2026-W27', '2026-W28']
const HEATMAP: CohortCell[] = []
for (let w = 0; w < COHORT_WEEKS.length; w++) {
  for (let n = 0; n <= 12; n++) {
    const baseRetention = n === 0 ? 100 : Math.max(2, 100 * Math.exp(-n * 0.18) + (Math.random() - 0.5) * 5)
    const cohortSize = 200 + Math.floor(Math.random() * 300)
    HEATMAP.push({
      cohortWeek: COHORT_WEEKS[w],
      weekN: n,
      retentionPct: Math.round(baseRetention * 10) / 10,
      listeners: Math.round((baseRetention / 100) * cohortSize),
    })
  }
}

const FUNNEL: FunnelStage[] = [
  { stage: 'First tune-in', listeners: 8472, pctOfFirst: 100, avgDaysFromFirst: 0 },
  { stage: 'Tune-in > 15min', listeners: 6234, pctOfFirst: 73.6, avgDaysFromFirst: 0.2 },
  { stage: 'Tune-in > 1hr', listeners: 4128, pctOfFirst: 48.7, avgDaysFromFirst: 0.8 },
  { stage: 'First song request', listeners: 1247, pctOfFirst: 14.7, avgDaysFromFirst: 3.2 },
  { stage: 'First share', listeners: 489, pctOfFirst: 5.8, avgDaysFromFirst: 7.1 },
  { stage: 'First UGC submission', listeners: 142, pctOfFirst: 1.7, avgDaysFromFirst: 14.8 },
  { stage: 'P1 (core) listener', listeners: 87, pctOfFirst: 1.0, avgDaysFromFirst: 42.3 },
]

const ATS_BY_DAYPART: AtsByDaypart[] = [
  { daypart: 'morning-drive', avgSessionMin: 47.2, vsTrailing7d: +2.1, vsTrailing28d: +5.8 },
  { daypart: 'midday', avgSessionMin: 28.4, vsTrailing7d: -1.8, vsTrailing28d: +0.4 },
  { daypart: 'afternoon-drive', avgSessionMin: 41.7, vsTrailing7d: +3.2, vsTrailing28d: +7.1 },
  { daypart: 'evening', avgSessionMin: 32.1, vsTrailing7d: +0.8, vsTrailing28d: -2.3 },
  { daypart: 'overnight', avgSessionMin: 18.9, vsTrailing7d: -0.4, vsTrailing28d: +1.2 },
]

const TTL_BY_TRACK: TtlByTrack[] = [
  { trackId: 'trk-001', title: 'Seven Nation Army', artist: 'The White Stripes', medianTtlSec: 245, skipRate: 1.2 },
  { trackId: 'trk-002', title: 'Everlong', artist: 'Foo Fighters', medianTtlSec: 312, skipRate: 0.8 },
  { trackId: 'trk-003', title: 'Thunderstruck', artist: 'AC/DC', medianTtlSec: 287, skipRate: 1.5 },
  { trackId: 'trk-004', title: 'Black Hole Sun', artist: 'Soundgarden', medianTtlSec: 198, skipRate: 3.8 },
  { trackId: 'trk-005', title: 'Hotel California', artist: 'Eagles', medianTtlSec: 356, skipRate: 0.5 },
  { trackId: 'trk-009', title: 'Zombie', artist: 'The Cranberries', medianTtlSec: 278, skipRate: 1.9 },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  return NextResponse.json({
    heatmap: {
      cohorts: COHORT_WEEKS,
      weeks: Array.from({ length: 13 }, (_, i) => i),
      cells: HEATMAP,
      avgRetentionW4: Math.round(HEATMAP.filter((c) => c.weekN === 4).reduce((s, c) => s + c.retentionPct, 0) / COHORT_WEEKS.length * 10) / 10,
      avgRetentionW12: Math.round(HEATMAP.filter((c) => c.weekN === 12).reduce((s, c) => s + c.retentionPct, 0) / COHORT_WEEKS.length * 10) / 10,
    },
    funnel: FUNNEL,
    funnelDropOff: {
      'tune-in → 15min': Math.round((1 - FUNNEL[1].pctOfFirst / FUNNEL[0].pctOfFirst) * 1000) / 10,
      '15min → 1hr': Math.round((1 - FUNNEL[2].pctOfFirst / FUNNEL[1].pctOfFirst) * 1000) / 10,
      '1hr → request': Math.round((1 - FUNNEL[3].pctOfFirst / FUNNEL[2].pctOfFirst) * 1000) / 10,
      'request → share': Math.round((1 - FUNNEL[4].pctOfFirst / FUNNEL[3].pctOfFirst) * 1000) / 10,
    },
    atsByDaypart: ATS_BY_DAYPART,
    atsByShow: [
      { show: 'Morning Show', avgSessionMin: 47.2, vsTrailing7d: +2.1 },
      { show: 'Midday Music Mix', avgSessionMin: 28.4, vsTrailing7d: -1.8 },
      { show: 'Afternoon Drive', avgSessionMin: 41.7, vsTrailing7d: +3.2 },
      { show: 'Evening Rock', avgSessionMin: 32.1, vsTrailing7d: +0.8 },
      { show: 'Overnight Mix', avgSessionMin: 18.9, vsTrailing7d: -0.4 },
    ],
    ttlByTrack: TTL_BY_TRACK,
    stats: {
      totalListeners: 8472,
      p1Listeners: 87,
      p1ConversionRate: 1.0,
      avgAtsMin: Math.round((ATS_BY_DAYPART.reduce((s, a) => s + a.avgSessionMin, 0) / ATS_BY_DAYPART.length) * 10) / 10,
      medianTtlSec: Math.round(TTL_BY_TRACK.reduce((s, t) => s + t.medianTtlSec, 0) / TTL_BY_TRACK.length),
      bestRetentionCohort: COHORT_WEEKS[0],
    },
    tech: {
      methodology: 'Nielsen/Ipsos standard — daypart + device are core dimensions',
      cohortDefinition: 'Listeners grouped by first tune-in week',
      retentionWindow: '12 weeks (radio industry standard)',
      ttlMeasurement: 'Seconds from track.start to listener tune-out',
      visualization: 'react-simple-maps for geo, recharts for heatmap, d3-sankey for funnel',
    },
  })
}
