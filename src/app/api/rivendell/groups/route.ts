import { NextResponse } from 'next/server'
import { mockGroups } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 150))
  return NextResponse.json({ count: mockGroups.length, groups: mockGroups })
}
