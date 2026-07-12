import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Social Media ROI Dashboard + Calendar.
 *
 * Closed loop: post → engagement → stream tune-in. Measures listener-acquisition-per-post
 * using UTM-tagged shortlinks per post.
 *
 * GET  /api/v1/social         — calendar + posts + engagement metrics + ROI
 * POST /api/v1/social         — schedule post, sync metrics
 */

interface SocialPost {
  id: string
  platform: 'twitter' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'threads'
  content: string
  mediaType: 'text' | 'image' | 'video' | 'carousel'
  scheduledAt: string
  publishedAt: string | null
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  // Engagement metrics
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  // ROI tracking
  clickThroughs: number      // clicks to stream URL (UTM-tagged shortlink)
  tuneIns: number            // confirmed tune-ins (matched listener ID within 1h of click)
  costPerTuneIn: number      // USD (production cost / tuneIns)
  // Caption variants
  captionVariants: { platform: string; text: string; hashtags: string[] }[]
  // Optimal time
  optimalTimeScore: number   // 0-1, based on historical listener activity peaks
}

const POSTS: SocialPost[] = [
  { id: 'post-001', platform: 'twitter', content: '🎵 NOW PLAYING: Seven Nation Army by The White Stripes on Rock 88.7 FM #NowPlaying', mediaType: 'image', scheduledAt: new Date(Date.now() - 3600000).toISOString(), publishedAt: new Date(Date.now() - 3600000).toISOString(), status: 'published', reach: 4287, likes: 248, comments: 42, shares: 67, saves: 89, clickThroughs: 142, tuneIns: 89, costPerTuneIn: 0.08, captionVariants: [{ platform: 'twitter', text: '🎵 NOW PLAYING: Seven Nation Army', hashtags: ['#NowPlaying', '#Rock'] }], optimalTimeScore: 0.92 },
  { id: 'post-002', platform: 'instagram', content: '🎤 Behind the scenes with Alex Morgan on the Morning Show! Swipe for more →', mediaType: 'carousel', scheduledAt: new Date(Date.now() + 1800000).toISOString(), publishedAt: null, status: 'scheduled', reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clickThroughs: 0, tuneIns: 0, costPerTuneIn: 0, captionVariants: [{ platform: 'instagram', text: '🎤 Behind the scenes with Alex Morgan on the Morning Show!', hashtags: ['#BTS', '#MorningShow', '#Rock887'] }, { platform: 'facebook', text: 'Go behind the scenes with Alex Morgan on the Morning Show!', hashtags: ['#BTS', '#MorningShow'] }], optimalTimeScore: 0.87 },
  { id: 'post-003', platform: 'tiktok', content: '🎸 30-second guitar riff challenge — can you name this song? #RockChallenge', mediaType: 'video', scheduledAt: new Date(Date.now() + 7200000).toISOString(), publishedAt: null, status: 'scheduled', reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clickThroughs: 0, tuneIns: 0, costPerTuneIn: 0, captionVariants: [{ platform: 'tiktok', text: '🎸 30-second guitar riff challenge', hashtags: ['#RockChallenge', '#FYP', '#Rock887'] }], optimalTimeScore: 0.95 },
  { id: 'post-004', platform: 'facebook', content: '📻 Happy Friday! What\'s your weekend rock anthem? Drop it in the comments 👇', mediaType: 'text', scheduledAt: new Date(Date.now() - 86400000).toISOString(), publishedAt: new Date(Date.now() - 86400000).toISOString(), status: 'published', reach: 8900, likes: 412, comments: 234, shares: 89, saves: 67, clickThroughs: 89, tuneIns: 42, costPerTuneIn: 0.19, captionVariants: [{ platform: 'facebook', text: '📻 Happy Friday! What\'s your weekend rock anthem?', hashtags: ['#FridayVibes'] }], optimalTimeScore: 0.78 },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const published = POSTS.filter((p) => p.status === 'published')
  const totalTuneIns = published.reduce((s, p) => s + p.tuneIns, 0)
  const totalEngagement = published.reduce((s, p) => s + p.likes + p.comments + p.shares + p.saves, 0)
  const totalCost = published.reduce((s, p) => s + p.costPerTuneIn * p.tuneIns, 0)
  const leaderboard = [...published].sort((a, b) => b.tuneIns - a.tuneIns).slice(0, 5)

  return NextResponse.json({
    posts: POSTS,
    scheduled: POSTS.filter((p) => p.status === 'scheduled'),
    published,
    stats: {
      totalPosts: POSTS.length,
      published: published.length,
      scheduled: POSTS.filter((p) => p.status === 'scheduled').length,
      totalReach: published.reduce((s, p) => s + p.reach, 0),
      totalEngagement,
      engagementRate: published.length > 0 ? Math.round((totalEngagement / published.reduce((s, p) => s + p.reach, 0)) * 1000) / 10 : 0,
      totalTuneIns,
      totalCost: Math.round(totalCost * 100) / 100,
      avgCostPerTuneIn: totalTuneIns > 0 ? Math.round((totalCost / totalTuneIns) * 100) / 100 : 0,
    },
    leaderboard,
    platforms: {
      twitter: { posts: POSTS.filter((p) => p.platform === 'twitter').length, followers: 12400 },
      facebook: { posts: POSTS.filter((p) => p.platform === 'facebook').length, followers: 8200 },
      instagram: { posts: POSTS.filter((p) => p.platform === 'instagram').length, followers: 15600 },
      tiktok: { posts: POSTS.filter((p) => p.platform === 'tiktok').length, followers: 23100 },
      youtube: { posts: POSTS.filter((p) => p.platform === 'youtube').length, followers: 4800 },
      threads: { posts: POSTS.filter((p) => p.platform === 'threads').length, followers: 3200 },
    },
    tech: {
      unifiedApi: 'Ayrshare (13+ networks) or Zernio (15+ networks)',
      utmTracking: 'Per-post UTM-tagged shortlink → click → 1h tune-in matching',
      aiCaptions: 'AI Social module generates platform-specific captions + hashtag variants',
      optimalTime: 'Historical listener activity peaks suggest best posting times',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'schedule-post') {
    const post: SocialPost = {
      id: `post-${Date.now()}`,
      platform: body.platform ?? 'twitter',
      content: body.content ?? '',
      mediaType: body.mediaType ?? 'text',
      scheduledAt: body.scheduledAt ?? new Date(Date.now() + 3600000).toISOString(),
      publishedAt: null,
      status: 'scheduled',
      reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, clickThroughs: 0, tuneIns: 0, costPerTuneIn: 0,
      captionVariants: body.captionVariants ?? [],
      optimalTimeScore: body.optimalTimeScore ?? 0.85,
    }
    POSTS.push(post)
    return NextResponse.json({ ok: true, post, message: `Post scheduled for ${new Date(post.scheduledAt).toLocaleString()}` })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
