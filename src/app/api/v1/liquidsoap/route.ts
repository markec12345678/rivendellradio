import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Liquidsoap Programmable Source Switcher & Fallback Router.
 *
 * Liquidsoap is the de-facto open-source audio router for radio (used by AzuraCast,
 * Airtime, LibreTime). It provides harbor input (live DJ handoff), fallback()
 * for automatic failover, and crossfade transitions between sources.
 *
 * GET  /api/v1/liquidsoap         — current source chain + active source + transition log
 * POST /api/v1/liquidsoap         — switch active source, configure crossfade, set fallback
 *
 * Source chain (priority order):
 *   1. live-studio     (Studer Vista 1, mic/aux) — highest priority
 *   2. live-remote     (SRT harbor input from remote DJ)
 *  3. automation       (Rivendell RDXport playout)
 *   4. backup-automation (Liquidsoap playlist("backup.m3u"))
 *   5. emergency-jingle (looping "we'll be right back" cart) — lowest priority
 *
 * fallback() semantics: if higher-priority source goes silent/errors, fall to next.
 */

interface Source {
  id: string
  name: string
  type: 'live' | 'srt' | 'automation' | 'backup' | 'emergency'
  priority: number          // 1 = highest
  active: boolean
  available: boolean        // source is currently feeding audio
  signalDbfs: number        // current signal level (-∞ to 0)
  status: 'on-air' | 'ready' | 'standby' | 'silent' | 'error'
  description: string
  // Liquidsoap harbor config (for live sources)
  harbor?: {
    port: number
    mountpoint: string
    password: string
    connectedClient?: string
  }
  // Playlist config (for automation/backup sources)
  playlist?: {
    path: string
    currentTrack?: string
    nextTrack?: string
  }
}

const SOURCES: Source[] = [
  {
    id: 'live-studio',
    name: 'Studio A — Live',
    type: 'live',
    priority: 1,
    active: true,
    available: true,
    signalDbfs: -8.2,
    status: 'on-air',
    description: 'Main studio — Studer Vista 1 mixer, mic + aux inputs',
    harbor: { port: 8010, mountpoint: '/live', password: '***' },
  },
  {
    id: 'live-remote',
    name: 'Remote DJ (SRT)',
    type: 'srt',
    priority: 2,
    active: false,
    available: true,
    signalDbfs: -Infinity,
    status: 'standby',
    description: 'SRT harbor input for remote DJ handoff (port 9000)',
    harbor: { port: 9000, mountpoint: '/remote', password: '***' },
  },
  {
    id: 'automation',
    name: 'Rivendell Automation',
    type: 'automation',
    priority: 3,
    active: false,
    available: true,
    signalDbfs: -Infinity,
    status: 'ready',
    description: 'Rivendell RDXport automated playout',
    playlist: { path: 'rdxport://main-log', currentTrack: null, nextTrack: null },
  },
  {
    id: 'backup-automation',
    name: 'Backup Playlist',
    type: 'backup',
    priority: 4,
    active: false,
    available: true,
    signalDbfs: -Infinity,
    status: 'standby',
    description: 'Emergency backup playlist (backup.m3u, 200 tracks)',
    playlist: { path: '/var/audio/backup.m3u', currentTrack: null, nextTrack: null },
  },
  {
    id: 'emergency-jingle',
    name: 'Emergency Jingle Loop',
    type: 'emergency',
    priority: 5,
    active: false,
    available: true,
    signalDbfs: -Infinity,
    status: 'standby',
    description: 'Looping "we\'ll be right back" jingle — last resort',
    playlist: { path: 'single("emergency-jingle.mp3")', currentTrack: null, nextTrack: null },
  },
]

interface TransitionLogEntry {
  timestamp: string
  from: string
  to: string
  reason: 'manual' | 'silence' | 'source-error' | 'source-restored' | 'scheduled'
  crossfadeMs: number
  operatorId?: string
}

const TRANSITION_LOG: TransitionLogEntry[] = [
  {
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    from: 'automation',
    to: 'live-studio',
    reason: 'scheduled',
    crossfadeMs: 1000,
    operatorId: 'presenter@rock887.fm',
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    from: 'live-studio',
    to: 'live-studio',
    reason: 'source-restored',
    crossfadeMs: 500,
  },
]

const CONFIG = {
  crossfadeMs: 1000,
  silenceThresholdDbfs: -40,
  silenceDurationSec: 5,
  autoFallback: true,
  harborPortRange: [8010, 8020],
}

function getActiveSource(): Source | undefined {
  return SOURCES.find((s) => s.active)
}

