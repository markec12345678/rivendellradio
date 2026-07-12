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

type RuleStatus = 'proposed' | 'observed' | 'simulated' | 'experiment-running' | 'externally-validated' | 'deprecated' | 'refuted'
type EvidenceType = 'observational' | 'ab-test' | 'meta-analysis' | 'expert-judgment' | 'simulation'

interface Evidence {
  id: string
  type: EvidenceType
  experimentId?: string
  description: string
  effectSize: number // Cohen's d
  pValue: number | null // null for observational
  sampleSize: number
  date: string
  // Honesty
  isReal: boolean // true if from actual experiment, false if demonstration
  confounders: string[]
}

interface Confidence {
  score: number // 0-100, weighted by evidence quality + replications
  evidenceQuality: 'high' | 'medium' | 'low' // A/B > observational > simulation
  replications: number // how many independent experiments confirmed this
  lastVerified: string | null // date of last A/B validation
  isReal: boolean // false = all evidence is simulation/observational, true = at least one real A/B
}

interface KnowledgeRule {
  id: string
  domain: 'track-selection' | 'voice-links' | 'ad-breaks' | 'listener-requests' | 'scheduling' | 'energy-management' | 'weather-context' | 'time-of-day'
  // The rule
  statement: string
  // Evidence
  evidence: Evidence[]
  consensusEffect: number // weighted average of evidence
  confidence: Confidence
  // Applicability — WHEN does this rule hold?
  appliesWhen: string[]
  // Boundaries — WHEN does this rule NOT hold?
  doesNotApplyWhen: string[]
  // Lifecycle
  status: RuleStatus
  proposedAt: string
  validatedAt: string | null // when externally-validated (real A/B)
  supersededBy?: string
  // Impact
  altImpact: number // estimated ALT delta (minutes)
  // Practical use
  implementedInScheduler: boolean
  implementedAsConstraint: 'hard' | 'soft' | 'none'
  // Versioning — full history, nothing disappears
  version: number
  versionHistory: { version: number; statement: string; changedAt: string; reason: string; status: RuleStatus }[]
  // Conflict detection
  conflictsWith?: string[] // IDs of rules that may conflict
  conflictResolution?: string // how the conflict was resolved
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
    confidence: { score: 45, evidenceQuality: 'medium', replications: 0, lastVerified: null, isReal: false },
    conflictsWith: ['rule-007'],
    conflictResolution: 'rule-001 applies daytime (06:00-22:00), rule-007 may apply overnight — both coexist in different time windows',
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
    status: 'simulated',
    proposedAt: '2026-07-08',
    validatedAt: '2026-07-12',
    altImpact: -2.4,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 2,
    versionHistory: [
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
    confidence: { score: 45, evidenceQuality: 'medium', replications: 0, lastVerified: null, isReal: false },
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
    status: 'simulated',
    proposedAt: '2026-06-28',
    validatedAt: '2026-07-05',
    altImpact: 0.8,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 1,
    versionHistory: [],
  },
  {
    id: 'rule-003',
    domain: 'track-selection',
    statement: 'Sandwiching new releases between familiar hits reduces tune-out for new tracks by 38%',
    evidence: [
      { id: 'ev-004', type: 'ab-test', experimentId: 'exp-003', description: '50/50 A/B, 150 new track plays per group, 14 days', effectSize: 0.35, pValue: 0.012, sampleSize: 300, confidence: 'high', date: '2026-07-12', isReal: false, confounders: ['genre of new releases varied', 'familiarity of "hits" varied'] },
    ],
    consensusEffect: 0.35,
    confidence: { score: 45, evidenceQuality: 'medium', replications: 0, lastVerified: null, isReal: false },
    conflictsWith: ['rule-007'],
    conflictResolution: 'rule-001 applies daytime (06:00-22:00), rule-007 may apply overnight — both coexist in different time windows',
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
    status: 'simulated',
    proposedAt: '2026-06-28',
    validatedAt: '2026-07-12',
    altImpact: 0.6,
    implementedInScheduler: true,
    implementedAsConstraint: 'hard',
    version: 1,
    versionHistory: [],
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
    confidence: { score: 20, evidenceQuality: 'low', replications: 0, lastVerified: null, isReal: false },
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
    status: 'experiment-running',
    proposedAt: '2026-07-02',
    validatedAt: null,
    altImpact: 8.5, // projected, not confirmed
    implementedInScheduler: false, // not yet — waiting for A/B
    implementedAsConstraint: 'none',
    version: 1,
    versionHistory: [],
  },
  {
    id: 'rule-005',
    domain: 'voice-links',
    statement: 'Weather mentions in voice links during drive time increase ALT by 0.6min above generic links',
    evidence: [
      { id: 'ev-007', type: 'observational', description: 'Observed +0.6min correlation (lrn-003, n=1, not significant)', effectSize: 0, pValue: null, sampleSize: 1, confidence: 'low', date: '2026-07-09', isReal: false, confounders: ['n=1', 'sunny weather (positive mood)', 'morning drive (naturally values weather)'] },
    ],
    consensusEffect: 0,
    confidence: { score: 10, evidenceQuality: 'low', replications: 0, lastVerified: null, isReal: false },
    conflictsWith: [],
    conflictResolution: 'No conflicts yet — may conflict with future voice-link-length rules',
    appliesWhen: [
      'Drive time dayparts (06:00-10:00, 15:00-19:00)',
      'Weather is actionable (rain, snow, extreme temp)',
    ],
    doesNotApplyWhen: [
      'Overnight (listeners less weather-sensitive)',
      'Generic weather ("partly cloudy") with no impact',
    ],
    status: 'proposed',
    proposedAt: '2026-07-09',
    validatedAt: null,
    altImpact: 0.6, // projected
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    versionHistory: [],
  },
  {
    id: 'rule-006',
    domain: 'track-selection',
    statement: 'Familiar hit tracks (familiarity >0.8) increase ALT by 4.2min on average',
    evidence: [
      { id: 'ev-008', type: 'observational', description: '847 track plays analyzed, +4.2min avg for power tracks (P<0.01)', effectSize: 0.55, pValue: 0.001, sampleSize: 847, confidence: 'medium', date: '2026-07-10', isReal: false, confounders: ['power tracks played more in drive time (natural ALT peak)', 'familiarity correlates with recency of last play'] },
    ],
    consensusEffect: 0.55,
    confidence: { score: 45, evidenceQuality: 'medium', replications: 0, lastVerified: null, isReal: false },
    appliesWhen: [
      'All dayparts',
      'Track not played in last 6h (title separation)',
      'Artist not played in last 3h (artist separation)',
    ],
    doesNotApplyWhen: [
      'Track has 30d play count >25 (fatigue threshold)',
      'Specialty shows (Deep Cuts)',
    ],
    status: 'observed',
    proposedAt: '2026-07-01',
    validatedAt: null,
    altImpact: 4.2,
    implementedInScheduler: true,
    implementedAsConstraint: 'soft',
    version: 1,
    versionHistory: [],
  },
  {
    id: 'rule-007',
    domain: 'time-of-day',
    statement: 'BPM transitions of 15% or less are well-tolerated in afternoon drive but cause friction in overnight',
    evidence: [
      { id: 'ev-009', type: 'observational', description: 'lrn-001: 158→134 BPM well-tolerated (afternoon, n=1)', effectSize: 0, pValue: null, sampleSize: 1, confidence: 'low', date: '2026-07-10', isReal: false, confounders: ['n=1', 'both tracks highly familiar'] },
    ],
    consensusEffect: 0,
    confidence: { score: 5, evidenceQuality: 'low', replications: 0, lastVerified: null, isReal: false },
    conflictsWith: ['rule-001'],
    conflictResolution: 'rule-001 says low-energy consecutive is bad daytime; rule-007 says BPM transition OK afternoon. Not a true conflict — energy and BPM are different dimensions.',
    appliesWhen: [
      'Afternoon drive (15:00-19:00)',
      'Both tracks have familiarity >0.7',
    ],
    doesNotApplyWhen: [
      'Overnight (listeners prefer gradual energy changes)',
      'Either track is unfamiliar',
    ],
    status: 'proposed',
    proposedAt: '2026-07-10',
    validatedAt: null,
    altImpact: 0.5,
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    versionHistory: [],
  },
  {
    id: 'rule-008',
    domain: 'scheduling',
    statement: 'SUPERSeded: "Low-energy tracks should not be played consecutively" (replaced by rule-001 with specific threshold + time window)',
    evidence: [],
    consensusEffect: 0,
    confidence: { score: 45, evidenceQuality: 'medium', replications: 0, lastVerified: null, isReal: false },
    conflictsWith: ['rule-007'],
    conflictResolution: 'rule-001 applies daytime (06:00-22:00), rule-007 may apply overnight — both coexist in different time windows',
    appliesWhen: [],
    doesNotApplyWhen: ['All cases — superseded by rule-001'],
    status: 'deprecated',
    proposedAt: '2026-07-08',
    validatedAt: '2026-07-10',
    supersededBy: 'rule-001',
    altImpact: 0,
    implementedInScheduler: false,
    implementedAsConstraint: 'none',
    version: 1,
    versionHistory: [],
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

// Knowledge Conflict Detection — finds rules that may contradict each other
function detectConflicts(rules: KnowledgeRule[]): { ruleA: string; ruleB: string; description: string; resolution: string; type: 'resolved' | 'unresolved' }[] {
  const conflicts: { ruleA: string; ruleB: string; description: string; resolution: string; type: 'resolved' | 'unresolved' }[] = []
  for (const rule of rules) {
    if (rule.conflictsWith) {
      for (const conflictId of rule.conflictsWith) {
        const other = rules.find(r => r.id === conflictId)
        if (other) {
          const resolution = rule.conflictResolution ?? 'Unresolved — requires investigation'
          conflicts.push({
            ruleA: rule.id, ruleB: conflictId,
            description: `"${rule.statement.slice(0, 60)}..." may conflict with "${other.statement.slice(0, 60)}..."`,
            resolution,
            type: rule.conflictResolution ? 'resolved' : 'unresolved',
          })
        }
      }
    }
  }
  return conflicts
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  return NextResponse.json({
    _disclaimer: '⚠️ ALL EVIDENCE IS DEMONSTRATION DATA — no real A/B tests have been conducted. Every evidence.isReal=false. No rule can be "externally-validated" without real data. This framework defines HOW the radio will accumulate knowledge. When real experiments run, isReal becomes true, rules transition to externally-validated, and confidence scores reflect actual evidence.',
    rules: RULES,
    preRegistrations: PRE_REGISTRATIONS,
    dynamicWeights: DYNAMIC_WEIGHTS,
    // Evidence Graph — trace any decision back to its origin
    evidenceGraph: {
      description: 'Every AI decision can be traced back through: Decision → Policy → Rule → Evidence → Experiment → Hypothesis',
      nodes: [
        { id: 'decision-001', type: 'decision', label: 'Play Thunderstruck after Everlong', parent: 'policy-001' },
        { id: 'policy-001', type: 'policy', label: 'Enforce energy separation <0.5 daytime', parent: 'rule-001' },
        { id: 'rule-001', type: 'rule', label: 'Two consecutive low-energy tracks increase tune-out', parent: 'exp-006' },
        { id: 'exp-006', type: 'experiment', label: 'A/B: enforced separation vs random (14 days)', parent: 'hypothesis-001' },
        { id: 'hypothesis-001', type: 'hypothesis', label: 'Consecutive low-energy tracks cause tune-out', parent: null },
        // Second chain
        { id: 'decision-002', type: 'decision', label: 'Cap ad break at 2.5min', parent: 'policy-002' },
        { id: 'policy-002', type: 'policy', label: 'Ad breaks max 2.5min, 4 spots', parent: 'rule-002' },
        { id: 'rule-002', type: 'rule', label: 'Shorter ad breaks increase retention', parent: 'exp-002' },
        { id: 'exp-002', type: 'experiment', label: 'A/B: 2.5min vs 3-4min breaks (14 days)', parent: 'hypothesis-002' },
        { id: 'hypothesis-002', type: 'hypothesis', label: 'Longer ad breaks cause tune-out', parent: null },
      ],
      edges: [
        { from: 'decision-001', to: 'policy-001', relationship: 'implements' },
        { from: 'policy-001', to: 'rule-001', relationship: 'derived-from' },
        { from: 'rule-001', to: 'exp-006', relationship: 'evidence' },
        { from: 'exp-006', to: 'hypothesis-001', relationship: 'tests' },
        { from: 'decision-002', to: 'policy-002', relationship: 'implements' },
        { from: 'policy-002', to: 'rule-002', relationship: 'derived-from' },
        { from: 'rule-002', to: 'exp-002', relationship: 'evidence' },
        { from: 'exp-002', to: 'hypothesis-002', relationship: 'tests' },
      ],
      principle: 'You can always answer: "Why did the AI make this decision?" → trace the graph back to the hypothesis.',
    },
    // Knowledge Conflict Detection
    conflicts: detectConflicts(RULES),
    stats: {
      totalRules: RULES.length,
      externallyValidated: RULES.filter(r => r.status === 'externally-validated').length, // 0 — none yet
      simulated: RULES.filter(r => r.status === 'simulated').length,
      observed: RULES.filter(r => r.status === 'observed').length,
      experimentRunning: RULES.filter(r => r.status === 'experiment-running').length,
      proposed: RULES.filter(r => r.status === 'proposed').length,
      deprecated: RULES.filter(r => r.status === 'deprecated').length,
      // Honesty metrics
      realEvidenceCount: RULES.flatMap(r => r.evidence).filter(e => e.isReal).length, // 0
      demonstrationEvidenceCount: RULES.flatMap(r => r.evidence).filter(e => !e.isReal).length,
      avgConfidenceScore: Math.round(RULES.reduce((s, r) => s + r.confidence.score, 0) / RULES.length),
      conflictsDetected: RULES.filter(r => r.conflictsWith && r.conflictsWith.length > 0).length,
      honestyRate: '0% real evidence — all demonstration. No rule is externally-validated. Framework ready for real experiments.',
    },
    knowledgePipeline: {
      stages: [
        { stage: 'Proposed', description: 'New idea from observation or theory', count: RULES.filter(r => r.status === 'proposed').length },
        { stage: 'Observed', description: 'Correlation observed in data (not causal)', count: RULES.filter(r => r.status === 'observed').length },
        { stage: 'Simulated', description: 'Confirmed with demonstration data only (isReal=false)', count: RULES.filter(r => r.status === 'simulated').length },
        { stage: 'Experiment Running', description: 'A/B test in progress', count: RULES.filter(r => r.status === 'experiment-running').length },
        { stage: 'Externally Validated', description: 'Confirmed with real A/B test (isReal=true)', count: RULES.filter(r => r.status === 'externally-validated').length },
        { stage: 'Deprecated', description: 'Replaced by refined version', count: RULES.filter(r => r.status === 'deprecated').length },
      ],
      flow: 'Proposed → Observed → Simulated → Experiment Running → Externally Validated → (or Refuted) → Implemented → Dynamic weight adjustment → Next hypothesis',
      principle: 'A rule can only be "externally-validated" when a real A/B test (isReal=true) shows P<0.05 AND d>0.2 AND no guardrail violation. "Simulated" means the framework is tested but evidence is demonstration data only.',
    },
    howItDiffersFromLearningLoop: {
      learningLoop: 'Adjusts numerical weights based on each decision outcome',
      knowledgeEngine: 'Stores semantic rules with evidence, applicability boundaries, lifecycle status, version history, and conflict detection. Rules can be deprecated, refined, or refuted — but never deleted.',
      example: 'Learning Loop: "consecutive_low_energy_penalty: 0.15 → 0.25" | Knowledge Engine: "Two consecutive low-energy tracks (<0.5) increase tune-out by 2.7% in daytime. Simulated via A/B (P=0.008, d=0.38, isReal=false). Does NOT apply overnight (22:00-06:00). Confidence: 45%. Conflicts with rule-007 (resolved: different dimensions)."',
    },
    nextStep: 'When the first real A/B test completes: evidence.isReal becomes true, rule transitions from "simulated" → "externally-validated", confidence.score increases, and the knowledge base becomes real wisdom — not framework, but experience.',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'add-rule' && body.statement) {
    const rule: KnowledgeRule = {
      id: `rule-${Date.now()}`, domain: body.domain ?? 'scheduling',
      statement: body.statement,
      evidence: [], consensusEffect: 0, confidence: { score: 0, evidenceQuality: 'low', replications: 0, lastVerified: null, isReal: false },
      appliesWhen: body.appliesWhen ?? [], doesNotApplyWhen: body.doesNotApplyWhen ?? [],
      status: 'proposed', proposedAt: new Date().toISOString(), validatedAt: null,
      altImpact: body.altImpact ?? 0,
      implementedInScheduler: false, implementedAsConstraint: 'none',
      version: 1, versionHistory: [],
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
        rule.validatedAt = new Date().toISOString()
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
      old.versionHistory.push({ version: old.version, statement: old.statement, changedAt: new Date().toISOString(), reason: body.reason ?? 'Superseded by refined version' })
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
