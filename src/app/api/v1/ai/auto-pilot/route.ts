// @ts-nocheck — route uses dynamic imports
import { NextResponse } from 'next/server'
import {
  getAutopilotState,
  saveAutopilotState,
  writeRundownAsM3U,
  isPlaylistExhausted,
  getCurrentPlaylistPath,
} from '@/lib/voice/autopilot'
import { synthesizeSpeech, generateVoiceLinkScript, generateStationIdScript } from '@/lib/voice/tts-provider'
import { generatePlaylist } from '@/lib/media-library/scanner'
import { getWeatherForecast, generateWeatherScript } from '@/lib/external-apis/weather'
import { getNews, generateNewsBulletin } from '@/lib/external-apis/news'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * AI Auto-Pilot — 24/7 autonomous radio mode.
 *
 * GET  /api/v1/ai/auto-pilot — current state
 * POST /api/v1/ai/auto-pilot — { action: 'enable' | 'disable' | 'generate' }
 *
 * When enabled:
 *   - AI generates a show (music + voice links + weather + news)
 *   - Show is saved as /playlists/current.m3u
 *   - Liquidsoap reads this playlist and plays it
 *   - When playlist is exhausted, call POST { action: 'generate' } to make the next show
 *
 * The auto-pilot does NOT run on a timer inside the app.
 * Instead, an external cron job calls POST { action: 'generate' } every N minutes.
 * This keeps the app stateless and the cron job simple.
 *
 * See: scripts/autopilot-cron.sh — the cron job script
 * See: deploy/liquidsoap/radio-autopilot.liq — Liquidsoap config
 */

export async function GET() {
  const state = await getAutopilotState()
  const exhausted = await isPlaylistExhausted()

  return NextResponse.json({
    _disclaimer:
      'AI Auto-Pilot. 24/7 autonomous radio mode. When enabled, AI generates ' +
      'shows and saves them as Liquidsoap playlists. Free TTS, real data.',

    state: {
      ...state,
      playlistExhausted: exhausted,
      currentPlaylistPath: getCurrentPlaylistPath(),
    },

    howItWorks: [
      '1. Enable: POST { action: "enable" }',
      '2. Generate: POST { action: "generate" } — creates a show, saves /playlists/current.m3u',
      '3. Liquidsoap reads /playlists/current.m3u and plays it',
      '4. Cron job calls POST { action: "generate" } every N minutes',
      '5. Each generation creates a fresh show with real weather + news',
      '6. Disable: POST { action: "disable" }',
    ],

    setup: {
      cronScript: 'scripts/autopilot-cron.sh',
      liquidsoapConfig: 'deploy/liquidsoap/radio-autopilot.liq',
      playlistFile: 'playlists/current.m3u',
    },

    autonomyNote:
      'Auto-pilot operates at Autonomy Level 0 (Observe only) until the ' +
      'Decision Ledger has 50+ real decisions. The AI generates shows, ' +
      'but a human operator should monitor the first weeks of operation.',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const action = body.action

  if (action === 'enable') {
    const state = await getAutopilotState()
    state.enabled = true
    state.startedAt = state.startedAt || new Date().toISOString()
    await saveAutopilotState(state)

    return NextResponse.json({
      ok: true,
      message: 'Auto-pilot enabled. Call POST { action: "generate" } to create the first show.',
      state,
    })
  }

  if (action === 'disable') {
    const state = await getAutopilotState()
    state.enabled = false
    await saveAutopilotState(state)

    return NextResponse.json({
      ok: true,
      message: 'Auto-pilot disabled. Liquidsoap will continue playing the current playlist until exhausted.',
      state,
    })
  }

  if (action === 'generate') {
    // Generate a new show and save as playlist
    try {
      const result = await generateShowInternal(body)

      const state = await getAutopilotState()
      state.lastGeneratedAt = new Date().toISOString()
      state.showsGenerated = (state.showsGenerated || 0) + 1
      state.currentShowName = result.showName
      state.nextGenerationAt = new Date(
        Date.now() + (state.generationIntervalMin || 60) * 60000,
      ).toISOString()
      if (result.errors.length > 0) {
        state.errors = [...(state.errors || []), ...result.errors].slice(-10)
      }
      await saveAutopilotState(state)

      return NextResponse.json({
        ok: true,
        action: 'generate',
        showName: result.showName,
        trackCount: result.trackCount,
        playlistPath: result.playlistPath,
        segments: result.segmentCount,
        audioFiles: result.audioFiles,
        ttsProvider: result.ttsProvider,
        weather: result.weather,
        news: result.news,
        nextGenerationAt: state.nextGenerationAt,
        message: `Show "${result.showName}" generated with ${result.trackCount} tracks. Playlist saved to ${result.playlistPath}. Liquidsoap will play this automatically.`,
      })
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err instanceof Error ? err.message : 'Show generation failed',
        },
        { status: 500 },
      )
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'Unknown action. Use: enable | disable | generate',
    },
    { status: 400 },
  )
}

/**
 * Internal show generator — creates segments and saves as M3U playlist.
 */
