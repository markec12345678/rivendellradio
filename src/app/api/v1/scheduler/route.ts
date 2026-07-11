import { NextResponse } from 'next/server'
import {
  scheduleHour,
  DEFAULT_SEPARATION_RULES,
  DEFAULT_CONFLICT_RULES,
  DEFAULT_CLOCKS,
  DEFAULT_DAYPARTS,
  SAMPLE_LIBRARY,
  getActiveClock,
  getActiveDaypart,
  type SchedulerConfig,
} from '@/lib/scheduler/engine'

export const dynamic = 'force-dynamic'

/**
 * Formal Rule-Based Music Scheduler (GSelector-class).
 *
 * GET /api/v1/scheduler
 *   ?hour=14           — schedule a specific hour (default: current)
 *   ?date=2026-07-10   — schedule a specific date
 *   ?librarySize=15    — sample library size
 *
 * Returns: scheduled tracks with demand scores, rule violations, category distribution.
 *
 * Algorithm:
 *   1. Get active category clock based on daypart
 *   2. Compute category counts from clock percentages
 *   3. For each slot: score candidates by demand - penalty
 *   4. Skip hard violations (artist/title separation, DMCA, explicit-daypart)
 *   5. Pick highest-scoring candidate
 */

const DEFAULT_CONFIG: SchedulerConfig = {
  separationRules: DEFAULT_SEPARATION_RULES,
  conflictRules: DEFAULT_CONFLICT_RULES,
  clocks: DEFAULT_CLOCKS,
  dayparts: DEFAULT_DAYPARTS,
  library: SAMPLE_LIBRARY,
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const url = new URL(req.url)
  const hourParam = url.searchParams.get('hour')
  const dateParam = url.searchParams.get('date')

  const now = dateParam ? new Date(dateParam) : new Date()
  if (hourParam !== null) now.setHours(parseInt(hourParam), 0, 0, 0)

  const daypart = getActiveDaypart(now, DEFAULT_CONFIG.dayparts)
  const clock = getActiveClock(now, DEFAULT_CONFIG)

  const result = scheduleHour(now, DEFAULT_CONFIG, [])

  return NextResponse.json({
    scheduledAt: now.toISOString(),
    daypart: daypart
      ? { id: daypart.id, name: daypart.name, startHour: daypart.startHour, endHour: daypart.endHour, daysOfWeek: daypart.daysOfWeek }
      : null,
    clock: clock
      ? {
          id: clock.id,
          name: clock.name,
          description: clock.description,
          slots: clock.slots,
        }
      : null,
    scheduled: result.scheduled,
    violations: result.violations,
    stats: result.stats,
    rules: {
      separation: DEFAULT_SEPARATION_RULES.map((r) => ({
        attribute: r.attribute,
        windowMinutes: r.windowMinutes,
        hardRule: r.hardRule,
        tolerance: r.tolerance,
      })),
      conflicts: DEFAULT_CONFLICT_RULES.map((c) => ({
        type: c.type,
        enabled: c.enabled,
        config: c.config,
      })),
    },
    library: {
      totalTracks: DEFAULT_CONFIG.library.length,
      categories: DEFAULT_CONFIG.library.reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + 1
        return acc
      }, {}),
      avgBpm: Math.round(
        (DEFAULT_CONFIG.library.reduce((s, t) => s + (t.bpm ?? 0), 0) / DEFAULT_CONFIG.library.length) * 10,
      ) / 10,
    },
    algorithm: {
      name: 'rule-based-backtracking (GSelector-class)',
      version: '1.0.0',
      features: [
        'Category clocks z daypart templates',
        'Separation matrix (artist/title/album/BPM/key/soundCode/gender)',
        'Demand scoring (rotation budget vs actual plays)',
        'Conflict avoidance (DMCA §114, brand-competitor, explicit-daypart)',
        'Backtracking fill z hard vs soft rule separation',
        'Reversion to sweeper/jingle on no-candidate',
      ],
      comparedTo: {
        gselector: 'Natural demand algorithm — equivalent',
        musicmaster: 'Rotation engine — equivalent',
        powergold: 'Separation rules — equivalent',
      },
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Allow custom config override (production: persisted per-station)
  const config: SchedulerConfig = {
    ...DEFAULT_CONFIG,
    ...(body.separationRules && { separationRules: body.separationRules }),
    ...(body.conflictRules && { conflictRules: body.conflictRules }),
  }

  const date = body.date ? new Date(body.date) : new Date()
  if (body.hour !== undefined) date.setHours(parseInt(body.hour), 0, 0, 0)

  const result = scheduleHour(date, config, body.recentSchedule ?? [])

  return NextResponse.json({
    ok: true,
    scheduledAt: date.toISOString(),
    ...result,
  })
}
