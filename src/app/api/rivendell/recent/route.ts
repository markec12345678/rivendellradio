import { NextResponse } from 'next/server'
import { rockTracks, scheduleShows } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  // Get played tracks from all shows (sorted by recency)
  const played: Array<{ trackId: string; title: string; artist: string; album: string; playedAt: string; show: string; albumArt?: string }> = []
  for (const show of scheduleShows) {
    for (const line of show.logLines) {
      if (line.status === 'played' && line.trackId) {
        const track = rockTracks.find((t) => t.id === line.trackId)
        if (track) {
          played.push({
            trackId: track.id,
            title: track.title,
            artist: track.artist,
            album: track.album,
            albumArt: track.albumArt,
            playedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
            show: show.name,
          })
        }
      }
    }
  }
  // Sort by playedAt desc, take 8
  played.sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
  const recent = played.slice(0, 8)

  // Top tracks by playCount
  const top = [...rockTracks]
    .filter((t) => t.type === 'music')
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5)
    .map((t) => ({
      trackId: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      albumArt: t.albumArt,
      playCount: t.playCount,
      length: t.length,
    }))

  return NextResponse.json({ recent, top })
}
