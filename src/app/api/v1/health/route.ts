import { NextResponse } from 'next/server'
import { eventBus } from '@/lib/event-bus'
export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    eventBusHistory: eventBus.getHistory().length,
    timestamp: new Date().toISOString(),
  })
}
