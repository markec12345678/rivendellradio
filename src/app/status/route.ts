import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Public Status Page — /status route.
 * Serves the HTML status page directly (no API prefix).
 */

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rock 88.7 — System Status</title>
  <meta name="description" content="Real-time status of Rock 88.7 broadcast platform — streaming, automation, RDS, API, Event Bus, AI modules">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #f59e0b; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
    .subtitle { color: #888; margin-bottom: 32px; }
    .overall { padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center; font-size: 20px; font-weight: 700; }
    .all-operational { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.4); }
    .some-issues { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.4); }
    h2 { color: #e5e5e5; margin: 32px 0 16px; font-size: 18px; }
    .service { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #1f1f1f; }
    .service-info { flex: 1; }
    .service-name { font-weight: 600; font-size: 15px; }
    .service-desc { font-size: 12px; color: #666; margin-top: 2px; }
    .uptime { font-size: 11px; color: #888; margin-top: 4px; }
    .status-badge { padding: 6px 14px; border-radius: 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-operational { background: rgba(16,185,129,0.2); color: #10b981; }
    .badge-degraded { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .badge-partial-outage { background: rgba(245,158,11,0.3); color: #f59e0b; }
    .badge-major-outage { background: rgba(239,68,68,0.2); color: #ef4444; }
    .badge-maintenance { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .history-bar { display: flex; gap: 2px; margin-top: 12px; height: 32px; align-items: flex-end; }
    .day { flex: 1; min-width: 3px; max-width: 12px; height: 100%; border-radius: 2px; transition: opacity 0.2s; }
    .day:hover { opacity: 0.7; }
    .day-operational { background: #10b981; }
    .day-degraded { background: #f59e0b; }
    .day-partial-outage { background: #f59e0b; }
    .day-major-outage { background: #ef4444; }
    .day-maintenance { background: #3b82f6; }
    .incident { padding: 16px; border: 1px solid #1f1f1f; border-radius: 8px; margin: 12px 0; background: #111; }
    .incident-title { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
    .incident-meta { font-size: 12px; color: #666; margin-bottom: 8px; }
    .incident-update { font-size: 13px; color: #aaa; padding: 8px; background: #0a0a0a; border-radius: 4px; margin-top: 8px; border-left: 3px solid #f59e0b; }
    .severity-minor { color: #f59e0b; }
    .severity-major { color: #f97316; }
    .severity-critical { color: #ef4444; }
    .footer { margin-top: 48px; text-align: center; color: #444; font-size: 12px; padding: 24px 0; border-top: 1px solid #1f1f1f; }
    .footer a { color: #f59e0b; text-decoration: none; }
    .refresh-note { font-size: 11px; color: #444; margin-top: 8px; }
    @media (max-width: 640px) {
      .container { padding: 20px 16px; }
      h1 { font-size: 24px; }
      .overall { font-size: 16px; }
      .day { max-width: 6px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📻 Rock 88.7</h1>
    <div class="subtitle">System Status — real-time availability of all platform components</div>
    <div class="overall all-operational" id="overall">Loading status…</div>
    <div id="services-section">
      <h2>Services</h2>
      <div id="services-list"></div>
    </div>
    <div id="incidents-section">
      <h2>Recent Incidents (90 days)</h2>
      <div id="incidents-list"></div>
    </div>
    <div class="footer">
      Powered by Rock 88.7 Reliability Validation<br/>
      <a href="/api/v1/status">JSON API</a> · <a href="/api/v1/reliability">Reliability Metrics</a> · <a href="/api/v1/slo">SLO Dashboard</a><br/>
      <span class="refresh-note">Auto-refreshes every 60 seconds · Last updated: <span id="last-updated">—</span></span>
    </div>
  </div>
  <script>
    async function loadStatus() {
      try {
        const res = await fetch('/api/v1/status');
        const data = await res.json();

        // Overall
        const overall = document.getElementById('overall');
        if (data.allOperational) {
          overall.className = 'overall all-operational';
          overall.textContent = '✅ All Systems Operational';
        } else {
          overall.className = 'overall some-issues';
          overall.textContent = '⚠️ Some Systems Experiencing Issues';
        }

        // Services
        const servicesList = document.getElementById('services-list');
        servicesList.innerHTML = data.services.map(s => \`
          <div class="service">
            <div class="service-info">
              <div class="service-name">\${s.name}</div>
              <div class="service-desc">\${s.description}</div>
              <div class="uptime">90-day uptime: \${s.uptime90d}%</div>
              <div class="history-bar">
                \${s.history.slice(-60).map(h => '<div class="day day-' + h.status + '" title="' + h.date + ': ' + h.status + '"></div>').join('')}
              </div>
            </div>
            <span class="status-badge badge-\${s.status}">\${s.status.replace(/-/g, ' ')}</span>
          </div>
        \`).join('');

        // Incidents
        const incidentsList = document.getElementById('incidents-list');
        if (data.incidents.length === 0) {
          incidentsList.innerHTML = '<div style="color: #666; padding: 16px;">No incidents in the last 90 days 🎉</div>';
        } else {
          incidentsList.innerHTML = data.incidents.map(inc => \`
            <div class="incident">
              <div class="incident-title">\${inc.title}</div>
              <div class="incident-meta">
                <span class="severity-\${inc.severity}">\${inc.severity.toUpperCase()}</span> ·
                Started: \${new Date(inc.startedAt).toLocaleString()}
                \${inc.resolvedAt ? '· Resolved: ' + new Date(inc.resolvedAt).toLocaleString() : ''}
              </div>
              <div class="incident-update">\${inc.updates[inc.updates.length - 1].message}</div>
            </div>
          \`).join('');
        }

        document.getElementById('last-updated').textContent = new Date().toLocaleString();
      } catch (err) {
        document.getElementById('overall').textContent = 'Failed to load status';
        document.getElementById('overall').className = 'overall some-issues';
      }
    }
    loadStatus();
    setInterval(loadStatus, 60000);
  </script>
</body>
</html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
