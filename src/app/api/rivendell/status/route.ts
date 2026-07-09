import { NextResponse } from 'next/server'
import { systemStatus } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  return NextResponse.json(systemStatus)
}
