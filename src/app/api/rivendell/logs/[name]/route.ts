import { NextResponse } from 'next/server'
import { mockLogs } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  await new Promise((r) => setTimeout(r, 150))
  const { name } = await params
  const log = mockLogs.find((l) => l.name.toUpperCase() === name.toUpperCase())
  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }
  return NextResponse.json(log)
}
