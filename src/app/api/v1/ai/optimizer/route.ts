import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Multi-Objective Optimizer — prevents AI from gaming one metric.
 *
 * Problem: If you optimize ONLY for ALT, AI plays only the 20 most familiar hits
 * forever. ALT goes up, but diversity drops, fatigue sets in, listeners leave long-term.
 *
 * Solution: AI optimizes 8 objectives simultaneously with weighted tradeoffs.
 * Each objective has a target, current value, weight, and constraint (hard/soft).
 * AI decisions are scored across ALL objectives, not just one.
 *
 * This prevents "gaming" — you can't sacrifice diversity for ALT
 * because diversity has its own weight and hard floor.
 *
 * GET /api/v1/ai/optimizer — current multi-objective state + tradeoffs + Pareto
 */

interface Objective {
  id: string
  name: string
  description: string
  // Current performance
  current: number
  baseline: number
  target: number
  unit: string
  // Optimization
  weight: number // 0-1, total weights = 1.0
  direction: 'maximize' | 'minimize'
  constraint: { type: 'hard' | 'soft'; floor?: number; ceiling?: number }
  // Evidence
  trend7d: 'improving' | 'stable' | 'degrading'
  trend30d: number // delta vs 30d ago
  // Risk
  gamingRisk: string // what happens if this is ignored
  lastUpdated: string
}

interface Tradeoff {
  decision: string
  objectivesAffected: { objectiveId: string; impact: number; direction: 'positive' | 'negative' }[]
  netScore: number
  reasoning: string
  // The tradeoff
  whatYouGain: string
  whatYouLose: string
  isWorthIt: boolean
}

interface ParetoFrontier {
  description: string
  points: { alt: number; diversity: number; label: string }[]
  current: { alt: number; diversity: number; label: string }
  optimal: { alt: number; diversity: number; label: string }
}

const OBJECTIVES: Objective[] = [
  {
    id: 'alt',
    name: 'Average Listening Time',
    description: 'Primary KPI — how long listeners stay per session',
    current: 18.9, baseline: 16.8, target: 25, unit: 'minutes',
    weight: 0.25, direction: 'maximize',
    constraint: { type: 'soft', floor: 15 },
    trend7d: 'improving', trend30d: 2.1,
    gamingRisk: 'If optimized alone: AI plays only top 20 hits forever → short-term ALT up, long-term fatigue → listeners leave',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'session-completion',
    name: 'Session Completion Rate',
    description: '% of listeners who stay through entire show segment',
    current: 48, baseline: 42, target: 60, unit: '%',
    weight: 0.15, direction: 'maximize',
    constraint: { type: 'soft', floor: 35 },
    trend7d: 'improving', trend30d: 6,
    gamingRisk: 'If optimized alone: AI shortens segments to artificially boost "completion" → loses depth',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'return-rate',
    name: '7-Day Return Rate',
    description: '% of listeners who return within 7 days (loyalty)',
    current: 34, baseline: 29, target: 45, unit: '%',
    weight: 0.20, direction: 'maximize',
    constraint: { type: 'hard', floor: 25 },
    trend7d: 'improving', trend30d: 5,
    gamingRisk: 'If ignored: AI burns out listeners with repetition → they leave and never come back',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'tune-out-rate',
    name: 'Tune-Out Rate',
    description: '% of listeners who leave per track (departure rate)',
    current: 3.2, baseline: 4.1, target: 2.0, unit: '%',
    weight: 0.15, direction: 'minimize',
    constraint: { type: 'hard', ceiling: 5 },
    trend7d: 'improving', trend30d: -0.9,
    gamingRisk: 'If ignored: high-tune-out tracks keep playing → listeners associate station with bad experience',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'ad-retention',
    name: 'Ad Break Retention',
    description: '% of listeners who stay through ad breaks',
    current: 88, baseline: 82, target: 93, unit: '%',
    weight: 0.10, direction: 'maximize',
    constraint: { type: 'soft', floor: 80 },
    trend7d: 'improving', trend30d: 6,
    gamingRisk: 'If optimized alone: AI eliminates ads → revenue drops to zero',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'discovery',
    name: 'Discovery Rate',
    description: '% of new/unfamiliar tracks that listeners accept (don\'t tune out)',
    current: 72, baseline: 65, target: 80, unit: '%',
    weight: 0.05, direction: 'maximize',
    constraint: { type: 'soft', floor: 60 },
    trend7d: 'stable', trend30d: 7,
    gamingRisk: 'If ignored: station becomes a jukebox of same 50 songs → stale, no reason to return',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'diversity',
    name: 'Artist Diversity',
    description: 'Unique artists per hour (prevents repetition fatigue)',
    current: 11.2, baseline: 8.4, target: 12, unit: 'artists/hr',
    weight: 0.05, direction: 'maximize',
    constraint: { type: 'hard', floor: 8 },
    trend7d: 'improving', trend30d: 2.8,
    gamingRisk: 'If ignored: AI plays same 5 artists → fatigue → listeners tune out after 2 weeks',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'compliance',
    name: 'Compliance Score',
    description: 'FCC + DMCA + EBU R128 rule adherence (0-100)',
    current: 100, baseline: 100, target: 100, unit: 'score',
    weight: 0.05, direction: 'maximize',
    constraint: { type: 'hard', floor: 100 },
    trend7d: 'stable', trend30d: 0,
    gamingRisk: 'If ignored: FCC fines, DMCA takedowns, EBU R128 violations → legal + financial damage',
    lastUpdated: new Date().toISOString(),
  },
]

