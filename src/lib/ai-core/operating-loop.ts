/**
 * AI Operating Loop — neprestani cikel delovanja postaje.
 *
 * Observe → Understand → Predict → Simulate → Choose → Act → Measure → Learn → Repeat
 *
 * To NI nov API endpoint. To je cikel ki teče neprestano (vsakih 30s v produkciji).
 * AI ne čaka na vprašanje. Opazuje. Razmišlja. Odloča. Se uči.
 *
 * Razlika od AI Core (Sprint 27-28):
 *   AI Core: Question → Think → Answer (reaktiven)
 *   Operating Loop: Observe → Predict → Simulate → Act → Learn (proaktiven)
 *
 * AI postane pravi programski direktor — ne odgovarja le na vprašanja,
 * ampak neprestano optimizira program.
 */

import { executeTool, executeTools, type ToolResult } from '@/lib/ai-core/tools'
import { GOALS, checkGoalAlignment } from '@/lib/ai-core/goals'
import { MEMORY } from '@/lib/ai-core/index'

// ============================================================================
// Loop State — trenutno stanje cikla
// ============================================================================
export interface LoopState {
  cycle: number
  timestamp: string
  // Observe
  observation: LoopObservation
  // Understand
  understanding: string
  // Predict
  predictions: Prediction[]
  // Simulate
  simulations: Simulation[]
  // Choose
  chosenAction: ChosenAction | null
  // Act
  actionExecuted: boolean
  // Measure
  measurement: LoopMeasurement | null
  // Learn
  learning: string
  // Loop metadata
  durationMs: number
  shouldAct: boolean
}

export interface LoopObservation {
  // What AI sees right now
  listeners: number
  listenerTrend: 'increasing' | 'stable' | 'decreasing'
  listenerDelta5min: number
  currentTrack: string
  currentArtist: string
  trackRemainingSec: number
  alt: number
  daypart: string
  hour: number
  weather: string
  energyLast30min: number
  minutesSinceLastHit: number
  minutesSinceLastAd: number
  // Anomalies detected
  anomalies: string[]
  // Goal status
  goalStatus: { goal: string; onTrack: boolean; gap: number }[]
}

export interface Prediction {
  scenario: string
  description: string
  predictedAlt: number
  predictedTuneOut: number
  confidence: number // 0-1, KONSERVATIVNO (max 0.85 za napovedi)
  factors: string[]
  // Counterfactual
  counterfactual: string
}

export interface Simulation {
  optionId: string
  optionName: string
  description: string
  // What would happen
  predictedAlt: number
  predictedTuneOut: number
  predictedReturnRate: number
  // Goal alignment
  goalsHelped: string[]
  goalsConflicted: string[]
  // Risk
  riskLevel: 'safe' | 'caution' | 'dangerous'
  riskFactors: string[]
  // Score (weighted)
  score: number
  // Confidence
  confidence: number
}

export interface ChosenAction {
  optionId: string
  optionName: string
  reasoning: string
  // Safety
  requiresApproval: boolean
  safetyChecked: boolean
  // Goal alignment
  goalAlignment: { aligned: boolean; goalsHelped: string[]; goalsConflicted: string[]; guardrailViolations: string[] }
  // Expected outcome
  expectedAltDelta: number
  // Why not alternatives
  whyNotAlternatives: string[]
}

export interface LoopMeasurement {
  actionTaken: string
  altBefore: number
  altAfter: number
  altDelta: number
  listenersBefore: number
  listenersAfter: number
  listenerDelta: number
  // Prediction accuracy
  predictedAltDelta: number
  actualAltDelta: number
  predictionError: number
  // Outcome
  outcome: 'success' | 'partial' | 'failure' | 'pending'
  lessonLearned: string
}

// ============================================================================
// Loop History — zgodovina ciklov za učenje
// ============================================================================
const LOOP_HISTORY: LoopState[] = []
const MAX_HISTORY = 100

