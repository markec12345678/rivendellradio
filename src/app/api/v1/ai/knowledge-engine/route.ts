import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Knowledge Engine — verified knowledge base with evidence + applicability.
 *
 * This is NOT another AI module. This is the radio's accumulated wisdom.
 *
 * Difference from Learning Loop:
 *   Learning Loop adjusts weights (numerical).
 *   Knowledge Engine stores RULES (semantic) with evidence + boundaries.
 *
 * Each rule has:
 *   - Statement (what we believe)
 *   - Evidence (which experiments confirmed it)
 *   - Effect size (how strong is the effect)
 *   - Applicability (when does this rule hold)
 *   - Boundaries (when does it NOT hold)
 *   - Confidence (observational vs A/B validated)
 *   - Status (hypothesis → testing → confirmed → superseded)
 *
 * GET /api/v1/ai/knowledge-engine — full knowledge base + rule lifecycle
 * POST /api/v1/ai/knowledge-engine — add rule, update evidence, supersede
 */

type RuleStatus = 'hypothesis' | 'testing' | 'confirmed' | 'partially-confirmed' | 'superseded' | 'refuted'
type EvidenceType = 'observational' | 'ab-test' | 'meta-analysis' | 'expert-judgment'

interface Evidence {
  id: string
  type: EvidenceType
  experimentId?: string
  description: string
  effectSize: number // Cohen's d
  pValue: number | null // null for observational
  sampleSize: number
  confidence: 'high' | 'medium' | 'low'
  date: string
  // Honesty
  isReal: boolean // true if from actual experiment, false if demonstration
  confounders: string[]
}

interface KnowledgeRule {
  id: string
  domain: 'track-selection' | 'voice-links' | 'ad-breaks' | 'listener-requests' | 'scheduling' | 'energy-management' | 'weather-context' | 'time-of-day'
  // The rule
  statement: string
  // Evidence
  evidence: Evidence[]
  consensusEffect: number // weighted average of evidence
  consensusConfidence: 'high' | 'medium' | 'low'
  // Applicability — WHEN does this rule hold?
  appliesWhen: string[]
  // Boundaries — WHEN does this rule NOT hold?
  doesNotApplyWhen: string[]
  // Lifecycle
  status: RuleStatus
  proposedAt: string
  confirmedAt: string | null
  supersededBy?: string
  // Impact
  altImpact: number // estimated ALT delta (minutes)
  // Practical use
  implementedInScheduler: boolean
  implementedAsConstraint: 'hard' | 'soft' | 'none'
  // Versioning
  version: number
  previousVersions: { version: number; statement: string; changedAt: string; reason: string }[]
}

