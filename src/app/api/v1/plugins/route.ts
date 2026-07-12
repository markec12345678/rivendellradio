import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Plugin SDK — third-party module development framework.
 *
 * Allows external developers to build plugins that extend the platform:
 *   - Register custom event handlers on the Event Bus
 *   - Add new API endpoints under /api/v1/plugins/{name}/
 *   - Register UI panels in the dashboard
 *   - Hook into playout (custom cart types, voice processors)
 *   - Hook into scheduling (custom rule types)
 *
 * Plugins run sandboxed with RBAC-scoped permissions.
 *
 * GET  /api/v1/plugins         — installed plugins + registry + SDK info
 * POST /api/v1/plugins         — install/enable/disable/uninstall plugin
 */

interface Plugin {
  id: string
  name: string
  version: string
  author: string
  description: string
  // Status
  status: 'installed' | 'enabled' | 'disabled' | 'error'
  installedAt: string
  lastUpdated: string
  // Manifest
  manifest: {
    apiVersion: string
    permissions: string[] // 'event:read', 'event:write', 'playout:control', 'schedule:write', 'ui:panel'
    eventHandlers: { event: string; handler: string }[]
    apiEndpoints: { path: string; method: string; handler: string }[]
    uiPanels: { id: string; title: string; tab: string; component: string }[]
    configSchema: any // JSON schema for plugin config
  }
  // Runtime
  config: any
  health: 'healthy' | 'degraded' | 'failed'
  lastError: string | null
  // Stats
  eventsHandled: number
  apiCalls: number
}

const PLUGINS: Plugin[] = [
  {
    id: 'plg-001', name: 'spotify-integration', version: '1.2.0', author: 'Rock 88.7 Team',
    description: 'Sync now-playing to Spotify, pull listener stats from Spotify for Artists',
    status: 'enabled', installedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastUpdated: new Date(Date.now() - 7 * 86400000).toISOString(),
    manifest: {
      apiVersion: '1.0.0',
      permissions: ['event:read', 'event:write', 'ui:panel'],
      eventHandlers: [{ event: 'track.started', handler: 'syncToSpotify' }, { event: 'track.finished', handler: 'updateSpotifyStats' }],
      apiEndpoints: [{ path: '/spotify/now-playing', method: 'GET', handler: 'getNowPlaying' }, { path: '/spotify/stats', method: 'GET', handler: 'getStats' }],
      uiPanels: [{ id: 'spotify-panel', title: 'Spotify Integration', tab: 'reports', component: 'SpotifyPanel' }],
      configSchema: { clientId: 'string', clientSecret: 'string', artistId: 'string' },
    },
    config: { clientId: '***', artistId: '3EhbVry6W5DR3M5p9XwvHE' },
    health: 'healthy', lastError: null,
    eventsHandled: 8472, apiCalls: 1247,
  },
  {
    id: 'plg-002', name: 'weather-overlay', version: '0.9.0', author: 'Community',
    description: 'Real-time weather overlay on DAB+ slideshow + RDS RT',
    status: 'enabled', installedAt: new Date(Date.now() - 14 * 86400000).toISOString(), lastUpdated: new Date(Date.now() - 14 * 86400000).toISOString(),
    manifest: {
      apiVersion: '1.0.0',
      permissions: ['event:read', 'rds:write', 'dab:write'],
      eventHandlers: [{ event: 'schedule.hourly', handler: 'pushWeatherSlide' }],
      apiEndpoints: [{ path: '/weather/current', method: 'GET', handler: 'getCurrent' }],
      uiPanels: [{ id: 'weather-panel', title: 'Weather Overlay', tab: 'system', component: 'WeatherPanel' }],
      configSchema: { apiKey: 'string', location: 'string', units: 'celsius|fahrenheit' },
    },
    config: { apiKey: '***', location: 'Ljubljana,SI', units: 'celsius' },
    health: 'healthy', lastError: null,
    eventsHandled: 336, apiCalls: 336,
  },
  {
    id: 'plg-003', name: 'custom-rotation-rules', version: '2.0.0', author: 'Rock 88.7 PD',
    description: 'Custom music rotation rules: decade separation, mood matching, energy curve',
    status: 'disabled', installedAt: new Date(Date.now() - 60 * 86400000).toISOString(), lastUpdated: new Date(Date.now() - 60 * 86400000).toISOString(),
    manifest: {
      apiVersion: '1.0.0',
      permissions: ['event:read', 'schedule:write'],
      eventHandlers: [{ event: 'scheduler.before-fill', handler: 'applyCustomRules' }],
      apiEndpoints: [],
      uiPanels: [{ id: 'rotation-rules', title: 'Custom Rotation', tab: 'schedule', component: 'RotationRulesPanel' }],
      configSchema: { decadeSeparation: 'number', moodMatching: 'boolean', energyCurve: 'string' },
    },
    config: { decadeSeparation: 120, moodMatching: true, energyCurve: 'morning-peak' },
    health: 'healthy', lastError: null,
    eventsHandled: 0, apiCalls: 0,
  },
]

