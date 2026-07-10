import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Webhook Registry — enumerates every emittable event type with example payloads
 * and the signing algorithm. Consumers use this to self-service-subscribe via the UI.
 *
 * Signature: RFC 2104 HMAC-SHA256 of raw request body, hex-encoded, sent in
 * the `X-Rock887-Signature: sha256=<hex>` header.
 */

interface EventCatalogEntry {
  type: string
  category: 'track' | 'schedule' | 'system' | 'ai' | 'webhook' | 'security' | 'listener' | 'incident' | 'rds' | 'snmp' | 'gpio'
  description: string
  examplePayload: Record<string, unknown>
  retention: 'persistent' | 'transient'
  fansOutTo: string[] // which AI modules consume this
}

const CATALOG: EventCatalogEntry[] = [
  {
    type: 'track.started',
    category: 'track',
    description: 'Fired when a new track begins playback on-air.',
    examplePayload: { type: 'track.started', trackId: 'trk-001', title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', durationMs: 252000, stationId: 'main-fm', timestamp: '2026-07-10T11:30:00.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-social', 'ai-metadata', 'ai-dj-assistant', 'ai-producer'],
  },
  {
    type: 'track.finished',
    category: 'track',
    description: 'Fired when a track finishes playback.',
    examplePayload: { type: 'track.finished', trackId: 'trk-001', title: 'Seven Nation Army', artist: 'The White Stripes', playedMs: 252000, skipCount: 0, stationId: 'main-fm', timestamp: '2026-07-10T11:34:12.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-dj', 'ai-music-director', 'ai-quality-control'],
  },
  {
    type: 'schedule.hourly',
    category: 'schedule',
    description: 'Fired at the top of every hour by the scheduler daemon.',
    examplePayload: { type: 'schedule.hourly', hour: 14, daypart: 'afternoon-drive', showId: 'show-003', timestamp: '2026-07-10T14:00:00.000Z' },
    retention: 'transient',
    fansOutTo: ['ai-news', 'ai-scheduler'],
  },
  {
    type: 'rds.updated',
    category: 'rds',
    description: 'Fired when the RDS encoder updates PI/PS/PTY/RT fields.',
    examplePayload: { type: 'rds.updated', field: 'RT', value: 'Seven Nation Army - The White Stripes', stationId: 'main-fm', timestamp: '2026-07-10T11:30:01.000Z' },
    retention: 'transient',
    fansOutTo: [],
  },
  {
    type: 'snmp.warning',
    category: 'snmp',
    description: 'Fired when an SNMP-polled device crosses a warning threshold.',
    examplePayload: { type: 'snmp.warning', device: 'FM Transmitter', oid: '1.3.6.1.4.1.7483.1.1.1.5.0', value: 47, threshold: 50, unit: 'celsius', timestamp: '2026-07-10T11:25:00.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-failure-detection'],
  },
  {
    type: 'gpio.changed',
    category: 'gpio',
    description: 'Fired when a GPIO line changes state (on/off).',
    examplePayload: { type: 'gpio.changed', line: 'automation-bypass', state: 'on', source: 'silence-detector', timestamp: '2026-07-10T11:31:05.000Z' },
    retention: 'persistent',
    fansOutTo: [],
  },
  {
    type: 'listener.request',
    category: 'listener',
    description: 'Fired when a listener submits a song request.',
    examplePayload: { type: 'listener.request', requestId: 'req-042', listenerId: 'lst-789', trackId: 'trk-123', title: 'Everlong', artist: 'Foo Fighters', timestamp: '2026-07-10T11:28:30.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-music-director'],
  },
  {
    type: 'incident.warning',
    category: 'incident',
    description: 'Fired when an incident is raised with warning severity.',
    examplePayload: { type: 'incident.warning', incidentId: 'inc-007', source: 'FM Transmitter', title: 'Temperature Trending Up', severity: 'medium', correlationId: 'corr-tx-temp-001', timestamp: '2026-07-10T11:25:00.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-failure-detection', 'ai-copilot'],
  },
  {
    type: 'incident.critical',
    category: 'incident',
    description: 'Fired when an incident is raised with critical severity (dead air, signal loss, etc.).',
    examplePayload: { type: 'incident.critical', incidentId: 'inc-012', source: 'Silence Detector', title: 'Dead Air Detected', severity: 'critical', correlationId: 'corr-silence-001', autoFailover: true, timestamp: '2026-07-10T11:31:05.000Z' },
    retention: 'persistent',
    fansOutTo: ['ai-failure-detection', 'ai-copilot', 'ai-dj'],
  },
  {
    type: 'ai.run.started',
    category: 'ai',
    description: 'Fired when an AI module begins processing an event.',
    examplePayload: { type: 'ai.run.started', moduleId: 'ai-social', moduleName: 'AI Social', triggerEvent: 'track.started', correlationId: 'corr-soc-001', timestamp: '2026-07-10T11:30:00.500Z' },
    retention: 'transient',
    fansOutTo: [],
  },
  {
    type: 'ai.run.completed',
    category: 'ai',
    description: 'Fired when an AI module finishes processing.',
    examplePayload: { type: 'ai.run.completed', moduleId: 'ai-social', moduleName: 'AI Social', durationMs: 1240, tokensUsed: 285, costUsd: 0.0009, success: true, correlationId: 'corr-soc-001', timestamp: '2026-07-10T11:30:01.740Z' },
    retention: 'persistent',
    fansOutTo: ['ai-cost-optimizer'],
  },
  {
    type: 'webhook.delivered',
    category: 'webhook',
    description: 'Fired when a webhook delivery succeeds.',
    examplePayload: { type: 'webhook.delivered', webhookId: 1, webhookName: 'Discord #now-playing', statusCode: 204, durationMs: 312, timestamp: '2026-07-10T11:30:02.100Z' },
    retention: 'transient',
    fansOutTo: [],
  },
  {
    type: 'webhook.failed',
    category: 'webhook',
    description: 'Fired when a webhook delivery fails (after retries).',
    examplePayload: { type: 'webhook.failed', webhookId: 1, webhookName: 'Discord #now-playing', statusCode: 429, error: 'Rate limited', attempt: 3, dlq: true, timestamp: '2026-07-10T11:30:08.500Z' },
    retention: 'persistent',
    fansOutTo: ['ai-failure-detection'],
  },
  {
    type: 'security.csp-violation',
    category: 'security',
    description: 'Fired when the browser reports a Content-Security-Policy violation.',
    examplePayload: { type: 'security.csp-violation', violatedDirective: 'script-src', blockedURI: 'https://evil.example.com/x.js', documentURI: 'http://localhost:3000/', timestamp: '2026-07-10T11:29:00.000Z' },
    retention: 'persistent',
    fansOutTo: [],
  },
  {
    type: 'system.health',
    category: 'system',
    description: 'Fired every 60s with aggregated system health metrics.',
    examplePayload: { type: 'system.health', uptime: 86400, cpuPercent: 12, memoryPercent: 45, diskFreePercent: 78, icecastListeners: 1492, eventBusDepth: 4, timestamp: '2026-07-10T11:30:00.000Z' },
    retention: 'transient',
    fansOutTo: [],
  },
]

const SIGNING = {
  algorithm: 'HMAC-SHA256',
  spec: 'RFC 2104',
  headerName: 'X-Rock887-Signature',
  headerFormat: 'sha256=<hex>',
  description:
    'Compute HMAC-SHA256 of the raw request body (bytes, not parsed JSON) using the webhook secret as the key. ' +
    'Send the hex-encoded digest in the X-Rock887-Signature header prefixed with "sha256=". ' +
    'Always compare digests using a constant-time comparison to prevent timing attacks.',
  verificationTypescript: `import crypto from 'crypto'

function verifySignature(rawBody: Buffer, header: string | undefined, secret: string): boolean {
  if (!header || !header.startsWith('sha256=')) return false
  const expected = header.slice(7)
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // Constant-time comparison
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(digest, 'hex'))
}

// Express example
// app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
//   if (!verifySignature(req.body, req.headers['x-rock887-signature'], SECRET)) {
//     return res.status(401).send('invalid signature')
//   }
//   const event = JSON.parse(req.body.toString())
//   // ... handle event
//   res.status(204).end()
// })`,
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const byCategory = CATALOG.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    count: CATALOG.length,
    byCategory,
    signing: SIGNING,
    events: CATALOG,
    note: 'Subscribe to specific event types via POST /api/v1/webhooks with the events field set to a comma-separated list (or "*" for all).',
  })
}
