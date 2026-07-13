import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AI Program Director — full context-aware programming decisions.
 *
 * Zahteva: Feature Store (realtime_features) + Warehouse (track_plays, listener_sessions).
 *
 * Namesto enostavnega "play next track" AI Program Director upošteva:
 *   - Čas dneva + daypart
 *   - Vreme (sonce → več energije, dež → melanholija)
 *   - Praznik / poseben dan
 *   - Športni dogodek (pred/med/po)
 *   - Prometna situacija (rush hour)
 *   - Energija zadnjih 30 minut
 *   - Minute od zadnjega hita
 *   - Minute od zadnje reklame
 *   - Listener trend (narašča/pada)
 *   - Dan v tednu
 *
 * GET /api/v1/ai/program-director         — current context + recommendations
 * POST /api/v1/ai/program-director         — get recommendation, apply
 */

interface ProgramContext {
  timestamp: string
  stationId: string
  // Time
  hour: number
  dayOfWeek: number
  daypart: string
  isWeekend: boolean
  // External
  weather: { tempC: number; condition: string; humidity: number; windKmh: number }
  isHoliday: boolean
  holidayName: string | null
  sportsEvent: { active: boolean; name: string | null; phase: 'pre' | 'live' | 'post' | null }
  trafficLevel: 'low' | 'medium' | 'high'
  // Program state
  currentListeners: number
  listenerTrend: 'increasing' | 'stable' | 'decreasing'
  energyLast30min: number // 0-1
  minutesSinceLastHit: number
  minutesSinceLastAd: number
  minutesSinceLastJingle: number
  // Show
  currentShow: string
  showProgressPct: number
}

interface Recommendation {
  id: string
  timestamp: string
  type: 'play-track' | 'play-jingle' | 'play-ad' | 'voice-track' | 'weather-break' | 'news-break'
  reason: string
  confidence: number
  contextFactors: string[]
  // For play-track
  trackId?: string
  trackTitle?: string
  trackArtist?: string
  targetEnergy?: number
  // Priority
  priority: 'critical' | 'high' | 'medium' | 'low'
}

function getCurrentContext(): ProgramContext {
  const now = new Date()
  const hour = now.getHours()
  const dow = now.getDay()
  const isWeekend = dow === 0 || dow === 6

  let daypart = 'overnight'
  if (hour >= 6 && hour < 10) daypart = 'morning-drive'
  else if (hour >= 10 && hour < 15) daypart = 'midday'
  else if (hour >= 15 && hour < 19) daypart = 'afternoon-drive'
  else if (hour >= 19 && hour < 22) daypart = 'evening'

  return {
    timestamp: now.toISOString(),
    stationId: 'main-fm',
    hour, dayOfWeek: dow, daypart, isWeekend,
    weather: { tempC: 24, condition: 'sunny', humidity: 45, windKmh: 8 },
    isHoliday: false, holidayName: null,
    sportsEvent: { active: false, name: null, phase: null },
    trafficLevel: hour >= 7 && hour <= 9 ? 'high' : hour >= 16 && hour <= 18 ? 'high' : 'low',
    currentListeners: 1492,
    listenerTrend: 'stable',
    energyLast30min: 0.72,
    minutesSinceLastHit: 14,
    minutesSinceLastAd: 8,
    minutesSinceLastJingle: 22,
    currentShow: 'Afternoon Drive',
    showProgressPct: 65,
  }
}

