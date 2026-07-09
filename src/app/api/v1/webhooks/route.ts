import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  try {
    const webhooks = await db.webhook.findMany({ orderBy: { createdAt: 'desc' } })
    const safe = webhooks.map((w) => ({
      ...w,
      secret: w.secret ? '***' : null, // ne vračaj secreta
      lastFired: w.lastFired?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
    }))
    return NextResponse.json({ count: safe.length, webhooks: safe })
  } catch {
    return NextResponse.json({ count: 0, webhooks: [] })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  try {
    const secret = body.generateSecret !== false ? crypto.randomBytes(32).toString('hex') : null
    const webhook = await db.webhook.create({
      data: {
        name: body.name ?? 'Untitled Webhook',
        url: body.url,
        secret,
        events: body.events ?? '*',
        active: true,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: { action: 'create', entity: 'webhook', entityId: String(webhook.id), details: JSON.stringify({ name: webhook.name, url: webhook.url, events: webhook.events }) },
    })

    return NextResponse.json({
      ok: true,
      webhook: {
        ...webhook,
        secret, // vrni secret samo enkrat
        lastFired: null,
        createdAt: webhook.createdAt.toISOString(),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }
}