const TRADEOFFS: Tradeoff[] = [
  {
    decision: 'Play power hit every 12min (up from 15min)',
    objectivesAffected: [
      { objectiveId: 'alt', impact: +1.2, direction: 'positive' },
      { objectiveId: 'tune-out-rate', impact: -0.3, direction: 'positive' },
      { objectiveId: 'diversity', impact: -1.5, direction: 'negative' },
      { objectiveId: 'discovery', impact: -2, direction: 'negative' },
    ],
    netScore: +0.4,
    reasoning: 'More hits = higher ALT, but fewer unique artists per hour and less new music exposure',
    whatYouGain: '+1.2min ALT, -0.3% tune-out',
    whatYouLose: '-1.5 artists/hr diversity, -2% discovery rate',
    isWorthIt: true, // ALT weight 0.25 > diversity weight 0.05
  },
  {
    decision: 'Cap ad breaks at 2.5min (down from 3min)',
    objectivesAffected: [
      { objectiveId: 'ad-retention', impact: +4, direction: 'positive' },
      { objectiveId: 'alt', impact: +0.8, direction: 'positive' },
      { objectiveId: 'compliance', impact: 0, direction: 'positive' },
    ],
    netScore: +1.1,
    reasoning: 'Shorter breaks retain more listeners, but may reduce ad inventory (revenue)',
    whatYouGain: '+4% ad retention, +0.8min ALT',
    whatYouLose: 'Potential revenue decrease (fewer ads per break — offset by more breaks)',
    isWorthIt: true,
  },
  {
    decision: 'Introduce 1 new release per hour (up from 0.5)',
    objectivesAffected: [
      { objectiveId: 'discovery', impact: +5, direction: 'positive' },
      { objectiveId: 'return-rate', impact: +1, direction: 'positive' },
      { objectiveId: 'tune-out-rate', impact: +0.4, direction: 'negative' },
      { objectiveId: 'alt', impact: -0.6, direction: 'negative' },
    ],
    netScore: +0.3,
    reasoning: 'More new music = better discovery + return rate, but new tracks cause tune-outs',
    whatYouGain: '+5% discovery, +1% return rate',
    whatYouLose: '+0.4% tune-out, -0.6min ALT',
    isWorthIt: true, // long-term return rate (0.20) > short-term ALT (0.25) when discovery is below target
  },
  {
    decision: 'Remove all explicit tracks entirely (not just daytime)',
    objectivesAffected: [
      { objectiveId: 'compliance', impact: 0, direction: 'positive' },
      { objectiveId: 'diversity', impact: -2, direction: 'negative' },
      { objectiveId: 'discovery', impact: -3, direction: 'negative' },
    ],
    netScore: -0.8,
    reasoning: 'Compliance already at 100% — removing explicit tracks loses diversity + discovery with zero compliance gain',
    whatYouGain: 'Nothing (already compliant)',
    whatYouLose: '-2 artists/hr, -3% discovery',
    isWorthIt: false, // hard constraint already met, so no benefit
  },
]

