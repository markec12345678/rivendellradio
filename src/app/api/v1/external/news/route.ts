// @ts-nocheck — route uses dynamic imports
import { NextResponse } from 'next/server'
import { getNews, generateNewsBulletin, getAvailableFeeds } from '@/lib/external-apis/news'

export const dynamic = 'force-dynamic'

/**
 * News API — real news headlines from free RSS feeds.
 *
 * GET /api/v1/external/news
 *   Returns headlines from all feeds (BBC, NPR, 24ur, etc.)
 *
 * GET /api/v1/external/news?feed=bbc-world
 *   Returns headlines from a specific feed only.
 *
 * GET /api/v1/external/news?script=true
 *   Returns a TTS-ready news bulletin script.
 *
 * GET /api/v1/external/news?script=true&maxHeadlines=5
 *   Returns a bulletin with up to 5 headlines.
 *
 * Free, no API key. Uses RSS feeds.
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const feedId = url.searchParams.get('feed') || undefined
  const wantScript = url.searchParams.get('script') === 'true'
  const maxHeadlines = parseInt(url.searchParams.get('maxHeadlines') || '3')
  const stationName = url.searchParams.get('stationName') || 'Rock 88.7 FM'
  const limitPerFeed = parseInt(url.searchParams.get('limit') || '5')

  try {
    const { feeds, totalItems } = await getNews(feedId, limitPerFeed)

    if (wantScript) {
      const script = generateNewsBulletin(feeds, stationName, maxHeadlines)
      return NextResponse.json({
        ok: true,
        script,
        headlinesUsed: Math.min(maxHeadlines, totalItems),
        sources: feeds.filter((f) => f.items.length > 0).map((f) => f.source),
        _note: 'TTS-ready news bulletin. POST to /api/v1/voice/synthesize with this text.',
      })
    }

    return NextResponse.json({
      ok: true,
      feeds,
      totalItems,
      availableFeeds: getAvailableFeeds().map((f) => ({
        id: f.id,
        name: f.name,
        language: f.language,
        category: f.category,
      })),
      source: 'RSS feeds (free, no API key)',
      _note:
        'Real news headlines from free RSS feeds. No API key required. ' +
        'Use ?script=true to get a TTS-ready bulletin.',
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'News fetch failed',
        _fallback: 'Use simulated news data from /api/v1/ai/show-prep as fallback',
      },
      { status: 500 },
    )
  }
}
