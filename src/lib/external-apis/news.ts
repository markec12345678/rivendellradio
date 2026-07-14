/**
 * News API — free RSS feeds, no API key required.
 *
 * Fetches headlines from free RSS feeds:
 *   - BBC World News (English)
 *   - 24ur.com (Slovenian)
 *   - Reuters (English)
 *   - NPR News (English)
 *
 * The AI can use these headlines to generate news bulletins.
 * The TTS system can then synthesize the bulletin as audio.
 */

export interface NewsItem {
  title: string
  link: string
  source: string
  publishedAt: string
  category: string
}

export interface NewsFeed {
  source: string
  items: NewsItem[]
}

interface FeedConfig {
  id: string
  name: string
  url: string
  language: 'en' | 'sl' | 'de' | 'fr' | 'es' | 'it'
  category: 'world' | 'business' | 'tech' | 'sports' | 'entertainment' | 'local'
}

/**
 * RSS feeds — all free, no API key.
 */
const FEEDS: FeedConfig[] = [
  {
    id: 'bbc-world',
    name: 'BBC World News',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    language: 'en',
    category: 'world',
  },
  {
    id: 'bbc-business',
    name: 'BBC Business',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    language: 'en',
    category: 'business',
  },
  {
    id: '24ur',
    name: '24ur.com',
    url: 'https://www.24ur.com/rss',
    language: 'sl',
    category: 'local',
  },
  {
    id: 'npr-news',
    name: 'NPR News',
    url: 'https://feeds.npr.org/1001/rss.xml',
    language: 'en',
    category: 'world',
  },
]

/**
 * Fetch and parse an RSS feed.
 * Extracts titles, links, and publication dates.
 */
async function fetchFeed(feed: FeedConfig, limit = 5): Promise<NewsFeed> {
  try {
    const res = await fetch(feed.url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Rock887/1.0 (radio news aggregator)' },
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const xml = await res.text()

    // Simple regex-based RSS parser (no external dependency)
    const items: NewsItem[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
      const itemXml = match[1]

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/)
      const dateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)

      const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : ''
      if (!title) continue

      items.push({
        title,
        link: linkMatch ? linkMatch[1].trim() : '',
        source: feed.name,
        publishedAt: dateMatch ? dateMatch[1].trim() : new Date().toISOString(),
        category: feed.category,
      })
    }

    return { source: feed.name, items }
  } catch (err) {
    return {
      source: feed.name,
      items: [],
    }
  }
}

/**
 * Fetch news from all feeds (or a specific one).
 *
 * @param feedId — optional feed ID to fetch only one source
 * @param limitPerFeed — max items per feed (default: 5)
 */
export async function getNews(
  feedId?: string,
  limitPerFeed = 5,
): Promise<{ feeds: NewsFeed[]; totalItems: number }> {
  const feedsToFetch = feedId ? FEEDS.filter((f) => f.id === feedId) : FEEDS

  const results = await Promise.all(feedsToFetch.map((f) => fetchFeed(f, limitPerFeed)))

  const totalItems = results.reduce((sum, f) => sum + f.items.length, 0)

  return { feeds: results, totalItems }
}

/**
 * Generate a news bulletin script for TTS.
 *
 * Takes the top headlines and formats them as a radio news bulletin.
 *
 * Example: "Here are the top stories. [Headline 1]. [Headline 2].
 *           [Headline 3]. You're listening to Rock 88.7 FM."
 */
export function generateNewsBulletin(
  feeds: NewsFeed[],
  stationName = 'Rock 88.7 FM',
  maxHeadlines = 3,
): string {
  // Collect top headlines from all feeds
  const allItems: NewsItem[] = []
  for (const feed of feeds) {
    allItems.push(...feed.items)
  }

  // Sort by publishedAt (newest first)
  allItems.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime()
    const dateB = new Date(b.publishedAt).getTime()
    return dateB - dateA
  })

  const headlines = allItems.slice(0, maxHeadlines)

  if (headlines.length === 0) {
    return `News update on ${stationName}. No headlines available at this time.`
  }

  const parts: string[] = []
  parts.push(`Here are the top stories on ${stationName}.`)

  for (const headline of headlines) {
    // Clean up the title (remove HTML entities, CDATA)
    const cleanTitle = headline.title
      .replace(/&amp;/g, 'and')
      .replace(/&[#0-9a-z]+;/g, '')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim()
    parts.push(cleanTitle + '.')
  }

  parts.push(`You're listening to ${stationName}.`)

  return parts.join(' ')
}

/**
 * Get the list of available news feeds.
 */
export function getAvailableFeeds(): FeedConfig[] {
  return FEEDS
}
