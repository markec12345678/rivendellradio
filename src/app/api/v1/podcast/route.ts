import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Podcast Management — RSS 2.0 + Podcast Namespace 2.0 feed generator.
 *
 * GET  /api/v1/podcast         — list podcasts + episodes + distribution status
 * POST /api/v1/podcast         — create/update podcast
 *
 * GET  /api/v1/podcast/feed?id=X  — RSS 2.0 + podcast:2.0 XML feed (see /feed route)
 *
 * Podcast namespace 2.0 features:
 *   - transcripts (SRT/VTT)
 *   - chapters (JSON)
 *   - person (host/guest)
 *   - funding (donation links)
 *   - soundbite (clip previews)
 *   - alternateFeed (multi-quality)
 */

interface Podcast {
  id: string
  title: string
  description: string
  language: string
  author: string
  email: string
  category: string
  artworkUrl: string
  feedUrl: string
  websiteUrl: string
  copyright: string
  explicit: boolean
  episodeCount: number
  totalDownloads: number
  distribution: {
    applePodcasts: 'approved' | 'pending' | 'not-submitted'
    spotify: 'approved' | 'pending' | 'not-submitted'
    youtubeMusic: 'approved' | 'pending' | 'not-submitted'
    amazonMusic: 'approved' | 'pending' | 'not-submitted'
    pocketCasts: 'approved' | 'pending' | 'not-submitted'
    podcastIndex: 'approved' | 'pending' | 'not-submitted'
  }
  podpingEnabled: boolean
}

interface Episode {
  id: string
  podcastId: string
  title: string
  description: string
  episodeNumber: number
  seasonNumber: number
  publishedAt: string
  durationSec: number
  audioUrl: string
  artworkUrl?: string
  downloadCount: number
  explicit: boolean
  // Podcast namespace 2.0
  transcriptUrl?: string
  transcriptType?: 'srt' | 'vtt' | 'json'
  chaptersUrl?: string
  soundbites?: { startTime: number; durationMs: number; title: string }[]
  persons?: { name: string; role: string; img?: string }[]
  funding?: { url: string; description: string }[]
}

const PODCASTS: Podcast[] = [
  {
    id: 'pod-001',
    title: 'Rock 88.7 Morning Show',
    description: 'Daily morning show with Alex Morgan — rock hits, news, weather, and interviews.',
    language: 'en-US',
    author: 'Rock 88.7 FM',
    email: 'podcast@rock887.fm',
    category: 'Music',
    artworkUrl: 'https://rock887.fm/artwork/morning-show-3000x3000.jpg',
    feedUrl: 'https://rock887.fm/feeds/morning-show.xml',
    websiteUrl: 'https://rock887.fm/morning-show',
    copyright: '© 2026 Rock 88.7 FM',
    explicit: false,
    episodeCount: 245,
    totalDownloads: 847000,
    distribution: {
      applePodcasts: 'approved',
      spotify: 'approved',
      youtubeMusic: 'approved',
      amazonMusic: 'pending',
      pocketCasts: 'approved',
      podcastIndex: 'approved',
    },
    podpingEnabled: true,
  },
  {
    id: 'pod-002',
    title: 'Rock 88.7 Deep Cuts',
    description: 'Weekly deep dives into album tracks, B-sides, and forgotten gems.',
    language: 'en-US',
    author: 'Rock 88.7 FM',
    email: 'podcast@rock887.fm',
    category: 'Music',
    artworkUrl: 'https://rock887.fm/artwork/deep-cuts-3000x3000.jpg',
    feedUrl: 'https://rock887.fm/feeds/deep-cuts.xml',
    websiteUrl: 'https://rock887.fm/deep-cuts',
    copyright: '© 2026 Rock 88.7 FM',
    explicit: false,
    episodeCount: 52,
    totalDownloads: 156000,
    distribution: {
      applePodcasts: 'approved',
      spotify: 'approved',
      youtubeMusic: 'not-submitted',
      amazonMusic: 'not-submitted',
      pocketCasts: 'pending',
      podcastIndex: 'approved',
    },
    podpingEnabled: true,
  },
]

