import { NextResponse } from 'next/server'
import { rockTracks, scheduleShows } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// AI Orchestrator — centralni sistem za AI module
// Event Bus → AI DJ, AI News, AI Scheduler, AI Metadata, AI Social

interface AiModule {
  id: string
  name: string
  description: string
  icon: string
  status: 'active' | 'idle' | 'processing' | 'error'
  trigger: string // kateri event ga sproži
  lastRun: string | null
  runsTotal: number
  config: Record<string, unknown>
}

const modules: AiModule[] = [
  {
    id: 'ai-dj', name: 'AI DJ', description: 'Generates voice track scripts between songs',
    icon: 'mic', status: 'active', trigger: 'track.finished', lastRun: new Date(Date.now() - 300000).toISOString(),
    runsTotal: 842, config: { style: 'energetic', language: 'en', maxLength: 30, autoInsert: true },
  },
  {
    id: 'ai-news', name: 'AI News', description: 'Generates news bulletins from current events',
    icon: 'newspaper', status: 'idle', trigger: 'schedule.hourly', lastRun: new Date(Date.now() - 1800000).toISOString(),
    runsTotal: 124, config: { sources: ['RSS', 'API'], language: 'en', duration: 60, autoPlay: false },
  },
  {
    id: 'ai-scheduler', name: 'AI Scheduler', description: 'Auto-generates playlists based on rotation rules',
    icon: 'calendar', status: 'active', trigger: 'schedule.daily', lastRun: new Date(Date.now() - 3600000).toISOString(),
    runsTotal: 31, config: { rotationDepth: 7, tempoMatching: true, daypartAware: true, avoidRepeat: 2 },
  },
  {
    id: 'ai-metadata', name: 'AI Metadata', description: 'Auto-tags tracks with BPM, key, mood, energy level',
    icon: 'tag', status: 'processing', trigger: 'track.imported', lastRun: new Date(Date.now() - 60000).toISOString(),
    runsTotal: 1567, config: { autoBPM: true, autoKey: true, autoMood: true, autoEnergy: true, autoGenre: true },
  },
  {
    id: 'ai-social', name: 'AI Social', description: 'Posts now-playing updates to social media',
    icon: 'share', status: 'active', trigger: 'track.started', lastRun: new Date(Date.now() - 5000).toISOString(),
    runsTotal: 4521, config: { platforms: ['twitter', 'instagram', 'discord'], autoPost: true, includeArtwork: true },
  },
  {
    id: 'ai-qc', name: 'AI Quality Control', description: 'Detects silence, clipping, and audio issues',
    icon: 'shield', status: 'active', trigger: 'audio.realtime', lastRun: new Date(Date.now() - 1000).toISOString(),
    runsTotal: 999999, config: { silenceThreshold: -60, silenceDuration: 10, clippingThreshold: -0.5, autoAlert: true },
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  const active = modules.filter((m) => m.status === 'active').length
  const processing = modules.filter((m) => m.status === 'processing').length
  const totalRuns = modules.reduce((acc, m) => acc + m.runsTotal, 0)

  return NextResponse.json({
    count: modules.length,
    active,
    processing,
    totalRuns,
    architecture: 'Event Bus → AI Modules (modular, independent)',
    modules,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Generate AI content based on module type
  if (body.module === 'ai-dj' || body.action === 'voice-track') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    const scripts = [
      `That was ${track.title} from ${track.artist}${track.year ? `, released in ${track.year}` : ''}. ${track.genre} at its finest, right here on Rock 88.7.`,
      `Welcome back to Rock 88.7. ${track.artist} with ${track.title} — ${track.bpm ?? 120} BPM of pure ${track.genre.toLowerCase()}. Coming up, more of the best rock on your radio.`,
      `${track.title} by ${track.artist}. ${track.album ? `From the album "${track.album}". ` : ''}You're listening to Rock 88.7 FM, where rock never sleeps.`,
    ]
    return NextResponse.json({ module: 'ai-dj', scripts, track: { title: track.title, artist: track.artist } })
  }

  if (body.module === 'ai-news' || body.action === 'news') {
    const headlines = [
      { headline: 'City Council Approves New Music Venue Downtown', category: 'local', summary: 'The city council voted unanimously to approve funding for a new 500-capacity music venue in the downtown arts district.', duration: 15 },
      { headline: 'Rock Hall of Fame Announces 2026 Inductees', category: 'entertainment', summary: 'The Rock and Roll Hall of Fame has announced this year\'s inductees, with three first-time nominees making the cut.', duration: 20 },
      { headline: 'Weather: Sunny Skies, High of 24°C', category: 'weather', summary: 'Expect clear skies throughout the day with a high of 24 degrees Celsius. Light winds from the northwest.', duration: 10 },
      { headline: 'Traffic: Clear on All Major Routes', category: 'traffic', summary: 'No incidents reported on major routes. Drive safely and have a great day.', duration: 10 },
    ]
    return NextResponse.json({ module: 'ai-news', headlines, totalDuration: headlines.reduce((a, h) => a + h.duration, 0) })
  }

  if (body.module === 'ai-scheduler' || body.action === 'schedule') {
    const playlist = rockTracks.filter((t) => t.type === 'music').slice(0, 8).map((t, i) => ({
      position: i + 1, trackId: t.id, title: t.title, artist: t.artist,
      reason: i === 0 ? 'Opener — high energy' : i === 7 ? 'Closer — classic rock' : 'Rotation — tempo match',
      bpm: t.bpm, genre: t.genre,
    }))
    return NextResponse.json({ module: 'ai-scheduler', playlist, totalTracks: playlist.length, rules: ['tempo_match', 'no_repeat_2h', 'daypart_aware'] })
  }

  if (body.module === 'ai-metadata' || body.action === 'metadata') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    return NextResponse.json({
      module: 'ai-metadata',
      trackId: track.id,
      analysis: {
        bpm: track.bpm ?? 120, key: 'A Minor', energy: 0.78, danceability: 0.65,
        mood: 'energetic', valence: 0.72, acousticness: 0.02, instrumentalness: 0.01,
        genres: [track.genre, 'Rock', 'Classic Rock'],
        tags: ['guitar-driven', 'high-energy', 'driving', 'upbeat'],
      },
    })
  }

  if (body.module === 'ai-social' || body.action === 'social') {
    const track = rockTracks.find((t) => t.id === body.trackId) ?? rockTracks[0]
    const posts = [
      { platform: 'twitter', text: `🎵 Now playing: ${track.title} by ${track.artist} on Rock 88.7 FM! #NowPlaying #Rock887`, url: 'https://twitter.com/rock887' },
      { platform: 'discord', text: `🎶 **Now Playing:** ${track.title} — ${track.artist}\n📻 Rock 88.7 FM | Listen: http://stream.rock887.fm`, url: 'https://discord.gg/rock887' },
      { platform: 'instagram', text: `🎧 ${track.title}\n${track.artist}\n.\nNow playing on Rock 88.7 FM 📻\n.\n#rock887 #nowplaying #${track.genre.toLowerCase().replace(/\s/g, '')} #radio`, url: 'https://instagram.com/rock887' },
    ]
    return NextResponse.json({ module: 'ai-social', posts, track: { title: track.title, artist: track.artist } })
  }

  return NextResponse.json({ error: 'Unknown module' }, { status: 400 })
}
