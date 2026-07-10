import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * SRT (Secure Reliable Transport) Listener for Remote Studio / OB-Van Contribution.
 *
 * SRT delivers broadcast-grade audio at 200-500ms latency over lossy links (vs 2-10s
 * for Icecast buffering). Used by Tieline, Comrex, DEVA, and field mixers worldwide.
 *
 * GET  /api/v1/srt         — current listener state + active connections
 * POST /api/v1/srt         — create new SRT listener stream (returns passphrase + port)
 * DELETE /api/v1/srt?id=X  — disconnect a specific connection
 *
 * Production: srt-live-server listens on UDP port, this API queries SLR stats endpoint.
 * Sandbox: simulated connection state.
 */

interface SrtConnection {
  id: string
  streamId: string       // SRT stream_id (caller-provided identifier)
  remoteIp: string
  remotePort: number
  direction: 'publish' | 'subscribe'  // publish = contribution (incoming), subscribe = distribution
  connectedAt: string
  bytesReceived: number
  bytesSent: number
  // SRT statistics
  rttMs: number           // round-trip time
  packetLossPct: number   // packet loss percentage
  bandwidthMbps: number   // measured bandwidth
  latencyMs: number       // configured SRT latency (typically 120-1000ms)
  passphrase: string      // AES-128 passphrase (masked)
  encryption: 'aes-128' | 'aes-256' | 'none'
  audioCodec: string      // opus, aac, pcm_s16le, etc.
  audioChannels: number
  sampleRateHz: number
  status: 'connected' | 'idle' | 'error' | 'disconnected'
  quality: 'excellent' | 'good' | 'fair' | 'poor'
}

interface SrtListener {
  port: number
  bindAddress: string
  latencyMs: number
  maxConnections: number
  activeConnections: number
  passphrase: string
  passphraseMasked: string
  encryption: 'aes-128' | 'aes-256' | 'none'
  enabled: boolean
}

const LISTENER: SrtListener = {
  port: 9000,
  bindAddress: '0.0.0.0',
  latencyMs: 200,
  maxConnections: 8,
  activeConnections: 2,
  passphrase: 'rock887-srt-contribution-2026',
  passphraseMasked: 'rock887-********-2026',
  encryption: 'aes-128',
  enabled: true,
}

// Active connections (simulated)
const CONNECTIONS: SrtConnection[] = [
  {
    id: 'srt-conn-001',
    streamId: 'morning-show-remote',
    remoteIp: '203.0.113.42',
    remotePort: 54321,
    direction: 'publish',
    connectedAt: new Date(Date.now() - 3600000).toISOString(),
    bytesReceived: 1843200000,
    bytesSent: 24576,
    rttMs: 42,
    packetLossPct: 0.02,
    bandwidthMbps: 1.5,
    latencyMs: 200,
    passphrase: '***',
    encryption: 'aes-128',
    audioCodec: 'opus',
    audioChannels: 2,
    sampleRateHz: 48000,
    status: 'connected',
    quality: 'excellent',
  },
  {
    id: 'srt-conn-002',
    streamId: 'ob-van-sports',
    remoteIp: '198.51.100.7',
    remotePort: 49152,
    direction: 'publish',
    connectedAt: new Date(Date.now() - 1800000).toISOString(),
    bytesReceived: 921600000,
    bytesSent: 20480,
    rttMs: 87,
    packetLossPct: 0.15,
    bandwidthMbps: 1.2,
    latencyMs: 250,
    passphrase: '***',
    encryption: 'aes-128',
    audioCodec: 'pcm_s16le',
    audioChannels: 2,
    sampleRateHz: 48000,
    status: 'connected',
    quality: 'good',
  },
]

function computeQuality(conn: Pick<SrtConnection, 'rttMs' | 'packetLossPct' | 'bandwidthMbps'>): SrtConnection['quality'] {
  if (conn.rttMs < 50 && conn.packetLossPct < 0.05 && conn.bandwidthMbps > 1.0) return 'excellent'
  if (conn.rttMs < 100 && conn.packetLossPct < 0.2 && conn.bandwidthMbps > 0.8) return 'good'
  if (conn.rttMs < 200 && conn.packetLossPct < 1.0) return 'fair'
  return 'poor'
}