const RULES: KnowledgeRule[] = [
  {
    id: 'rule-001',
    domain: 'energy-management',
    statement: 'Two consecutive low-energy tracks (<0.5) increase tune-out rate by 2.7% in daytime dayparts (06:00-22:00)',
    evidence: [
      { id: 'ev-001', type: 'observational', description: 'Observed 18% higher departure after 2 consecutive low-energy tracks (lrn-002)', effectSize: 0.52, pValue: null, sampleSize: 189, confidence: 'medium', date: '2026-07-10', isReal: false, confounders: ['post-lunch dip', 'Wonderwall is divisive'] },
      { id: 'ev-002', type: 'ab-test', experimentId: 'exp-006', description: 'A/B test: enforced separation vs random placement, 14 days', effectSize: 0.38, pValue: 0.008, sampleSize: 420, confidence: 'high', date: '2026-07-12', isReal: false, confounders: ['weather variation across test period'] },
    ],
    consensusEffect: 0.43,
    consensusConfidence: 'high',
    appliesWhen: [
      'Daytime dayparts (06:00-22:00)',
      'Both tracks have energy <0.5',
      'Mobile listeners (>60% of audience)',
    ],
    doesNotApplyWhen: [
      'Overnight (22:00-06:00) — listeners expect slower music',
      'Specialty shows (Deep Cuts, Album Sides)',
      'Explicit-content safe harbor programming',
    ],
    status: 'confirmed',
    proposedAt: '2026-07-08',
    confirmedAt: '2026-07-12',
    altImpact: -2.4,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 2,
    previousVersions: [
      { version: 1, statement: 'Low-energy tracks should not be played consecutively', changedAt: '2026-07-10', reason: 'Refined after A/B test — specific threshold (0.5) and time window (06-22) identified' },
    ],
  },
  {
    id: 'rule-002',
    domain: 'ad-breaks',
    statement: 'Ad breaks capped at 2.5min increase listener retention by 4.8% without reducing revenue',
    evidence: [
      { id: 'ev-003', type: 'ab-test', experimentId: 'exp-002', description: '50/50 A/B test, 200 breaks per group, 14 days', effectSize: 0.42, pValue: 0.003, sampleSize: 400, confidence: 'high', date: '2026-07-05', isReal: false, confounders: ['ad content quality varied', 'time-of-day distribution was balanced'] },
    ],
    consensusEffect: 0.42,
    consensusConfidence: 'high',
    appliesWhen: [
      'All dayparts',
      'Commercial stations with ad inventory',
      'Breaks with 3+ spots',
    ],
    doesNotApplyWhen: [
      'Non-commercial / community radio (no ads)',
      'Sponsor-only breaks (single sponsor, <90s)',
      'EAS override periods (ad breaks suspended)',
    ],
    status: 'confirmed',
    proposedAt: '2026-06-28',
    confirmedAt: '2026-07-05',
    altImpact: 0.8,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-003',
    domain: 'track-selection',
    statement: 'Sandwiching new releases between familiar hits reduces tune-out for new tracks by 38%',
    evidence: [
      { id: 'ev-004', type: 'ab-test', experimentId: 'exp-003', description: '50/50 A/B, 150 new track plays per group, 14 days', effectSize: 0.35, pValue: 0.012, sampleSize: 300, confidence: 'high', date: '2026-07-12', isReal: false, confounders: ['genre of new releases varied', 'familiarity of "hits" varied'] },
    ],
    consensusEffect: 0.35,
    consensusConfidence: 'high',
    appliesWhen: [
      'New releases (familiarity <0.5)',
      'Daytime dayparts',
      'Surrounding tracks have familiarity >0.7',
    ],
    doesNotApplyWhen: [
      'Specialty shows (New Music Wednesday)',
      'Overnight (listeners more open to unfamiliar)',
      'Listener-requested new tracks (listener already invested)',
    ],
    status: 'confirmed',
    proposedAt: '2026-06-28',
    confirmedAt: '2026-07-12',
    altImpact: 0.6,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-004',
    domain: 'listener-requests',
    statement: 'Fulfilling P1 listener requests within 15min increases ALT for those listeners by 8.5min',
    evidence: [
      { id: 'ev-005', type: 'observational', description: 'Correlation: fulfilled requests correlate with +8.5min ALT (P<0.01, n=142)', effectSize: 0.61, pValue: 0.001, sampleSize: 142, confidence: 'medium', date: '2026-07-10', isReal: false, confounders: ['P1 listeners naturally have longer sessions', 'time-of-day bias', 'track familiarity bias'] },
      { id: 'ev-006', type: 'ab-test', experimentId: 'exp-001', description: 'A/B test running — 342/500 sessions collected', effectSize: 0, pValue: null, sampleSize: 342, confidence: 'low', date: '2026-07-12', isReal: false, confounders: ['incomplete — results not yet available'] },
    ],
    consensusEffect: 0.30, // downweighted because A/B not yet complete
    consensusConfidence: 'low',
    appliesWhen: [
      'P1 listeners (Diamond/Platinum tier)',
      'Request fits the current clock category',
      'Track available in library',
    ],
    doesNotApplyWhen: [
      'New/trial listeners (no established relationship)',
      'Request conflicts with hard rules (DMCA, separation)',
      'Track is explicit outside safe harbor',
    ],
    status: 'testing',
    proposedAt: '2026-07-02',
    confirmedAt: null,
    altImpact: 8.5, // projected, not confirmed
    implementedInScheduler: false, // not yet — waiting for A/B
    implementedAsConstraint: 'none',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-005',
    domain: 'voice-links',
    statement: 'Weather mentions in voice links during drive time increase ALT by 0.6min above generic links',
    evidence: [
      { id: 'ev-007', type: 'observational', description: 'Observed +0.6min correlation (lrn-003, n=1, not significant)', effectSize: 0, pValue: null, sampleSize: 1, confidence: 'low', date: '2026-07-09', isReal: false, confounders: ['n=1', 'sunny weather (positive mood)', 'morning drive (naturally values weather)'] },
    ],
    consensusEffect: 0,
    consensusConfidence: 'low',
    appliesWhen: [
      'Drive time dayparts (06:00-10:00, 15:00-19:00)',
      'Weather is actionable (rain, snow, extreme temp)',
    ],
    doesNotApplyWhen: [
      'Overnight (listeners less weather-sensitive)',
      'Generic weather ("partly cloudy") with no impact',
    ],
    status: 'hypothesis',
    proposedAt: '2026-07-09',
    confirmedAt: null,
    altImpact: 0.6, // projected
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-006',
    domain: 'track-selection',
    statement: 'Familiar hit tracks (familiarity >0.8) increase ALT by 4.2min on average',
    evidence: [
      { id: 'ev-008', type: 'observational', description: '847 track plays analyzed, +4.2min avg for power tracks (P<0.01)', effectSize: 0.55, pValue: 0.001, sampleSize: 847, confidence: 'medium', date: '2026-07-10', isReal: false, confounders: ['power tracks played more in drive time (natural ALT peak)', 'familiarity correlates with recency of last play'] },
    ],
    consensusEffect: 0.55,
    consensusConfidence: 'medium',
    appliesWhen: [
      'All dayparts',
      'Track not played in last 6h (title separation)',
      'Artist not played in last 3h (artist separation)',
    ],
    doesNotApplyWhen: [
      'Track has 30d play count >25 (fatigue threshold)',
      'Specialty shows (Deep Cuts)',
    ],
    status: 'partially-confirmed',
    proposedAt: '2026-07-01',
    confirmedAt: null,
    altImpact: 4.2,
    implementedInScheduler: true,
    implementedAsConstraint: 'soft',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-007',
    domain: 'time-of-day',
    statement: 'BPM transitions of 15% or less are well-tolerated in afternoon drive but cause friction in overnight',
    evidence: [
      { id: 'ev-009', type: 'observational', description: 'lrn-001: 158→134 BPM well-tolerated (afternoon, n=1)', effectSize: 0, pValue: null, sampleSize: 1, confidence: 'low', date: '2026-07-10', isReal: false, confounders: ['n=1', 'both tracks highly familiar'] },
    ],
    consensusEffect: 0,
    consensusConfidence: 'low',
    appliesWhen: [
      'Afternoon drive (15:00-19:00)',
      'Both tracks have familiarity >0.7',
    ],
    doesNotApplyWhen: [
      'Overnight (listeners prefer gradual energy changes)',
      'Either track is unfamiliar',
    ],
    status: 'hypothesis',
    proposedAt: '2026-07-10',
    confirmedAt: null,
    altImpact: 0.5,
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    previousVersions: [],
  },
  {
    id: 'rule-008',
    domain: 'scheduling',
    statement: 'SUPERSeded: "Low-energy tracks should not be played consecutively" (replaced by rule-001 with specific threshold + time window)',
    evidence: [],
    consensusEffect: 0,
    consensusConfidence: 'low',
    appliesWhen: [],
    doesNotApplyWhen: ['All cases — superseded by rule-001'],
    status: 'superseded',
    proposedAt: '2026-07-08',
    confirmedAt: '2026-07-10',
    supersededBy: 'rule-001',
    altImpact: 0,
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    previousVersions: [],
  },
]

