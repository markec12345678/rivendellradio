import { NextResponse } from 'next/server'
import { eventBus } from '@/lib/event-bus'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const type = searchParams.get('type')
  const events = type ? eventBus.getHistoryByType(type, limit) : eventBus.getHistory(limit)
  return NextResponse.json({
    count: events.length,
    events: events.map((e) => ({ ...e, timestamp: new Date(e.timestamp).toISOString() })),
  })
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  if (!body.type) return NextResponse.json({ error: 'type required' }, { status: 400 })
  eventBus.publish({ type: body.type, timestamp: Date.now(), source: body.source ?? 'api', data: body.data ?? {} })
  return NextResponse.json({ ok: true, message: `Event ${body.type} published` })
}