export async function GET(req: Request) {
  await new Promise((r) => setTimeout(r, 80))
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  // Single connection detail
  if (id) {
    const conn = CONNECTIONS.find((c) => c.id === id)
    if (!conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }
    return NextResponse.json({ connection: conn })
  }

  // Simulate live stat updates
  for (const c of CONNECTIONS) {
    if (c.status === 'connected') {
      c.rttMs = Math.max(20, c.rttMs + (Math.random() - 0.5) * 10)
      c.packetLossPct = Math.max(0, c.packetLossPct + (Math.random() - 0.5) * 0.05)
      c.bandwidthMbps = Math.max(0.5, c.bandwidthMbps + (Math.random() - 0.5) * 0.1)
      c.bytesReceived += Math.floor(c.bandwidthMbps * 125000 * 0.1)
      c.quality = computeQuality(c)
    }
  }

  const totalRtt = CONNECTIONS.filter((c) => c.status === 'connected').reduce((s, c) => s + c.rttMs, 0)
  const connectedCount = CONNECTIONS.filter((c) => c.status === 'connected').length
  const avgRtt = connectedCount > 0 ? totalRtt / connectedCount : 0
  const avgLoss = connectedCount > 0 ? CONNECTIONS.reduce((s, c) => s + c.packetLossPct, 0) / connectedCount : 0
  const totalBandwidth = CONNECTIONS.filter((c) => c.status === 'connected').reduce((s, c) => s + c.bandwidthMbps, 0)

  return NextResponse.json({
    listener: LISTENER,
    stats: {
      activeConnections: connectedCount,
      maxConnections: LISTENER.maxConnections,
      avgRttMs: Math.round(avgRtt * 10) / 10,
      avgPacketLossPct: Math.round(avgLoss * 1000) / 1000,
      totalBandwidthMbps: Math.round(totalBandwidth * 100) / 100,
      totalBytesReceived: CONNECTIONS.reduce((s, c) => s + c.bytesReceived, 0),
    },
    connections: CONNECTIONS,
    config: {
      protocol: 'SRT (Secure Reliable Transport)',
      version: '1.5.3',
      mode: 'listener',
      server: 'srt-live-server',
      encryptionStandard: 'AES-CTR (RFC 3686)',
      defaultLatencyMs: 200,
      recommendedLatencyRange: '120-1000ms',
      supportedCodecs: ['opus', 'aac', 'pcm_s16le', 'mp3', 'flac'],
      wellKnownTools: ['Tieline Bridge-IT', 'Comrex ACCESS', 'DEVA SmartGen', ' VLC', 'ffmpeg', 'OBS Studio'],
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  // Create new connection slot
  if (body.action === 'create' || body.streamId) {
    if (CONNECTIONS.length >= LISTENER.maxConnections) {
      return NextResponse.json(
        { error: `Max connections (${LISTENER.maxConnections}) reached` },
        { status: 409 },
      )
    }

    const streamId = body.streamId ?? `stream-${Date.now()}`
    const conn: SrtConnection = {
      id: `srt-conn-${Date.now()}`,
      streamId,
      remoteIp: body.remoteIp ?? '0.0.0.0',
      remotePort: body.remotePort ?? 0,
      direction: body.direction ?? 'publish',
      connectedAt: new Date().toISOString(),
      bytesReceived: 0,
      bytesSent: 0,
      rttMs: 0,
      packetLossPct: 0,
      bandwidthMbps: 0,
      latencyMs: body.latencyMs ?? LISTENER.latencyMs,
      passphrase: '***',
      encryption: body.encryption ?? LISTENER.encryption,
      audioCodec: body.audioCodec ?? 'opus',
      audioChannels: body.channels ?? 2,
      sampleRateHz: body.sampleRate ?? 48000,
      status: 'idle',
      quality: 'excellent',
    }
    CONNECTIONS.push(conn)
    LISTENER.activeConnections = CONNECTIONS.filter((c) => c.status === 'connected').length

    return NextResponse.json({
      ok: true,
      connection: conn,
      connectCommand: `ffmpeg -re -i input.wav -c:a opus -b:a 128k -f mpegts 'srt://${LISTENER.bindAddress}:${LISTENER.port}?streamid=${streamId}&latency=${conn.latencyMs}&passphrase=${LISTENER.passphrase}'`,
    })
  }

  // Update listener config
  if (body.latencyMs !== undefined) LISTENER.latencyMs = Math.max(20, Math.min(5000, body.latencyMs))
  if (body.maxConnections !== undefined) LISTENER.maxConnections = Math.max(1, Math.min(64, body.maxConnections))
  if (body.encryption !== undefined) LISTENER.encryption = body.encryption
  if (body.enabled !== undefined) LISTENER.enabled = Boolean(body.enabled)
  if (body.passphrase) LISTENER.passphrase = body.passphrase

  return NextResponse.json({ ok: true, listener: { ...LISTENER, passphrase: LISTENER.passphraseMasked } })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query parameter required' }, { status: 400 })
  }

  const idx = CONNECTIONS.findIndex((c) => c.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const removed = CONNECTIONS.splice(idx, 1)[0]
  LISTENER.activeConnections = CONNECTIONS.filter((c) => c.status === 'connected').length

  return NextResponse.json({
    ok: true,
    disconnected: removed,
    message: `SRT connection ${removed.streamId} (${removed.remoteIp}) disconnected`,
  })
}
