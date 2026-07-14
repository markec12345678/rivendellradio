// @ts-nocheck — route uses dynamic imports
import { NextResponse } from 'next/server'
import { getOnThisDay, generateFunFactScript } from '@/lib/external-apis/wikipedia'

export const dynamic = 'force-dynamic'

/**
 * On This Day API — real historical events from Wikipedia.
 *
 * GET /api/v1/external/on-this-day
 *   Returns historical events for today.
 *
 * GET /api/v1/external/on-this-day?script=true
 *   Returns a TTS-ready "fun fact" script.
 *
 * GET /api/v1/external/on-this-day?month=7&day=13
 *   Returns events for a specific date.
 *
 * GET /api/v1/external/on-this-day?language=sl
 *   Returns events in Slovenian (if available on Wikipedia).
 *
 * Free, no API key. Uses Wikipedia/Wikimedia API.
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!) : undefined
  const day = url.searchParams.get('day') ? parseInt(url.searchParams.get('day')!) : undefined
  const language = url.searchParams.get('language') || 'en'
  const wantScript = url.searchParams.get('script') === 'true'
  const stationName = url.searchParams.get('stationName') || 'Rock 88.7 FM'
  const maxEvents = parseInt(url.searchParams.get('maxEvents') || '2')

  try {
    const result = await getOnThisDay(month, day, language)

    if (wantScript) {
      const script = generateFunFactScript(result, stationName, maxEvents)
      return NextResponse.json({
        ok: true,
        date: result.date,
        script,
        eventsUsed: Math.min(maxEvents, result.selectedEvents.length),
        _note: 'TTS-ready fun fact script. POST to /api/v1/voice/synthesize with this text.',
      })
    }

    return NextResponse.json({
      ok: true,
      date: result.date,
      totalEvents: result.events.length,
      selectedEvents: result.selectedEvents.map((e) => ({
        year: e.year,
        text: e.text,
        yearsAgo: new Date().getFullYear() - e.year,
        wikipedia: e.pages?.[0]?.content_urls?.desktop?.page,
      })),
      source: 'Wikipedia/Wikimedia API (free, no API key)',
      _note:
        'Real historical events from Wikipedia. Free, no API key. ' +
        'Use ?script=true to get a TTS-ready fun fact script.',
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Wikipedia API fetch failed',
      },
      { status: 500 },
    )
  }
}
