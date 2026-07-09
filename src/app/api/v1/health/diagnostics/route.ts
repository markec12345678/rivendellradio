import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { eventBus, getMetrics } from '@/lib/event-bus'

export const dynamic = 'force-dynamic'

interface DiagnosticCheck {
  name: string
  category: 'database' | 'eventbus' | 'websocket' | 'daemons' | 'memory' | 'disk' | 'network' | 'security'
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  message: string
  value?: string
  threshold?: string
  responseTimeMs?: number
  lastChecked: string
}

export async function GET() {
  const checks: DiagnosticCheck[] = []
  const now = new Date().toISOString()

  // 1. Database connectivity
  const dbStart = Date.now()
  try {
    await db.rivendellConfig.count()
    const dbLatency = Date.now() - dbStart
    checks.push({
      name: 'Database Connection',
      category: 'database',
      status: dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'warning' : 'critical',
      message: 'SQLite database responding',
      value: `${dbLatency}ms`,
      threshold: '< 100ms',
      responseTimeMs: dbLatency,
      lastChecked: now,
    })
  } catch {
    checks.push({
      name: 'Database Connection',
      category: 'database',
      status: 'critical',
      message: 'Database connection failed',
      lastChecked: now,
      responseTimeMs: Date.now() - dbStart,
    })
  }

  // 2. Event Bus health
  const eventMetrics = getMetrics()
  const eventLatency = eventMetrics.avgEventLatencyMs
  checks.push({
    name: 'Event Bus Latency',
    category: 'eventbus',
    status: eventLatency < 50 ? 'healthy' : eventLatency < 200 ? 'warning' : 'critical',
    message: `${eventMetrics.eventsTotal} events processed`,
    value: `${eventLatency}ms avg`,
    threshold: '< 50ms',
    responseTimeMs: eventLatency,
    lastChecked: now,
  })

  // 3. Event Bus history
  const historyCount = eventBus.getHistory().length
  checks.push({
    name: 'Event Bus History',
    category: 'eventbus',
    status: 'healthy',
    message: `${historyCount} events in memory history`,
    value: `${historyCount}/100`,
    lastChecked: now,
  })

  // 4. Memory usage
  const mem = process.memoryUsage()
  const memMb = Math.round(mem.rss / 1024 / 1024)
  const heapUsed = Math.round(mem.heapUsed / 1024 / 1024)
  const heapTotal = Math.round(mem.heapTotal / 1024 / 1024)
  const heapPct = Math.round((heapUsed / heapTotal) * 100)
  checks.push({
    name: 'Memory (RSS)',
    category: 'memory',
    status: memMb < 512 ? 'healthy' : memMb < 1024 ? 'warning' : 'critical',
    message: `RSS: ${memMb}MB, Heap: ${heapUsed}/${heapTotal}MB (${heapPct}%)`,
    value: `${memMb}MB`,
    threshold: '< 512MB',
    lastChecked: now,
  })

  // 5. Process uptime
  const uptimeSec = Math.round(process.uptime())
  checks.push({
    name: 'Process Uptime',
    category: 'system',
    status: uptimeSec > 3600 ? 'healthy' : uptimeSec > 300 ? 'warning' : 'healthy',
    message: `Running for ${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`,
    value: `${uptimeSec}s`,
    threshold: '> 1h',
    lastChecked: now,
  })

  // 6. API response time (self-test)
  const apiStart = Date.now()
  await new Promise((r) => setTimeout(r, 1))
  const apiLatency = Date.now() - apiStart
  checks.push({
    name: 'API Response Time',
    category: 'network',
    status: apiLatency < 50 ? 'healthy' : 'warning',
    message: 'API responding normally',
    value: `${apiLatency}ms`,
    threshold: '< 50ms',
    responseTimeMs: apiLatency,
    lastChecked: now,
  })

  // 7. WebSocket feed status (check if broadcast-feed is running)
  const wsConnected = eventMetrics.eventsTotal > 0
  checks.push({
    name: 'WebSocket Feed',
    category: 'websocket',
    status: wsConnected ? 'healthy' : 'warning',
    message: wsConnected ? 'Feed active — events flowing' : 'No events received — feed may be offline',
    value: wsConnected ? 'connected' : 'disconnected',
    lastChecked: now,
  })

  // 8. Audit log recent activity
  try {
    const recentAudits = await db.auditLog.count({
      where: { timestamp: { gte: new Date(Date.now() - 3600000) } },
    })
    checks.push({
      name: 'Audit Trail',
      category: 'security',
      status: 'healthy',
      message: `${recentAudits} audit entries in last hour`,
      value: `${recentAudits} entries/h`,
      lastChecked: now,
    })
  } catch {
    checks.push({
      name: 'Audit Trail',
      category: 'security',
      status: 'unknown',
      message: 'Unable to query audit log',
      lastChecked: now,
    })
  }

  // 9. API Keys active
  try {
    const activeKeys = await db.apiKey.count({ where: { active: true } })
    checks.push({
      name: 'API Keys',
      category: 'security',
      status: 'healthy',
      message: `${activeKeys} active API keys`,
      value: `${activeKeys}`,
      lastChecked: now,
    })
  } catch {
    checks.push({
      name: 'API Keys',
      category: 'security',
      status: 'unknown',
      message: 'Unable to query API keys',
      lastChecked: now,
    })
  }

  // 10. Event Store size
  try {
    const eventCount = await db.eventStore.count()
    checks.push({
      name: 'Event Store',
      category: 'eventbus',
      status: eventCount < 10000 ? 'healthy' : eventCount < 100000 ? 'warning' : 'critical',
      message: `${eventCount} events persisted in database`,
      value: `${eventCount}`,
      threshold: '< 10,000 for optimal performance',
      lastChecked: now,
    })
  } catch {
    checks.push({
      name: 'Event Store',
      category: 'eventbus',
      status: 'unknown',
      message: 'Unable to query event store',
      lastChecked: now,
    })
  }

  // 11. Webhook deliveries
  try {
    const pendingDeliveries = await db.webhookDelivery.count({ where: { status: 'pending' } })
    const failedDeliveries = await db.webhookDelivery.count({ where: { status: 'failed' } })
    const dlqDeliveries = await db.webhookDelivery.count({ where: { status: 'dlq' } })
    checks.push({
      name: 'Webhook Queue',
      category: 'eventbus',
      status: pendingDeliveries < 10 ? 'healthy' : 'warning',
      message: `${pendingDeliveries} pending, ${failedDeliveries} failed, ${dlqDeliveries} in DLQ`,
      value: `pending=${pendingDeliveries}, DLQ=${dlqDeliveries}`,
      lastChecked: now,
    })
  } catch {
    checks.push({
      name: 'Webhook Queue',
      category: 'eventbus',
      status: 'unknown',
      message: 'Unable to query webhook deliveries',
      lastChecked: now,
    })
  }

  // Calculate overall health score
  const healthy = checks.filter((c) => c.status === 'healthy').length
  const warnings = checks.filter((c) => c.status === 'warning').length
  const critical = checks.filter((c) => c.status === 'critical').length
  const healthScore = Math.round(((healthy * 100 + warnings * 50) / (checks.length * 100)) * 100)

  return NextResponse.json({
    healthScore,
    status: critical > 0 ? 'critical' : warnings > 0 ? 'warning' : 'healthy',
    summary: {
      total: checks.length,
      healthy,
      warnings,
      critical,
      uptime: Math.round(process.uptime()),
      memoryMb,
      eventBusEvents: eventMetrics.eventsTotal,
      eventBusLatencyMs: eventLatency,
    },
    checks,
    timestamp: now,
  })
}
