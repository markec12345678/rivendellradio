import { NextResponse } from 'next/server'
import { eventBus } from '@/lib/event-bus'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/v1/events — event history (memory + DB)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const type = searchParams.get('type')
  const source = searchParams.get('source')

  // Pretry memory history first (fast)
  let events = type ? eventBus.getHistoryByType(type, limit) : eventBus.getHistory(limit)

  // If memory is empty or we need more, try DB
  if (events.length < limit) {
    try {
      let where: Record<string, unknown> = {}
      if (type) where.type = type
      if (source) where.source = source

      const dbEvents = await db.eventStore.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      events = dbEvents.map((e) => ({
        eventId: e.eventId,
        version: e.version,
        type: e.type,
        timestamp: e.timestamp.getTime(),
        source: e.source,
        correlationId: e.correlationId,
        data: JSON.parse(e.data),
      })) as typeof events
    } catch {
      // Fall back to memory only
    }
  }

  return NextResponse.json({
    count: events.length,
    events: events.map((e) => ({ ...e, timestamp: new Date(e.timestamp).toISOString() })),
  })
}

// POST /api/v1/events — trigger custom event
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (!body.type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const { randomUUID: uuid } = await import('crypto')
  eventBus.publish({
    eventId: uuid(),
    version: 1,
    type: body.type,
    timestamp: Date.now(),
    source: body.source ?? 'api',
    correlationId: body.correlationId ?? uuid(),
    data: body.data ?? {},
  })

  return NextResponse.json({ ok: true, message: `Event ${body.type} published` })
}
