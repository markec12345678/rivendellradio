import { NextResponse } from 'next/server'
import { daemons } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  return NextResponse.json({ count: daemons.length, running: daemons.filter(d => d.status === 'running').length, daemons })
}
