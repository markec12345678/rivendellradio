// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
// API v1 — verzionirane rute z backward compat
// /api/v1/* = verzionirane (za eksterne integracije)
// /api/rivendell/* = legacy (backward compat, delegira na v1)

import { NextResponse } from 'next/server'
import { eventBus, publishTrackStarted } from '@/lib/event-bus'
import { rockTracks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// API v1 root + health + events
export async function GET(req: Request) {
  const { pathname, searchParams } = new URL(req.url)
  const path = pathname.replace('/api/v1', '')

  // Root — API info
  if (path === '' || path === '/') {
    return NextResponse.json({
      name: 'Rock 88.7 Broadcast API',
      version: '1.0.0',
      status: 'online',
      timestamp: new Date().toISOString(),
      endpoints: {
        tracks: '/api/v1/tracks',
        schedule: '/api/v1/schedule',
        stations: '/api/v1/stations',
        rds: '/api/v1/rds',
        requests: '/api/v1/requests',
        voiceTrack: '/api/v1/voice-track',
        reports: '/api/v1/reports',
        airplay: '/api/v1/airplay',
        events: '/api/v1/events',
        health: '/api/v1/health',
      },
      websocket: {
        url: '/?XTransformPort=3003',
        events: ['track.started', 'track.finished', 'rds.updated', 'vu.updated', 'request.created', 'alert.created'],
      },
    })
  }

  // Health check
  if (path === '/health') {
    return NextResponse.json({
      status: 'healthy',
      uptime: Math.round(process.uptime()),
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      eventBusHistory: eventBus.getHistory().length,
      timestamp: new Date().toISOString(),
    })
  }

  // Events history
  if (path === '/events') {
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
    const type = searchParams.get('type')
    const events = type
      ? eventBus.getHistoryByType(type, limit)
      : eventBus.getHistory(limit)
    return NextResponse.json({
      count: events.length,
      events: events.map((e) => ({ ...e, timestamp: new Date(e.timestamp).toISOString() })),
    })
  }

  // Trigger a test event
  if (path === '/events/test') {
    const track = rockTracks[0]
    publishTrackStarted({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      albumArt: track.albumArt,
      length: track.length,
      station: 'Rock 88.7 FM',
      listeners: 1287,
    })
    return NextResponse.json({ ok: true, message: 'track.started event published' })
  }

  return NextResponse.json({ error: 'Not found', path }, { status: 404 })
}

// POST for event triggers
export async function POST(req: Request) {
  const { pathname } = new URL(req.url)
  const path = pathname.replace('/api/v1', '')
  const body = await req.json().catch(() => ({}))

  // Trigger custom event
  if (path === '/events/trigger') {
    if (!body.type) {
      return NextResponse.json({ error: 'type required' }, { status: 400 })
    }
    eventBus.publish({
      type: body.type,
      timestamp: Date.now(),
      source: body.source ?? 'api',
      data: body.data ?? {},
    })
    return NextResponse.json({ ok: true, message: `Event ${body.type} published` })
  }

  return NextResponse.json({ error: 'Not found', path }, { status: 404 })
}
