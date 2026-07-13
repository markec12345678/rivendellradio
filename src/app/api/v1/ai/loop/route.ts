import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AI Operating Loop API — neprestani cikel delovanja postaje.
 *
 * Observe → Understand → Predict → Simulate → Choose → Act → Measure → Learn → Repeat
 *
 * AI ne čaka na vprašanje. Opazuje. Razmišlja. Odloča. Se uči.
 *
 * GET  /api/v1/ai/loop         — loop history + stats + current state
 * POST /api/v1/ai/loop         — run one cycle manually (production: runs every 30s automatically)
 */

export async function GET() {
  const { getLoopHistory, getLoopStats } = await import('@/lib/ai-core/operating-loop')

  const history = getLoopHistory(10)
  const stats = getLoopStats()

  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — loop runs manually via POST. In production: runs every 30s automatically via cron/setInterval. Observations use real tool data. Predictions and simulations are model-based (confidence is conservative: 0.60-0.75, not 0.99). Measurements simulate before/after (production: real before/after comparison).',
    architecture: {
      flow: 'Observe → Understand → Predict → Simulate → Choose → Act → Measure → Learn → Repeat',
      frequency: 'Every 30 seconds (production) | Manual (current)',
      principle: 'AI does not wait for questions. It observes, predicts, simulates options, chooses the best, acts, measures the outcome, and learns. This is a proactive digital program director, not a reactive chatbot.',
    },
    stats,
    history,
    counterfactualExample: {
      question: 'Kaj bi se zgodilo če bi predvajali drugo skladbo?',
      counterfactual: 'Če bi predvajali hit pred 5min, ALT bi bil verjetno 20.1 namesto 18.9. Razlika: +1.2min (correlation, not causation).',
    },
    simulatorExample: {
      optionA: { name: 'Power hit (Thunderstruck)', predictedAlt: 20.1, score: 0.85 },
      optionB: { name: 'New release (sandwiched)', predictedAlt: 19.2, score: 0.72 },
      optionC: { name: 'Voice link + hit', predictedAlt: 20.9, score: 0.91 },
      optionD: { name: 'No action', predictedAlt: 18.6, score: 0.45 },
      chosen: 'Option C (highest score 0.91, predicted ALT +2.0)',
    },
    confidencePhilosophy: 'Confidence is conservative: 0.60-0.75 for predictions (not 0.99). 0.99 reserved for directly verified facts (current track, system status). Behavioral predictions are inherently uncertain — we acknowledge this.',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const cycles = body.cycles ?? 1

  const { runLoopCycle, getLoopStats } = await import('@/lib/ai-core/operating-loop')

  const results: any[] = []
  for (let i = 0; i < Math.min(cycles, 5); i++) {
    const cycle = await runLoopCycle(Date.now() + i)
    results.push({
      cycle: cycle.cycle,
      timestamp: cycle.timestamp,
      shouldAct: cycle.shouldAct,
      action: cycle.chosenAction?.optionName ?? 'no action',
      understanding: cycle.understanding.slice(0, 200),
      predictions: cycle.predictions.length,
      simulations: cycle.simulations.length,
      chosenScore: cycle.chosenAction ? cycle.simulations[0]?.score : null,
      measurement: cycle.measurement ? {
        altDelta: cycle.measurement.altDelta,
        predictionError: cycle.measurement.predictionError,
        outcome: cycle.measurement.outcome,
      } : null,
      learning: cycle.learning.slice(0, 200),
      durationMs: cycle.durationMs,
    })
  }

  const stats = getLoopStats()

  return NextResponse.json({
    ok: true,
    cyclesRun: results.length,
    results,
    stats,
    message: `🧠 Operating Loop ran ${results.length} cycle(s). ${results.filter(r => r.shouldAct).length} action(s) taken. Stats: ${stats.successRate}% success rate, avg prediction error: ${stats.avgPredictionError}.`,
  })
}
