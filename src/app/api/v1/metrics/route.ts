import { NextResponse } from 'next/server'
import { getPrometheusMetrics, getMetrics } from '@/lib/event-bus'

export const dynamic = 'force-dynamic'

// GET /api/v1/metrics — Prometheus format (text/plain)
// GET /api/v1/metrics?format=json — JSON format
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'json') {
    return NextResponse.json(getMetrics())
  }

  // Prometheus format (default)
  return new NextResponse(getPrometheusMetrics(), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  })
}
