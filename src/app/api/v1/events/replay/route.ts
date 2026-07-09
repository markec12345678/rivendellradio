import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/v1/events/replay — replay events from DB
// Query params: limit (default 100, max 1000), type (filter), from (ISO date)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 1000)
  const type = searchParams.get('type')
  const from = searchParams.get('from')

  try {
    let where: Record<string, unknown> = {}
    if (type) where.type = type
    if (from) where.timestamp = { gte: new Date(from) }

    const events = await db.eventStore.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    })

    const replayed = events.map((e) => ({
      eventId: e.eventId,
      version: e.version,
      type: e.type,
      timestamp: e.timestamp.toISOString(),
      source: e.source,
      correlationId: e.correlationId,
      data: JSON.parse(e.data),
    }))

    return NextResponse.json({
      count: replayed.length,
      replayed: true,
      events: replayed,
    })
  } catch {
    return NextResponse.json({ count: 0, events: [], error: 'Replay failed' }, { status: 500 })
  }
}
