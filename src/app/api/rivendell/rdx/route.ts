import { NextResponse } from 'next/server'
import { mockRdxStatus } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 180))
  return NextResponse.json(mockRdxStatus)
}
