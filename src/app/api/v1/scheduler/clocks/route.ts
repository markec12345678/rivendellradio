import { NextResponse } from 'next/server'
import { DEFAULT_CLOCKS, DEFAULT_DAYPARTS, type CategoryClock, type Daypart } from '@/lib/scheduler/engine'

export const dynamic = 'force-dynamic'

/**
 * Category Clock Designer — hour-grid with category percentages + daypart variants.
 *
 * GET  /api/v1/scheduler/clocks — list all clocks + dayparts
 * POST /api/v1/scheduler/clocks — create/update a clock
 * DELETE /api/v1/scheduler/clocks?id=X — delete a clock
 */

let clocks: CategoryClock[] = [...DEFAULT_CLOCKS]
let dayparts: Daypart[] = [...DEFAULT_DAYPARTS]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    clocks: clocks.map((c) => ({
      ...c,
      slotCount: c.slots.length,
      totalPercentage: c.slots.reduce((sum, s) => sum + s.percentage, 0),
      valid: c.slots.reduce((sum, s) => sum + s.percentage, 0) === 100,
    })),
    dayparts,
    stats: {
      totalClocks: clocks.length,
      totalDayparts: dayparts.length,
      coverage24h: dayparts.length > 0 ? '24/7' : 'partial',
    },
    examples: {
      morningDrive: clocks.find((c) => c.id === 'morning-drive'),
      overnight: clocks.find((c) => c.id === 'overnight'),
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.clock) {
    const newClock: CategoryClock = body.clock
    const totalPct = newClock.slots.reduce((sum, s) => sum + s.percentage, 0)
    if (totalPct !== 100) {
      return NextResponse.json(
        { error: `Category percentages must sum to 100 (got ${totalPct})` },
        { status: 400 },
      )
    }
    const idx = clocks.findIndex((c) => c.id === newClock.id)
    if (idx >= 0) {
      clocks[idx] = newClock
    } else {
      clocks.push(newClock)
    }
    return NextResponse.json({ ok: true, clock: newClock, action: idx >= 0 ? 'updated' : 'created' })
  }

  if (body.daypart) {
    const newDp: Daypart = body.daypart
    const idx = dayparts.findIndex((d) => d.id === newDp.id)
    if (idx >= 0) {
      dayparts[idx] = newDp
    } else {
      dayparts.push(newDp)
    }
    return NextResponse.json({ ok: true, daypart: newDp, action: idx >= 0 ? 'updated' : 'created' })
  }

  if (body.resetDefaults) {
    clocks = [...DEFAULT_CLOCKS]
    dayparts = [...DEFAULT_DAYPARTS]
    return NextResponse.json({ ok: true, message: 'Reset to defaults' })
  }

  return NextResponse.json({ ok: true, clocks, dayparts })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  clocks = clocks.filter((c) => c.id !== id)
  return NextResponse.json({ ok: true, deleted: id })
}
