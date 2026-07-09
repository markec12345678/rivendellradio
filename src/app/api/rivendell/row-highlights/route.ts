import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mockRowHighlights } from '@/lib/rivendell/mock-data'
import type { AppearanceField } from '@/lib/rivendell/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  try {
    const rows = await db.rowHighlight.findMany({ orderBy: { id: 'asc' } })
    if (rows.length > 0) {
      return NextResponse.json({
        count: rows.length,
        highlights: rows.map((r) => ({
          id: r.id,
          field: r.field as AppearanceField,
          value: r.value,
          foreground: r.foreground,
          background: r.background,
          enabled: r.enabled,
        })),
      })
    }
  } catch {
    // DB not ready
  }
  return NextResponse.json({ count: mockRowHighlights.length, highlights: mockRowHighlights })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const field = String(body.field ?? '')
  const value = String(body.value ?? '')
  if (!field || !value) {
    return NextResponse.json({ error: 'field and value required' }, { status: 400 })
  }
  try {
    await db.rowHighlight.upsert({
      where: { field_value: { field, value } },
      create: {
        field,
        value,
        foreground: body.foreground ?? null,
        background: body.background ?? null,
        enabled: body.enabled !== false,
      },
      update: {
        foreground: body.foreground ?? null,
        background: body.background ?? null,
        enabled: body.enabled !== false,
      },
    })
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true })
}
