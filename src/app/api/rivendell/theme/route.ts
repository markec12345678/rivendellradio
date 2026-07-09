import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  try {
    const row = await db.themePreference.findUnique({ where: { id: 1 } })
    if (row) return NextResponse.json({ mode: row.mode, accentHue: row.accentHue })
  } catch {}
  return NextResponse.json({ mode: 'dark', accentHue: 60 })
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const mode = ['dark','metal','light'].includes(body.mode) ? body.mode : 'dark'
  const accentHue = typeof body.accentHue === 'number' ? Math.max(0, Math.min(360, body.accentHue)) : 60
  try {
    await db.themePreference.upsert({
      where: { id: 1 },
      create: { id: 1, mode, accentHue },
      update: { mode, accentHue },
    })
  } catch {}
  return NextResponse.json({ ok: true, mode, accentHue })
}
