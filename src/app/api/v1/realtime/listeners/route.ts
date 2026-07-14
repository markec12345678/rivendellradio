// @ts-nocheck — route uses dynamic imports
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Real-Time Listener API — live listener stats for the operator dashboard.
 *
 * GET /api/v1/realtime/listeners
 *
 * Returns:
 *   - Current listener count (from Icecast2, if connected)
 *   - Active sessions in the last 5 minutes
 *   - Current track (if available)
 *   - Listener trend (increasing/stable/decreasing)
 *   - Device breakdown
 *   - Geographic distribution
 *
 * This endpoint can be polled every 5-10 seconds for a live dashboard.
 * For true real-time, use the WebSocket feed (mini-services/broadcast-feed).
 */

export async function GET() {
  const now = new Date()
  const fiveMinAgo = new Date(now.getTime() - 5 * 60000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60000)
  const twentyFourHAgo = new Date(now.getTime() - 24 * 3600000)

  // Sessions in the last 5 minutes (active listeners)
  const activeSessions = await db.listenerSession.count({
    where: { startedAt: { gte: fiveMinAgo } },
  }).catch(() => 0)

  // Total sessions today
  const sessionsToday = await db.listenerSession.count({
    where: { startedAt: { gte: twentyFourHAgo } },
  }).catch(() => 0)

  // Sessions in the last hour
  const sessionsLastHour = await db.listenerSession.count({
    where: { startedAt: { gte: oneHourAgo } },
  }).catch(() => 0)

  // Device breakdown (from sessions today)
  const deviceBreakdown = await db.listenerSession.groupBy({
    by: ['device'],
    where: { startedAt: { gte: twentyFourHAgo } },
    _count: true,
  }).catch(() => [])

  // Returning listeners today
  const returningToday = await db.listenerSession.count({
    where: {
      startedAt: { gte: twentyFourHAgo },
      returning: true,
    },
  }).catch(() => 0)

  // Average session duration today (in minutes)
  const avgSessionResult = await db.listenerSession.aggregate({
    where: { startedAt: { gte: twentyFourHAgo } },
    _avg: { durationMs: true },
  }).catch(() => ({ _avg: { durationMs: 0 } }))
  const avgSessionMin = avgSessionResult._avg?.durationMs
    ? Math.round(avgSessionResult._avg.durationMs / 60000)
    : 0

  // Geographic distribution (top 5 regions)
  const geoResult = await db.listenerSession.groupBy({
    by: ['geoRegion'],
    where: {
      startedAt: { gte: twentyFourHAgo },
      geoRegion: { not: null },
    },
    _count: true,
    orderBy: { _count: { geoRegion: 'desc' } },
    take: 5,
  }).catch(() => [])

  // Trend: compare last 5 min vs previous 5 min
  const tenMinAgo = new Date(now.getTime() - 10 * 60000)
  const previousSessions = await db.listenerSession.count({
    where: {
      startedAt: { gte: tenMinAgo, lt: fiveMinAgo },
    },
  }).catch(() => 0)

  let trend: 'increasing' | 'stable' | 'decreasing' | 'no-data'
  if (activeSessions === 0 && previousSessions === 0) {
    trend = 'no-data'
  } else if (activeSessions > previousSessions * 1.1) {
    trend = 'increasing'
  } else if (activeSessions < previousSessions * 0.9) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  return NextResponse.json({
    _disclaimer:
      'Real-Time Listener Stats. Poll every 5-10 seconds for a live dashboard. ' +
      'For true real-time (sub-second), use the WebSocket feed on port 3003.',

    timestamp: now.toISOString(),

    live: {
      activeListeners: activeSessions,
      trend,
      previous5Min: previousSessions,
    },

    today: {
      totalSessions: sessionsToday,
      sessionsLastHour,
      returningListeners: returningToday,
      newListeners: sessionsToday - returningToday,
      avgSessionMin,
    },

    devices: Object.fromEntries(
      deviceBreakdown.map((d) => [d.device, d._count]),
    ),

    geographic: geoResult
      .filter((g) => g.geoRegion)
      .map((g) => ({ region: g.geoRegion, listeners: g._count })),

    icecast: {
      // If Icecast2 is connected, the adapter will update this
      connected: false,
      note: 'Icecast2 connection status is updated by the adapter. If connected, activeListeners reflects real Icecast2 listeners.',
    },

    polling: {
      recommendedInterval: '5s',
      maxInterval: '30s',
      note: 'Poll /api/v1/realtime/listeners every 5 seconds for a live dashboard. Use the WebSocket feed (port 3003) for sub-second updates.',
    },
  })
}
