import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 100))
  try {
    const row = await db.rivendellConfig.findUnique({ where: { id: 1 } })
    if (row) return NextResponse.json({ ...row, updatedAt: row.updatedAt.toISOString() })
  } catch {}
  const now = new Date().toISOString()
  return NextResponse.json({ id: 1, url: 'http://localhost/rdxport.cgi', username: null, password: null, connected: false, updatedAt: now })
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  try {
    const row = await db.rivendellConfig.upsert({
      where: { id: 1 },
      create: { id: 1, url: body.url ?? 'http://localhost/rdxport.cgi', username: body.username ?? null, password: body.password ?? null, connected: body.connected ?? false },
      update: { url: body.url, username: body.username, password: body.password, connected: body.connected },
    })
    return NextResponse.json({ ...row, updatedAt: row.updatedAt.toISOString() })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
