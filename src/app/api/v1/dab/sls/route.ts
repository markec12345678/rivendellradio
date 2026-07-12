import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DAB+ DLS+ Slideshow (SLS) via MOT — ETSI TS 101 499.
 *
 * Modern DAB+ receivers show slideshow images as default content.
 * Station logos, artist images, now-playing art — auto-cycling every 15s
 * with a branded fallback during talk segments.
 *
 * GET  /api/v1/dab/sls         — slideshow queue + slide history
 * POST /api/v1/dab/sls         — push slide, configure cycle interval
 *
 * Spec: ETSI TS 101 499 (DAB Slideshow), MOT (Multimedia Object Transfer)
 */

interface Slide {
  id: string
  title: string
  imageUrl: string
  width: number
  height: number
  format: 'JPEG' | 'PNG'
  category: 'now-playing' | 'station-logo' | 'ad' | 'weather' | 'news' | 'fallback'
  priority: number          // 1 = highest
  pushAt: string
  durationSec: number       // how long to display
  status: 'queued' | 'on-air' | 'aired'
  // Linkage
  trackId?: string
  advertiser?: string
  // MOT metadata
  motObjectId: string
  contentLocation: string
}

const SLIDES: Slide[] = [
  { id: 'slide-001', title: 'Now Playing: Seven Nation Army', imageUrl: 's3://rock887-sls/seven-nation-army-640x480.jpg', width: 640, height: 480, format: 'JPEG', category: 'now-playing', priority: 1, pushAt: new Date(Date.now() - 180000).toISOString(), durationSec: 30, status: 'on-air', trackId: 'trk-001', motObjectId: 'mot-001', contentLocation: '/slide/now-playing' },
  { id: 'slide-002', title: 'Rock 88.7 Station Logo', imageUrl: 's3://rock887-sls/logo-320x240.png', width: 320, height: 240, format: 'PNG', category: 'station-logo', priority: 5, pushAt: new Date(Date.now() - 120000).toISOString(), durationSec: 10, status: 'queued', motObjectId: 'mot-002', contentLocation: '/slide/logo' },
  { id: 'slide-003', title: 'Pepsi Summer Refresh — Ad', imageUrl: 's3://rock887-sls/pepsi-ad-640x480.jpg', width: 640, height: 480, format: 'JPEG', category: 'ad', priority: 2, pushAt: new Date(Date.now() - 60000).toISOString(), durationSec: 15, status: 'queued', advertiser: 'Pepsi', motObjectId: 'mot-003', contentLocation: '/slide/ad' },
  { id: 'slide-004', title: 'Weather: Sunny 28°C', imageUrl: 's3://rock887-sls/weather-640x480.jpg', width: 640, height: 480, format: 'JPEG', category: 'weather', priority: 3, pushAt: new Date(Date.now() - 30000).toISOString(), durationSec: 10, status: 'queued', motObjectId: 'mot-004', contentLocation: '/slide/weather' },
  { id: 'slide-005', title: 'Branded Fallback (Talk)', imageUrl: 's3://rock887-sls/fallback-640x480.jpg', width: 640, height: 480, format: 'JPEG', category: 'fallback', priority: 10, pushAt: new Date(Date.now() - 600000).toISOString(), durationSec: 15, status: 'aired', motObjectId: 'mot-005', contentLocation: '/slide/fallback' },
]

const CONFIG = {
  cycleIntervalSec: 15,         // default slide duration
  talkSegmentFallback: true,    // show branded fallback during talk segments
  resolution: '640x480',        // DAB+ SLS standard resolution
  maxQueueSize: 20,
  autoPushOnTrackChange: true,  // auto-push now-playing art when track changes
  autoPushWeather: true,        // auto-push weather every hour
  fallbackSlideId: 'slide-005',
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  const onAir = SLIDES.find((s) => s.status === 'on-air')
  const queued = SLIDES.filter((s) => s.status === 'queued').sort((a, b) => a.priority - b.priority)

  return NextResponse.json({
    config: CONFIG,
    onAir,
    queue: queued,
    history: SLIDES.filter((s) => s.status === 'aired').slice(-10),
    stats: {
      totalSlides: SLIDES.length,
      slidesToday: 142,
      avgCycleMs: 15800,
      adSlidesToday: 23,
      nowPlayingSlidesToday: 89,
      fallbackSlidesToday: 18,
    },
    tech: {
      standard: 'ETSI TS 101 499 (DAB Slideshow)',
      transport: 'MOT (Multimedia Object Transfer) via DAB PAD',
      resolutions: ['320x240', '640x480'],
      formats: ['JPEG', 'PNG'],
      maxFileSize: '256 KB per slide',
      cycleInterval: `${CONFIG.cycleIntervalSec}s default`,
    },
    integration: {
      trackChange: 'track.started event → push now-playing slide (auto)',
      adBreak: 'SCTE-35 cue → push ad slide',
      weather: 'Hourly cron → push weather slide',
      talk: 'GPIO mic-on → push fallback slide',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'push-slide') {
    const slide: Slide = {
      id: `slide-${Date.now()}`,
      title: body.title ?? 'Untitled Slide',
      imageUrl: body.imageUrl ?? `s3://rock887-sls/slide-${Date.now()}.jpg`,
      width: body.width ?? 640,
      height: body.height ?? 480,
      format: body.format ?? 'JPEG',
      category: body.category ?? 'fallback',
      priority: body.priority ?? 5,
      pushAt: new Date().toISOString(),
      durationSec: body.durationSec ?? CONFIG.cycleIntervalSec,
      status: 'queued',
      trackId: body.trackId,
      advertiser: body.advertiser,
      motObjectId: `mot-${Date.now()}`,
      contentLocation: body.contentLocation ?? `/slide/${Date.now()}`,
    }
    SLIDES.unshift(slide)
    if (SLIDES.length > CONFIG.maxQueueSize) SLIDES.length = CONFIG.maxQueueSize
    return NextResponse.json({ ok: true, slide, message: `Slide "${slide.title}" queued (priority ${slide.priority})` })
  }

  if (body.action === 'configure') {
    if (body.cycleIntervalSec !== undefined) CONFIG.cycleIntervalSec = Math.max(5, Math.min(60, body.cycleIntervalSec))
    if (body.talkSegmentFallback !== undefined) CONFIG.talkSegmentFallback = Boolean(body.talkSegmentFallback)
    if (body.autoPushOnTrackChange !== undefined) CONFIG.autoPushOnTrackChange = Boolean(body.autoPushOnTrackChange)
    return NextResponse.json({ ok: true, config: CONFIG })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
