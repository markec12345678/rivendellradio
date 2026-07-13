import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AES67 / SMPTE ST 2110 / NMOS — Professional Audio-over-IP Interconnect.
 *
 * AES67: Audio over IP interoperability standard (RTP, PTP, SAP/SDP discovery)
 * SMPTE ST 2110: Professional media over managed IP networks
 *   - ST 2110-10: System timing + alignment (PTP)
 *   - ST 2110-20: Uncompressed video
 *   - ST 2110-30: AES67 audio
 *   - ST 2110-40: ANC data
 * NMOS (IS-04/IS-05/IS-08): Discovery + connection management + audio mapping
 *
 * This enables integration with professional broadcast infrastructure:
 *   - Lawo V_pro8, Riedel, Grass Valley, Ross Video
 *   - Dante (via AES67 mode), Ravenna, Livewire
 *   - SMPTE 2110 production switchers + routers
 *
 * GET  /api/v1/aes67         — nodes, senders, receivers, PTP status
 * POST /api/v1/aes67         — route audio, register node, configure PTP
 */

interface Aes67Node {
  id: string
  type: 'sender' | 'receiver' | 'node'
  name: string
  vendor: string
  model: string
  firmware: string
  // NMOS IS-04 registration
  nmosId: string
  nmosVersion: string
  // Network
  ip: string
  port: number
  // PTP (Precision Time Protocol)
  ptpDomain: number
  ptpStatus: 'locked' | 'freewheel' | 'acquiring' | 'unlocked'
  ptpGrandmasterId: string | null
  ptpOffsetNs: number
  // Audio streams
  streams: Aes67Stream[]
  // Status
  lastSeenAt: string
  health: 'healthy' | 'degraded' | 'offline'
}

interface Aes67Stream {
  id: string
  nodeId: string
  direction: 'send' | 'receive'
  // SDP (Session Description Protocol)
  sdp: string
  // Audio
  channels: number
  sampleRate: number
  bitDepth: number
  codec: 'L16' | 'L24' | 'L32' | 'AM824'
  packetTime: number // microseconds (125, 250, 333, 1000, 4000)
  // RTP
  rtpPayloadType: number
  ssrc: number
  // Routing
  connectedReceiver?: string
  // Metrics
  packetsPerSec: number
  packetLossPct: number
  jitterMs: number
  latencyMs: number
}

interface NmosConnection {
  id: string
  senderId: string
  receiverId: string
  status: 'connected' | 'pending' | 'disconnected' | 'error'
  connectedAt: string | null
  // ST 2110-10 timing
  ptAligned: boolean
  // Transport
  transportFile: string // SDP URL
  transportType: 'urn:x-nmos:transport:rtp'
  // Metrics
  bandwidthMbps: number
}

const NODES: Aes67Node[] = [
  {
    id: 'node-001', type: 'sender', name: 'Studio A — Main Output', vendor: 'Lawo', model: 'V_pro8', firmware: '4.2.1',
    nmosId: 'a4b8c2d3-e5f6-7890-abcd-ef1234567890', nmosVersion: 'IS-04 v1.3',
    ip: '10.10.1.10', port: 5004,
    ptpDomain: 0, ptpStatus: 'locked', ptpGrandmasterId: 'GM-001', ptpOffsetNs: 12,
    streams: [
      { id: 'str-001', nodeId: 'node-001', direction: 'send', sdp: 'v=0\no=- 1234 1 IN IP4 10.10.1.10\ns=Studio A Main\nm=audio 5004 RTP/AVP 97\nc=IN IP4 239.10.10.1/32\nt=0 0\na=rtpmap:97 L24/48000/2\na=ptime:0.125', channels: 2, sampleRate: 48000, bitDepth: 24, codec: 'L24', packetTime: 125, rtpPayloadType: 97, ssrc: 12345678, packetsPerSec: 8000, packetLossPct: 0.001, jitterMs: 0.05, latencyMs: 0.5 },
      { id: 'str-002', nodeId: 'node-001', direction: 'send', sdp: 'v=0\n...', channels: 2, sampleRate: 48000, bitDepth: 24, codec: 'L24', packetTime: 125, rtpPayloadType: 97, ssrc: 12345679, packetsPerSec: 8000, packetLossPct: 0.001, jitterMs: 0.06, latencyMs: 0.5 },
    ],
    lastSeenAt: new Date().toISOString(), health: 'healthy',
  },
  {
    id: 'node-002', type: 'receiver', name: 'FM Transmitter — Input', vendor: 'RVR', model: 'T60-IP', firmware: '2.0.3',
    nmosId: 'b5c9d3e4-f6a7-8901-bcde-f12345678901', nmosVersion: 'IS-04 v1.3',
    ip: '10.10.1.20', port: 5004,
    ptpDomain: 0, ptpStatus: 'locked', ptpGrandmasterId: 'GM-001', ptpOffsetNs: 18,
    streams: [],
    lastSeenAt: new Date().toISOString(), health: 'healthy',
  },
  {
    id: 'node-003', type: 'sender', name: 'Studio B — Backup Output', vendor: 'Riedel', model: 'Bolero', firmware: '3.1.0',
    nmosId: 'c6d0e4f5-a7b8-9012-cdef-012345678901', nmosVersion: 'IS-04 v1.3',
    ip: '10.10.2.10', port: 5004,
    ptpDomain: 0, ptpStatus: 'locked', ptpGrandmasterId: 'GM-001', ptpOffsetNs: 15,
    streams: [],
    lastSeenAt: new Date().toISOString(), health: 'healthy',
  },
  {
    id: 'node-gm', type: 'node', name: 'PTP Grandmaster', vendor: 'Tektronix', model: 'SPG8000A', firmware: '5.1.2',
    nmosId: 'd7e1f5a6-b8c9-0123-def0-123456789012', nmosVersion: 'IS-04 v1.3',
    ip: '10.10.0.1', port: 319,
    ptpDomain: 0, ptpStatus: 'locked', ptpGrandmasterId: 'self', ptpOffsetNs: 0,
    streams: [],
    lastSeenAt: new Date().toISOString(), health: 'healthy',
  },
]

