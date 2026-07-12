import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Experiment Framework — the radio learns from its own decisions.
 *
 * Loop: Hypothesis → Experiment → Measurement → Analysis → Policy → Next
 *
 * Every AI decision change is treated as a scientific experiment:
 *   1. Formulate hypothesis ("If we fulfill requests within 15min, ALT +2min")
 *   2. Design A/B test (50% treatment, 50% control, 2 weeks)
 *   3. Measure primary KPI + guardrail metrics
 *   4. Statistical analysis (t-test, effect size, confidence interval)
 *   5. Decision: ship, kill, or iterate
 *   6. Policy update (if shipped, new behavior becomes default)
 *   7. Next hypothesis
 *
 * GET /api/v1/ai/experiments — active + completed experiments + learnings
 * POST /api/v1/ai/experiments — create experiment, record result, update policy
 */

interface Experiment {
  id: string
  name: string
  hypothesis: string
  // Design
  type: 'ab-test' | 'before-after' | 'observational'
  treatment: string
  control: string
  // Metrics
  primaryKpi: string
  guardrailMetrics: string[]
  // Sample
  sampleSizeTarget: number
  sampleSizeCurrent: number
  // Timeline
  startedAt: string
  endsAt: string
  durationDays: number
  // Status
  status: 'planning' | 'running' | 'analyzing' | 'completed' | 'killed'
  // Results
  results?: {
    treatmentMean: number
    controlMean: number
    delta: number
    deltaPct: number
    pValue: number
    effectSize: number // Cohen's d
    confidenceInterval: [number, number]
    statisticallySignificant: boolean
    guardrailViolated: boolean
  }
  // Decision
  decision?: 'ship' | 'kill' | 'iterate' | 'inconclusive'
  decisionReason?: string
  // Policy
  policyUpdate?: string
  learnedAt?: string
}

const EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-001',
    name: 'Fulfill P1 requests within 15min',
    hypothesis: 'If we fulfill P1 (Diamond/Platinum) listener requests within 15min (vs current 30-60min), ALT will increase by 2+ minutes for P1 listeners',
    type: 'ab-test',
    treatment: 'Auto-fulfill 50% of P1 requests within 15min when track fits the clock',
    control: 'Current behavior (manual fulfillment, 30-60min average)',
    primaryKpi: 'ALT (P1 listeners only)',
    guardrailMetrics: ['Artist diversity', 'Compliance score', 'Other listeners ALT (no spillover)'],
    sampleSizeTarget: 500, // 500 P1 listener sessions per group
    sampleSizeCurrent: 342,
    startedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    durationDays: 14,
    status: 'running',
  },
  {
    id: 'exp-002',
    name: 'Cap ad breaks at 2.5min',
    hypothesis: 'If we cap ad breaks at 2.5min (vs current 3-4min), ad break retention will increase by 5%+ without reducing revenue (offset by more frequent breaks)',
    type: 'ab-test',
    treatment: '50% of ad breaks capped at 2.5min (max 4 spots)',
    control: 'Current behavior (3-4min breaks, up to 6 spots)',
    primaryKpi: 'Ad break retention (%)',
    guardrailMetrics: ['Revenue per day', 'ALT', 'Advertiser satisfaction'],
    sampleSizeTarget: 200, // 200 ad breaks per group
    sampleSizeCurrent: 200,
    startedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    endsAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    durationDays: 14,
    status: 'completed',
    results: {
      treatmentMean: 91.2,
      controlMean: 86.4,
      delta: 4.8,
      deltaPct: 5.6,
      pValue: 0.003,
      effectSize: 0.42, // medium effect
      confidenceInterval: [1.6, 8.0],
      statisticallySignificant: true,
      guardrailViolated: false, // revenue stayed flat (offset by more breaks)
    },
    decision: 'ship',
    decisionReason: 'Statistically significant (P=0.003), medium effect (d=0.42), no guardrail violation. Revenue flat (more breaks offset shorter duration). Ship to 100% of breaks.',
    policyUpdate: 'Default ad break length: 2.5min (max 4 spots). If revenue drops >5%, revert.',
    learnedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'exp-003',
    name: 'Sandwich new releases between hits',
    hypothesis: 'If we sandwich new/unfamiliar tracks between two familiar hits (vs random placement), tune-out rate for new tracks will decrease by 30%+',
    type: 'ab-test',
    treatment: 'New releases always preceded + followed by power/recurrent tracks',
    control: 'New releases placed per scheduler (may follow non-hit)',
    primaryKpi: 'Tune-out rate for new tracks (%)',
    guardrailMetrics: ['Discovery rate', 'ALT', 'Diversity'],
    sampleSizeTarget: 150, // 150 new track plays per group
    sampleSizeCurrent: 150,
    startedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    endsAt: new Date(Date.now() - 0 * 86400000).toISOString(),
    durationDays: 14,
    status: 'completed',
    results: {
      treatmentMean: 2.1,
      controlMean: 3.4,
      delta: -1.3,
      deltaPct: -38.2,
      pValue: 0.012,
      effectSize: 0.35, // small-medium effect
      confidenceInterval: [-2.3, -0.3],
      statisticallySignificant: true,
      guardrailViolated: false,
    },
    decision: 'ship',
    decisionReason: 'Significant (P=0.012), 38% reduction in tune-out for new tracks. No guardrail violation. Discovery rate stable. Ship as default scheduler rule.',
    policyUpdate: 'Scheduler rule: new releases (familiarity <0.5) must be preceded + followed by tracks with familiarity >0.7',
    learnedAt: new Date().toISOString(),
  },
  {
    id: 'exp-004',
    name: 'AI DJ voice link every 15min (vs 20min)',
    hypothesis: 'If AI DJ speaks every 15min (vs 20min), ALT will increase by 1+ minute. Risk: over-talking may increase tune-outs.',
    type: 'ab-test',
    treatment: 'Voice links every 15min',
    control: 'Voice links every 20min',
    primaryKpi: 'ALT (minutes)',
    guardrailMetrics: ['Tune-out rate after voice link', 'Listener satisfaction survey'],
    sampleSizeTarget: 1000,
    sampleSizeCurrent: 487,
    startedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    durationDays: 14,
    status: 'running',
  },
  {
    id: 'exp-005',
    name: 'Weather context in voice links',
    hypothesis: 'If AI DJ mentions weather in voice links (vs generic link), drive-time ALT will increase by 0.5min. Risk: may feel repetitive.',
    type: 'ab-test',
    treatment: 'Weather mention in 50% of voice links',
    control: 'Generic voice links (no weather)',
    primaryKpi: 'Drive-time ALT (minutes)',
    guardrailMetrics: ['Tune-out after voice link', 'Return rate'],
    sampleSizeTarget: 800,
    sampleSizeCurrent: 0,
    startedAt: '',
    endsAt: '',
    durationDays: 14,
    status: 'planning',
  },
]

