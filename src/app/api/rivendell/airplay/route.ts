import { NextResponse } from 'next/server'
import { scheduleShows, rockTracks, stations } from '@/lib/rivendell/mock-data'
import type { NowPlaying } from '@/lib/rivendell/types'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  // Find the live show
  const liveShow = scheduleShows.find(s => s.status === 'live')
  const playingLine = liveShow?.logLines.find(l => l.status === 'playing')
  const track = playingLine?.trackId ? rockTracks.find(t => t.id === playingLine.trackId) : null
  const station = stations[0]
  const now: NowPlaying = {
    trackId: track?.id ?? 't001',
    title: track?.title ?? 'Back in Black',
    artist: track?.artist ?? 'AC/DC',
    album: track?.album ?? 'Back in Black',
    length: track?.length ?? 253000,
    elapsed: 120000,
    remaining: (track?.length ?? 253000) - 120000,
    station: station.name,
    listeners: station.listeners,
  }
  return NextResponse.json(now)
}
