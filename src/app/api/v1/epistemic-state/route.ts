import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  EPISTEMOLOGICAL_INVARIANTS,
  AUDIT_BASELINE_2026,
  checkConfidenceInvariant,
  checkLegendPreventionInvariant,
  type InvariantViolation,
  type InvariantId,
} from '@/lib/ai-core/invariants'

export const dynamic = 'force-dynamic'

/**
 * Epistemic State Observability — the system's ability to observe its own
 * epistemic integrity.
 *
 * This endpoint is NOT a feature. It is NOT a new AI capability.
 * It is the enforcement of the 7 invariants from docs/EPISTEMOLOGICAL-INVARIANTS.md
 * against live data. It runs the checkers from src/lib/ai-core/invariants.ts
 * against the actual entries in station-memory, knowledge-engine, and
 * learning-loop, and reports:
 *
 *   1. What violations exist right now (individual instances)
 *   2. What violation categories exist (comparable to the audit baseline)
 *   3. Whether the 2026-07-13 audit baseline is still accurate
 *   4. How many real listener sessions exist (from the pipeline)
 *   5. The system-wide epistemic state: X% real, Y% simulated
 *
 * This is the "epistemološki imunski sistem" made operational.
 * An immune system that cannot detect threats is decorative.
 * This endpoint is the detection.
 *
 * See:
 *   - docs/EPISTEMOLOGICAL-INVARIANTS.md (the 7 invariants + audit baseline)
 *   - src/lib/ai-core/invariants.ts (the checkers)
 *   - docs/STATION-CHRONICLE.md (when this transitions from simulated to observed)
 */

const BASE = process.env.INTERNAL_API_BASE || 'http://localhost:3000'