function setSourceActive(id: string, reason: TransitionLogEntry['reason'], operatorId?: string): Source | null {
  const target = SOURCES.find((s) => s.id === id)
  if (!target || !target.available) return null

  const previous = getActiveSource()
  if (previous && previous.id === id) return target

  // Deactivate all, activate target
  for (const s of SOURCES) {
    s.active = s.id === id
    if (s.active) {
      s.status = 'on-air'
      s.signalDbfs = s.type === 'emergency' ? -12 : -8 + (Math.random() - 0.5) * 4
    } else {
      s.status = s.available ? 'ready' : 'error'
      if (!s.active) s.signalDbfs = -Infinity
    }
  }

  TRANSITION_LOG.unshift({
    timestamp: new Date().toISOString(),
    from: previous?.id ?? 'none',
    to: id,
    reason,
    crossfadeMs: CONFIG.crossfadeMs,
    operatorId,
  })
  if (TRANSITION_LOG.length > 50) TRANSITION_LOG.pop()

  return target
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  // Simulate signal level drift on active source
  const active = getActiveSource()
  if (active) {
    active.signalDbfs = -8 + (Math.random() - 0.5) * 6
  }

  return NextResponse.json({
    activeSource: active?.id ?? null,
    activeName: active?.name ?? null,
    sources: SOURCES,
    config: CONFIG,
    transitionLog: TRANSITION_LOG.slice(0, 20),
    liquidsoapScript: generateLiquidsoapScript(),
    stats: {
      totalTransitions: TRANSITION_LOG.length,
      lastTransition: TRANSITION_LOG[0]?.timestamp ?? null,
      uptime: '12d 4h 23m',
      autoFallbackActive: CONFIG.autoFallback,
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Switch source
  if (body.switchTo) {
    const target = setSourceActive(body.switchTo, body.reason ?? 'manual', body.operatorId)
    if (!target) {
      return NextResponse.json(
        { error: `Source "${body.switchTo}" not found or unavailable` },
        { status: 404 },
      )
    }
    return NextResponse.json({
      ok: true,
      activeSource: target.id,
      activeName: target.name,
      message: `Switched to ${target.name} (crossfade ${CONFIG.crossfadeMs}ms)`,
    })
  }

  // Update config
  if (body.crossfadeMs !== undefined) CONFIG.crossfadeMs = Math.max(0, Math.min(10000, body.crossfadeMs))
  if (body.silenceThresholdDbfs !== undefined) CONFIG.silenceThresholdDbfs = body.silenceThresholdDbfs
  if (body.silenceDurationSec !== undefined) CONFIG.silenceDurationSec = Math.max(1, Math.min(60, body.silenceDurationSec))
  if (body.autoFallback !== undefined) CONFIG.autoFallback = Boolean(body.autoFallback)

  // Simulate failover (silence detection trigger)
  if (body.simulateSilence === true) {
    const active = getActiveSource()
    if (active && CONFIG.autoFallback) {
      const next = SOURCES
        .filter((s) => s.available && s.priority > active.priority)
        .sort((a, b) => a.priority - b.priority)[0]
      if (next) {
        const target = setSourceActive(next.id, 'silence')
        return NextResponse.json({
          ok: true,
          failover: true,
          from: active.id,
          to: next.id,
          message: `🚨 Silence detected on ${active.name} — auto-failover to ${next.name}`,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, config: CONFIG })
}

function generateLiquidsoapScript(): string {
  return `# Rock 88.7 — Liquidsoap source router (auto-generated)
# Documentation: https://www.liquidsoap.info/doc

# Sources (priority order — highest first)
studio      = harbor.input(port=8010, password="***", "/live")
remote      = harbor.input(port=9000, password="***", "/remote")
automation  = request.dynamic(id="rdxport", fun() -> request.create("rdxport://main-log"))
backup      = playlist(mode="random", "/var/audio/backup.m3u")
emergency   = single("/var/audio/emergency-jingle.mp3")

# Fallback chain — auto-failover on silence/error
radio = fallback(
  track_sensitive=false,
  [studio, remote, automation, backup, emergency]
)

# Silence detection — switch to backup after ${CONFIG.silenceDurationSec}s below ${CONFIG.silenceThresholdDbfs}dBFS
radio = fallback.skip(radio, blank(duration=${CONFIG.silenceDurationSec}., radio))

# Crossfade transitions
radio = crossfade(smart=true, duration=${(CONFIG.crossfadeMs / 1000).toFixed(1)}., radio)

# Normalize to EBU R128 (-23 LUFS)
radio = amplify(1.0, radio)

# Output to Icecast2 (multi-bitrate)
output.icecast(
  %mp3(bitrate=192),
  host="localhost", port=8000,
  password="***", mount="/stream",
  radio
)
output.icecast(
  %fdkaac(bitrate=128),
  host="localhost", port=8000,
  password="***", mount="/stream-aac",
  radio
)`
}