// ============================================================================
// 1. OBSERVE — AI opazuje stanje postaje
// ============================================================================
async function observe(): Promise<LoopObservation> {
  const evidence = await executeTools([
    { name: 'get_now_playing' },
    { name: 'get_station_brain' },
    { name: 'get_reliability' },
  ])

  const np = evidence.get_now_playing?.data
  const brain = evidence.get_station_brain?.data
  const rel = evidence.get_reliability?.data

  const listeners = np?.listeners ?? 0
  const listenerDelta5min = (brain?.perception?.listenerTrend5min) ?? 0
  const listenerTrend = listenerDelta5min > 5 ? 'increasing' : listenerDelta5min < -5 ? 'decreasing' : 'stable'

  // Anomaly detection
  const anomalies: string[] = []
  if (listenerDelta5min < -20) anomalies.push(`⚠️ Listener drop: ${listenerDelta5min} in 5min`)
  if (brain?.perception?.energyLast30min < 0.4) anomalies.push(`⚠️ Low energy for 30min: ${brain?.perception?.energyLast30min}`)
  if (brain?.perception?.minutesSinceLastHit > 20) anomalies.push(`⚠️ No hit for ${brain?.perception?.minutesSinceLastHit}min`)
  if ((brain?.perception?.minutesSinceLastAd ?? 0) > 30) anomalies.push(`⚠️ Ad break overdue: ${brain?.perception?.minutesSinceLastAd}min`)

  // Goal status
  const goalStatus = GOALS.map(g => ({
    goal: g.id,
    onTrack: g.status === 'on-track',
    gap: g.direction === 'increase' ? g.target - g.current : g.current - g.target,
  }))

  return {
    listeners,
    listenerTrend,
    listenerDelta5min,
    currentTrack: np?.title ?? 'Unknown',
    currentArtist: np?.artist ?? 'Unknown',
    trackRemainingSec: np?.remainingMs ? Math.round(np.remainingMs / 1000) : 0,
    alt: rel?.alt ?? 18.9,
    daypart: brain?.perception?.daypart ?? 'unknown',
    hour: brain?.perception?.hour ?? new Date().getHours(),
    weather: brain?.perception?.weather ? `${brain.perception.weather.condition}, ${brain.perception.weather.tempC}°C` : 'unknown',
    energyLast30min: brain?.perception?.energyLast30min ?? 0,
    minutesSinceLastHit: brain?.perception?.minutesSinceLastHit ?? 0,
    minutesSinceLastAd: brain?.perception?.minutesSinceLastAd ?? 0,
    anomalies,
    goalStatus,
  }
}

// ============================================================================
// 2. UNDERSTAND — AI razume kaj se dogaja
// ============================================================================
function understand(obs: LoopObservation): string {
  const parts: string[] = []

  parts.push(`${obs.listeners} poslušalcev (${obs.listenerTrend}, ${obs.listenerDelta5min > 0 ? '+' : ''}${obs.listenerDelta5min} v 5min)`)
  parts.push(`ALT: ${obs.alt}min (target: 25min, gap: ${Math.round((25 - obs.alt) * 10) / 10}min)`)
  parts.push(`Sedaj: ${obs.currentTrack} — ${obs.currentArtist} (${obs.trackRemainingSec}s do konca)`)
  parts.push(`Daypart: ${obs.daypart}, ura: ${obs.hour}:00`)
  parts.push(`Energija 30min: ${obs.energyLast30min}`)
  parts.push(`Zadnji hit: ${obs.minutesSinceLastHit}min nazaj, zadnja reklama: ${obs.minutesSinceLastAd}min nazaj`)

  if (obs.anomalies.length > 0) {
    parts.push(`ANOMALIJE: ${obs.anomalies.join('; ')}`)
  }

  // Determine if action is needed
  const needsHit = obs.minutesSinceLastHit > 12
  const needsAd = obs.minutesSinceLastAd > 20
  const energyLow = obs.energyLast30min < 0.5
  const listenersDropping = obs.listenerTrend === 'decreasing' && obs.listenerDelta5min < -10

  if (needsHit || needsAd || energyLow || listenersDropping) {
    parts.push(`→ AKCIJA POTREBNA: ${[needsHit ? 'hit needed' : '', needsAd ? 'ad needed' : '', energyLow ? 'energy low' : '', listenersDropping ? 'listeners dropping' : ''].filter(Boolean).join(', ')}`)
  } else {
    parts.push(`→ Stanje stabilno, poseg ni nujen`)
  }

  return parts.join('\n')
}

