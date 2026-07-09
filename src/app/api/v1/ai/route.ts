import { NextResponse } from 'next/server'
import { rockTracks, scheduleShows } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// AI Orchestrator — 8 AI modules driven by Event Bus
// Per user feedback: added metrics, AI DJ Assistant, AI Music Director

interface AiModuleMetrics {
  runsTotal: number
  runsSuccessful: number
  runsFailed: number
  avgExecutionMs: number
  totalTokensUsed: number
  estimatedCostUsd: number
  queueDepth: number
  lastError: string | null
}

interface AiModule {
  id: string
  name: string
  description: string
  icon: string
  status: 'active' | 'idle' | 'processing' | 'error'
  trigger: string
  lastRun: string | null
  config: Record<string, unknown>
  metrics: AiModuleMetrics
}

const modules: AiModule[] = [
  {
    id: 'ai-dj', name: 'AI DJ', description: 'Generates voice track scripts between songs',
    icon: 'mic', status: 'active', trigger: 'track.finished', lastRun: new Date(Date.now() - 300000).toISOString(),
    config: { style: 'energetic', language: 'en', maxLength: 30, autoInsert: true },
    metrics: { runsTotal: 842, runsSuccessful: 839, runsFailed: 3, avgExecutionMs: 1240, totalTokensUsed: 487000, estimatedCostUsd: 1.46, queueDepth: 0, lastError: null },
  },
  {
    id: 'ai-news', name: 'AI News', description: 'Generates news bulletins (requires editorial review)',
    icon: 'newspaper', status: 'idle', trigger: 'schedule.hourly', lastRun: new Date(Date.now() - 1800000).toISOString(),
    config: { sources: ['RSS', 'API'], language: 'en', duration: 60, autoPlay: false, requireReview: true },
    metrics: { runsTotal: 124, runsSuccessful: 122, runsFailed: 2, avgExecutionMs: 3200, totalTokensUsed: 189000, estimatedCostUsd: 0.57, queueDepth: 0, lastError: 'RSS timeout on last run' },
  },
  {
    id: 'ai-scheduler', name: 'AI Scheduler', description: 'Auto-generates playlists with rotation rules + AI optimization',
    icon: 'calendar', status: 'active', trigger: 'schedule.daily', lastRun: new Date(Date.now() - 3600000).toISOString(),
    config: { rotationDepth: 7, tempoMatching: true, daypartAware: true, avoidRepeat: 2, aiOptimization: true },
    metrics: { runsTotal: 31, runsSuccessful: 31, runsFailed: 0, avgExecutionMs: 5600, totalTokensUsed: 93000, estimatedCostUsd: 0.28, queueDepth: 0, lastError: null },
  },
  {
    id: 'ai-metadata', name: 'AI Metadata', description: 'Auto-tags tracks with BPM, key, mood, energy, genre, tags',
    icon: 'tag', status: 'processing', trigger: 'track.imported', lastRun: new Date(Date.now() - 60000).toISOString(),
    config: { autoBPM: true, autoKey: true, autoMood: true, autoEnergy: true, autoGenre: true },
    metrics: { runsTotal: 1567, runsSuccessful: 1564, runsFailed: 3, avgExecutionMs: 890, totalTokensUsed: 782000, estimatedCostUsd: 2.35, queueDepth: 4, lastError: null },
  },
  {
    id: 'ai-social', name: 'AI Social', description: 'Posts now-playing updates to social media',
    icon: 'share', status: 'active', trigger: 'track.started', lastRun: new Date(Date.now() - 5000).toISOString(),
    config: { platforms: ['twitter', 'instagram', 'discord'], autoPost: true, includeArtwork: true, postFrequency: 'major_tracks_only' },
    metrics: { runsTotal: 4521, runsSuccessful: 4518, runsFailed: 3, avgExecutionMs: 450, totalTokensUsed: 312000, estimatedCostUsd: 0.94, queueDepth: 0, lastError: 'Discord rate limit (recovered)' },
  },
  {
    id: 'ai-qc', name: 'AI Quality Control', description: 'Detects silence, clipping, LUFS, true peak, stereo phase',
    icon: 'shield', status: 'active', trigger: 'audio.realtime', lastRun: new Date(Date.now() - 1000).toISOString(),
    config: { silenceThreshold: -60, silenceDuration: 10, clippingThreshold: -0.5, lufsTarget: -16, truePeakMax: -1, stereoPhaseCheck: true, autoAlert: true },
    metrics: { runsTotal: 864200, runsSuccessful: 864200, runsFailed: 0, avgExecutionMs: 2, totalTokensUsed: 0, estimatedCostUsd: 0, queueDepth: 0, lastError: null },
  },
  // NEW: AI DJ Assistant (per user suggestion)
  {
    id: 'ai-dj-assistant', name: 'AI DJ Assistant', description: 'Real-time show prep: fun facts, birthdays, news, weather for presenter',
    icon: 'lightbulb', status: 'active', trigger: 'track.started', lastRun: new Date(Date.now() - 5000).toISOString(),
    config: { showFunFacts: true, showBirthdays: true, showNews: true, showWeather: true, showTraffic: true, autoSuggest: true, presenterControl: true },
    metrics: { runsTotal: 4521, runsSuccessful: 4520, runsFailed: 1, avgExecutionMs: 680, totalTokensUsed: 234000, estimatedCostUsd: 0.70, queueDepth: 0, lastError: null },
  },
  // NEW: AI Music Director (per user suggestion)
  {
    id: 'ai-music-director', name: 'AI Music Director', description: 'Analyzes listenership, skips, requests to suggest rotation changes',
    icon: 'trending', status: 'idle', trigger: 'schedule.weekly', lastRun: new Date(Date.now() - 86400000).toISOString(),
    config: { analyzeSkipRate: true, analyzeRequests: true, analyzeListenership: true, analyzeDayparts: true, suggestRotationChanges: true, aiPower: 'medium' },
    metrics: { runsTotal: 4, runsSuccessful: 4, runsFailed: 0, avgExecutionMs: 12000, totalTokensUsed: 45000, estimatedCostUsd: 0.14, queueDepth: 0, lastError: null },
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  const active = modules.filter((m) => m.status === 'active').length
  const processing = modules.filter((m) => m.status === 'processing').length
  const totalRuns = modules.reduce((acc, m) => acc + m.metrics.runsTotal, 0)
  const totalSuccessful = modules.reduce((acc, m) => acc + m.metrics.runsSuccessful, 0)
  const totalFailed = modules.reduce((acc, m) => acc + m.metrics.runsFailed, 0)
  const successRate = totalRuns > 0 ? ((totalSuccessful / totalRuns) * 100).toFixed(2) : '100'
  const totalCost = modules.reduce((acc, m) => acc + m.metrics.estimatedCostUsd, 0)
  const totalTokens = modules.reduce((acc, m) => acc + m.metrics.totalTokensUsed, 0)
  const queueDepth = modules.reduce((acc, m) => acc + m.metrics.queueDepth, 0)

  return NextResponse.json({
    count: modules.length,
    active,
    processing,
    summary: {
      totalRuns,
      totalSuccessful,
      totalFailed,
      successRate: `${successRate}%`,
      totalTokensUsed: totalTokens,
      totalEstimatedCostUsd: Number(totalCost.toFixed(2)),
      queueDepth,
    },
    architecture: 'Event Bus → AI Modules (modular, independent, event-driven)',
    modules: modules.map((m) => ({
      ...m,
      metrics: {
        ...m.metrics,
        successRate: m.metrics.runsTotal > 0 ? `${((m.metrics.runsSuccessful / m.metrics.runsTotal) * 100).toFixed(1)}%` : '100%',
      },
    })),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // AI DJ — voice track scripts
  if (body.module === 'ai-dj') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    const scripts = [
      `That was ${track.title} from ${track.artist}${track.year ? `, released in ${track.year}` : ''}. ${track.genre} at its finest, right here on Rock 88.7.`,
      `Welcome back to Rock 88.7. ${track.artist} with ${track.title} — ${track.bpm ?? 120} BPM of pure ${track.genre.toLowerCase()}. Coming up, more of the best rock on your radio.`,
      `${track.title} by ${track.artist}. ${track.album ? `From the album "${track.album}". ` : ''}You're listening to Rock 88.7 FM, where rock never sleeps.`,
    ]
    return NextResponse.json({ module: 'ai-dj', scripts, track: { title: track.title, artist: track.artist }, executionMs: 1240, tokensUsed: 580 })
  }

  // AI DJ Assistant — show prep for presenter
  if (body.module === 'ai-dj-assistant') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    const funFacts = [
      `${track.artist} released "${track.album}" in ${track.year}. The album has sold over 50 million copies worldwide.`,
      `Did you know? ${track.title} runs at ${track.bpm ?? 120} BPM — perfect for ${track.genre.toLowerCase()}!`,
      `Fun fact: ${track.artist} is known for their high-energy performances and has toured in over 40 countries.`,
    ]
    const birthdays = [
      'Today in rock history: Kurt Cobain was born in 1967.',
      'On this day in 1980, AC/DC released "Back in Black" — one of the best-selling albums of all time.',
    ]
    const suggestions = [
      { type: 'fun_fact', text: funFacts[Math.floor(Math.random() * funFacts.length)] },
      { type: 'birthday', text: birthdays[Math.floor(Math.random() * birthdays.length)] },
      { type: 'weather', text: 'Current weather: Sunny, 24°C. Perfect for some classic rock!' },
      { type: 'traffic', text: 'Traffic update: All clear on major routes.' },
      { type: 'upcoming', text: `Next up: Consider mentioning the upcoming ${track.genre} segment.` },
    ]
    return NextResponse.json({ module: 'ai-dj-assistant', suggestions, track: { title: track.title, artist: track.artist }, executionMs: 680, tokensUsed: 420 })
  }

  // AI Music Director — rotation analysis
  if (body.module === 'ai-music-director') {
    const analysis = {
      topPerformers: rockTracks.filter((t) => t.type === 'music').sort((a, b) => b.playCount - a.playCount).slice(0, 5).map((t) => ({
        title: t.title, artist: t.artist, playCount: t.playCount, trend: 'up' as const,
      })),
      underperformers: rockTracks.filter((t) => t.type === 'music').sort((a, b) => a.playCount - b.playCount).slice(0, 3).map((t) => ({
        title: t.title, artist: t.artist, playCount: t.playCount, trend: 'down' as const, recommendation: 'Reduce rotation frequency',
      })),
      recommendations: [
        { type: 'rotation_increase', tracks: ['Bohemian Rhapsody', 'Smells Like Teen Spirit'], reason: 'High listener retention + request volume' },
        { type: 'rotation_decrease', tracks: ['Blitzkrieg Bop'], reason: 'Skip rate above average in afternoon daypart' },
        { type: 'daypart_suggestion', text: 'Add more Alternative Rock tracks to evening rotation (18:00-22:00) — listener engagement peaks' },
        { type: 'new_addition', text: 'Consider adding tracks from similar artists: Foo Fighters, Pearl Jam fans also engage with Soundgarden' },
      ],
      summary: {
        totalAnalyzed: 30, avgSkipRate: '2.3%', avgCompletionRate: '94.1%',
        topGenre: 'Classic Rock', topDaypart: 'Afternoon Drive (14:00-18:00)',
      },
    }
    return NextResponse.json({ module: 'ai-music-director', analysis, executionMs: 12000, tokensUsed: 3500 })
  }

  // AI News — headlines (with editorial review warning)
  if (body.module === 'ai-news') {
    const headlines = [
      { headline: 'City Council Approves New Music Venue Downtown', category: 'local', summary: 'The city council voted unanimously to approve funding for a new 500-capacity music venue in the downtown arts district.', duration: 15, requiresReview: true },
      { headline: 'Rock Hall of Fame Announces 2026 Inductees', category: 'entertainment', summary: 'The Rock and Roll Hall of Fame has announced this year\'s inductees, with three first-time nominees making the cut.', duration: 20, requiresReview: true },
      { headline: 'Weather: Sunny Skies, High of 24°C', category: 'weather', summary: 'Expect clear skies throughout the day with a high of 24 degrees Celsius. Light winds from the northwest.', duration: 10, requiresReview: false },
      { headline: 'Traffic: Clear on All Major Routes', category: 'traffic', summary: 'No incidents reported on major routes. Drive safely and have a great day.', duration: 10, requiresReview: false },
    ]
    return NextResponse.json({ module: 'ai-news', headlines, warning: 'All news content requires editorial review before broadcast', totalDuration: headlines.reduce((a, h) => a + h.duration, 0), executionMs: 3200, tokensUsed: 890 })
  }

  // AI Scheduler — playlist
  if (body.module === 'ai-scheduler') {
    const playlist = rockTracks.filter((t) => t.type === 'music').slice(0, 8).map((t, i) => ({
      position: i + 1, trackId: t.id, title: t.title, artist: t.artist,
      reason: i === 0 ? 'Opener — high energy' : i === 7 ? 'Closer — classic rock' : 'Rotation — tempo match',
      bpm: t.bpm, genre: t.genre,
    }))
    return NextResponse.json({ module: 'ai-scheduler', playlist, totalTracks: playlist.length, rules: ['tempo_match', 'no_repeat_2h', 'daypart_aware', 'ai_optimization'], executionMs: 5600, tokensUsed: 1200 })
  }

  // AI Metadata — track analysis
  if (body.module === 'ai-metadata') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    return NextResponse.json({
      module: 'ai-metadata', trackId: track.id,
      analysis: {
        bpm: track.bpm ?? 120, key: 'A Minor', energy: 0.78, danceability: 0.65,
        mood: 'energetic', valence: 0.72, acousticness: 0.02, instrumentalness: 0.01,
        genres: [track.genre, 'Rock', 'Classic Rock'],
        tags: ['guitar-driven', 'high-energy', 'driving', 'upbeat'],
      },
      executionMs: 890, tokensUsed: 320,
    })
  }

  // AI Social — social posts
  if (body.module === 'ai-social') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    const posts = [
      { platform: 'twitter', text: `🎵 Now playing: ${track.title} by ${track.artist} on Rock 88.7 FM! #NowPlaying #Rock887`, url: 'https://twitter.com/rock887' },
      { platform: 'discord', text: `🎶 **Now Playing:** ${track.title} — ${track.artist}\n📻 Rock 88.7 FM | Listen: http://stream.rock887.fm`, url: 'https://discord.gg/rock887' },
      { platform: 'instagram', text: `🎧 ${track.title}\n${track.artist}\n.\nNow playing on Rock 88.7 FM 📻\n.\n#rock887 #nowplaying #${track.genre.toLowerCase().replace(/\s/g, '')} #radio`, url: 'https://instagram.com/rock887' },
    ]
    return NextResponse.json({ module: 'ai-social', posts, track: { title: track.title, artist: track.artist }, executionMs: 450, tokensUsed: 180 })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}
