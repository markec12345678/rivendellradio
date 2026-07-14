/**
 * Goal Engine — AI ima dolgoročne cilje.
 *
 * Vsaka odločitev AI Core preveri: "Ali to pomaga cilju?"
 *
 * Cilji imajo:
 *   - target (kaj želimo doseči)
 *   - current (kje smo zdaj)
 *   - deadline (kdaj)
 *   - progress (zadnje meritve)
 *   - priority (utež v multi-objective)
 *   - status (on-track / at-risk / off-track)
 */

export interface Goal {
  id: string
  name: string
  description: string
  // Target
  metric: string
  target: number
  current: number
  unit: string
  direction: 'increase' | 'decrease' | 'maintain'
  // Timeline
  deadline: string
  startedAt: string
  // Progress tracking
  progressHistory: { date: string; value: number }[]
  // Priority
  priority: number // 1 = highest
  weight: number // 0-1 in multi-objective
  // Status
  status: 'on-track' | 'at-risk' | 'off-track' | 'achieved'
  // Constraints
  allowedActions: string[] // what AI can do to pursue this goal
  forbiddenActions: string[] // what AI must NOT do
  // Guardrails
  guardrails: string[] // things that must not be sacrificed
}

const GOALS: Goal[] = [
  {
    id: 'goal-alt',
    name: 'Increase Average Listening Time',
    description: 'Primary KPI — listeners should stay longer per session',
    metric: 'ALT',
    target: 25, current: 18.9, unit: 'minutes',
    direction: 'increase',
    deadline: '2026-10-01',
    startedAt: '2026-07-01',
    progressHistory: [
      { date: '2026-07-01', value: 16.8 },
      { date: '2026-07-08', value: 17.2 },
      { date: '2026-07-15', value: 18.1 },
      { date: '2026-07-22', value: 18.5 },
      { date: '2026-07-29', value: 18.9 },
    ],
    priority: 1, weight: 0.25,
    status: 'on-track',
    allowedActions: ['optimize_track_selection', 'adjust_voice_link_frequency', 'fulfill_listener_requests', 'adjust_ad_break_length'],
    forbiddenActions: ['play_only_top_20', 'eliminate_new_music', 'remove_voice_links'],
    guardrails: ['diversity ≥ 8 artists/hr', 'discovery rate ≥ 60%', 'compliance = 100%'],
  },
  {
    id: 'goal-tuneout',
    name: 'Reduce Tune-Out Rate',
    description: 'Fewer listeners leaving during tracks',
    metric: 'Tune-out rate',
    target: 2.0, current: 3.2, unit: '%',
    direction: 'decrease',
    deadline: '2026-10-01',
    startedAt: '2026-07-01',
    progressHistory: [
      { date: '2026-07-01', value: 4.1 },
      { date: '2026-07-15', value: 3.8 },
      { date: '2026-07-29', value: 3.2 },
    ],
    priority: 2, weight: 0.15,
    status: 'on-track',
    allowedActions: ['enforce_separation_rules', 'sandwich_new_releases', 'adjust_energy_curve'],
    forbiddenActions: ['remove_slow_tracks_entirely', 'only_play_fast_music'],
    guardrails: ['evening listeners need slower tracks', 'overnight allows low energy'],
  },
  {
    id: 'goal-return',
    name: 'Increase 7-Day Return Rate',
    description: 'More listeners coming back within 7 days',
    metric: 'Return rate',
    target: 45, current: 34, unit: '%',
    direction: 'increase',
    deadline: '2026-12-01',
    startedAt: '2026-07-01',
    progressHistory: [
      { date: '2026-07-01', value: 29 },
      { date: '2026-07-15', value: 31 },
      { date: '2026-07-29', value: 34 },
    ],
    priority: 3, weight: 0.20,
    status: 'on-track',
    allowedActions: ['introduce_contests', 'fulfill_requests', 'new_music_wednesday', 'personalize_voice_links'],
    forbiddenActions: ['spam_notifications', 'manipulative_tactics'],
    guardrails: ['respect listener privacy', 'no excessive push notifications'],
  },
  {
    id: 'goal-discovery',
    name: 'Maintain Music Discovery Rate',
    description: 'Listeners should accept new music (not just hits)',
    metric: 'Discovery rate',
    target: 80, current: 72, unit: '%',
    direction: 'increase',
    deadline: '2026-09-01',
    startedAt: '2026-07-01',
    progressHistory: [
      { date: '2026-07-01', value: 65 },
      { date: '2026-07-15', value: 68 },
      { date: '2026-07-29', value: 72 },
    ],
    priority: 4, weight: 0.05,
    status: 'on-track',
    allowedActions: ['sandwich_new_releases', 'introduce_new_artists', 'ai_metadata_tagging'],
    forbiddenActions: ['force_unfamiliar_music', 'sacrifice_alt_for_discovery'],
    guardrails: ['ALT must not decrease', 'new tracks sandwiched between hits'],
  },
]

/**
 * Check if a proposed action aligns with goals.
 */
export function checkGoalAlignment(action: string): { aligned: boolean; goalsHelped: string[]; goalsConflicted: string[]; guardrailViolations: string[] } {
  const goalsHelped: string[] = []
  const goalsConflicted: string[] = []
  const guardrailViolations: string[] = []

  for (const goal of GOALS) {
    if (goal.allowedActions.includes(action)) {
      goalsHelped.push(goal.id)
    }
    if (goal.forbiddenActions.includes(action)) {
      goalsConflicted.push(goal.id)
    }
  }

  // Check guardrails
  if (action === 'play_only_top_20') {
    guardrailViolations.push('diversity ≥ 8 artists/hr would be violated')
    guardrailViolations.push('discovery rate ≥ 60% would be violated')
  }

  return {
    aligned: goalsConflicted.length === 0 && guardrailViolations.length === 0,
    goalsHelped,
    goalsConflicted,
    guardrailViolations,
  }
}

/**
 * Get overall goal progress summary.
 */
export function getGoalProgress(): { goals: Goal[]; overallProgress: number; onTrack: number; atRisk: number; offTrack: number } {
  const onTrack = GOALS.filter(g => g.status === 'on-track').length
  const atRisk = GOALS.filter(g => g.status === 'at-risk').length
  const offTrack = GOALS.filter(g => g.status === 'off-track').length

  const overallProgress = GOALS.reduce((sum, g) => {
    const progress = g.direction === 'increase'
      ? (g.current / g.target)
      : (g.target / g.current)
    return sum + (progress * g.weight)
  }, 0)

  return { goals: GOALS, overallProgress: Math.round(overallProgress * 100) / 100, onTrack, atRisk, offTrack }
}

export { GOALS }
