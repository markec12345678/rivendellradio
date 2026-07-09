import { NextResponse } from 'next/server'
import { mockPypadStatus } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 160))
  return NextResponse.json(mockPypadStatus)
}
