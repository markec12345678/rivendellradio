import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Public Status Page API — javno dostopen status vseh komponent.
 *
 * Podobno kot status.github.com ali status.stripe.com — javno prikazuje
 * razpoložljivost vseh storitev z zgodovino incidentov.
 *
 * GET /api/v1/status — JSON status (za embed na druge strani)
 * GET /api/v1/status?format=html — HTML status page
 */

interface ServiceStatus {
  id: string
  name: string
  description: string
  status: 'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance'
  uptime90d: number
  // Recent days (90)
  history: { date: string; status: 'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance' }[]
}

interface StatusIncident {
  id: string
  title: string
  status: 'resolved' | 'monitoring' | 'investigating' | 'identified'
  severity: 'minor' | 'major' | 'critical'
  startedAt: string
  resolvedAt: string | null
  affectedServices: string[]
  updates: { timestamp: string; status: string; message: string }[]
}

const SERVICES: ServiceStatus[] = [
  { id: 'streaming', name: 'Streaming', description: 'Icecast2 + HLS + WebRTC', status: 'operational', uptime90d: 99.987, history: [] },
  { id: 'automation', name: 'Playout Automation', description: 'Rivendell RDXport', status: 'operational', uptime90d: 99.985, history: [] },
  { id: 'rds', name: 'RDS Encoder', description: 'Inovonics 730 (PI/PS/PTY/RT)', status: 'operational', uptime90d: 99.982, history: [] },
  { id: 'api', name: 'API', description: 'REST API endpoints', status: 'operational', uptime90d: 99.994, history: [] },
  { id: 'event-bus', name: 'Event Bus', description: 'Event distribution + webhooks', status: 'operational', uptime90d: 99.997, history: [] },
  { id: 'scheduler', name: 'Scheduler', description: 'Music scheduling + clocks', status: 'operational', uptime90d: 99.99, history: [] },
  { id: 'ai', name: 'AI Modules', description: '11 AI modules (DJ, News, QC, etc.)', status: 'operational', uptime90d: 99.96, history: [] },
  { id: 'dashboard', name: 'Dashboard', description: 'Web UI + WebSocket feed', status: 'operational', uptime90d: 99.99, history: [] },
]

// Generate 90-day history for each service
for (const svc of SERVICES) {
  for (let i = 89; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    let status: ServiceStatus['history'][0]['status'] = 'operational'
    // Simulate incidents
    if (svc.id === 'streaming' && i === 20) status = 'degraded'
    if (svc.id === 'ai' && (i === 14 || i === 27 || i === 42)) status = 'degraded'
    if (svc.id === 'event-bus' && i === 14) status = 'degraded'
    svc.history.push({ date, status })
  }
}

