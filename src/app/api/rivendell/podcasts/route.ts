import { NextResponse } from 'next/server'
import { mockPodcasts } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 150))
  const summaries = mockPodcasts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    feedUrl: p.feedUrl,
    episodeCount: p.episodeCount,
    lastPublished: p.lastPublished,
    status: p.status,
  }))
  return NextResponse.json({ count: summaries.length, podcasts: summaries })
}
