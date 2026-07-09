import { NextResponse } from 'next/server'
import { mockHotKeyBanks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 140))
  return NextResponse.json({
    count: mockHotKeyBanks.length,
    banks: mockHotKeyBanks,
  })
}