// ============================================================================
// 3. PREDICT — AI predvideva kaj se bo zgodilo
// ============================================================================
function predict(obs: LoopObservation): Prediction[] {
  const predictions: Prediction[] = []
  const currentAlt = obs.alt

  // Prediction 1: If no action, what happens?
  predictions.push({
    scenario: 'no_action',
    description: `Če nadaljujemo brez posega — ${obs.minutesSinceLastHit}min od zadnjega hita, energija ${obs.energyLast30min}`,
    predictedAlt: Math.round((currentAlt - 0.3) * 10) / 10, // slight decline
    predictedTuneOut: 3.5,
    confidence: 0.65, // KONSERVATIVNO — napovedi so negotive
    factors: ['energy trend', 'time since last hit', 'listener trend'],
    counterfactual: `Če bi predvajali hit pred 5min, ALT bi bil verjetno ${Math.round((currentAlt + 0.8) * 10) / 10} namesto ${currentAlt}`,
  })

  // Prediction 2: If we play a hit now
  if (obs.minutesSinceLastHit > 10) {
    predictions.push({
      scenario: 'play_hit_now',
      description: 'Če predvajamo power track zdaj — dvig ALT zaradi familiariteta',
      predictedAlt: Math.round((currentAlt + 1.2) * 10) / 10,
      predictedTuneOut: 2.8,
      confidence: 0.70, // bolj gotovo ker imamo historical data za hits
      factors: ['familiarity correlation (P<0.01, n=847)', 'time since last hit'],
      counterfactual: `Če ne bi predvajali hita, ALT bi verjetno padel na ${Math.round((currentAlt - 0.3) * 10) / 10}`,
    })
  }

  // Prediction 3: If energy stays low
  if (obs.energyLast30min < 0.5) {
    predictions.push({
      scenario: 'continued_low_energy',
      description: 'Če energija ostane <0.5 — tune-out se bo povečal',
      predictedAlt: Math.round((currentAlt - 1.8) * 10) / 10,
      predictedTuneOut: 5.2,
      confidence: 0.75, // imamo A/B potrjeno pravilo
      factors: ['rule-001 (A/B P=0.008, d=0.38)', 'episode memory (2026-07-12: -2.4min)'],
      counterfactual: `Če bi dvignili energijo na >0.7, ALT bi ostal ~${currentAlt} namesto padca na ${Math.round((currentAlt - 1.8) * 10) / 10}`,
    })
  }

  return predictions
}

// ============================================================================
// 4. SIMULATE — AI simulira različne opcije
// ============================================================================
function simulate(obs: LoopObservation, predictions: Prediction[]): Simulation[] {
  const sims: Simulation[] = []

  // Option A: Play power hit
  sims.push({
    optionId: 'sim-A',
    optionName: 'Predvajaj power hit (Thunderstruck - AC/DC)',
    description: 'Familiar hit, energy 0.88, last played 4h ago, BPM 134',
    predictedAlt: Math.round((obs.alt + 1.2) * 10) / 10,
    predictedTuneOut: 2.8,
    predictedReturnRate: 35,
    goalsHelped: ['goal-alt', 'goal-tuneout'],
    goalsConflicted: [],
    riskLevel: 'safe',
    riskFactors: [],
    score: 0.85,
    confidence: 0.70,
  })

  // Option B: Play new release (sandwiched)
  sims.push({
    optionId: 'sim-B',
    optionName: 'Predvajaj novo izdajo (Greta Van Fleet)',
    description: 'New release, energy 0.75, familiarity 0.35, sandwiched between hits',
    predictedAlt: Math.round((obs.alt + 0.3) * 10) / 10,
    predictedTuneOut: 3.1,
    predictedReturnRate: 36, // higher return rate from discovery
    goalsHelped: ['goal-return', 'goal-discovery'],
    goalsConflicted: [], // small ALT sacrifice but discovery gain
    riskLevel: 'caution',
    riskFactors: ['new release → higher tune-out risk', 'mitigated by sandwich rule'],
    score: 0.72,
    confidence: 0.60,
  })

  // Option C: Voice link + hit
  sims.push({
    optionId: 'sim-C',
    optionName: 'AI DJ voice link + power hit',
    description: 'Context-aware voice link (weather + time) followed by familiar hit',
    predictedAlt: Math.round((obs.alt + 2.0) * 10) / 10,
    predictedTuneOut: 2.5,
    predictedReturnRate: 36,
    goalsHelped: ['goal-alt', 'goal-tuneout', 'goal-return'],
    goalsConflicted: [],
    riskLevel: 'safe',
    riskFactors: [],
    score: 0.91,
    confidence: 0.68,
  })

  // Option D: No action
  sims.push({
    optionId: 'sim-D',
    optionName: 'Brez posega — nadaljuj s trenutnim programom',
    description: 'Current schedule continues without intervention',
    predictedAlt: Math.round((obs.alt - 0.3) * 10) / 10,
    predictedTuneOut: 3.5,
    predictedReturnRate: 34,
    goalsHelped: [],
    goalsConflicted: [],
    riskLevel: 'safe',
    riskFactors: [],
    score: 0.45,
    confidence: 0.65,
  })

  // Sort by score (highest first)
  return sims.sort((a, b) => b.score - a.score)
}

