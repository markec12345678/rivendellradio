import { NextResponse } from 'next/server'
import { mockCarts } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  await new Promise((r) => setTimeout(r, 150))
  const { searchParams } = new URL(request.url)
  const group = searchParams.get('group') ?? ''
  const q = (searchParams.get('q') ?? '').toLowerCase().trim()
  const limitRaw = searchParams.get('limit')

  let carts = mockCarts.slice()
  if (group && group !== 'ALL') {
    carts = carts.filter((c) => c.group === group)
  }
  if (q) {
    carts = carts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.artist.toLowerCase().includes(q) ||
        String(c.number).includes(q) ||
        (c.album ?? '').toLowerCase().includes(q),
    )
  }
  if (limitRaw) {
    const limit = parseInt(limitRaw, 10)
    if (!Number.isNaN(limit)) carts = carts.slice(0, limit)
  }
  return NextResponse.json({
    count: carts.length,
    total: mockCarts.length,
    carts,
  })
}
