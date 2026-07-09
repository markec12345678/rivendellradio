import { NextResponse } from 'next/server'
import { mockLogs } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 150))
  const summaries = mockLogs.map((l) => ({
    name: l.name,
    serviceName: l.serviceName,
    description: l.description,
    date: l.date,
    lineCount: l.lineCount,
    totalLength: l.totalLength,
    status: l.status,
    lastModified: l.lastModified,
  }))
  return NextResponse.json({ count: summaries.length, logs: summaries })
}
