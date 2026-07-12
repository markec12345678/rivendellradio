import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Feature Store — consistent ML features med training in serving.
 *
 * Problem: AI moduli (Music Director, Scheduler, Churn Prediction) potrebujejo
 * feature-je (BPM, energy, play_count_30d, listener_delta_avg, etc.).
 * Brez feature store-a vsak modul računa feature-je drugače → inconsistent.
 *
 * Feast (Feature Store) pattern:
 *   - Feature views (skupine feature-jev za entiteto)
 *   - Online store (Redis —低latency serving, <1ms)
 *   - Offline store (ClickHouse/S3 — training, point-in-time joins)
 *   - Materialization (periodično kopira offline → online)
 *
 * GET /api/v1/feature-store         — feature views + features + materialization
 * POST /api/v1/feature-store         — get online features, materialize
 */

interface FeatureView {
  name: string
  description: string
  entity: string
  ttl: string
  features: { name: string; dtype: string; description: string }[]
  source: 'warehouse' | 'realtime' | 'external'
  onlineStore: 'redis' | 'dynamodb' | 'memory'
  materializationSchedule: string
  lastMaterializedAt: string
  rowCount: number
}

const FEATURE_VIEWS: FeatureView[] = [
  {
    name: 'track_features',
    description: 'Audio + metadata features for each track (powers AI Music Director, AI Scheduler)',
    entity: 'track_id',
    ttl: '7d',
    features: [
      { name: 'bpm', dtype: 'float32', description: 'Beats per minute (chromaprint/librosa)' },
      { name: 'key', dtype: 'string', description: 'Camelot key (1A-12B)' },
      { name: 'energy', dtype: 'float32', description: '0-1 perceived energy' },
      { name: 'danceability', dtype: 'float32', description: '0-1 danceability score' },
      { name: 'valence', dtype: 'float32', description: '0-1 happiness/positivity' },
      { name: 'acousticness', dtype: 'float32', description: '0-1 acoustic vs electronic' },
      { name: 'instrumentalness', dtype: 'float32', description: '0-1 no vocals probability' },
      { name: 'liveness', dtype: 'float32', description: '0-1 live audience probability' },
      { name: 'speechiness', dtype: 'float32', description: '0-1 spoken word content' },
      { name: 'loudness_lufs', dtype: 'float32', description: 'Integrated LUFS (EBU R128)' },
      { name: 'intro_ms', dtype: 'uint32', description: 'Intro duration (auto-detected)' },
      { name: 'outro_ms', dtype: 'uint32', description: 'Outro duration (auto-detected)' },
      { name: 'play_count_7d', dtype: 'uint32', description: 'Plays in last 7 days' },
      { name: 'play_count_30d', dtype: 'uint32', description: 'Plays in last 30 days' },
      { name: 'avg_completion_rate', dtype: 'float32', description: '0-1 avg completion' },
      { name: 'avg_listener_delta', dtype: 'float32', description: 'Avg net listener change' },
      { name: 'rolling_score', dtype: 'float32', description: 'AI Music Director rolling score (0-1)' },
      { name: 'skip_probability', dtype: 'float32', description: 'ML-predicted skip probability' },
      { name: 'last_played_ms', dtype: 'uint64', description: 'Timestamp of last play (epoch ms)' },
    ],
    source: 'warehouse',
    onlineStore: 'redis',
    materializationSchedule: '*/15 * * * *', // every 15 min
    lastMaterializedAt: new Date(Date.now() - 600000).toISOString(),
    rowCount: 15000,
  },
  {
    name: 'listener_features',
    description: 'Per-listener behavioral features (powers Churn Prediction, Loyalty, P1 identification)',
    entity: 'listener_id',
    ttl: '24h',
    features: [
      { name: 'total_listen_min', dtype: 'uint32', description: 'Total listening minutes' },
      { name: 'sessions_30d', dtype: 'uint32', description: 'Sessions in last 30 days' },
      { name: 'avg_session_min', dtype: 'float32', description: 'Average session length' },
      { name: 'consecutive_days', dtype: 'uint16', description: 'Current daily streak' },
      { name: 'requests_fulfilled', dtype: 'uint32', description: 'Fulfilled requests count' },
      { name: 'shares_count', dtype: 'uint32', description: 'Social shares' },
      { name: 'tier', dtype: 'string', description: 'Bronze/Silver/Gold/Platinum/Diamond' },
      { name: 'churn_probability', dtype: 'float32', description: 'XGBoost churn prediction (0-1)' },
      { name: 'p1_score', dtype: 'float32', description: 'P1 core listener score (0-1)' },
      { name: 'preferred_daypart', dtype: 'string', description: 'Most active daypart' },
      { name: 'preferred_device', dtype: 'string', description: 'Most used device' },
      { name: 'last_seen_ms', dtype: 'uint64', description: 'Last seen timestamp' },
    ],
    source: 'warehouse',
    onlineStore: 'redis',
    materializationSchedule: '0 * * * *', // hourly
    lastMaterializedAt: new Date(Date.now() - 1800000).toISOString(),
    rowCount: 8472,
  },
  {
    name: 'show_features',
    description: 'Per-show performance features (powers AI Program Director)',
    entity: 'show_id',
    ttl: '24h',
    features: [
      { name: 'avg_listeners', dtype: 'float32', description: 'Average listeners during show' },
      { name: 'peak_listeners', dtype: 'uint32', description: 'Peak listeners' },
      { name: 'avg_ats_min', dtype: 'float32', description: 'Average Time Spent (minutes)' },
      { name: 'completion_rate', dtype: 'float32', description: '0-1 listeners who stayed full show' },
      { name: 'track_skip_rate', dtype: 'float32', description: '0-1 track skip rate during show' },
      { name: 'engagement_score', dtype: 'float32', description: '0-1 requests+shares+votes per listener' },
      { name: 'revenue_per_show', dtype: 'float32', description: 'USD ad revenue attributed' },
    ],
    source: 'warehouse',
    onlineStore: 'redis',
    materializationSchedule: '0 * * * *',
    lastMaterializedAt: new Date(Date.now() - 1800000).toISOString(),
    rowCount: 5,
  },
  {
    name: 'realtime_features',
    description: 'Real-time context features (updated every minute, powers AI Program Director)',
    entity: 'station_id',
    ttl: '5m',
    features: [
      { name: 'current_listeners', dtype: 'uint32', description: 'Live listener count' },
      { name: 'listeners_5min_ago', dtype: 'uint32', description: 'Listener count 5min ago' },
      { name: 'listener_trend', dtype: 'string', description: 'increasing/stable/decreasing' },
      { name: 'energy_last_30min', dtype: 'float32', description: 'Avg track energy in last 30min' },
      { name: 'min_since_last_hit', dtype: 'uint16', description: 'Minutes since last power track' },
      { name: 'min_since_last_ad', dtype: 'uint16', description: 'Minutes since last ad break' },
      { name: 'current_daypart', dtype: 'string', description: 'morning-drive/midday/etc.' },
      { name: 'weather_temp_c', dtype: 'float32', description: 'Current temperature' },
      { name: 'weather_condition', dtype: 'string', description: 'sunny/cloudy/rainy/snow' },
      { name: 'is_holiday', dtype: 'bool', description: 'National holiday today' },
      { name: 'is_sports_event', dtype: 'bool', description: 'Major sports event happening' },
      { name: 'traffic_level', dtype: 'string', description: 'low/medium/high (rush hour)' },
    ],
    source: 'realtime',
    onlineStore: 'memory',
    materializationSchedule: '*/1 * * * *', // every minute
    lastMaterializedAt: new Date().toISOString(),
    rowCount: 1,
  },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const totalFeatures = FEATURE_VIEWS.reduce((s, fv) => s + fv.features.length, 0)

  return NextResponse.json({
    _disclaimer: '🧩 ARCHITECTURE/SCHEMA — Feast-style feature store schema. Real implementation requires: (1) Redis for online store, (2) ClickHouse for offline store, (3) Feast SDK (Python) for materialization. Feature definitions are production-ready; values are illustrative.',
    framework: 'Feast (Feature Store) — https://feast.dev',
    version: '0.40.0',
    featureViews: FEATURE_VIEWS,
    stats: {
      totalViews: FEATURE_VIEWS.length,
      totalFeatures,
      totalRows: FEATURE_VIEWS.reduce((s, fv) => s + fv.rowCount, 0),
      realtimeViews: FEATURE_VIEWS.filter((fv) => fv.source === 'realtime').length,
      lastMaterialization: FEATURE_VIEWS.reduce((latest, fv) => {
        return fv.lastMaterializedAt > latest ? fv.lastMaterializedAt : latest
      }, ''),
    },
    architecture: {
      offlineStore: 'ClickHouse (warehouse tables) — point-in-time joins za training',
      onlineStore: 'Redis — sub-millisecond feature retrieval za serving',
      materialization: 'Cron job (Feast materialize) — kopira offline → online',
      consistency: 'Feature definitions shared med training (Python notebook) in serving (API)',
      pointInTime: 'Feast ensures no data leakage — features at time T only use data before T',
    },
    usage: {
      training: `# Python (offline, training)
from feast import FeatureStore
store = FeatureStore(repo_path='.')
features = store.get_historical_features(
    entity_df=listener_sessions_df,
    features=['track_features:bpm', 'track_features:energy', 'track_features:rolling_score']
)`,
      serving: `// TypeScript (online, serving)
const features = await fetch('/api/v1/feature-store', {
  method: 'POST',
  body: JSON.stringify({
    action: 'get-online',
    entity: 'track_id',
    ids: ['trk-001', 'trk-002'],
    features: ['bpm', 'energy', 'rolling_score']
  })
})
// Returns: [{track_id:'trk-001', bpm:124, energy:0.89, ...}]`,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'get-online' && body.entity && body.ids && body.features) {
    // In production: query Redis
    const results = (body.ids as string[]).map((id) => {
      const result: any = { [body.entity]: id }
      for (const f of body.features) {
        result[f] = Math.random() // placeholder
      }
      return result
    })
    return NextResponse.json({ ok: true, results, source: 'online-store' })
  }

  if (body.action === 'materialize' && body.view) {
    return NextResponse.json({
      ok: true,
      view: body.view,
      materializedAt: new Date().toISOString(),
      rowsCopied: Math.floor(Math.random() * 1000 + 100),
      message: `Materialized ${body.view} from offline → online store`,
    })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
