import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Learning Loop — the radio that improves from its own decisions.
 *
 * This is the culmination of the AI radio. Every decision the Station Brain makes
 * is tracked, measured, and fed back into the system as learning.
 *
 * The loop:
 *   1. Brain makes decision (play track X at time T in context C)
 *   2. Listeners react (stay, leave, return, request, share)
 *   3. System measures outcome (ALT delta, tune-out rate, return rate)
 *   4. System attributes outcome to decision (with confounders noted)
 *   5. System updates decision weights (reinforcement learning)
 *   6. Next decision is slightly better informed
 *
 * Over time, the radio learns:
 *   - Which tracks work in which contexts (weather, time, energy curve)
 *   - Which voice link styles keep listeners
 *   - Which ad break lengths optimize retention
 *   - Which new releases listeners accept
 *   - When to speak and when to stay silent
 *
 * GET /api/v1/ai/learning-loop — learning state + accumulated knowledge + what it learned
 */

interface LearningRecord {
  id: string
  timestamp: string
  decision: string
  context: string
  // What the brain expected
  projectedOutcome: string
  projectedAltDelta: number
  // What actually happened
  actualOutcome: string
  actualAltDelta: number
  // Learning
  surprise: number // 0-1, how unexpected was the outcome
  lessonLearned: string
  weightAdjustment: { factor: string; oldWeight: number; newWeight: number; reason: string }[]
  // Scientific honesty
  confounders: string[]
  causalConfidence: 'high' | 'medium' | 'low' // based on whether A/B confirmed
}

interface AccumulatedKnowledge {
  domain: string
  findings: { finding: string; evidence: string; confidence: 'high' | 'medium' | 'low'; actionable: boolean; abValidated: boolean }[]
  lastUpdated: string
}

const LEARNING_RECORDS: LearningRecord[] = [
  {
    id: 'lrn-001',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    decision: 'Play Thunderstruck after Everlong (BPM 158→134)',
    context: 'Afternoon drive, 1,492 listeners, sunny, energy 0.72, 8min since last hit',
    projectedOutcome: '93% 5-min retention, +1.2min ALT',
    projectedAltDelta: 1.2,
    actualOutcome: '94% 5-min retention, +1.4min ALT. Listeners responded well to familiar hit.',
    actualAltDelta: 1.4,
    surprise: 0.05,
    lessonLearned: 'BPM drop of 15% from high-energy to mid-energy hit is well-tolerated in afternoon drive. Familiarity outweighs BPM friction.',
    weightAdjustment: [
      { factor: 'familiarity_score', oldWeight: 0.30, newWeight: 0.32, reason: 'Familiarity predicted retention accurately — increase weight slightly' },
      { factor: 'bpm_transition', oldWeight: 0.10, newWeight: 0.09, reason: '15% BPM drop caused no friction — decrease penalty slightly' },
    ],
    confounders: ['Sunny weather may have boosted mood', 'Everlong is highly liked (completion rate 96%)'],
    causalConfidence: 'medium',
  },
  {
    id: 'lrn-002',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    decision: 'Play Black Hole Sun after Wonderwall (energy 0.40→0.35)',
    context: 'Midday, 1,200 listeners, energy curve declining, 18min since last hit',
    projectedOutcome: '78% 5-min retention, -0.8min ALT',
    projectedAltDelta: -0.8,
    actualOutcome: '71% 5-min retention, -2.4min ALT. 12 listeners left during Black Hole Sun.',
    actualAltDelta: -2.4,
    surprise: 0.35,
    lessonLearned: 'Two consecutive low-energy tracks (<0.5) cause 3x more departure than predicted. Energy curve matters more than model estimated.',
    weightAdjustment: [
      { factor: 'consecutive_low_energy_penalty', oldWeight: 0.15, newWeight: 0.25, reason: 'Model underestimated impact of consecutive low energy — increase penalty significantly' },
      { factor: 'energy_floor_daytime', oldWeight: 0.05, newWeight: 0.08, reason: 'Add energy floor for daytime (no two tracks <0.5 in a row before 22:00)' },
    ],
    confounders: ['Post-lunch dip (13:00-14:00) naturally has higher tune-out', 'Wonderwall is divisive (some love, some skip)'],
    causalConfidence: 'medium',
  },
  {
    id: 'lrn-003',
    timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
    decision: 'AI DJ voice link with weather mention',
    context: 'Morning drive, 1,600 listeners, first voice link of the hour',
    projectedOutcome: '+2.8min ALT (based on voice link correlation)',
    projectedAltDelta: 2.8,
    actualOutcome: '+3.4min ALT. Weather mention specifically correlated with longer sessions.',
    actualAltDelta: 3.4,
    surprise: 0.15,
    lessonLearned: 'Weather mentions in voice links show +0.6min above generic voice links. Listeners value practical information.',
    weightAdjustment: [
      { factor: 'weather_in_voice_link', oldWeight: 0.05, newWeight: 0.08, reason: 'Weather mention boosts voice link impact — increase weight' },
      { factor: 'voice_link_frequency_drive', oldWeight: 0.10, newWeight: 0.10, reason: 'No change — frequency is correct' },
    ],
    confounders: ['Morning drive listeners naturally value weather more than midday', 'Specific weather was sunny (positive mood)'],
    causalConfidence: 'low', // not yet A/B validated
  },
  {
    id: 'lrn-004',
    timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    decision: 'Fulfill P1 listener request (Everlong) within 8min',
    context: 'Morning drive, Diamond-tier listener, request received 8min ago',
    projectedOutcome: '+8.5min ALT for this listener (based on correlation)',
    projectedAltDelta: 8.5,
    actualOutcome: '+12.3min ALT for this listener. Listener also returned next day.',
    actualAltDelta: 12.3,
    surprise: 0.45,
    lessonLearned: 'Fast request fulfillment exceeded expectation. The +8.5min correlation may UNDERESTIMATE the causal effect — fast fulfillment may be more impactful than thought.',
    weightAdjustment: [
      { factor: 'request_fulfillment_speed', oldWeight: 0.20, newWeight: 0.24, reason: 'Fast fulfillment exceeded projection — increase priority' },
      { factor: 'request_announce_listener_name', oldWeight: 0.05, newWeight: 0.07, reason: 'Personalization may be the driver — increase weight' },
    ],
    confounders: ['Single listener (n=1, not statistically significant)', 'Diamond-tier listeners naturally have longer sessions', 'Everlong is a universally liked track'],
    causalConfidence: 'low', // single observation, need A/B test (exp-001 is running)
  },
]

