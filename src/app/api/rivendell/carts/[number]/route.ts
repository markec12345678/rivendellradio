import { NextResponse } from 'next/server'
import { mockCarts } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  await new Promise((r) => setTimeout(r, 150))
  const { number } = await params
  const num = parseInt(number, 10)
  const cart = mockCarts.find((c) => c.number === num)
  if (!cart) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
  }
  return NextResponse.json(cart)
}