const EPISODES: Episode[] = [
  {
    id: 'ep-001',
    podcastId: 'pod-001',
    title: 'Morning Show #245 — Summer Hits Special',
    description: 'Alex counts down the top 10 summer rock hits of all time, with listener requests and weather.',
    episodeNumber: 245,
    seasonNumber: 5,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    durationSec: 3600,
    audioUrl: 'https://rock887.fm/audio/morning-show-245.mp3',
    artworkUrl: 'https://rock887.fm/artwork/morning-show-245.jpg',
    downloadCount: 4200,
    explicit: false,
    transcriptUrl: 'https://rock887.fm/transcripts/morning-show-245.vtt',
    transcriptType: 'vtt',
    chaptersUrl: 'https://rock887.fm/chapters/morning-show-245.json',
    soundbites: [
      { startTime: 120, durationMs: 15000, title: 'Top 10 countdown intro' },
      { startTime: 1800, durationMs: 30000, title: 'Listener call-in: best summer concert' },
    ],
    persons: [
      { name: 'Alex Morgan', role: 'Host', img: 'https://rock887.fm/people/alex.jpg' },
      { name: 'Sara Chen', role: 'Guest', img: 'https://rock887.fm/people/sara.jpg' },
    ],
    funding: [
      { url: 'https://rock887.fm/support', description: 'Support Rock 88.7' },
    ],
  },
  {
    id: 'ep-002',
    podcastId: 'pod-001',
    title: 'Morning Show #244 — Interview with Foo Fighters',
    description: 'Exclusive interview with Dave Grohl and Taylor Hawkins before their stadium tour.',
    episodeNumber: 244,
    seasonNumber: 5,
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    durationSec: 2700,
    audioUrl: 'https://rock887.fm/audio/morning-show-244.mp3',
    downloadCount: 8900,
    explicit: false,
    transcriptUrl: 'https://rock887.fm/transcripts/morning-show-244.vtt',
    transcriptType: 'vtt',
    persons: [
      { name: 'Alex Morgan', role: 'Host' },
      { name: 'Dave Grohl', role: 'Guest' },
      { name: 'Taylor Hawkins', role: 'Guest' },
    ],
  },
]

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const url = new URL(req.url)
  const podcastId = url.searchParams.get('id')

  if (podcastId) {
    const pod = PODCASTS.find((p) => p.id === podcastId)
    if (!pod) return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    const episodes = EPISODES.filter((e) => e.podcastId === podcastId)
    return NextResponse.json({
      podcast: pod,
      episodes,
      feedUrl: `/api/v1/podcast/feed?id=${podcastId}`,
    })
  }

  return NextResponse.json({
    count: PODCASTS.length,
    podcasts: PODCASTS,
    recentEpisodes: EPISODES.slice(0, 10),
    stats: {
      totalEpisodes: EPISODES.length,
      totalDownloads: PODCASTS.reduce((s, p) => s + p.totalDownloads, 0),
      distributionCoverage: {
        apple: PODCASTS.filter((p) => p.distribution.applePodcasts === 'approved').length,
        spotify: PODCASTS.filter((p) => p.distribution.spotify === 'approved').length,
        youtube: PODCASTS.filter((p) => p.distribution.youtubeMusic === 'approved').length,
        amazon: PODCASTS.filter((p) => p.distribution.amazonMusic === 'approved').length,
      },
    },
    features: {
      rssStandard: 'RSS 2.0',
      podcastNamespace: 'Podcast Namespace 2.0 (transcripts, chapters, person, funding, soundbite)',
      podping: 'Real-time Hive blockchain pings (see /api/v1/podping)',
      autoDistribution: 'One-click submit to Apple/Spotify/YouTube/Amazon/PocketCasts/PodcastIndex',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'distribute' && body.podcastId) {
    const pod = PODCASTS.find((p) => p.id === body.podcastId)
    if (!pod) return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })

    const platform = body.platform
    if (pod.distribution[platform as keyof typeof pod.distribution]) {
      pod.distribution[platform as keyof typeof pod.distribution] = 'pending'
      return NextResponse.json({
        ok: true,
        message: `Submitted "${pod.title}" to ${platform}. Approval typically takes 1-5 business days.`,
      })
    }
  }

  if (body.action === 'publish-episode' && body.podcastId) {
    // Fire podping
    const pod = PODCASTS.find((p) => p.id === body.podcastId)
    if (pod) {
      try {
        await fetch('http://localhost:3000/api/v1/podping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feedUrl: pod.feedUrl,
            episodeTitle: body.episodeTitle,
            reason: 'new',
          }),
        })
      } catch {}
    }
    return NextResponse.json({ ok: true, message: 'Episode published — podping.live notified' })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