// Pre-registration (experiments registered BEFORE they start)
interface PreRegistration {
  experimentId: string
  registeredAt: string
  hypothesis: string
  primaryKpi: string
  secondaryKpis: string[]
  successCriteria: string
  guardrailMetrics: string[]
  plannedDuration: number
  plannedSampleSize: number
  analysisPlan: string
  // Frozen — cannot be changed after registration
  frozen: boolean
}

const PRE_REGISTRATIONS: PreRegistration[] = [
  {
    experimentId: 'exp-001',
    registeredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    hypothesis: 'Fulfilling P1 requests within 15min increases ALT by 2+ minutes',
    primaryKpi: 'ALT (P1 listeners, minutes)',
    secondaryKpis: ['Return rate 7d', 'Session completion'],
    successCriteria: 'P<0.05 AND Cohen\'s d > 0.2 AND no guardrail violation',
    guardrailMetrics: ['Artist diversity (≥8/hr)', 'Compliance (100%)', 'Non-P1 ALT (no spillover)'],
    plannedDuration: 14,
    plannedSampleSize: 500,
    analysisPlan: 'Two-sample t-test, one-tailed, alpha=0.05, power=0.8. Analysis at pre-registered end date. No interim peeking.',
    frozen: true,
  },
  {
    experimentId: 'exp-004',
    registeredAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    hypothesis: 'Voice links every 15min increase ALT by 1+ minute vs 20min',
    primaryKpi: 'ALT (all listeners, minutes)',
    secondaryKpis: ['Tune-out rate after voice link', 'Listener satisfaction survey'],
    successCriteria: 'P<0.05 AND d > 0.15 AND tune-out after voice link not worse',
    guardrailMetrics: ['Tune-out rate after voice link', 'Return rate 7d'],
    plannedDuration: 14,
    plannedSampleSize: 1000,
    analysisPlan: 'Two-sample t-test, two-tailed, alpha=0.05. Guardrail: tune-out after voice link must not increase >1%.',
    frozen: true,
  },
]

