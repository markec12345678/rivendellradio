import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mockAppearanceRules } from '@/lib/rivendell/mock-data'
import type { AppearanceField } from '@/lib/rivendell/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))
  try {
    const rows = await db.appearanceRule.findMany({ orderBy: { id: 'asc' } })
    if (rows.length > 0) {
      return NextResponse.json({
        count: rows.length,
        rules: rows.map((r) => ({
          id: r.id,
          field: r.field as AppearanceField,
          value: r.value,
          foreground: r.foreground,
          background: r.background,
          bold: r.bold,
          enabled: r.enabled,
        })),
      })
    }
  } catch {
    // DB not ready
  }
  return NextResponse.json({ count: mockAppearanceRules.length, rules: mockAppearanceRules })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  // Simple upsert by field+value
  const field = String(body.field ?? '')
  const value = String(body.value ?? '')
  if (!field || !value) {
    return NextResponse.json({ error: 'field and value required' }, { status: 400 })
  }
  try {
    await db.appearanceRule.upsert({
      where: { field_value: { field, value } },
      create: {
        field,
        value,
        foreground: body.foreground ?? null,
        background: body.background ?? null,
        bold: Boolean(body.bold),
        enabled: body.enabled !== false,
      },
      update: {
        foreground: body.foreground ?? null,
        background: body.background ?? null,
        bold: Boolean(body.bold),
        enabled: body.enabled !== false,
      },
    })
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true })
}
