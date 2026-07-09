import { NextResponse } from 'next/server'
import { rockTracks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

interface ListenerRequest {
  id: string
  trackId: string
  title: string
  artist: string
  albumArt?: string
  listenerName: string
  listenerMessage?: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'played'
}

// In-memory store (would be database in production)
const requestStore: ListenerRequest[] = [
  { id: 'rq001', trackId: 't004', title: 'Bohemian Rhapsody', artist: 'Queen', albumArt: '/album-art/classic-1.png', listenerName: 'Sarah K.', listenerMessage: 'Please play this for my dad\'s birthday!', requestedAt: new Date(Date.now() - 300000).toISOString(), status: 'pending' },
  { id: 'rq002', trackId: 't013', title: 'Smells Like Teen Spirit', artist: 'Nirvana', albumArt: '/album-art/grunge-1.png', listenerName: 'Mike R.', listenerMessage: 'Friday night vibes!', requestedAt: new Date(Date.now() - 600000).toISOString(), status: 'pending' },
  { id: 'rq003', trackId: 't001', title: 'Back in Black', artist: 'AC/DC', albumArt: '/album-art/rock-1.png', listenerName: 'Anonymous', requestedAt: new Date(Date.now() - 900000).toISOString(), status: 'pending' },
  { id: 'rq004', trackId: 't021', title: 'Everlong', artist: 'Foo Fighters', albumArt: '/album-art/alt-1.png', listenerName: 'Jenny L.', listenerMessage: 'Best song ever written', requestedAt: new Date(Date.now() - 1200000).toISOString(), status: 'approved' },
  { id: 'rq005', trackId: 't029', title: 'Livin\' on a Prayer', artist: 'Bon Jovi', albumArt: '/album-art/classic-1.png', listenerName: 'Tom B.', requestedAt: new Date(Date.now() - 1800000).toISOString(), status: 'played' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  const pending = requestStore.filter((r) => r.status === 'pending').length
  return NextResponse.json({
    count: requestStore.length,
    pending,
    requests: requestStore.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Submit new request
  if (body.action === 'submit' || body.trackId) {
    const track = rockTracks.find((t) => t.id === body.trackId)
    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }
    const newRequest: ListenerRequest = {
      id: `rq${String(requestStore.length + 1).padStart(3, '0')}`,
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      listenerName: body.listenerName?.trim() || 'Anonymous',
      listenerMessage: body.listenerMessage?.trim() || undefined,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    }
    requestStore.unshift(newRequest)
    return NextResponse.json({ ok: true, request: newRequest })
  }

  // Approve / reject / mark played
  if (body.action && body.requestId) {
    const req = requestStore.find((r) => r.id === body.requestId)
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    if (['approved', 'rejected', 'played'].includes(body.action)) {
      req.status = body.action as ListenerRequest['status']
    }
    return NextResponse.json({ ok: true, request: req })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
