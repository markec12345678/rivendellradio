import { NextResponse } from 'next/server'
import { DEFAULT_SEPARATION_RULES, type SeparationRule } from '@/lib/scheduler/engine'

export const dynamic = 'force-dynamic'

/**
 * Separation Matrix Config — artist/title/album/BPM/key/soundCode/gender separation rules.
 *
 * GET  /api/v1/scheduler/separation — current rules
 * POST /api/v1/scheduler/separation — update rules (admin only in production)
 */

let currentRules: SeparationRule[] = [...DEFAULT_SEPARATION_RULES]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    count: currentRules.length,
    rules: currentRules.map((r) => ({
      attribute: r.attribute,
      windowMinutes: r.windowMinutes,
      hardRule: r.hardRule,
      tolerance: r.tolerance,
      description: describeRule(r),
    })),
    presets: {
      gselector: 'GSelector natural demand (artist 2h, title 4h, BPM ±10)',
      musicmaster: 'MusicMaster rotation (artist 3h, title 6h, key ±2)',
      powergold: 'PowerGOLD aggressive (artist 4h, title 8h, BPM ±20)',
      conservative: 'Conservative (artist 6h, title 12h)',
    },
    defaultRules: DEFAULT_SEPARATION_RULES,
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.preset) {
    const presets: Record<string, SeparationRule[]> = {
      gselector: [
        { attribute: 'artist', windowMinutes: 120, hardRule: true },
        { attribute: 'title', windowMinutes: 240, hardRule: true },
        { attribute: 'album', windowMinutes: 60, hardRule: false, tolerance: 0 },
        { attribute: 'bpm', windowMinutes: 20, hardRule: false, tolerance: 10 },
        { attribute: 'key', windowMinutes: 20, hardRule: false, tolerance: 2 },
        { attribute: 'soundCode', windowMinutes: 15, hardRule: false, tolerance: 0 },
        { attribute: 'gender', windowMinutes: 10, hardRule: false, tolerance: 0 },
        { attribute: 'category', windowMinutes: 0, hardRule: false, tolerance: 0 },
      ],
      musicmaster: DEFAULT_SEPARATION_RULES,
      powergold: [
        { attribute: 'artist', windowMinutes: 240, hardRule: true },
        { attribute: 'title', windowMinutes: 480, hardRule: true },
        { attribute: 'album', windowMinutes: 180, hardRule: false, tolerance: 0 },
        { attribute: 'bpm', windowMinutes: 40, hardRule: false, tolerance: 20 },
        { attribute: 'key', windowMinutes: 40, hardRule: false, tolerance: 3 },
        { attribute: 'soundCode', windowMinutes: 30, hardRule: false, tolerance: 0 },
        { attribute: 'gender', windowMinutes: 20, hardRule: false, tolerance: 0 },
        { attribute: 'category', windowMinutes: 0, hardRule: false, tolerance: 0 },
      ],
      conservative: [
        { attribute: 'artist', windowMinutes: 360, hardRule: true },
        { attribute: 'title', windowMinutes: 720, hardRule: true },
        { attribute: 'album', windowMinutes: 240, hardRule: true, tolerance: 0 },
        { attribute: 'bpm', windowMinutes: 60, hardRule: false, tolerance: 15 },
        { attribute: 'key', windowMinutes: 60, hardRule: false, tolerance: 2 },
        { attribute: 'soundCode', windowMinutes: 45, hardRule: false, tolerance: 0 },
        { attribute: 'gender', windowMinutes: 30, hardRule: false, tolerance: 0 },
        { attribute: 'category', windowMinutes: 0, hardRule: false, tolerance: 0 },
      ],
    }
    if (presets[body.preset]) {
      currentRules = presets[body.preset]
      return NextResponse.json({ ok: true, preset: body.preset, rules: currentRules })
    }
  }

  if (Array.isArray(body.rules)) {
    currentRules = body.rules
    return NextResponse.json({ ok: true, rules: currentRules })
  }

  if (body.reset === true) {
    currentRules = [...DEFAULT_SEPARATION_RULES]
    return NextResponse.json({ ok: true, message: 'Reset to defaults', rules: currentRules })
  }

  return NextResponse.json({ ok: true, rules: currentRules })
}

function describeRule(r: SeparationRule): string {
  const hard = r.hardRule ? 'Hard' : 'Soft'
  const tol = r.tolerance ? ` (±${r.tolerance})` : ''
  const mins = r.windowMinutes === 0 ? 'disabled' : `${r.windowMinutes}min`
  return `${hard} rule: ${r.attribute} separation ${mins}${tol}`
}
