import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 100))
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const entity = searchParams.get('entity')
  const action = searchParams.get('action')

  try {
    let where: Record<string, unknown> = {}
    if (entity) where.entity = entity
    if (action) where.action = action

    const logs = await db.auditLog.findMany({
      where,
      include: { user: { select: { username: true, fullName: true } } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    const entries = logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      username: l.user?.username ?? null,
      fullName: l.user?.fullName ?? null,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      ipAddress: l.ipAddress,
      timestamp: l.timestamp.toISOString(),
    }))

    return NextResponse.json({ count: entries.length, entries })
  } catch {
    return NextResponse.json({ count: 0, entries: [] })
  }
}