// Dynamic weights (change based on accumulated evidence)
interface DynamicWeight {
  objective: string
  initialValue: number
  currentValue: number
  adjustmentHistory: { date: string; oldValue: number; newValue: number; reason: string; evidence: string }[]
  nextReviewDate: string
  adjustmentPolicy: string
}

const DYNAMIC_WEIGHTS: DynamicWeight[] = [
  {
    objective: 'consecutive_low_energy_penalty',
    initialValue: 0.15,
    currentValue: 0.25,
    adjustmentHistory: [
      { date: '2026-07-10', oldValue: 0.15, newValue: 0.25, reason: 'Observed 3x more departure than predicted (lrn-002)', evidence: 'rule-001 ev-001' },
    ],
    nextReviewDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    adjustmentPolicy: 'Reviewed every 14 days or when new A/B evidence arrives. Max adjustment ±0.05 per cycle. Requires confirmed rule status.',
  },
  {
    objective: 'weather_in_voice_link',
    initialValue: 0.05,
    currentValue: 0.08,
    adjustmentHistory: [
      { date: '2026-07-09', oldValue: 0.05, newValue: 0.08, reason: 'Observed +0.6min correlation (lrn-003)', evidence: 'rule-005 ev-007 (low confidence)' },
    ],
    nextReviewDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    adjustmentPolicy: 'Reviewed weekly. If A/B test (exp-005) confirms, increase to 0.10. If refutes, revert to 0.05.',
  },
  {
    objective: 'request_fulfillment_speed',
    initialValue: 0.20,
    currentValue: 0.24,
    adjustmentHistory: [
      { date: '2026-07-07', oldValue: 0.20, newValue: 0.24, reason: 'Fast fulfillment exceeded projection (lrn-004)', evidence: 'rule-004 ev-005 (n=1, low confidence)' },
    ],
    nextReviewDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    adjustmentPolicy: 'Pending A/B test (exp-001). If confirmed, increase to 0.28. If refuted, revert to 0.20.',
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const confirmed = RULES.filter(r => r.status === 'confirmed')
  const testing = RULES.filter(r => r.status === 'testing')
  const hypothesis = RULES.filter(r => r.status === 'hypothesis')
  const superseded = RULES.filter(r => r.status === 'superseded')
  const abValidated = RULES.filter(r => r.evidence.some(e => e.type === 'ab-test'))

  return NextResponse.json({
    _disclaimer: '⚠️ ALL EVIDENCE IS DEMONSTRATION DATA — no real A/B tests have been conducted. Every evidence.isReal=false. This framework defines HOW the radio will accumulate knowledge. When real experiments are run, isReal will be set to true and evidence will include actual P-values, effect sizes, and sample sizes from real listener data.',
    rules: RULES,
    preRegistrations: PRE_REGISTRATIONS,
    dynamicWeights: DYNAMIC_WEIGHTS,
    stats: {
      totalRules: RULES.length,
      confirmed: confirmed.length,
      partiallyConfirmed: RULES.filter(r => r.status === 'partially-confirmed').length,
      testing: testing.length,
      hypothesis: hypothesis.length,
      superseded: superseded.length,
      abValidated: abValidated.length,
      // Honesty metrics
      realEvidenceCount: RULES.flatMap(r => r.evidence).filter(e => e.isReal).length, // 0 — all demonstration
      demonstrationEvidenceCount: RULES.flatMap(r => r.evidence).filter(e => !e.isReal).length,
      honestyRate: '0% real evidence — all demonstration. Framework ready for real experiments.',
    },
    knowledgePipeline: {
      stages: [
        { stage: 'Hypothesis', description: 'Proposed rule from observation or theory', count: hypothesis.length },
        { stage: 'Testing', description: 'A/B test designed and running', count: testing.length },
        { stage: 'Partially confirmed', description: 'Observational evidence, A/B pending', count: RULES.filter(r => r.status === 'partially-confirmed').length },
        { stage: 'Confirmed', description: 'A/B validated with statistical significance', count: confirmed.length },
        { stage: 'Superseded', description: 'Replaced by refined version', count: superseded.length },
      ],
      flow: 'Hypothesis → Pre-registration → A/B test → Statistical analysis → Confirmed rule → Implemented in scheduler → Dynamic weight adjustment → Next hypothesis',
      principle: 'A rule is only "confirmed" when an A/B test with adequate sample size shows P<0.05 AND effect size >0.2 AND no guardrail violation. Everything else is "hypothesis" or "partially-confirmed".',
    },
    howItDiffersFromLearningLoop: {
      learningLoop: 'Adjusts numerical weights based on each decision outcome',
      knowledgeEngine: 'Stores semantic rules with evidence, applicability boundaries, and lifecycle status. Rules can be superseded, refined, or refuted.',
      example: 'Learning Loop: "consecutive_low_energy_penalty: 0.15 → 0.25" | Knowledge Engine: "Two consecutive low-energy tracks (<0.5) increase tune-out by 2.7% in daytime. Confirmed via A/B (P=0.008, d=0.38). Does NOT apply overnight (22:00-06:00)."',
    },
    nextStep: 'When real experiments run, evidence.isReal becomes true, rules transition from hypothesis → confirmed, and the knowledge base becomes the radio\'s accumulated wisdom — not guesses, but verified findings with clear boundaries.',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'add-rule' && body.statement) {
    const rule: KnowledgeRule = {
      id: `rule-${Date.now()}`, domain: body.domain ?? 'scheduling',
      statement: body.statement,
      evidence: [], consensusEffect: 0, consensusConfidence: 'low',
      appliesWhen: body.appliesWhen ?? [], doesNotApplyWhen: body.doesNotApplyWhen ?? [],
      status: 'hypothesis', proposedAt: new Date().toISOString(), confirmedAt: null,
      altImpact: body.altImpact ?? 0,
      implementedInScheduler: false, implementedAsConstraint: 'none',
      version: 1, previousVersions: [],
    }
    RULES.push(rule)
    return NextResponse.json({ ok: true, rule, message: 'Hypothesis added to knowledge engine — needs A/B test to confirm' })
  }

  if (body.action === 'add-evidence' && body.ruleId && body.evidence) {
    const rule = RULES.find(r => r.id === body.ruleId)
    if (rule) {
      rule.evidence.push({ ...body.evidence, id: `ev-${Date.now()}`, date: new Date().toISOString() })
      // Recalculate consensus
      const abEvidence = rule.evidence.filter(e => e.type === 'ab-test' && e.pValue !== null && e.pValue < 0.05)
      if (abEvidence.length > 0) {
        rule.status = 'confirmed'
        rule.confirmedAt = new Date().toISOString()
        rule.consensusConfidence = 'high'
        rule.consensusEffect = abEvidence.reduce((s, e) => s + e.effectSize, 0) / abEvidence.length
      }
      return NextResponse.json({ ok: true, rule, message: `Evidence added — rule status: ${rule.status}` })
    }
  }

  if (body.action === 'supersede' && body.ruleId && body.newRuleId) {
    const old = RULES.find(r => r.id === body.ruleId)
    if (old) {
      old.status = 'superseded'
      old.supersededBy = body.newRuleId
      old.previousVersions.push({ version: old.version, statement: old.statement, changedAt: new Date().toISOString(), reason: body.reason ?? 'Superseded by refined version' })
      return NextResponse.json({ ok: true, rule: old, message: `Rule ${old.id} superseded by ${body.newRuleId}` })
    }
  }

  if (body.action === 'adjust-weight' && body.objective && body.newValue !== undefined) {
    const w = DYNAMIC_WEIGHTS.find(d => d.objective === body.objective)
    if (w) {
      w.adjustmentHistory.push({ date: new Date().toISOString(), oldValue: w.currentValue, newValue: body.newValue, reason: body.reason ?? 'Manual adjustment', evidence: body.evidence ?? '' })
      w.currentValue = body.newValue
      return NextResponse.json({ ok: true, weight: w, message: `Weight adjusted: ${w.objective} ${w.adjustmentHistory[w.adjustmentHistory.length - 2].oldValue} → ${w.currentValue}` })
    }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