const PARETO: ParetoFrontier = {
  description: 'Pareto frontier shows the tradeoff between ALT and Diversity. Points on the frontier are "Pareto optimal" — you cannot improve one without hurting the other.',
  points: [
    { alt: 22.5, diversity: 6.0, label: 'All hits, no new music' },
    { alt: 21.0, diversity: 8.0, label: 'Mostly hits, occasional new' },
    { alt: 19.5, diversity: 10.0, label: 'Balanced (current target)' },
    { alt: 18.0, diversity: 11.5, label: 'Current position' },
    { alt: 16.5, diversity: 13.0, label: 'Lots of new music, lower ALT' },
    { alt: 14.0, diversity: 14.5, label: 'All new music, low ALT' },
  ],
  current: { alt: 18.9, diversity: 11.2, label: 'Current' },
  optimal: { alt: 19.5, diversity: 10.0, label: 'Optimal balance' },
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalWeight = OBJECTIVES.reduce((s, o) => s + o.weight, 0)
  const objectivesMet = OBJECTIVES.filter(o => o.direction === 'maximize' ? o.current >= o.target : o.current <= o.target).length
  const hardConstraintsMet = OBJECTIVES.filter(o => o.constraint.type === 'hard').every(o => {
    if (o.direction === 'maximize') return o.current >= (o.constraint.floor ?? 0)
    return o.current <= (o.constraint.ceiling ?? Infinity)
  })

  // Composite score (weighted average of normalized objectives)
  const compositeScore = OBJECTIVES.reduce((score, o) => {
    const normalized = o.direction === 'maximize'
      ? Math.min(1, o.current / o.target)
      : Math.min(1, o.target / o.current)
    return score + normalized * o.weight
  }, 0)

  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — objective weights + targets are configurable design choices. Current values are illustrative. Real implementation requires: (1) warehouse queries for each KPI, (2) A/B test infrastructure to measure causal impact of weight changes, (3) periodic weight rebalancing based on business priorities.',
    objectives: OBJECTIVES,
    tradeoffs: TRADEOFFS,
    pareto: PARETO,
    stats: {
      totalObjectives: OBJECTIVES.length,
      objectivesMet,
      hardConstraintsMet,
      compositeScore: Math.round(compositeScore * 100) / 100,
      totalWeight, // should be 1.0
      northStar: 'ALT (weight 0.25) — primary but not sole objective',
    },
    whyMultiObjective: {
      problem: 'If you optimize ONLY for ALT, AI plays only the 20 most familiar hits forever. ALT goes up, but diversity drops, fatigue sets in, listeners leave long-term.',
      solution: '8 objectives with weights. AI decisions scored across ALL objectives. Hard constraints prevent gaming.',
      example: 'Playing "Seven Nation Army" every 30min would boost ALT by +1.2min, but hurt diversity (-1.5 artists/hr) and discovery (-2%). Net score: +0.4 — worth it. But every 15min would push diversity below hard floor (8 artists/hr) → blocked.',
    },
    weightRationale: {
      alt: '0.25 — primary KPI, but not sole. 25% weight prevents over-optimization.',
      'return-rate': '0.20 — loyalty is second most important. Listeners who return = sustainable audience.',
      'session-completion': '0.15 — engagement signal. Lower weight than ALT because it\'s correlated.',
      'tune-out-rate': '0.15 — immediate pain signal. Minimize, with hard ceiling (5%).',
      'ad-retention': '0.10 — revenue sustainability. Important but not at expense of listener experience.',
      'discovery': '0.05 — long-term health. Low weight but hard floor prevents staleness.',
      'diversity': '0.05 — long-term health. Hard floor (8 artists/hr) prevents fatigue.',
      'compliance': '0.05 — non-negotiable. Hard floor at 100% — violations are blocked, not penalized.',
    },
  })
}