const CONNECTIONS: NmosConnection[] = [
  {
    id: 'conn-001', senderId: 'node-001', receiverId: 'node-002', status: 'connected',
    connectedAt: new Date(Date.now() - 86400000).toISOString(),
    ptAligned: true,
    transportFile: 'http://10.10.1.10/x-nmos/connection/v1.0/transportfile/str-001',
    transportType: 'urn:x-nmos:transport:rtp',
    bandwidthMbps: 4.6,
  },
]

const PTP_CONFIG = {
  domain: 0,
  grandmasterPriority1: 128,
  grandmasterPriority2: 128,
  clockClass: 248,
  clockAccuracy: 32,
  offsetScaledLogVariance: 65535,
  // ST 2110-10 alignment
  alignmentTimestamp: 'media',
  // Network
  multicastAddress: '224.0.1.129',
  ptpEventPort: 319,
  ptpGeneralPort: 320,
}

const CONFIG = {
  standard: 'AES67-2018 + SMPTE ST 2110-10/20/30/40',
  nmosVersion: 'IS-04 v1.3 + IS-05 v1.1 + IS-08 v1.0',
  discovery: 'mDNS/Bonjour + DNS-SD (_nmos-registration._tcp)',
  registrationApi: 'http://nmos-registrar:8080/x-nmos/registration/v1.3',
  connectionApi: 'http://node:8080/x-nmos/connection/v1.1',
  // Audio
  sampleRates: [44100, 48000, 96000],
  bitDepths: [16, 24, 32],
  packetTimes: [125, 250, 333, 1000, 4000], // microseconds
  codecs: ['L16', 'L24', 'L32', 'AM824'],
  // Network
  multicastRange: '239.10.10.0/24',
  rtpPort: 5004,
  // Interop
  danteInterop: true, // AES67 mode
  ravennaInterop: true,
  livewireInterop: true,
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 80))

  const activeStreams = NODES.flatMap((n) => n.streams)
  const totalBandwidth = activeStreams.reduce((s, str) => s + (str.channels * str.sampleRate * str.bitDepth / 8 / 1000000), 0)

  return NextResponse.json({
    _disclaimer: '🧩 ARCHITECTURE/SCHEMA — API defines AES67/ST 2110/NMOS data model + routing. Real audio streaming requires: (1) PTP grandmaster hardware, (2) AES67-capable audio interface (Lawo/Riedel/Dante), (3) managed multicast network. Current implementation is protocol schema + NMOS registry simulation.',
    standard: CONFIG.standard,
    nmos: CONFIG.nmosVersion,
    ptp: PTP_CONFIG,
    nodes: NODES,
    streams: activeStreams,
    connections: CONNECTIONS,
    stats: {
      totalNodes: NODES.length,
      senders: NODES.filter((n) => n.type === 'sender').length,
      receivers: NODES.filter((n) => n.type === 'receiver').length,
      activeStreams: activeStreams.length,
      activeConnections: CONNECTIONS.filter((c) => c.status === 'connected').length,
      ptpLocked: NODES.filter((n) => n.ptpStatus === 'locked').length,
      totalBandwidthMbps: Math.round(totalBandwidth * 100) / 100,
      avgJitterMs: Math.round(activeStreams.reduce((s, str) => s + str.jitterMs, 0) / activeStreams.length * 100) / 100,
      avgPacketLoss: activeStreams.reduce((s, str) => s + str.packetLossPct, 0) / activeStreams.length,
    },
    tech: {
      aes67: 'AES67-2018 — Audio over IP interoperability (RTP, PTP, SAP/SDP)',
      st2110: 'SMPTE ST 2110 — Professional media over managed IP networks',
      st2110_10: 'System timing + alignment (PTP, genlock)',
      st2110_20: 'Uncompressed video essence',
      st2110_30: 'AES67 audio essence',
      st2110_40: 'ANC data (VANC/HANC)',
      nmos: 'AMWA NMOS — Networked Media Open Specifications',
      nmos_is04: 'IS-04 — Discovery + registration (mDNS + REST API)',
      nmos_is05: 'IS-05 — Connection management (transport file, SDP)',
      nmos_is08: 'IS-08 — Audio channel mapping',
      ptp: 'IEEE 1588-2019 PTPv2 — Precision Time Protocol (sub-microsecond sync)',
      rtp: 'RFC 3550 — Real-time Transport Protocol',
      sdp: 'RFC 4566 — Session Description Protocol',
      sap: 'RFC 2974 — Session Announcement Protocol',
    },
    interop: {
      dante: 'Dante (Audinate) — AES67 mode enables interop',
      ravenna: 'Ravenna (ALC NetworX) — native AES67',
      livewire: 'Livewire+ (Axia) — AES67 mode',
      lawo: 'Lawo V_pro8 — native ST 2110',
      riedel: 'Riedel Artist/Bolero — native AES67',
      danteVirtual: 'Dante Virtual Soundcard — AES67 bridge',
    },
    comparedTo: {
      dante: 'Audinate Dante — dominant in pro audio (proprietary, AES67 interop mode)',
      ravenna: 'ALC NetworX Ravenna — open AES67 implementation',
      livewire: 'Axia Livewire+ — Telos Alliance ecosystem',
      rock887: 'NMOS IS-04/05/08 + AES67 + ST 2110 — open standards, vendor-neutral',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (body.action === 'register-node' && body.node) {
    const node: Aes67Node = {
      id: `node-${Date.now()}`, type: body.node.type ?? 'sender', name: body.node.name ?? 'New Node',
      vendor: body.node.vendor ?? 'Unknown', model: body.node.model ?? 'Unknown', firmware: body.node.firmware ?? '1.0.0',
      nmosId: body.node.nmosId ?? `nmos-${Date.now()}`, nmosVersion: 'IS-04 v1.3',
      ip: body.node.ip ?? '0.0.0.0', port: 5004,
      ptpDomain: 0, ptpStatus: 'acquiring', ptpGrandmasterId: null, ptpOffsetNs: 0,
      streams: [], lastSeenAt: new Date().toISOString(), health: 'healthy',
    }
    NODES.push(node)
    return NextResponse.json({ ok: true, node, message: `Node "${node.name}" registered via NMOS IS-04` })
  }

  if (body.action === 'route' && body.senderId && body.receiverId) {
    const sender = NODES.find((n) => n.id === body.senderId)
    const receiver = NODES.find((n) => n.id === body.receiverId)
    if (!sender || !receiver) return NextResponse.json({ error: 'Sender or receiver not found' }, { status: 404 })

    const conn: NmosConnection = {
      id: `conn-${Date.now()}`, senderId: body.senderId, receiverId: body.receiverId,
      status: 'connected', connectedAt: new Date().toISOString(),
      ptAligned: true,
      transportFile: `http://${sender.ip}/x-nmos/connection/v1.0/transportfile/${sender.streams[0]?.id ?? 'str-0'}`,
      transportType: 'urn:x-nmos:transport:rtp',
      bandwidthMbps: 4.6,
    }
    CONNECTIONS.push(conn)
    return NextResponse.json({ ok: true, conn, message: `NMOS IS-05 routed: ${sender.name} → ${receiver.name}` })
  }

  if (body.action === 'unroute' && body.connectionId) {
    const c = CONNECTIONS.find((x) => x.id === body.connectionId)
    if (c) { c.status = 'disconnected'; return NextResponse.json({ ok: true, conn: c }) }
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 })
}