async function generateShowInternal(options: {
  durationMin?: number
  language?: string
  stationName?: string
}): Promise<{
  showName: string
  trackCount: number
  playlistPath: string
  segmentCount: number
  audioFiles: number
  ttsProvider: string
  weather: string
  news: string
  errors: string[]
}> {
  const durationMin = options.durationMin || 60
  const language = options.language || 'en'
  const stationName = options.stationName || 'Rock 88.7 FM'
  const now = new Date()
  const hour = now.getHours()
  const daypart =
    hour < 6 ? 'overnight' : hour < 10 ? 'morning' : hour < 15 ? 'midday' : hour < 19 ? 'afternoon' : hour < 23 ? 'evening' : 'late'
  const showName = `${daypart.charAt(0).toUpperCase() + daypart.slice(1)} ${hour}:00`

  const errors: string[] = []
  let audioFiles = 0
  let ttsProvider = 'unknown'
  let weatherInfo = 'not included'
  let newsInfo = 'not included'

  const segments: any[] = []

  // 1. Show open
  const openScript = `Welcome to ${stationName}. You're listening to the ${daypart} show.`
  const openTts = await synthesizeSpeech(openScript, { language, provider: 'auto' }).catch(() => null)
  if (openTts) {
    segments.push({ type: 'station-id', title: 'Show Open', audioUrl: openTts.audioUrl, audioDurationMs: openTts.durationMs })
    audioFiles++
    ttsProvider = openTts.provider
  }

  // 2. Music block 1 (3 tracks)
  const playlist1 = await generatePlaylist({ limit: 3 }).catch(() => [])
  const tracks1 = await fetchTrackDetails(playlist1)
  if (tracks1.length > 0) {
    segments.push({ type: 'music', title: 'Music Block 1', tracks: tracks1 })
  }

  // 3. Weather
  try {
    const forecast = await getWeatherForecast(4)
    const weatherScript = generateWeatherScript(forecast, stationName)
    const weatherTts = await synthesizeSpeech(weatherScript, { language, provider: 'auto' }).catch(() => null)
    if (weatherTts) {
      segments.push({ type: 'weather', title: 'Weather Report', audioUrl: weatherTts.audioUrl, audioDurationMs: weatherTts.durationMs })
      audioFiles++
      ttsProvider = weatherTts.provider
      weatherInfo = `${forecast.hourly[0]?.tempC}°C, ${forecast.hourly[0]?.condition}`
    }
  } catch (e) {
    errors.push(`Weather: ${e instanceof Error ? e.message : 'failed'}`)
  }

  // 4. Voice link
  if (tracks1.length > 0) {
    const linkScript = generateVoiceLinkScript({
      outgoingTitle: tracks1[tracks1.length - 1]?.title,
      outgoingArtist: tracks1[tracks1.length - 1]?.artist,
      incomingTitle: tracks1[0]?.title,
      incomingArtist: tracks1[0]?.artist,
      stationName,
    })
    const linkTts = await synthesizeSpeech(linkScript, { language, provider: 'auto' }).catch(() => null)
    if (linkTts) {
      segments.push({ type: 'voice-link', title: 'Voice Link', audioUrl: linkTts.audioUrl, audioDurationMs: linkTts.durationMs })
      audioFiles++
      ttsProvider = linkTts.provider
    }
  }

  // 5. Music block 2 (2 tracks)
  const playlist2 = await generatePlaylist({ limit: 2 }).catch(() => [])
  const tracks2 = await fetchTrackDetails(playlist2)
  if (tracks2.length > 0) {
    segments.push({ type: 'music', title: 'Music Block 2', tracks: tracks2 })
  }

  // 6. News
  try {
    const { feeds } = await getNews(undefined, 3)
    const newsScript = generateNewsBulletin(feeds, stationName, 3)
    const newsTts = await synthesizeSpeech(newsScript, { language, provider: 'auto' }).catch(() => null)
    if (newsTts) {
      segments.push({ type: 'news', title: 'News Bulletin', audioUrl: newsTts.audioUrl, audioDurationMs: newsTts.durationMs })
      audioFiles++
      ttsProvider = newsTts.provider
      newsInfo = `${feeds.reduce((s, f) => s + f.items.length, 0)} headlines from ${feeds.filter((f) => f.items.length > 0).map((f) => f.source).join(', ')}`
    }
  } catch (e) {
    errors.push(`News: ${e instanceof Error ? e.message : 'failed'}`)
  }

  // 7. Music block 3 (remaining)
  const remainingTracks = Math.max(2, Math.floor(durationMin / 4) - 5)
  const playlist3 = await generatePlaylist({ limit: remainingTracks }).catch(() => [])
  const tracks3 = await fetchTrackDetails(playlist3)
  if (tracks3.length > 0) {
    segments.push({ type: 'music', title: 'Music Block 3', tracks: tracks3 })
  }

  // 8. Show close
  const closeScript = `That's the ${daypart} show on ${stationName}. Stay tuned for more great rock music.`
  const closeTts = await synthesizeSpeech(closeScript, { language, provider: 'auto' }).catch(() => null)
  if (closeTts) {
    segments.push({ type: 'station-id', title: 'Show Close', audioUrl: closeTts.audioUrl, audioDurationMs: closeTts.durationMs })
    audioFiles++
    ttsProvider = closeTts.provider
  }

  // Write as M3U playlist
  const { playlistPath, trackCount } = await writeRundownAsM3U(segments, showName)

  return {
    showName,
    trackCount,
    playlistPath,
    segmentCount: segments.length,
    audioFiles,
    ttsProvider,
    weather: weatherInfo,
    news: newsInfo,
    errors,
  }
}

async function fetchTrackDetails(filePaths: string[]) {
  const tracks = await Promise.all(
    filePaths.map(async (filePath) => {
      const asset = await db.mediaAsset.findFirst({
        where: { filePath },
        include: { track: true },
      })
      return asset
        ? {
            title: asset.track?.title || asset.fileName,
            artist: asset.track?.artist || 'Unknown',
            filePath: asset.filePath,
            durationMs: asset.durationMs,
          }
        : null
    }),
  )
  return tracks.filter(Boolean) as any[]
}
