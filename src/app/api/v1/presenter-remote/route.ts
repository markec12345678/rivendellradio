import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Phone-as-Presenter-Remote + Density Modes + Framer Motion system.
 *
 * #16: Phone-as-Presenter-Remote (QR pairing + WebSocket trigger)
 * #3: Density modes (Operator / Standard / Presentation) + skeleton loaders
 * #2: Framer Motion micro-interaction system
 *
 * GET /api/v1/presenter-remote         — paired remotes + density config + motion settings
 * POST /api/v1/presenter-remote         — pair remote, trigger cart, set density/motion
 */

interface PairedRemote {
  id: string
  pairCode: string
  qrCodeUrl: string
  presenterName: string
  presenterEmail: string
  pairedAt: string
  lastSeenAt: string
  // Available controls on remote
  controls: ('carts' | 'mic-cue' | 'next' | 'stop' | 'talkback')[]
  // WebSocket session
  socketConnected: boolean
  latencyMs: number
  // Auth
  token: string
  tokenExpiresAt: string
}

interface DensityConfig {
  current: 'operator' | 'standard' | 'presentation'
  operator: { gutterPx: number; fontScale: number; cardPadding: string; description: string }
  standard: { gutterPx: number; fontScale: number; cardPadding: string; description: string }
  presentation: { gutterPx: number; fontScale: number; cardPadding: string; description: string }
}

interface MotionConfig {
  enabled: boolean
  microMs: number        // 150ms ease-out for micro-interactions
  layoutMs: number       // 250ms spring for layout transitions
  reducedMotion: boolean // respects prefers-reduced-motion
  variants: {
    cartPress: string    // spring-scale on cart press
    toastToast: string   // optimistic toast for RML commands
    tabSwitch: string    // layout-id transitions between tabs
    numberCount: string  // animated number count-up for listener totals
  }
}

const PAIRED_REMOTES: PairedRemote[] = [
  { id: 'remote-001', pairCode: 'R887-XYZ789', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://rock887.fm/remote/R887-XYZ789', presenterName: 'Alex Morgan', presenterEmail: 'alex@rock887.fm', pairedAt: new Date(Date.now() - 30 * 86400000).toISOString(), lastSeenAt: new Date(Date.now() - 3600000).toISOString(), controls: ['carts', 'mic-cue', 'next', 'stop'], socketConnected: false, latencyMs: 0, token: '***', tokenExpiresAt: new Date(Date.now() + 3600000).toISOString() },
  { id: 'remote-002', pairCode: 'R887-ABC123', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://rock887.fm/remote/R887-ABC123', presenterName: 'Sara Chen', presenterEmail: 'sara@rock887.fm', pairedAt: new Date(Date.now() - 14 * 86400000).toISOString(), lastSeenAt: new Date(Date.now() - 300000).toISOString(), controls: ['carts', 'mic-cue', 'next', 'stop', 'talkback'], socketConnected: true, latencyMs: 42, token: '***', tokenExpiresAt: new Date(Date.now() + 86400000).toISOString() },
]

const DENSITY: DensityConfig = {
  current: 'standard',
  operator: { gutterPx: 4, fontScale: 0.875, cardPadding: 'p-2', description: 'Compact 4px gutter — max info density za control room operators' },
  standard: { gutterPx: 16, fontScale: 1.0, cardPadding: 'p-4', description: 'Default balanced density za daily use' },
  presentation: { gutterPx: 32, fontScale: 1.5, cardPadding: 'p-8', description: 'Oversized type + auto-cycle now-playing za studio wall displays' },
}

const MOTION: MotionConfig = {
  enabled: true,
  microMs: 150,
  layoutMs: 250,
  reducedMotion: false,
  variants: {
    cartPress: 'spring: { scale: 0.95 }, transition: { type: spring, stiffness: 200 }',
    toastToast: 'animate: { y: [100, 0] }, exit: { y: [0, 100] }',
    tabSwitch: 'layoutId: "tab-content", transition: { duration: 0.25 }',
    numberCount: 'animate: { value: [old, new] }, transition: { duration: 0.5 }',
  },
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))
  return NextResponse.json({
    pairedRemotes: PAIRED_REMOTES,
    density: DENSITY,
    motion: MOTION,
    stats: {
      totalRemotes: PAIRED_REMOTES.length,
      connected: PAIRED_REMOTES.filter((r) => r.socketConnected).length,
      avgLatency: PAIRED_REMOTES.filter((r) => r.socketConnected).reduce((s, r) => s + r.latencyMs, 0) / Math.max(1, PAIRED_REMOTES.filter((r) => r.socketConnected).length),
    },
    pairFlow: {
      step1: 'Dashboard renders QR code with pairCode',
      step2: 'Presenter scans QR → opens PWA on phone (stripped, only carts + mic cue + next + stop)',
      step3: 'Phone authenticates with short-lived presenter token from RBAC',
      step4: 'Phone connects to existing WebSocket (port 3003) → sub-100ms trigger latency',
      step5: 'Cart press on phone → WebSocket event → dashboard fires cart → on-air',
    },
    tech: {
      transport: 'Socket.io (existing port 3003) — sub-100ms trigger latency',
      auth: 'Short-lived presenter token (1h) from RBAC — auto-refresh',
      offline: 'PWA service worker caches cart layout — works on flaky studio WiFi',
      density: 'localStorage persisted, applied via Tailwind class swapping',
      motion: 'Framer Motion 12.x, respects prefers-reduced-motion CSS media query',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'pair-remote') {
    const pairCode = `R887-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const remote: PairedRemote = {
      id: `remote-${Date.now()}`,
      pairCode,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://rock887.fm/remote/${pairCode}`,
      presenterName: body.presenterName ?? 'Presenter',
      presenterEmail: body.presenterEmail ?? 'presenter@rock887.fm',
      pairedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      controls: body.controls ?? ['carts', 'mic-cue', 'next', 'stop'],
      socketConnected: false,
      latencyMs: 0,
      token: Math.random().toString(36).slice(2),
      tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    }
    PAIRED_REMOTES.push(remote)
    return NextResponse.json({ ok: true, remote, message: `Scan QR code to pair: ${pairCode}` })
  }

  if (body.action === 'trigger-cart' && body.remoteId && body.cartNumber !== undefined) {
    const r = PAIRED_REMOTES.find((x) => x.id === body.remoteId)
    if (r) {
      r.lastSeenAt = new Date().toISOString()
      r.latencyMs = Math.floor(Math.random() * 40 + 20)
      return NextResponse.json({
        ok: true,
        message: `Cart ${body.cartNumber} triggered by ${r.presenterName} via phone remote`,
        latencyMs: r.latencyMs,
      })
    }
  }

  if (body.action === 'set-density' && body.density) {
    if (['operator', 'standard', 'presentation'].includes(body.density)) {
      DENSITY.current = body.density as any
      return NextResponse.json({ ok: true, density: DENSITY, message: `Density set to "${body.density}"` })
    }
  }

  if (body.action === 'set-motion' && body.enabled !== undefined) {
    MOTION.enabled = Boolean(body.enabled)
    return NextResponse.json({ ok: true, motion: MOTION })
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