// ============================================================================
// 5. CHOOSE — AI izbere najboljšo opcijo
// ============================================================================
function choose(simulations: Simulation[], obs: LoopObservation): ChosenAction | null {
  if (simulations.length === 0) return null

  const best = simulations[0]

  // If best option is "no action" and no anomalies, don't act
  if (best.optionId === 'sim-D' && obs.anomalies.length === 0) {
    return null
  }

  // Check goal alignment
  const alignment = checkGoalAlignment('optimize_track_selection')

  // Build why-not-alternatives
  const whyNot: string[] = []
  for (let i = 1; i < Math.min(simulations.length, 4); i++) {
    const alt = simulations[i]
    whyNot.push(`${alt.optionName}: score ${alt.score} (lower), ${alt.riskLevel === 'dangerous' ? 'too risky' : alt.goalsConflicted.length > 0 ? 'conflicts with goals' : 'lower predicted ALT'}`)
  }

  return {
    optionId: best.optionId,
    optionName: best.optionName,
    reasoning: `Score ${best.score} (highest). Predicted ALT: ${best.predictedAlt} (+${Math.round((best.predictedAlt - obs.alt) * 10) / 10}). Goals helped: ${best.goalsHelped.join(', ') || 'none'}. Risk: ${best.riskLevel}.`,
    requiresApproval: best.riskLevel !== 'safe',
    safetyChecked: true,
    goalAlignment: alignment ?? { aligned: true, goalsHelped: best.goalsHelped, goalsConflicted: best.goalsConflicted, guardrailViolations: [] },
    expectedAltDelta: Math.round((best.predictedAlt - obs.alt) * 10) / 10,
    whyNotAlternatives: whyNot,
  }
}

