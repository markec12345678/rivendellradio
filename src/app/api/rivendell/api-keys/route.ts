import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  try {
    const keys = await db.apiKey.findMany({ orderBy: { createdAt: 'desc' } })
    const safeKeys = keys.map((k) => ({
      ...k,
      lastUsed: k.lastUsed?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    }))
    return NextResponse.json({ count: safeKeys.length, keys: safeKeys })
  } catch {
    return NextResponse.json({ count: 0, keys: [] })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  try {
    // Generate API key
    const rawKey = `rk_live_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.slice(0, 12)

    const apiKey = await db.apiKey.create({
      data: {
        name: body.name ?? 'Untitled Key',
        keyHash,
        keyPrefix,
        permissions: body.permissions ?? 'read:tracks,read:schedule',
        active: true,
        createdBy: body.createdBy ?? 'system',
      },
    })

    // Audit log
    await db.auditLog.create({
      data: { action: 'create', entity: 'api-key', entityId: String(apiKey.id), details: JSON.stringify({ name: apiKey.name, permissions: apiKey.permissions }) },
    })

    return NextResponse.json({
      ok: true,
      key: rawKey, // Only returned once
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        active: apiKey.active,
        createdAt: apiKey.createdAt.toISOString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
