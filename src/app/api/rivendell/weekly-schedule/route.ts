import { NextResponse } from 'next/server'
import { weeklySchedule } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  return NextResponse.json({ count: weeklySchedule.length, schedule: weeklySchedule })
}