const POLICY_LOG: { id: string; experimentId: string; policy: string; effectiveAt: string; impact?: string }[] = [
  { id: 'pol-001', experimentId: 'exp-002', policy: 'Ad breaks capped at 2.5min', effectiveAt: new Date(Date.now() - 7 * 86400000).toISOString(), impact: 'Ad retention +4.8% (P=0.003), revenue flat' },
  { id: 'pol-002', experimentId: 'exp-003', policy: 'New releases sandwiched between hits', effectiveAt: new Date().toISOString(), impact: 'Tune-out for new tracks -38% (P=0.012)' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const running = EXPERIMENTS.filter(e => e.status === 'running')
  const completed = EXPERIMENTS.filter(e => e.status === 'completed')
  const shipped = completed.filter(e => e.decision === 'ship')
  const killed = completed.filter(e => e.decision === 'kill')

  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — experiment design is production-ready (hypothesis + A/B + sample size + stats). Results shown are illustrative. Real implementation requires: (1) randomization layer in scheduler, (2) warehouse queries for measurement, (3) stats library (t-test, effect size). The framework methodology is the real value.',
    experiments: EXPERIMENTS,
    policyLog: POLICY_LOG,
    stats: {
      totalExperiments: EXPERIMENTS.length,
      running: running.length,
      completed: completed.length,
      shipped: shipped.length,
      killed: killed.length,
      planning: EXPERIMENTS.filter(e => e.status === 'planning').length,
      successRate: completed.length > 0 ? Math.round((shipped.length / completed.length) * 100) : 0,
    },
    learningLoop: {
      steps: ['Hypothesis', 'Experiment (A/B test)', 'Measurement', 'Statistical analysis', 'Decision (ship/kill/iterate)', 'Policy update', 'Next hypothesis'],
      currentStep: 'Running 2 experiments, 2 shipped, 1 in planning',
      cycleTime: '14 days average (design → ship)',
      principle: 'Every AI behavior change is an experiment. No change ships without statistical evidence.',
    },
    methodology: {
      randomization: '50/50 split (treatment vs control), random assignment per listener session',
      sampleSize: 'Calculated from expected effect size + power (0.8) + alpha (0.05) before experiment starts',
      primaryKpi: 'One metric per experiment (prevents p-hacking)',
      guardrails: 'Secondary metrics that must not degrade (prevents gaming)',
      stats: 'Two-sample t-test, Cohen\'s d effect size, 95% confidence interval',
      decision: 'Ship if P<0.05 AND no guardrail violation AND effect size >0.2 (small). Kill if guardrail violated. Iterate if inconclusive.',
      noPpeeking: 'Results checked only at pre-registered end date (no peeking at intermediate results)',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'create' && body.hypothesis) {
    const exp: Experiment = {
      id: `exp-${Date.now()}`, name: body.name ?? 'New experiment',
      hypothesis: body.hypothesis,
      type: body.type ?? 'ab-test',
      treatment: body.treatment ?? '', control: body.control ?? '',
      primaryKpi: body.primaryKpi ?? 'ALT',
      guardrailMetrics: body.guardrailMetrics ?? [],
      sampleSizeTarget: body.sampleSizeTarget ?? 500, sampleSizeCurrent: 0,
      startedAt: '', endsAt: '', durationDays: body.durationDays ?? 14,
      status: 'planning',
    }
    EXPERIMENTS.push(exp)
    return NextResponse.json({ ok: true, experiment: exp, message: 'Experiment created — define sample size + start date to begin' })
  }

  if (body.action === 'start' && body.experimentId) {
    const exp = EXPERIMENTS.find(e => e.id === body.experimentId)
    if (exp) {
      exp.status = 'running'
      exp.startedAt = new Date().toISOString()
      exp.endsAt = new Date(Date.now() + exp.durationDays * 86400000).toISOString()
      return NextResponse.json({ ok: true, experiment: exp, message: `Experiment "${exp.name}" started — A/B test running for ${exp.durationDays} days` })
    }
  }

  if (body.action === 'analyze' && body.experimentId) {
    const exp = EXPERIMENTS.find(e => e.id === body.experimentId)
    if (exp) {
      exp.status = 'analyzing'
      return NextResponse.json({ ok: true, message: 'Running statistical analysis...' })
    }
  }

  if (body.action === 'decide' && body.experimentId && body.decision) {
    const exp = EXPERIMENTS.find(e => e.id === body.experimentId)
    if (exp) {
      exp.decision = body.decision
      exp.decisionReason = body.reason
      exp.status = body.decision === 'ship' ? 'completed' : body.decision === 'kill' ? 'killed' : 'completed'
      if (body.decision === 'ship' && body.policyUpdate) {
        exp.policyUpdate = body.policyUpdate
        POLICY_LOG.unshift({ id: `pol-${Date.now()}`, experimentId: exp.id, policy: body.policyUpdate, effectiveAt: new Date().toISOString() })
      }
      exp.learnedAt = new Date().toISOString()
      return NextResponse.json({ ok: true, experiment: exp, message: `Decision: ${body.decision.toUpperCase()} — ${body.reason}` })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
