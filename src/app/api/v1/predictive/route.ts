import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Predictive Analytics — listener churn prediction + trend forecasting.
 *
 * ML-based predictions:
 *   - Listener churn risk (high/medium/low) per listener
 *   - Daily/hourly listener count forecast (next 7 days)
 *   - Track skip probability (which tracks will be skipped)
 *   - Revenue forecast (ad inventory fill rate prediction)
 *
 * GET /api/v1/predictive — predictions + model accuracy + feature importance
 */

interface ChurnPrediction {
  listenerId: string
  listenerName: string
  tier: string
  churnRisk: 'high' | 'medium' | 'low'
  churnProbability: number // 0-1
  topRiskFactors: { factor: string; weight: number }[]
  recommendedAction: string
}

interface ListenerForecast {
  date: string
  predictedListeners: number
  confidenceLow: number
  confidenceHigh: number
  confidence: number // 0-1
}

interface TrackSkipPrediction {
  trackId: string
  title: string
  artist: string
  skipProbability: number
  predictedSkipRate: number
  reason: string
}

const CHURN_PREDICTIONS: ChurnPrediction[] = [
  { listenerId: 'lst-005', listenerName: 'NewListener', tier: 'Bronze', churnRisk: 'high', churnProbability: 0.72, topRiskFactors: [{ factor: 'Low session duration (avg 8min)', weight: 0.35 }, { factor: 'No requests submitted', weight: 0.25 }, { factor: 'Single device (mobile only)', weight: 0.20 }], recommendedAction: 'Send welcome email with station highlights + contest entry' },
  { listenerId: 'lst-004', listenerName: 'RockRadioFan', tier: 'Silver', churnRisk: 'medium', churnProbability: 0.41, topRiskFactors: [{ factor: 'Declining session length (-15% vs 30d)', weight: 0.30 }, { factor: 'No UGC submissions', weight: 0.22 }], recommendedAction: 'Notify about loyalty rewards + offer song pick' },
  { listenerId: 'lst-003', listenerName: 'JaneDoe', tier: 'Gold', churnRisk: 'low', churnProbability: 0.12, topRiskFactors: [{ factor: 'Stable listening pattern', weight: 0.15 }], recommendedAction: 'Continue engagement — no action needed' },
  { listenerId: 'lst-001', listenerName: 'RockFan_42', tier: 'Diamond', churnRisk: 'low', churnProbability: 0.03, topRiskFactors: [{ factor: 'P1 core listener — 142 day streak', weight: 0.02 }], recommendedAction: 'VIP — invite to studio tour' },
]

const LISTENER_FORECAST: ListenerForecast[] = []
const now = new Date()
for (let i = 0; i < 7; i++) {
  const date = new Date(now.getTime() + i * 86400000)
  const predicted = 1450 + Math.sin(i / 2) * 200 + (Math.random() - 0.5) * 100
  LISTENER_FORECAST.push({
    date: date.toISOString().slice(0, 10),
    predictedListeners: Math.round(predicted),
    confidenceLow: Math.round(predicted - 150),
    confidenceHigh: Math.round(predicted + 150),
    confidence: 0.85 - i * 0.03, // confidence decreases over time
  })
}

const TRACK_SKIP_PREDICTIONS: TrackSkipPrediction[] = [
  { trackId: 'trk-004', title: 'Black Hole Sun', artist: 'Soundgarden', skipProbability: 0.18, predictedSkipRate: 3.8, reason: 'Slow tempo + long intro → high skip on mobile' },
  { trackId: 'trk-005', title: 'Hotel California', artist: 'Eagles', skipProbability: 0.08, predictedSkipRate: 0.5, reason: 'Classic — low skip despite length' },
  { trackId: 'trk-015', title: 'Killing in the Name', artist: 'Rage Against the Machine', skipProbability: 0.22, predictedSkipRate: 5.2, reason: 'Explicit lyrics → higher skip during daytime' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    _disclaimer: '⚠️ SIMULATION — Predictions are illustrative. Real 87% accuracy requires actual ML training on real listener session data (2.4M+ sessions) with proper train/test split + cross-validation. XGBoost model must be trained + deployed as a service. Feature engineering + data pipeline are the real work, not the API.',
    churnPredictions: CHURN_PREDICTIONS,
    listenerForecast: LISTENER_FORECAST,
    trackSkipPredictions: TRACK_SKIP_PREDICTIONS,
    modelInfo: {
      algorithm: 'Gradient Boosted Trees (XGBoost)',
      trainingData: '2.4M listener sessions',
      accuracy: 0.87, // 87% accuracy on test set
      precision: 0.84,
      recall: 0.79,
      f1Score: 0.81,
      lastTrainedAt: new Date(Date.now() - 86400000).toISOString(),
      features: 47,
      topFeatures: [
        { feature: 'avg_session_duration', importance: 0.18 },
        { feature: 'days_since_last_listen', importance: 0.15 },
        { feature: 'request_count_30d', importance: 0.12 },
        { feature: 'device_diversity', importance: 0.09 },
        { feature: 'time_of_day_pattern', importance: 0.08 },
        { feature: 'genre_preference_match', importance: 0.07 },
      ],
    },
    revenueForecast: {
      next7dProjected: 18420,
      next30dProjected: 78600,
      fillRateForecast: 78.4,
      confidence: 0.82,
    },
    stats: {
      highRiskListeners: CHURN_PREDICTIONS.filter((c) => c.churnRisk === 'high').length,
      mediumRisk: CHURN_PREDICTIONS.filter((c) => c.churnRisk === 'medium').length,
      lowRisk: CHURN_PREDICTIONS.filter((c) => c.churnRisk === 'low').length,
      avgForecastAccuracy: 0.85,
    },
  })
}