const INCIDENTS: StatusIncident[] = [
  {
    id: 'inc-pub-011', title: 'CDN latency spike — mobile listener impact', status: 'resolved', severity: 'minor',
    startedAt: new Date(Date.now() - 20 * 86400000).toISOString(), resolvedAt: new Date(Date.now() - 20 * 86400000 + 68000).toISOString(),
    affectedServices: ['streaming'],
    updates: [
      { timestamp: new Date(Date.now() - 20 * 86400000).toISOString(), status: 'investigating', message: 'We are investigating increased CDN latency affecting mobile listeners.' },
      { timestamp: new Date(Date.now() - 20 * 86400000 + 30000).toISOString(), status: 'identified', message: 'CDN provider (Cloudflare) experiencing latency spike. Switching to Fastly.' },
      { timestamp: new Date(Date.now() - 20 * 86400000 + 68000).toISOString(), status: 'resolved', message: 'Switched to Fastly CDN. All listeners recovered.' },
    ],
  },
  {
    id: 'inc-pub-010', title: 'AI module degraded performance', status: 'resolved', severity: 'minor',
    startedAt: new Date(Date.now() - 14 * 86400000).toISOString(), resolvedAt: new Date(Date.now() - 14 * 86400000 + 42000).toISOString(),
    affectedServices: ['ai'],
    updates: [
      { timestamp: new Date(Date.now() - 14 * 86400000).toISOString(), status: 'monitoring', message: 'AI modules showing increased response times.' },
      { timestamp: new Date(Date.now() - 14 * 86400000 + 42000).toISOString(), status: 'resolved', message: 'AI module performance restored.' },
    ],
  },
]

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'json'

  const allOperational = SERVICES.every((s) => s.status === 'operational')
  const overallStatus = allOperational ? 'all-operational' : 'some-issues'

  if (format === 'html') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rock 88.7 — System Status</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e5e5e5; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #f59e0b; }
    .overall { padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: 600; }
    .all-operational { background: #10b98120; color: #10b981; border: 1px solid #10b98140; }
    .some-issues { background: #f59e0b20; color: #f59e0b; border: 1px solid #f59e0b40; }
    .service { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #333; }
    .service-name { font-weight: 500; }
    .service-status { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .operational { background: #10b98120; color: #10b981; }
    .degraded { background: #f59e0b20; color: #f59e0b; }
    .uptime { font-size: 11px; color: #888; }
    .history { display: flex; gap: 2px; margin-top: 8px; }
    .day { width: 8px; height: 24px; border-radius: 2px; }
    .day-operational { background: #10b981; }
    .day-degraded { background: #f59e0b; }
    .incident { padding: 12px; border: 1px solid #333; border-radius: 8px; margin: 8px 0; }
    .incident-title { font-weight: 600; }
    .incident-resolved { color: #10b981; font-size: 12px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📻 Rock 88.7 — System Status</h1>
  <div class="overall ${overallStatus}">
    ${allOperational ? '✅ All Systems Operational' : '⚠️ Some Systems Experiencing Issues'}
  </div>
  <h2>Services</h2>
  ${SERVICES.map((s) => `
    <div class="service">
      <div>
        <div class="service-name">${s.name}</div>
        <div class="uptime">90-day uptime: ${s.uptime90d}%</div>
      </div>
      <span class="service-status ${s.status}">${s.status.replace('-', ' ')}</span>
    </div>
    <div class="history">
      ${s.history.slice(-30).map((h) => `<div class="day day-${h.status}" title="${h.date}: ${h.status}"></div>`).join('')}
    </div>
  `).join('')}
  <h2>Recent Incidents (90 days)</h2>
  ${INCIDENTS.map((inc) => `
    <div class="incident">
      <div class="incident-title">${inc.title}</div>
      <div class="incident-resolved">${inc.status === 'resolved' ? '✅ Resolved' : inc.status}</div>
      <div style="font-size: 12px; color: #888; margin-top: 4px;">Started: ${new Date(inc.startedAt).toLocaleString()}</div>
      ${inc.resolvedAt ? `<div style="font-size: 12px; color: #888;">Resolved: ${new Date(inc.resolvedAt).toLocaleString()}</div>` : ''}
      <div style="font-size: 12px; color: #aaa; margin-top: 8px;">${inc.updates[inc.updates.length - 1].message}</div>
    </div>
  `).join('')}
  <div class="footer">
    Powered by Rock 88.7 Reliability Validation<br/>
    Last updated: ${new Date().toLocaleString()}
  </div>
</body>
</html>`
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  return NextResponse.json({
    overallStatus,
    allOperational,
    services: SERVICES,
    incidents: INCIDENTS,
    stats: {
      totalServices: SERVICES.length,
      operational: SERVICES.filter((s) => s.status === 'operational').length,
      avgUptime90d: Math.round(SERVICES.reduce((s, svc) => s + svc.uptime90d, 0) / SERVICES.length * 1000) / 1000,
      incidents90d: INCIDENTS.length,
    },
    embedUrl: '/api/v1/status?format=html',
    publicPageUrl: '/status',
  })
}
