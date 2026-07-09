import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface IncidentEvent {
  id: string
  timestamp: string
  type: 'alert' | 'warning' | 'info' | 'recovery' | 'ai_action' | 'human_action'
  category: 'snmp' | 'gpio' | 'rds' | 'stream' | 'daemon' | 'ai' | 'webhook' | 'security' | 'system'
  source: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  acknowledged: boolean
  resolvedAt: string | null
  correlationId?: string
  aiAnalysis?: string
}

// Mock incidents — in production, these would come from EventStore + AI analysis
const mockIncidents: IncidentEvent[] = [
  { id: 'inc-001', timestamp: new Date(Date.now() - 1800000).toISOString(), type: 'alert', category: 'snmp', source: 'DAB+ Multiplexer', title: 'DAB+ Error Rate Spike', description: 'Error rate increased from 0.001% to 0.003% on DAB+ mux', severity: 'medium', acknowledged: true, resolvedAt: new Date(Date.now() - 1740000).toISOString(), correlationId: 'corr-dab-001' },
  { id: 'inc-002', timestamp: new Date(Date.now() - 1740000).toISOString(), type: 'ai_action', category: 'ai', source: 'AI Failure Detection', title: 'AI Detected DAB+ Anomaly', description: 'AI Failure Detection module identified error rate spike on DAB+ multiplexer. Analyzing correlation with other systems.', severity: 'medium', acknowledged: true, resolvedAt: null, correlationId: 'corr-dab-001', aiAnalysis: 'DAB+ error rate spike correlates with scheduled maintenance window on encoder firmware update. Non-critical — backup encoder active.' },
  { id: 'inc-003', timestamp: new Date(Date.now() - 1500000).toISOString(), type: 'alert', category: 'daemon', source: 'rdrepld', title: 'rdrepld Daemon Stopped', description: 'Replication daemon stopped unexpectedly. Non-critical — replication is not required for on-air operations.', severity: 'low', acknowledged: true, resolvedAt: null, correlationId: 'corr-repl-001' },
  { id: 'inc-004', timestamp: new Date(Date.now() - 900000).toISOString(), type: 'warning', category: 'webhook', source: 'Discord Webhook', title: 'Webhook Rate Limit', description: 'Discord webhook hit rate limit (2/3 retries used). Auto-retry scheduled with exponential backoff.', severity: 'low', acknowledged: false, resolvedAt: new Date(Date.now() - 600000).toISOString(), correlationId: 'corr-webhook-001' },
  { id: 'inc-005', timestamp: new Date(Date.now() - 600000).toISOString(), type: 'recovery', category: 'webhook', source: 'Webhook System', title: 'Discord Webhook Recovered', description: 'Discord webhook delivery resumed successfully after rate limit cooldown.', severity: 'low', acknowledged: true, resolvedAt: new Date(Date.now() - 600000).toISOString(), correlationId: 'corr-webhook-001' },
  { id: 'inc-006', timestamp: new Date(Date.now() - 300000).toISOString(), type: 'info', category: 'ai', source: 'AI Music Director', title: 'Weekly Rotation Analysis Complete', description: 'AI Music Director analyzed 30 tracks, 4 recommendations generated. Skip rate: 2.3%, completion rate: 94.1%.', severity: 'low', acknowledged: false, resolvedAt: null, correlationId: 'corr-md-001' },
  { id: 'inc-007', timestamp: new Date(Date.now() - 120000).toISOString(), type: 'warning', category: 'snmp', source: 'FM Transmitter', title: 'Temperature Trending Up', description: 'FM transmitter temperature increased from 42°C to 47°C over 2 hours. Threshold: 50°C.', severity: 'medium', acknowledged: false, resolvedAt: null, correlationId: 'corr-tx-temp-001', aiAnalysis: 'Temperature rise correlates with ambient studio temperature increase (afternoon sun). No action required — cooling system operating within parameters. Predicted stabilization at 48°C.' },
  { id: 'inc-008', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'info', category: 'system', source: 'Event Bus', title: 'Event Store Milestone', description: 'Event Store reached 2 persisted events. All systems operational.', severity: 'low', acknowledged: true, resolvedAt: null, correlationId: 'corr-es-001' },
]

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 120))
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const severity = searchParams.get('severity')
  const unresolved = searchParams.get('unresolved') === 'true'

  let incidents = [...mockIncidents]

  if (category) incidents = incidents.filter((i) => i.category === category)
  if (severity) incidents = incidents.filter((i) => i.severity === severity)
  if (unresolved) incidents = incidents.filter((i) => !i.resolvedAt)

  // Sort by timestamp descending
  incidents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate stats
  const stats = {
    total: incidents.length,
    critical: incidents.filter((i) => i.severity === 'critical').length,
    high: incidents.filter((i) => i.severity === 'high').length,
    medium: incidents.filter((i) => i.severity === 'medium').length,
    low: incidents.filter((i) => i.severity === 'low').length,
    unresolved: incidents.filter((i) => !i.resolvedAt).length,
    acknowledged: incidents.filter((i) => i.acknowledged).length,
    withAiAnalysis: incidents.filter((i) => i.aiAnalysis).length,
  }

  return NextResponse.json({ count: incidents.length, stats, incidents })
}

// POST — acknowledge or resolve incident
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  try {
    await db.auditLog.create({
      data: {
        action: body.action ?? 'acknowledge',
        entity: 'incident',
        entityId: body.incidentId ?? 'unknown',
        details: JSON.stringify({ ...body }),
      },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Silent fail for mock
  }
}
