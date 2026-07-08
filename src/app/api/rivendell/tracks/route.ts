import { NextResponse } from 'next/server'
import { rockTracks } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.toLowerCase() ?? ''
  const group = searchParams.get('group') ?? 'ALL'
  let tracks = rockTracks
  if (group !== 'ALL') tracks = tracks.filter((t) => t.group === group)
  if (q) tracks = tracks.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    t.artist.toLowerCase().includes(q) ||
    t.album.toLowerCase().includes(q) ||
    String(t.id).includes(q)
  )
  return NextResponse.json({ count: tracks.length, total: rockTracks.length, tracks })
}