const SDK_INFO = {
  apiVersion: '1.0.0',
  runtime: 'Node.js 20+ / Bun 1.1+',
  sdk: '@rock887/plugin-sdk',
  documentation: 'https://rock887.fm/docs/plugins',
  // Plugin lifecycle
  lifecycle: ['install', 'enable', 'configure', 'run', 'disable', 'uninstall'],
  // Permission model
  permissions: {
    'event:read': 'Subscribe to Event Bus events',
    'event:write': 'Publish events to Event Bus',
    'playout:control': 'Control playout (play/stop/segue)',
    'schedule:write': 'Modify schedule + music log',
    'rds:write': 'Write to RDS encoder',
    'dab:write': 'Write to DAB+ slideshow/DLS',
    'ui:panel': 'Register UI panel in dashboard',
    'api:expose': 'Expose new API endpoints',
    'db:read': 'Read from database',
    'db:write': 'Write to database (sandboxed schema)',
  },
  // Sandbox
  sandbox: {
    isolation: 'VM2 sandbox with timeout + memory limits',
    cpuLimit: '100ms per event handler',
    memoryLimit: '128MB per plugin',
    network: 'Configurable allowlist per plugin',
  },
  // Distribution
  distribution: {
    registry: 'https://registry.rock887.fm/plugins',
    format: 'NPM package with @rock887/plugin- prefix',
    signing: 'Plugins must be signed with developer PGP key',
    verification: 'Signature + checksum verified on install',
  },
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    sdk: SDK_INFO,
    plugins: PLUGINS,
    registry: {
      url: 'https://registry.rock887.fm/plugins',
      totalAvailable: 47,
      categories: ['integration', 'ui', 'scheduling', 'playout', 'analytics', 'social', 'hardware'],
    },
    stats: {
      totalInstalled: PLUGINS.length,
      enabled: PLUGINS.filter((p) => p.status === 'enabled').length,
      disabled: PLUGINS.filter((p) => p.status === 'disabled').length,
      healthy: PLUGINS.filter((p) => p.health === 'healthy').length,
      totalEventsHandled: PLUGINS.reduce((s, p) => s + p.eventsHandled, 0),
    },
    developerGuide: {
      quickstart: 'npm init @rock887/plugin my-plugin',
      example: `import { Plugin } from '@rock887/plugin-sdk'
export default class MyPlugin extends Plugin {
  onTrackStarted(event) {
    this.log(\`Track started: \${event.title}\`)
  }
}`,
      testing: 'bun test — runs plugin tests in sandbox',
      publishing: 'rock887 publish — signs + uploads to registry',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'install' && body.package) {
    // Production: download from registry, verify signature, install in sandbox
    const plugin: Plugin = {
      id: `plg-${Date.now()}`, name: body.package, version: body.version ?? '1.0.0', author: body.author ?? 'Unknown',
      description: body.description ?? 'Third-party plugin',
      status: 'disabled', installedAt: new Date().toISOString(), lastUpdated: new Date().toISOString(),
      manifest: body.manifest ?? { apiVersion: '1.0.0', permissions: [], eventHandlers: [], apiEndpoints: [], uiPanels: [], configSchema: {} },
      config: {}, health: 'healthy', lastError: null, eventsHandled: 0, apiCalls: 0,
    }
    PLUGINS.push(plugin)
    try {
      await db.auditLog.create({ data: { action: 'plugin-install', entity: 'plugin', entityId: plugin.id, details: JSON.stringify({ name: plugin.name, version: plugin.version }) } })
    } catch {}
    return NextResponse.json({ ok: true, plugin, message: `Plugin "${plugin.name}" installed (disabled by default — review permissions, then enable)` })
  }

  if (body.action === 'enable' && body.pluginId) {
    const p = PLUGINS.find((x) => x.id === body.pluginId)
    if (p) { p.status = 'enabled'; return NextResponse.json({ ok: true, plugin: p, message: `Plugin "${p.name}" enabled — event handlers now active` }) }
  }

  if (body.action === 'disable' && body.pluginId) {
    const p = PLUGINS.find((x) => x.id === body.pluginId)
    if (p) { p.status = 'disabled'; return NextResponse.json({ ok: true, plugin: p }) }
  }

  if (body.action === 'uninstall' && body.pluginId) {
    const idx = PLUGINS.findIndex((x) => x.id === body.pluginId)
    if (idx >= 0) { const removed = PLUGINS.splice(idx, 1)[0]; return NextResponse.json({ ok: true, removed }) }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
