/**
 * Wikipedia "On This Day" API — free, no API key required.
 *
 * Fetches real historical events that happened on today's date.
 * Used by show-prep to generate real fun facts and anniversaries.
 *
 * API: https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/{MM}/{DD}
 * Free, no API key, no rate limit (reasonable use).
 */

export interface HistoricalEvent {
  year: number
  text: string
  pages?: { title: string; description?: string; content_urls?: { desktop: { page: string } } }[]
}

export interface OnThisDayResult {
  date: string
  events: HistoricalEvent[]
  selectedEvents: HistoricalEvent[] // top 5 most notable
}

/**
 * Fetch historical events for today (or a specific date).
 *
 * @param month 1-12 (default: current month)
 * @param day 1-31 (default: current day)
 * @param language 'en' | 'sl' | 'hr' | 'de' | ... (default: 'en')
 */
export async function getOnThisDay(
  month?: number,
  day?: number,
  language: string = 'en',
): Promise<OnThisDayResult> {
  const now = new Date()
  const m = month || now.getMonth() + 1
  const d = day || now.getDate()

  // Wikipedia supports many languages — map our codes to Wikipedia codes
  const wikiLang = language === 'sl' ? 'sl' : language === 'hr' ? 'hr' : language === 'sr' ? 'sr' : 'en'

  const url = `https://api.wikimedia.org/feed/v1/wikipedia/${wikiLang}/onthisday/events/${m}/${d}`

  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Rock887/1.0 (radio show prep)' },
  })

  if (!res.ok) {
    // Fallback to English if the language is not available
    if (wikiLang !== 'en') {
      const enUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${m}/${d}`
      const enRes = await fetch(enUrl, { cache: 'no-store' })
      if (!enRes.ok) throw new Error(`Wikipedia API error: ${enRes.status}`)
      const enData = await enRes.json()
      return parseOnThisDay(enData, m, d)
    }
    throw new Error(`Wikipedia API error: ${res.status}`)
  }

  const data = await res.json()
  return parseOnThisDay(data, m, d)
}

function parseOnThisDay(data: any, month: number, day: number): OnThisDayResult {
  const events: HistoricalEvent[] = (data.events || [])
    .map((e: any) => ({
      year: e.year || 0,
      text: e.text || '',
      pages: e.pages?.map((p: any) => ({
        title: p.title,
        description: p.description,
        content_urls: p.content_urls,
      })),
    }))
    .filter((e: HistoricalEvent) => e.text.length > 0)

  // Sort by year descending (most recent first) and select top 5 notable
  const sorted = [...events].sort((a, b) => b.year - a.year)
  const selectedEvents = sorted.slice(0, 5)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return {
    date: `${monthNames[month - 1]} ${day}`,
    events: sorted,
    selectedEvents,
  }
}

/**
 * Generate a "fun fact" radio script from historical events.
 *
 * Example: "On this day in 1985, Live Aid concert was held simultaneously
 * in London and Philadelphia. You're listening to Rock 88.7 FM."
 */
export function generateFunFactScript(
  result: OnThisDayResult,
  stationName = 'Rock 88.7 FM',
  maxEvents = 2,
): string {
  const events = result.selectedEvents.slice(0, maxEvents)

  if (events.length === 0) {
    return `On this day in history, many things happened. You're listening to ${stationName}.`
  }

  const parts: string[] = [`On this day, ${result.date}.`]

  for (const event of events) {
    const yearsAgo = new Date().getFullYear() - event.year
    if (yearsAgo > 0) {
      parts.push(`${yearsAgo} years ago, in ${event.year}, ${event.text}`)
    } else {
      parts.push(`In ${event.year}, ${event.text}`)
    }
  }

  parts.push(`You're listening to ${stationName}.`)

  return parts.join(' ')
}