const ACCUMULATED_KNOWLEDGE: AccumulatedKnowledge[] = [
  {
    domain: 'Track selection',
    findings: [
      { finding: 'Familiar hits (familiarity >0.8) increase ALT by +4.2min on average', evidence: 'Correlation: P<0.01, n=847. A/B not yet run.', confidence: 'medium', actionable: true, abValidated: false },
      { finding: 'Two consecutive low-energy tracks (<0.5) cause 3x more departure than model predicted', evidence: 'Observed in lrn-002, model weight adjusted. A/B needed.', confidence: 'medium', actionable: true, abValidated: false },
      { finding: 'New releases sandwiched between hits reduce tune-out by 38%', evidence: 'A/B test exp-003: P=0.012, d=0.35. Shipped.', confidence: 'high', actionable: true, abValidated: true },
      { finding: 'BPM transition of 15% (158→134) is well-tolerated in afternoon drive', evidence: 'Observed in lrn-001, n=1. Need more observations.', confidence: 'low', actionable: false, abValidated: false },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    domain: 'Voice links',
    findings: [
      { finding: 'Weather mentions in voice links boost ALT by +0.6min above generic links', evidence: 'Observed in lrn-003. A/B test exp-005 in planning.', confidence: 'low', actionable: true, abValidated: false },
      { finding: 'Voice links every 15min (vs 20min) — impact unknown, A/B running', evidence: 'exp-004 running, 487/1000 sessions collected.', confidence: 'low', actionable: false, abValidated: false },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    domain: 'Listener requests',
    findings: [
      { finding: 'Fulfilled requests correlate with +8.5min ALT, but causal attribution requires A/B', evidence: 'Correlation P<0.01, n=142. exp-001 running (342/500 sessions).', confidence: 'medium', actionable: true, abValidated: false },
      { finding: 'Fast fulfillment (8min) exceeded projection (+12.3 vs +8.5 projected)', evidence: 'Single observation (lrn-004). Not significant alone.', confidence: 'low', actionable: false, abValidated: false },
    ],
    lastUpdated: new Date().toISOString(),
  },
  {
    domain: 'Ad breaks',
    findings: [
      { finding: 'Capping ad breaks at 2.5min increases retention by 4.8% without revenue loss', evidence: 'A/B test exp-002: P=0.003, d=0.42. Shipped.', confidence: 'high', actionable: true, abValidated: true },
    ],
    lastUpdated: new Date().toISOString(),
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalLearningRecords = 287
  const validatedFindings = ACCUMULATED_KNOWLEDGE.flatMap(k => k.findings).filter(f => f.abValidated).length
  const totalFindings = ACCUMULATED_KNOWLEDGE.flatMap(k => k.findings).length

  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — learning records are illustrative. Real implementation requires: (1) Event Bus correlation (decision → listener behavior), (2) warehouse queries for ALT delta, (3) reinforcement learning framework. The methodology (track → measure → attribute → adjust → repeat) is the real value. Causal confidence is honestly labeled.',
    learningRecords: LEARNING_RECORDS,
    accumulatedKnowledge: ACCUMULATED_KNOWLEDGE,
    stats: {
      totalDecisionsTracked: totalLearningRecords,
      weightAdjustmentsMade: 12,
      findingsDiscovered: totalFindings,
      abValidatedFindings: validatedFindings,
      highConfidenceFindings: ACCUMULATED_KNOWLEDGE.flatMap(k => k.findings).filter(f => f.confidence === 'high').length,
      lowConfidenceFindings: ACCUMULATED_KNOWLEDGE.flatMap(k => k.findings).filter(f => f.confidence === 'low').length,
      // Honesty metric
      honestyRate: Math.round((validatedFindings / totalFindings) * 100), // % of findings that are A/B validated
    },
    theLoop: {
      name: 'Hypothesis → Experiment → Measure → Analyze → Policy → Next',
      currentCycle: 'Running 2 A/B tests (exp-001, exp-004), 2 shipped policies, 1 in planning',
      cycleTime: '14 days average',
      totalCycles: 5,
      // What the radio has learned about itself
      selfAwareness: [
        'I underestimate the impact of consecutive low-energy tracks (corrected +0.10 weight)',
        'I underestimate the value of weather in voice links (corrected +0.03 weight)',
        'I may underestimate the causal effect of fast request fulfillment (A/B test running)',
        'I correctly predict familiar hit retention (projection within 5% of actual)',
        'I correctly predict ad break impact after A/B validation (shipped with confidence)',
      ],
    },
    principle: 'Every decision is a learning opportunity. Every surprise is a weight adjustment. Every A/B test converts correlation to causation. The radio gets smarter every day — but it never claims more than the evidence supports.',
  })
}
