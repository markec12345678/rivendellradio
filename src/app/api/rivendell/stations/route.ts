import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations } from '@/lib/rivendell/mock-data'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  let activeId = 'main-fm'
  try {
    const row = await db.activeStation.findUnique({ where: { id: 1 } })
    if (row) activeId = row.stationId
  } catch {}
  return NextResponse.json({ count: stations.length, stations, activeId })
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const stationId = typeof body.stationId === 'string' ? body.stationId : 'main-fm'
  try {
    await db.activeStation.upsert({
      where: { id: 1 },
      create: { id: 1, stationId },
      update: { stationId },
    })
  } catch {}
  return NextResponse.json({ ok: true, stationId })
}