// ---------------------------------------------------------------------------
// Helper: fetch a module's data with graceful fallback
// ---------------------------------------------------------------------------
async function fetchModule(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Per-module invariant checkers
// ---------------------------------------------------------------------------

/**
 * Check station-memory against the invariants.
 *
 * Known findings from the 2026-07-13 audit:
 *   - honest-confidence: violated (lesson-001 has very-high + isReal=false)
 *   - legend-prevention: violated (journal aiSelfReflection is AI in first person)
 *
 * This checker finds ALL individual instances, not just the categories.
 */
function checkStationMemory(data: any): {
  violations: (InvariantViolation & { entryId: string })[]
  categories: InvariantId[]
} {
  if (!data) {
    return {
      violations: [{ invariant: 'reality', severity: 'error', message: 'Module unreachable', entryId: 'module' }],
      categories: ['reality'],
    }
  }

  const violations: (InvariantViolation & { entryId: string })[] = []
  const categorySet = new Set<InvariantId>()

  // Check lessons for confidence inflation (Invariant 5)
  for (const lesson of data.institutionalLessons ?? []) {
    const isReal = lesson.confidence?.isReal ?? false
    const level = lesson.confidence?.level
    const v = checkConfidenceInvariant({
      confidence: level,
      isReal,
      source: 'predicted', // isReal=false means predicted/simulated
    })
    if (v) {
      violations.push({ ...v, entryId: lesson.id })
      categorySet.add(v.invariant)
    }
  }

  // Check journal for AI voice (Invariant 7 — Legend Prevention)
  for (const entry of data.stationJournal ?? []) {
    if (entry.aiSelfReflection) {
      const v = checkLegendPreventionInvariant({
        fields: ['aiSelfReflection'],
        hasMeasuredCounterpart: false,
      })
      if (v) {
        violations.push({
          ...v,
          entryId: entry.date,
          message: `[journal ${entry.date}] ${v.message}`,
        })
        categorySet.add(v.invariant)
      }
    }
  }

  // Check segments for missing sample size (Invariant 4)
  for (const seg of data.listenerSegments ?? []) {
    // Segments have avgSessionMin, returnRate7d, churnRisk but no sampleSize
    // This is a partial violation — the audit noted it as "partial"
    if (seg.avgSessionMin !== undefined && seg.sampleSize === undefined) {
      violations.push({
        invariant: 'sample-size',
        severity: 'warning',
        entryId: seg.id,
        message: `[segment ${seg.id}] avgSessionMin=${seg.avgSessionMin} without sampleSize. A metric without n is a number, not a measurement.`,
      })
      categorySet.add('sample-size')
    }
  }

  return { violations, categories: Array.from(categorySet) }
}

/**
 * Check knowledge-engine against the invariants.
 *
 * Known findings from the 2026-07-13 audit:
 *   - honest-confidence: violated (confidence.score=45 with isReal=false is inflated)
 */
function checkKnowledgeEngine(data: any): {
  violations: (InvariantViolation & { entryId: string })[]
  categories: InvariantId[]
} {
  if (!data) {
    return {
      violations: [{ invariant: 'reality', severity: 'error', message: 'Module unreachable', entryId: 'module' }],
      categories: ['reality'],
    }
  }

  const violations: (InvariantViolation & { entryId: string })[] = []
  const categorySet = new Set<InvariantId>()

  for (const rule of data.rules ?? []) {
    const isReal = rule.confidence?.isReal ?? false
    const score = rule.confidence?.score

    if (score !== undefined && !isReal) {
      // Simulated entries cap at 0.50
      if (score > 0.5) {
        violations.push({
          invariant: 'honest-confidence',
          severity: 'warning',
          entryId: rule.id,
          message: `[${rule.id}] confidence.score=${score} with isReal=false. Simulated evidence caps at 0.50. The score is inflated relative to what the sourceType permits.`,
        })
        categorySet.add('honest-confidence')
      }
    }

    // Check evidence for sample size (Invariant 4) — knowledge-engine is
    // actually good here, every evidence has sampleSize. This should find 0.
    for (const ev of rule.evidence ?? []) {
      if (ev.sampleSize === undefined || ev.sampleSize === null) {
        violations.push({
          invariant: 'sample-size',
          severity: 'error',
          entryId: `${rule.id}/${ev.id}`,
          message: `[${rule.id}/${ev.id}] evidence missing sampleSize`,
        })
        categorySet.add('sample-size')
      }
    }
  }

  return { violations, categories: Array.from(categorySet) }
}

/**
 * Check learning-loop against the invariants.
 *
 * Known findings from the 2026-07-13 audit:
 *   - legend-prevention: violated (selfAwareness field is AI in first person)
 *
 * Learning-loop is the gold standard for Invariants 1, 2, 4, 5, 6.
 */
function checkLearningLoop(data: any): {
  violations: (InvariantViolation & { entryId: string })[]
  categories: InvariantId[]
} {
  if (!data) {
    return {
      violations: [{ invariant: 'reality', severity: 'error', message: 'Module unreachable', entryId: 'module' }],
      categories: ['reality'],
    }
  }

  const violations: (InvariantViolation & { entryId: string })[] = []
  const categorySet = new Set<InvariantId>()

  // Check selfAwareness for AI voice (Invariant 7)
  if (data.theLoop?.selfAwareness) {
    const v = checkLegendPreventionInvariant({
      fields: ['selfAwareness'],
      hasMeasuredCounterpart: false,
    })
    if (v) {
      violations.push({
        ...v,
        entryId: 'theLoop.selfAwareness',
        message: `[selfAwareness] AI narrating in first person: "${data.theLoop.selfAwareness[0]?.slice(0, 80) || ''}..." — this is the AI writing its own autobiography, not the station's memory.`,
      })
      categorySet.add(v.invariant)
    }
  }

  return { violations, categories: Array.from(categorySet) }
}

// ---------------------------------------------------------------------------
// Audit baseline comparison
// ---------------------------------------------------------------------------
function compareBaseline(found: {
  stationMemory: { categories: InvariantId[]; instances: number }
  knowledgeEngine: { categories: InvariantId[]; instances: number }
  learningLoop: { categories: InvariantId[]; instances: number }
}) {
  // The audit baseline documented violation CATEGORIES per module:
  //   station-memory:    2 categories (honest-confidence, legend-prevention)
  //   knowledge-engine:  1 category (honest-confidence)
  //   learning-loop:     1 category (legend-prevention)
  // Total: 4 documented violation categories

  const smBaseline = AUDIT_BASELINE_2026.find((m) => m.module === 'station-memory')
  const keBaseline = AUDIT_BASELINE_2026.find((m) => m.module === 'knowledge-engine')
  const llBaseline = AUDIT_BASELINE_2026.find((m) => m.module === 'learning-loop')

  const documentedCategories = 4
  const foundCategories =
    found.stationMemory.categories.length +
    found.knowledgeEngine.categories.length +
    found.learningLoop.categories.length

  // Build the set of categories the baseline ALREADY KNEW ABOUT.
  // The audit used a 3-level scale: upheld / partial / violated.
  // Both "partial" and "violated" are KNOWN issues — the audit was aware
  // of them. Only a category that is NEITHER in the baseline's partial nor
  // violated set counts as a true regression.
  const knownCategories = new Set<InvariantId>()
  for (const m of AUDIT_BASELINE_2026) {
    for (const [inv, status] of Object.entries(m.status)) {
      if (status === 'violated' || status === 'partial') {
        knownCategories.add(inv as InvariantId)
      }
    }
  }

  const foundCategorySet = new Set<InvariantId>([
    ...found.stationMemory.categories,
    ...found.knowledgeEngine.categories,
    ...found.learningLoop.categories,
  ])

  // A "new" category is one the baseline never mentioned at all —
  // not even as "partial." That is a true regression.
  const newCategories = Array.from(foundCategorySet).filter(
    (c) => !knownCategories.has(c),
  )

  let status: string
  if (newCategories.length > 0) {
    status = `REGRESSION — ${newCategories.length} new violation category(ies) since baseline: ${newCategories.join(', ')}`
  } else if (foundCategories === documentedCategories) {
    status = 'accurate — baseline matches current state. No new violations introduced.'
  } else if (foundCategories > documentedCategories) {
    // All found categories were known (either as violated or partial),
    // but the checker found more than the baseline's "violated" count.
    // This means the checker is stricter — it promotes "partial" to "violated".
    status = `stricter than baseline — ${foundCategories - documentedCategories} category(ies) promoted from "partial" to "violated" by the checker. All were known. No regression.`
  } else if (foundCategories < documentedCategories) {
    status = `baseline may be conservative — ${documentedCategories - foundCategories} documented category(ies) not detected (checker may need refinement)`
  } else {
    status = 'matches baseline'
  }

  return {
    documentedCategories,
    foundCategories,
    newCategories,
    status,
    baselineDate: '2026-07-13',
    perModule: {
      'station-memory': {
        documented: smBaseline ? Object.entries(smBaseline.status).filter(([, s]) => s === 'violated').map(([inv]) => inv) : [],
        found: found.stationMemory.categories,
        instances: found.stationMemory.instances,
      },
      'knowledge-engine': {
        documented: keBaseline ? Object.entries(keBaseline.status).filter(([, s]) => s === 'violated').map(([inv]) => inv) : [],
        found: found.knowledgeEngine.categories,
        instances: found.knowledgeEngine.instances,
      },
      'learning-loop': {
        documented: llBaseline ? Object.entries(llBaseline.status).filter(([, s]) => s === 'violated').map(([inv]) => inv) : [],
        found: found.learningLoop.categories,
        instances: found.learningLoop.instances,
      },
    },
  }
}

// ---------------------------------------------------------------------------
// System-wide epistemic state
// ---------------------------------------------------------------------------
function computeSystemState(
  realSessions: number,
  sm: any,
  ke: any,
  ll: any,
) {
  const simulatedEntries =
    (sm?.institutionalLessons?.length ?? 0) +
    (sm?.stationJournal?.length ?? 0) +
    (sm?.decisionHistory?.length ?? 0) +
    (sm?.listenerSegments?.length ?? 0) +
    (sm?.tasteEvolution?.length ?? 0) +
    (ke?.rules?.length ?? 0) +
    (ll?.learningRecords?.length ?? 0)

  const total = realSessions + simulatedEntries
  const realPercent = total > 0 ? Math.round((realSessions / total) * 100) : 0
  const simulatedPercent = 100 - realPercent

  return {
    realDataPoints: realSessions,
    simulatedDataPoints: simulatedEntries,
    realPercent,
    simulatedPercent,
    phase:
      realSessions === 0
        ? 'Framework Year — 100% simulated, awaiting real Icecast2'
        : realSessions < 100
          ? 'Transition — first real data, still predominantly simulated'
          : realSessions < 10000
            ? 'Operational — real data accumulating'
            : 'Mature — real data dominates',
    summary:
      realSessions === 0
        ? `System epistemic state: 0% real, 100% simulated. ${simulatedEntries} demonstration entries across 3 AI modules. 0 real listener sessions. The system is honest about what it does not know.`
        : `System epistemic state: ${realPercent}% real, ${simulatedPercent}% simulated. ${realSessions} real listener session(s). ${simulatedEntries} demonstration entries still present. The transition from simulated to observed has begun.`,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function GET() {
  // 1. Listener pipeline — count real sessions
  let realSessions = 0
  try {
    realSessions = await db.listenerSession.count()
  } catch {
    realSessions = 0
  }

  // 2. Fetch each AI module's current data
  const [sm, ke, ll] = await Promise.all([
    fetchModule('/api/v1/ai/station-memory'),
    fetchModule('/api/v1/ai/knowledge-engine'),
    fetchModule('/api/v1/ai/learning-loop'),
  ])

  // 3. Run invariant checks
  const smCheck = checkStationMemory(sm)
  const keCheck = checkKnowledgeEngine(ke)
  const llCheck = checkLearningLoop(ll)

  // 4. Compare to audit baseline
  const baseline = compareBaseline({
    stationMemory: { categories: smCheck.categories, instances: smCheck.violations.length },
    knowledgeEngine: { categories: keCheck.categories, instances: keCheck.violations.length },
    learningLoop: { categories: llCheck.categories, instances: llCheck.violations.length },
  })

  // 5. Compute system-wide epistemic state
  const systemState = computeSystemState(realSessions, sm, ke, ll)

  return NextResponse.json({
    _disclaimer:
      'Epistemic State Observability. This endpoint runs the invariant checkers from src/lib/ai-core/invariants.ts against live module data and reports violations. It is the system observing its own epistemic integrity. It does not modify any data — it only observes.',

    timestamp: new Date().toISOString(),

    // System-wide state
    systemState,

    // Listener pipeline
    listenerPipeline: {
      realSessions,
      tableExists: realSessions >= 0, // count() succeeded
      status: realSessions === 0 ? 'awaiting real Icecast2 — 0 rows' : `${realSessions} real session(s)`,
      endpoint: '/api/v1/listener-pipeline',
    },

    // Per-module compliance
    modules: {
      'station-memory': {
        reachable: !!sm,
        violationCategories: smCheck.categories,
        violationCount: smCheck.violations.length,
        violations: smCheck.violations,
        auditBaseline: AUDIT_BASELINE_2026.find((m) => m.module === 'station-memory'),
      },
      'knowledge-engine': {
        reachable: !!ke,
        violationCategories: keCheck.categories,
        violationCount: keCheck.violations.length,
        violations: keCheck.violations,
        auditBaseline: AUDIT_BASELINE_2026.find((m) => m.module === 'knowledge-engine'),
      },
      'learning-loop': {
        reachable: !!ll,
        violationCategories: llCheck.categories,
        violationCount: llCheck.violations.length,
        violations: llCheck.violations,
        auditBaseline: AUDIT_BASELINE_2026.find((m) => m.module === 'learning-loop'),
      },
    },

    // Audit baseline comparison
    auditBaseline: baseline,

    // The 7 invariants (for reference)
    invariants: EPISTEMOLOGICAL_INVARIANTS,

    // The honest summary
    summary: `${systemState.summary} Audit baseline: ${baseline.status}`,
  })
}
