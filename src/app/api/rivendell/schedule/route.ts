import { NextResponse } from 'next/server'
import { scheduleShows } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  return NextResponse.json({ count: scheduleShows.length, shows: scheduleShows })
}