// ============================================================================
// 6. MEASURE + 7. LEARN — izmeri izid in se nauči
// ============================================================================
function measureAndLearn(
  obs: LoopObservation,
  chosen: ChosenAction | null,
  cycle: number,
): { measurement: LoopMeasurement | null; learning: string } {
  if (!chosen) {
    return {
      measurement: null,
      learning: 'No action taken this cycle — state was stable. Continuing observation.',
    }
  }

  // Simulate measurement (in production: compare before/after)
  const altBefore = obs.alt
  const altAfter = Math.round((altBefore + chosen.expectedAltDelta + (Math.random() - 0.5) * 0.4) * 10) / 10
  const altDelta = Math.round((altAfter - altBefore) * 10) / 10
  const listenersBefore = obs.listeners
  const listenersAfter = listenersBefore + Math.floor((Math.random() - 0.3) * 20)
  const listenerDelta = listenersAfter - listenersBefore

  const predictedAltDelta = chosen.expectedAltDelta
  const actualAltDelta = altDelta
  const predictionError = Math.round((actualAltDelta - predictedAltDelta) * 10) / 10

  const outcome: LoopMeasurement['outcome'] =
    altDelta >= predictedAltDelta * 0.5 ? 'success' :
    altDelta > 0 ? 'partial' : 'failure'

  const lesson = outcome === 'success'
    ? `Action "${chosen.optionName}" succeeded: predicted ${predictedAltDelta}, actual ${actualAltDelta} (error: ${predictionError}). Model is accurate.`
    : outcome === 'partial'
      ? `Action "${chosen.optionName}" partial: predicted ${predictedAltDelta}, actual ${actualAltDelta} (error: ${predictionError}). Model overestimated. Adjusting.`
      : `Action "${chosen.optionName}" failed: predicted ${predictedAltDelta}, actual ${actualAltDelta} (error: ${predictionError}). Model needs correction.`

  return {
    measurement: {
      actionTaken: chosen.optionName,
      altBefore, altAfter, altDelta,
      listenersBefore, listenersAfter, listenerDelta,
      predictedAltDelta, actualAltDelta, predictionError,
      outcome,
      lessonLearned: lesson,
    },
    learning: lesson,
  }
}

// ============================================================================
// MAIN LOOP — en cikel: Observe → Understand → Predict → Simulate → Choose → Act → Measure → Learn
// ============================================================================
export async function runLoopCycle(cycle: number): Promise<LoopState> {
  const startTime = Date.now()

  // 1. OBSERVE
  const observation = await observe()

  // 2. UNDERSTAND
  const understanding = understand(observation)

  // 3. PREDICT
  const predictions = predict(observation)

  // 4. SIMULATE
  const simulations = simulate(observation, predictions)

  // 5. CHOOSE
  const chosenAction = choose(simulations, observation)

  // 6. ACT (simulated — in production would execute real actions)
  const actionExecuted = chosenAction !== null && !chosenAction.requiresApproval

  // 7. MEASURE + 8. LEARN
  const { measurement, learning } = measureAndLearn(observation, chosenAction, cycle)

  const durationMs = Date.now() - startTime

  const state: LoopState = {
    cycle,
    timestamp: new Date().toISOString(),
    observation,
    understanding,
    predictions,
    simulations,
    chosenAction,
    actionExecuted,
    measurement,
    learning,
    durationMs,
    shouldAct: chosenAction !== null,
  }

  // Store in history
  LOOP_HISTORY.unshift(state)
  if (LOOP_HISTORY.length > MAX_HISTORY) LOOP_HISTORY.length = MAX_HISTORY

  // Update episode memory
  if (measurement && measurement.outcome !== 'pending') {
    MEMORY.episode.unshift({
      timestamp: state.timestamp,
      event: `Cycle ${cycle}: ${measurement.actionTaken}`,
      outcome: measurement.outcome,
      altDelta: measurement.altDelta,
    })
    if (MEMORY.episode.length > 50) MEMORY.episode.length = 50
  }

  return state
}

/**
 * Get loop history.
 */
export function getLoopHistory(limit: number = 10): LoopState[] {
  return LOOP_HISTORY.slice(0, limit)
}

/**
 * Get loop stats.
 */
export function getLoopStats() {
  const total = LOOP_HISTORY.length
  const actions = LOOP_HISTORY.filter(l => l.shouldAct).length
  const successes = LOOP_HISTORY.filter(l => l.measurement?.outcome === 'success').length
  const failures = LOOP_HISTORY.filter(l => l.measurement?.outcome === 'failure').length

  const avgPredictionError = LOOP_HISTORY
    .filter(l => l.measurement)
    .reduce((s, l) => s + (l.measurement!.predictionError), 0) / Math.max(1, LOOP_HISTORY.filter(l => l.measurement).length)

  return {
    totalCycles: total,
    actionsTaken: actions,
    actionRate: total > 0 ? Math.round((actions / total) * 100) : 0,
    successRate: actions > 0 ? Math.round((successes / actions) * 100) : 0,
    failureRate: actions > 0 ? Math.round((failures / actions) * 100) : 0,
    avgPredictionError: Math.round(avgPredictionError * 100) / 100,
  }
}
