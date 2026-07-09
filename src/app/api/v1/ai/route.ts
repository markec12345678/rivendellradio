import { NextResponse } from 'next/server'
import { rockTracks, scheduleShows } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// AI Orchestrator — 11 AI modules driven by Event Bus
// Per user feedback: P95/P99, error breakdown, cache hit, retries + 3 new modules

interface AiModuleMetrics {
  runsTotal: number
  runsSuccessful: number
  runsFailed: number
  avgExecutionMs: number
  p95ExecutionMs: number
  p99ExecutionMs: number
  totalTokensUsed: number
  estimatedCostUsd: number
  queueDepth: number
  lastError: string | null
  errorBreakdown: Record<string, number>
  cacheHitRate: number
  retryCount: number
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
    metrics: { runsTotal: 842, runsSuccessful: 839, runsFailed: 3, avgExecutionMs: 1240, p95ExecutionMs: 2100, p99ExecutionMs: 3400, totalTokensUsed: 487000, estimatedCostUsd: 1.46, queueDepth: 0, lastError: null, errorBreakdown: { timeout: 2, rate_limit: 1 }, cacheHitRate: 0.34, retryCount: 3 },
  },
  {
    id: 'ai-news', name: 'AI News', description: 'Generates news bulletins (requires editorial review)',
    icon: 'newspaper', status: 'idle', trigger: 'schedule.hourly', lastRun: new Date(Date.now() - 1800000).toISOString(),
    config: { sources: ['RSS', 'API'], language: 'en', duration: 60, autoPlay: false, requireReview: true },
    metrics: { runsTotal: 124, runsSuccessful: 122, runsFailed: 2, avgExecutionMs: 3200, p95ExecutionMs: 5100, p99ExecutionMs: 7200, totalTokensUsed: 189000, estimatedCostUsd: 0.57, queueDepth: 0, lastError: 'RSS timeout on last run', errorBreakdown: { rss_timeout: 1, content_filter: 1 }, cacheHitRate: 0.12, retryCount: 2 },
  },
  {
    id: 'ai-scheduler', name: 'AI Scheduler', description: 'Auto-generates playlists with rotation rules + AI optimization',
    icon: 'calendar', status: 'active', trigger: 'schedule.daily', lastRun: new Date(Date.now() - 3600000).toISOString(),
    config: { rotationDepth: 7, tempoMatching: true, daypartAware: true, avoidRepeat: 2, aiOptimization: true },
    metrics: { runsTotal: 31, runsSuccessful: 31, runsFailed: 0, avgExecutionMs: 5600, p95ExecutionMs: 8200, p99ExecutionMs: 11000, totalTokensUsed: 93000, estimatedCostUsd: 0.28, queueDepth: 0, lastError: null, errorBreakdown: {}, cacheHitRate: 0.08, retryCount: 0 },
  },
  {
    id: 'ai-metadata', name: 'AI Metadata', description: 'Auto-tags tracks with BPM, key, mood, energy, genre, tags',
    icon: 'tag', status: 'processing', trigger: 'track.imported', lastRun: new Date(Date.now() - 60000).toISOString(),
    config: { autoBPM: true, autoKey: true, autoMood: true, autoEnergy: true, autoGenre: true },
    metrics: { runsTotal: 1567, runsSuccessful: 1564, runsFailed: 3, avgExecutionMs: 890, p95ExecutionMs: 1400, p99ExecutionMs: 2200, totalTokensUsed: 782000, estimatedCostUsd: 2.35, queueDepth: 4, lastError: null, errorBreakdown: { low_confidence: 2, timeout: 1 }, cacheHitRate: 0.45, retryCount: 3 },
  },
  {
    id: 'ai-social', name: 'AI Social', description: 'Posts now-playing updates to social media',
    icon: 'share', status: 'active', trigger: 'track.started', lastRun: new Date(Date.now() - 5000).toISOString(),
    config: { platforms: ['twitter', 'instagram', 'discord'], autoPost: true, includeArtwork: true, postFrequency: 'major_tracks_only' },
    metrics: { runsTotal: 4521, runsSuccessful: 4518, runsFailed: 3, avgExecutionMs: 450, p95ExecutionMs: 800, p99ExecutionMs: 1400, totalTokensUsed: 312000, estimatedCostUsd: 0.94, queueDepth: 0, lastError: 'Discord rate limit (recovered)', errorBreakdown: { rate_limit: 2, network: 1 }, cacheHitRate: 0.67, retryCount: 3 },
  },
  {
    id: 'ai-qc', name: 'AI Quality Control', description: 'Detects silence, clipping, LUFS, true peak, stereo phase, DC offset, noise floor',
    icon: 'shield', status: 'active', trigger: 'audio.realtime', lastRun: new Date(Date.now() - 1000).toISOString(),
    config: { silenceThreshold: -60, silenceDuration: 10, clippingThreshold: -0.5, lufsTarget: -16, truePeakMax: -1, stereoPhaseCheck: true, dcOffsetCheck: true, noiseFloorCheck: true, monoCompatibility: true, autoAlert: true },
    metrics: { runsTotal: 864200, runsSuccessful: 864200, runsFailed: 0, avgExecutionMs: 2, p95ExecutionMs: 4, p99ExecutionMs: 8, totalTokensUsed: 0, estimatedCostUsd: 0, queueDepth: 0, lastError: null, errorBreakdown: {}, cacheHitRate: 0, retryCount: 0 },
  },
  {
    id: 'ai-dj-assistant', name: 'AI DJ Assistant', description: 'Real-time show prep: fun facts, birthdays, news, weather for presenter',
    icon: 'lightbulb', status: 'active', trigger: 'track.started', lastRun: new Date(Date.now() - 5000).toISOString(),
    config: { showFunFacts: true, showBirthdays: true, showNews: true, showWeather: true, showTraffic: true, autoSuggest: true, presenterControl: true },
    metrics: { runsTotal: 4521, runsSuccessful: 4520, runsFailed: 1, avgExecutionMs: 680, p95ExecutionMs: 1100, p99ExecutionMs: 1800, totalTokensUsed: 234000, estimatedCostUsd: 0.70, queueDepth: 0, lastError: null, errorBreakdown: { timeout: 1 }, cacheHitRate: 0.52, retryCount: 1 },
  },
  {
    id: 'ai-music-director', name: 'AI Music Director', description: 'Analyzes listenership, skips, requests to suggest rotation changes',
    icon: 'trending', status: 'idle', trigger: 'schedule.weekly', lastRun: new Date(Date.now() - 86400000).toISOString(),
    config: { analyzeSkipRate: true, analyzeRequests: true, analyzeListenership: true, analyzeDayparts: true, suggestRotationChanges: true, artistFatigueIndex: true, songFatigueIndex: true, genreBalance: true, decadeBalance: true, tempoBalance: true, energyCurve: true, aiPower: 'medium' },
    metrics: { runsTotal: 4, runsSuccessful: 4, runsFailed: 0, avgExecutionMs: 12000, p95ExecutionMs: 15000, p99ExecutionMs: 18000, totalTokensUsed: 45000, estimatedCostUsd: 0.14, queueDepth: 0, lastError: null, errorBreakdown: {}, cacheHitRate: 0.0, retryCount: 0 },
  },
  // NEW: AI Producer (per user suggestion)
  {
    id: 'ai-producer', name: 'AI Producer', description: 'Suggests jingles, sweepers, promos, station IDs, breaks during show',
    icon: 'clapperboard', status: 'active', trigger: 'track.finished', lastRun: new Date(Date.now() - 300000).toISOString(),
    config: { suggestJingles: true, suggestSweepers: true, suggestPromos: true, suggestStationIds: true, suggestWeatherBreak: true, suggestTrafficBreak: true, suggestContestReminder: true, suggestSponsorMention: true, autoPlay: false, producerControl: true },
    metrics: { runsTotal: 842, runsSuccessful: 840, runsFailed: 2, avgExecutionMs: 920, p95ExecutionMs: 1500, p99ExecutionMs: 2400, totalTokensUsed: 298000, estimatedCostUsd: 0.89, queueDepth: 0, lastError: null, errorBreakdown: { timeout: 2 }, cacheHitRate: 0.38, retryCount: 2 },
  },
  // NEW: AI Failure Detection (per user suggestion)
  {
    id: 'ai-failure-detection', name: 'AI Failure Detection', description: 'Detects RDS stalls, webhook failures, listener anomalies, frozen VU meters',
    icon: 'alert-triangle', status: 'active', trigger: 'audio.realtime', lastRun: new Date(Date.now() - 2000).toISOString(),
    config: { checkRdsStall: true, checkWebhookFailure: true, checkListenerAnomaly: true, checkVuFrozen: true, checkStreamDrop: true, checkDbLatency: true, alertThreshold: 'critical', autoNotify: true },
    metrics: { runsTotal: 432100, runsSuccessful: 432100, runsFailed: 0, avgExecutionMs: 5, p95ExecutionMs: 10, p99ExecutionMs: 20, totalTokensUsed: 0, estimatedCostUsd: 0, queueDepth: 0, lastError: null, errorBreakdown: {}, cacheHitRate: 0, retryCount: 0 },
  },
  // NEW: AI Cost Optimizer (per user suggestion)
  {
    id: 'ai-cost-optimizer', name: 'AI Cost Optimizer', description: 'Analyzes token usage and suggests prompt optimization / model downsizing',
    icon: 'coins', status: 'idle', trigger: 'schedule.daily', lastRun: new Date(Date.now() - 7200000).toISOString(),
    config: { analyzeTokenUsage: true, suggestPromptShortening: true, suggestModelDownsize: true, suggestCacheStrategy: true, costThresholdUsd: 5.00, dailyBudgetUsd: 2.00 },
    metrics: { runsTotal: 31, runsSuccessful: 31, runsFailed: 0, avgExecutionMs: 3400, p95ExecutionMs: 5200, p99ExecutionMs: 6800, totalTokensUsed: 67000, estimatedCostUsd: 0.20, queueDepth: 0, lastError: null, errorBreakdown: {}, cacheHitRate: 0.15, retryCount: 0 },
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

  const totalRetries = modules.reduce((acc, m) => acc + m.metrics.retryCount, 0)
  const totalCacheHits = modules.reduce((acc, m) => acc + (m.metrics.cacheHitRate * m.metrics.runsTotal), 0)
  const overallCacheHitRate = totalRuns > 0 ? ((totalCacheHits / totalRuns) * 100).toFixed(1) : '0'

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
      totalRetries,
      cacheHitRate: `${overallCacheHitRate}%`,
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

  // AI Producer — suggests jingles, sweepers, promos, breaks
  if (body.module === 'ai-producer') {
    const suggestions = [
      { type: 'jingle', title: 'Station ID — Rock 88.7', reason: 'Top of hour — 3 tracks since last ID', priority: 'high', autoPlay: false },
      { type: 'sweeper', title: 'Sweeper: "The Best Rock"', reason: 'Transition between genres (Hard Rock → Alternative)', priority: 'medium', autoPlay: false },
      { type: 'promo', title: 'Promo: Friday Night Rock Show', reason: 'Promo rotation — last played 2h ago', priority: 'medium', autoPlay: false },
      { type: 'weather_break', title: 'Weather Break', reason: 'Scheduled — 15min since last weather', priority: 'low', autoPlay: false },
      { type: 'traffic_break', title: 'Traffic Update', reason: 'Approaching rush hour (16:00)', priority: 'high', autoPlay: false },
      { type: 'sponsor', title: 'Sponsor: Guitar Center', reason: 'Sponsor rotation — 2h since last mention', priority: 'medium', autoPlay: false },
      { type: 'contest', title: 'Contest Reminder: Win Tickets', reason: 'Active contest — reminder every 30min', priority: 'low', autoPlay: false },
    ]
    return NextResponse.json({ module: 'ai-producer', suggestions, warning: 'All suggestions require producer approval', executionMs: 920, tokensUsed: 340 })
  }

  // AI Failure Detection — detects system anomalies
  if (body.module === 'ai-failure-detection') {
    const checks = [
      { check: 'rds_stall', status: 'ok', message: 'RDS updated 3s ago', lastChecked: new Date().toISOString() },
      { check: 'webhook_delivery', status: 'ok', message: 'All webhooks delivering successfully', lastChecked: new Date().toISOString() },
      { check: 'listener_anomaly', status: 'ok', message: 'Listener count within normal range', lastChecked: new Date().toISOString() },
      { check: 'vu_frozen', status: 'ok', message: 'VU meters active (last update 100ms ago)', lastChecked: new Date().toISOString() },
      { check: 'stream_drop', status: 'ok', message: 'All 3 streams online', lastChecked: new Date().toISOString() },
      { check: 'db_latency', status: 'ok', message: 'DB response: 2ms', lastChecked: new Date().toISOString() },
      { check: 'daemon_health', status: 'warning', message: 'rdrepld is stopped (non-critical)', lastChecked: new Date().toISOString() },
    ]
    const alerts = checks.filter((c) => c.status !== 'ok')
    return NextResponse.json({ module: 'ai-failure-detection', checks, alerts: alerts.length, alertsDetail: alerts, executionMs: 5, tokensUsed: 0 })
  }

  // AI Cost Optimizer — analyzes token usage and suggests savings
  if (body.module === 'ai-cost-optimizer') {
    const analysis = {
      dailySpend: 6.44,
      dailyBudget: 2.00,
      overBudget: true,
      topConsumer: 'AI Metadata ($2.35, 782K tokens)',
      recommendations: [
        { module: 'ai-metadata', type: 'model_downsize', description: 'Switch from GPT-4 to GPT-3.5 for BPM detection — saves ~$1.20/day', savings: 1.20, confidence: 'high' },
        { module: 'ai-dj', type: 'prompt_shortening', description: 'Reduce context window from 4096 to 2048 tokens — saves ~$0.30/day', savings: 0.30, confidence: 'medium' },
        { module: 'ai-news', type: 'cache_strategy', description: 'Cache weather/traffic prompts (they repeat) — saves ~$0.15/day', savings: 0.15, confidence: 'high' },
        { module: 'ai-social', type: 'batch_processing', description: 'Batch social posts every 5min instead of per-track — saves ~$0.20/day', savings: 0.20, confidence: 'medium' },
      ],
      projectedSavings: 1.85,
      projectedDailyCost: 4.59,
    }
    return NextResponse.json({ module: 'ai-cost-optimizer', analysis, executionMs: 3400, tokensUsed: 890 })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}
