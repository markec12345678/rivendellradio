import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

interface ReplayEvent {
  id: string
  timestamp: string
  category: 'track' | 'rds' | 'gpio' | 'snmp' | 'ai' | 'webhook' | 'incident' | 'playlist' | 'listener' | 'system'
  type: string
  title: string
  description: string
  source: string
  severity: 'info' | 'warning' | 'critical'
  data?: Record<string, unknown>
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 150))
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500)

  // Try to get real events from EventStore
  let dbEvents: ReplayEvent[] = []
  try {
    const where: Record<string, unknown> = {}
    if (from || to) {
      where.timestamp = {}
      if (from) (where.timestamp as Record<string, unknown>).gte = new Date(from)
      if (to) (where.timestamp as Record<string, unknown>).lte = new Date(to)
    }
    const events = await db.eventStore.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
    })
    dbEvents = events.map((e) => ({
      id: e.eventId,
      timestamp: e.timestamp.toISOString(),
      category: categorizeEvent(e.type),
      type: e.type,
      title: formatEventTitle(e.type, e.data),
      description: `${e.type} from ${e.source}`,
      source: e.source,
      severity: e.type.includes('error') || e.type.includes('fail') ? 'critical' : e.type.includes('warning') ? 'warning' : 'info',
      data: JSON.parse(e.data),
    }))
  } catch {}

  // If no DB events, generate mock replay data for a typical 30-minute window
  if (dbEvents.length < 3) {
    const now = Date.now()
    const startTime = from ? new Date(from).getTime() : now - 1800000 // 30 min ago
    const endTime = to ? new Date(to).getTime() : now

    const mockEvents: ReplayEvent[] = [
      { id: 'rpl-001', timestamp: new Date(startTime + 30000).toISOString(), category: 'track', type: 'track.started', title: 'Back in Black — AC/DC', description: 'Track started on Main log machine', source: 'playout', severity: 'info', data: { trackId: 't001', title: 'Back in Black', artist: 'AC/DC', length: 253000 } },
      { id: 'rpl-002', timestamp: new Date(startTime + 32000).toISOString(), category: 'rds', type: 'rds.updated', title: 'RDS Updated: AC/DC - Back in Black', description: 'PI=887F, PS=ROCK887, RT=AC/DC - Back in Black', source: 'rds-engine', severity: 'info' },
      { id: 'rpl-003', timestamp: new Date(startTime + 33000).toISOString(), category: 'ai', type: 'ai.social', title: 'AI Social: Twitter post sent', description: 'Posted "Now playing: Back in Black by AC/DC" to Twitter', source: 'ai-social', severity: 'info' },
      { id: 'rpl-004', timestamp: new Date(startTime + 35000).toISOString(), category: 'ai', type: 'ai.dj_assistant', title: 'AI DJ Assistant: Fun fact generated', description: '"AC/DC released Back in Black in 1980. The album has sold over 50 million copies worldwide."', source: 'ai-dj-assistant', severity: 'info' },
      { id: 'rpl-005', timestamp: new Date(startTime + 60000).toISOString(), category: 'listener', type: 'stream.listeners.changed', title: 'Listeners: +5 on Main FM', description: 'Listener count increased from 1282 to 1287', source: 'streaming', severity: 'info', data: { stationId: 'main-fm', listeners: 1287, delta: 5 } },
      { id: 'rpl-006', timestamp: new Date(startTime + 120000).toISOString(), category: 'snmp', type: 'snmp.warning', title: 'FM Transmitter: Temperature 45°C', description: 'Temperature increased from 42°C to 45°C', source: 'snmp-monitor', severity: 'warning' },
      { id: 'rpl-007', timestamp: new Date(startTime + 180000).toISOString(), category: 'gpio', type: 'gpio.changed', title: 'Mic 1 Opened (Studio A)', description: 'GPI 1 state changed: OFF → ON. ON-AIR lamp activated.', source: 'ripcd', severity: 'info' },
      { id: 'rpl-008', timestamp: new Date(startTime + 185000).toISOString(), category: 'system', type: 'system.on_air', title: 'ON AIR — Studio A Live', description: 'Console fader start triggered. Automation paused.', source: 'playout', severity: 'info' },
      { id: 'rpl-009', timestamp: new Date(startTime + 240000).toISOString(), category: 'gpio', type: 'gpio.changed', title: 'Mic 1 Closed (Studio A)', description: 'GPI 1 state changed: ON → OFF. ON-AIR lamp deactivated.', source: 'ripcd', severity: 'info' },
      { id: 'rpl-010', timestamp: new Date(startTime + 245000).toISOString(), category: 'system', type: 'system.auto_resume', title: 'Automation Resumed', description: 'Console fader closed. Automation resumed from last position.', source: 'playout', severity: 'info' },
      { id: 'rpl-011', timestamp: new Date(startTime + 283000).toISOString(), category: 'track', type: 'track.finished', title: 'Back in Black finished', description: 'Track played for 4:13 (full duration)', source: 'playout', severity: 'info', data: { trackId: 't001', playedDuration: 253000 } },
      { id: 'rpl-012', timestamp: new Date(startTime + 284000).toISOString(), category: 'ai', type: 'ai.voice_track', title: 'AI DJ: Voice track generated', description: 'Generated 3 script variations for transition to next track', source: 'ai-dj', severity: 'info' },
      { id: 'rpl-013', timestamp: new Date(startTime + 285000).toISOString(), category: 'track', type: 'track.started', title: 'Highway to Hell — AC/DC', description: 'Track started on Main log machine', source: 'playout', severity: 'info', data: { trackId: 't002', title: 'Highway to Hell', artist: 'AC/DC', length: 208000 } },
      { id: 'rpl-014', timestamp: new Date(startTime + 286000).toISOString(), category: 'rds', type: 'rds.updated', title: 'RDS Updated: AC/DC - Highway to Hell', description: 'PI=887F, PS=ROCK887, RT=AC/DC - Highway to Hell', source: 'rds-engine', severity: 'info' },
      { id: 'rpl-015', timestamp: new Date(startTime + 300000).toISOString(), category: 'incident', type: 'incident.warning', title: 'Webhook Rate Limit Warning', description: 'Discord webhook hit rate limit (1/3 retries used)', source: 'webhook-system', severity: 'warning' },
      { id: 'rpl-016', timestamp: new Date(startTime + 360000).toISOString(), category: 'ai', type: 'ai.qc', title: 'AI QC: Audio levels normal', description: 'LUFS: -16.2, True Peak: -1.2dB, no clipping detected', source: 'ai-qc', severity: 'info' },
      { id: 'rpl-017', timestamp: new Date(startTime + 420000).toISOString(), category: 'listener', type: 'stream.listeners.changed', title: 'Listeners: -3 on Web HD', description: 'Listener count decreased from 415 to 412', source: 'streaming', severity: 'info', data: { stationId: 'web-hd', listeners: 412, delta: -3 } },
      { id: 'rpl-018', timestamp: new Date(startTime + 480000).toISOString(), category: 'snmp', type: 'snmp.info', title: 'DAB+ Mux: Error rate stable', description: 'Error rate: 0.001% (within normal range)', source: 'snmp-monitor', severity: 'info' },
      { id: 'rpl-019', timestamp: new Date(startTime + 493000).toISOString(), category: 'track', type: 'track.finished', title: 'Highway to Hell finished', description: 'Track played for 3:28 (full duration)', source: 'playout', severity: 'info' },
      { id: 'rpl-020', timestamp: new Date(startTime + 494000).toISOString(), category: 'ai', type: 'ai.producer', title: 'AI Producer: Sweeper suggestion', description: 'Suggested sweeper: "The Best Rock" — transition from Hard Rock to next track', source: 'ai-producer', severity: 'info' },
    ]

    // Filter by time range
    dbEvents = mockEvents.filter((e) => {
      const t = new Date(e.timestamp).getTime()
      return t >= startTime && t <= endTime
    })
  }

  // Calculate summary
  const summary = {
    totalEvents: dbEvents.length,
    byCategory: dbEvents.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
    bySeverity: {
      info: dbEvents.filter((e) => e.severity === 'info').length,
      warning: dbEvents.filter((e) => e.severity === 'warning').length,
      critical: dbEvents.filter((e) => e.severity === 'critical').length,
    },
    timeRange: {
      from: dbEvents[0]?.timestamp ?? null,
      to: dbEvents[dbEvents.length - 1]?.timestamp ?? null,
      durationSec: dbEvents.length > 1 ? Math.round((new Date(dbEvents[dbEvents.length - 1].timestamp).getTime() - new Date(dbEvents[0].timestamp).getTime()) / 1000) : 0,
    },
  }

  return NextResponse.json({
    count: dbEvents.length,
    summary,
    events: dbEvents,
  })
}

function categorizeEvent(type: string): ReplayEvent['category'] {
  if (type.startsWith('track.')) return 'track'
  if (type.startsWith('rds.')) return 'rds'
  if (type.startsWith('ai.')) return 'ai'
  if (type.includes('listener')) return 'listener'
  if (type.includes('webhook')) return 'webhook'
  if (type.includes('alert')) return 'incident'
  return 'system'
}

function formatEventTitle(type: string, data: string): string {
  try {
    const d = JSON.parse(data)
    if (d.title) return `${d.title} — ${d.artist ?? ''}`
    if (d.rt) return `RDS: ${d.rt}`
    if (d.left !== undefined) return `VU: L=${d.left.toFixed(2)} R=${d.right.toFixed(2)}`
    return type
  } catch {
    return type
  }
}