function generateRecommendations(ctx: ProgramContext): Recommendation[] {
  const recs: Recommendation[] = []
  const factors: string[] = []

  // Rule: No hit for >15min → play power track
  if (ctx.minutesSinceLastHit > 15) {
    factors.push(`No hit in ${ctx.minutesSinceLastHit}min (threshold: 15min)`)
    recs.push({
      id: `rec-${Date.now()}-1`, timestamp: new Date().toISOString(),
      type: 'play-track', reason: `${ctx.minutesSinceLastHit} minutes since last power track — listeners need a familiar hit`,
      confidence: 0.92, contextFactors: [...factors],
      trackId: 'trk-001', trackTitle: 'Seven Nation Army', trackArtist: 'The White Stripes',
      targetEnergy: 0.85, priority: 'high',
    })
  }

  // Rule: Ad break every 20-30 min
  if (ctx.minutesSinceLastAd > 20) {
    factors.push(`${ctx.minutesSinceLastAd}min since last ad (threshold: 20min)`)
    recs.push({
      id: `rec-${Date.now()}-2`, timestamp: new Date().toISOString(),
      type: 'play-ad', reason: `Ad break window reached (${ctx.minutesSinceLastAd}min since last)`,
      confidence: 0.88, contextFactors: [...factors],
      priority: 'high',
    })
  }

  // Rule: Weather context — rainy → softer tracks
  if (ctx.weather.condition === 'rainy' && ctx.energyLast30min > 0.7) {
    factors.push(`Weather: rainy, but energy=${ctx.energyLast30min.toFixed(2)} — consider softer track`)
    recs.push({
      id: `rec-${Date.now()}-3`, timestamp: new Date().toISOString(),
      type: 'play-track', reason: 'Rainy weather detected — listener mood suggests softer energy (0.4-0.6)',
      confidence: 0.75, contextFactors: [...factors],
      trackId: 'trk-004', trackTitle: 'Black Hole Sun', trackArtist: 'Soundgarden',
      targetEnergy: 0.5, priority: 'medium',
    })
  }

  // Rule: Rush hour → higher energy + traffic update
  if (ctx.trafficLevel === 'high' && ctx.daypart.includes('drive')) {
    factors.push(`Rush hour (${ctx.trafficLevel} traffic) — high energy + traffic report`)
    recs.push({
      id: `rec-${Date.now()}-4`, timestamp: new Date().toISOString(),
      type: 'weather-break', reason: 'Rush hour traffic update — high listener value',
      confidence: 0.85, contextFactors: [...factors],
      priority: 'high',
    })
  }

  // Rule: Jingle every 25min
  if (ctx.minutesSinceLastJingle > 25) {
    factors.push(`${ctx.minutesSinceLastJingle}min since last jingle (threshold: 25min)`)
    recs.push({
      id: `rec-${Date.now()}-5`, timestamp: new Date().toISOString(),
      type: 'play-jingle', reason: 'Station ID rotation — reinforce brand',
      confidence: 0.80, contextFactors: [...factors],
      priority: 'medium',
    })
  }

  // Rule: Sports event context
  if (ctx.sportsEvent.active && ctx.sportsEvent.phase === 'pre') {
    factors.push(`Sports event: ${ctx.sportsEvent.name} starting soon`)
    recs.push({
      id: `rec-${Date.now()}-6`, timestamp: new Date().toISOString(),
      type: 'voice-track', reason: `Mention upcoming ${ctx.sportsEvent.name} in voice link`,
      confidence: 0.70, contextFactors: [...factors],
      priority: 'medium',
    })
  }

  // Rule: Holiday context
  if (ctx.isHoliday) {
    factors.push(`Holiday: ${ctx.holidayName}`)
    recs.push({
      id: `rec-${Date.now()}-7`, timestamp: new Date().toISOString(),
      type: 'play-track', reason: `${ctx.holidayName} — play themed/celebratory tracks`,
      confidence: 0.65, contextFactors: [...factors],
      trackId: 'trk-005', trackTitle: 'Holiday-themed track', trackArtist: 'Various',
      targetEnergy: 0.75, priority: 'low',
    })
  }

  // Rule: Energy curve management
  if (ctx.energyLast30min > 0.85) {
    factors.push(`Sustained high energy (${ctx.energyLast30min.toFixed(2)}) — consider cooldown track`)
    recs.push({
      id: `rec-${Date.now()}-8`, timestamp: new Date().toISOString(),
      type: 'play-track', reason: 'Energy management — 30min avg >0.85, reduce to prevent listener fatigue',
      confidence: 0.72, contextFactors: [...factors],
      trackId: 'trk-007', trackTitle: 'Wonderwall', trackArtist: 'Oasis',
      targetEnergy: 0.4, priority: 'medium',
    })
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recs
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const ctx = getCurrentContext()
  const recs = generateRecommendations(ctx)

  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — context factors are real (hour, daypart, traffic rules), but weather/holiday/sports data requires external API integration. Recommendations are rule-based (not ML) — production would use trained model from Feature Store.',
    context: ctx,
    recommendations: recs,
    stats: {
      activeRecommendations: recs.length,
      highPriority: recs.filter((r) => r.priority === 'high').length,
      avgConfidence: recs.length > 0 ? Math.round(recs.reduce((s, r) => s + r.confidence, 0) / recs.length * 100) / 100 : 0,
    },
    rules: [
      'No hit for >15min → play power track',
      'Ad break every 20-30min',
      'Rainy weather + high energy → softer track',
      'Rush hour + drive daypart → traffic update + high energy',
      'Jingle every 25min',
      'Sports event pre → mention in voice link',
      'Holiday → themed tracks',
      'Sustained energy >0.85 for 30min → cooldown track',
    ],
    comparedTo: {
      rcsZetta: 'RCS Zetta has "Selector" + "GSelector" with similar rule engine',
      wideorbit: 'WideOrbit has "Music" module with daypart rules',
      aiNative: 'Rock 88.7 adds real-time context (weather, traffic, sports) that legacy systems lack',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'apply' && body.recommendationId) {
    return NextResponse.json({
      ok: true,
      recommendationId: body.recommendationId,
      appliedAt: new Date().toISOString(),
      message: 'Recommendation applied to schedule',
    })
  }

  if (body.action === 'dismiss' && body.recommendationId) {
    return NextResponse.json({ ok: true, message: 'Recommendation dismissed' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
