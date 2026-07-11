import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Podcast RSS 2.0 + Podcast Namespace 2.0 Feed Generator.
 *
 * GET /api/v1/podcast/feed?id=pod-001  — RSS XML feed
 *
 * Generates valid RSS 2.0 with podcast: namespace extensions:
 *   - <podcast:transcript>
 *   - <podcast:chapters>
 *   - <podcast:person>
 *   - <podcast:funding>
 *   - <podcast:soundbite>
 *   - <podcast:guid>
 */

interface FeedEpisode {
  id: string
  title: string
  description: string
  episodeNumber: number
  seasonNumber: number
  publishedAt: string
  durationSec: number
  audioUrl: string
  artworkUrl?: string
  explicit: boolean
  transcriptUrl?: string
  transcriptType?: string
  chaptersUrl?: string
  soundbites?: { startTime: number; durationMs: number; title: string }[]
  persons?: { name: string; role: string; img?: string }[]
  funding?: { url: string; description: string }[]
}

const PODCASTS_FEED: Record<string, any> = {
  'pod-001': {
    title: 'Rock 88.7 Morning Show',
    description: 'Daily morning show with Alex Morgan — rock hits, news, weather, and interviews.',
    language: 'en-US',
    author: 'Rock 88.7 FM',
    email: 'podcast@rock887.fm',
    category: 'Music',
    artworkUrl: 'https://rock887.fm/artwork/morning-show-3000x3000.jpg',
    websiteUrl: 'https://rock887.fm/morning-show',
    copyright: '© 2026 Rock 88.7 FM',
    explicit: false,
  },
  'pod-002': {
    title: 'Rock 88.7 Deep Cuts',
    description: 'Weekly deep dives into album tracks, B-sides, and forgotten gems.',
    language: 'en-US',
    author: 'Rock 88.7 FM',
    email: 'podcast@rock887.fm',
    category: 'Music',
    artworkUrl: 'https://rock887.fm/artwork/deep-cuts-3000x3000.jpg',
    websiteUrl: 'https://rock887.fm/deep-cuts',
    copyright: '© 2026 Rock 88.7 FM',
    explicit: false,
  },
}

const FEED_EPISODES: FeedEpisode[] = [
  {
    id: 'ep-001',
    title: 'Morning Show #245 — Summer Hits Special',
    description: 'Alex counts down the top 10 summer rock hits of all time, with listener requests and weather.',
    episodeNumber: 245,
    seasonNumber: 5,
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    durationSec: 3600,
    audioUrl: 'https://rock887.fm/audio/morning-show-245.mp3',
    artworkUrl: 'https://rock887.fm/artwork/morning-show-245.jpg',
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
    funding: [{ url: 'https://rock887.fm/support', description: 'Support Rock 88.7' }],
  },
  {
    id: 'ep-002',
    title: 'Morning Show #244 — Interview with Foo Fighters',
    description: 'Exclusive interview with Dave Grohl and Taylor Hawkins before their stadium tour.',
    episodeNumber: 244,
    seasonNumber: 5,
    publishedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    durationSec: 2700,
    audioUrl: 'https://rock887.fm/audio/morning-show-244.mp3',
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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function generateRssFeed(podcastId: string): string {
  const pod = PODCASTS_FEED[podcastId]
  if (!pod) return '<?xml version="1.0" encoding="UTF-8"?>\n<rss><channel><title>Unknown podcast</title></channel></rss>'

  const episodes = FEED_EPISODES

  const itemsXml = episodes.map((ep) => {
    const pubDate = new Date(ep.publishedAt).toUTCString()
    let xml = `    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description)}</description>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${ep.audioUrl}" length="${ep.durationSec * 128000}" type="audio/mpeg" />
      <guid isPermaLink="false">${ep.id}</guid>
      <itunes:episode>${ep.episodeNumber}</itunes:episode>
      <itunes:season>${ep.seasonNumber}</itunes:season>
      <itunes:duration>${ep.durationSec}</itunes:duration>
      <itunes:explicit>${ep.explicit ? 'yes' : 'no'}</itunes:explicit>
      <podcast:guid>${podcastId}-${ep.id}</podcast:guid>`

    if (ep.transcriptUrl) {
      xml += `\n      <podcast:transcript url="${ep.transcriptUrl}" type="${ep.transcriptType ?? 'vtt'}" rel="captions" />`
    }
    if (ep.chaptersUrl) {
      xml += `\n      <podcast:chapters url="${ep.chaptersUrl}" type="application/json+chapters" />`
    }
    if (ep.persons) {
      for (const p of ep.persons) {
        xml += `\n      <podcast:person role="${p.role}"${p.img ? ` img="${p.img}"` : ''}>${escapeXml(p.name)}</podcast:person>`
      }
    }
    if (ep.funding) {
      for (const f of ep.funding) {
        xml += `\n      <podcast:funding url="${f.url}">${escapeXml(f.description)}</podcast:funding>`
      }
    }
    if (ep.soundbites) {
      for (const s of ep.soundbites) {
        xml += `\n      <podcast:soundbite startTime="${s.startTime}" duration="${(s.durationMs / 1000).toFixed(1)}">${escapeXml(s.title)}</podcast:soundbite>`
      }
    }
    xml += `\n    </item>`
    return xml
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${escapeXml(pod.title)}</title>
    <description>${escapeXml(pod.description)}</description>
    <language>${pod.language}</language>
    <link>${pod.websiteUrl}</link>
    <copyright>${escapeXml(pod.copyright)}</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <itunes:author>${escapeXml(pod.author)}</itunes:author>
    <itunes:owner>
      <itunes:name>${escapeXml(pod.author)}</itunes:name>
      <itunes:email>${pod.email}</itunes:email>
    </itunes:owner>
    <itunes:category text="${escapeXml(pod.category)}" />
    <itunes:image href="${pod.artworkUrl}" />
    <itunes:explicit>${pod.explicit ? 'yes' : 'no'}</itunes:explicit>
    <podcast:guid>${podcastId}</podcast:guid>
    <podcast:funding url="https://rock887.fm/support">Support Rock 88.7</podcast:funding>
${itemsXml}
  </channel>
</rss>`
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const url = new URL(req.url)
  const id = url.searchParams.get('id') ?? 'pod-001'

  const xml = generateRssFeed(id)
  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
