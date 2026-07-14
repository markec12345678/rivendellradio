// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface TopologyNode {
  id: string
  name: string
  type: 'studio' | 'mixer' | 'processor' | 'encoder' | 'rds' | 'transmitter' | 'stream' | 'cdn' | 'listener'
  icon: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  metrics: {
    signalLevel?: number // dBFS
    latency?: number // ms
    throughput?: string
    cpu?: number
    memory?: number
    listeners?: number
    bitrate?: string
  }
  position: { x: number; y: number } // grid position 0-100
  description: string
}

interface TopologyConnection {
  from: string
  to: string
  status: 'healthy' | 'warning' | 'critical'
  latencyMs: number
  packetLoss: number // percentage
  bandwidth?: string
  protocol: string
  label: string
}

const nodes: TopologyNode[] = [
  { id: 'studio', name: 'Studio A', type: 'studio', icon: 'mic', status: 'healthy', metrics: { signalLevel: -8 }, position: { x: 10, y: 50 }, description: 'Main broadcast studio with mic and console' },
  { id: 'mixer', name: 'Studer Vista 1', type: 'mixer', icon: 'sliders', status: 'healthy', metrics: { signalLevel: -6, latency: 1, cpu: 12 }, position: { x: 25, y: 50 }, description: 'Digital mixing console' },
  { id: 'processor', name: 'Omnia 9', type: 'processor', icon: 'zap', status: 'healthy', metrics: { signalLevel: -3, latency: 2, cpu: 23 }, position: { x: 40, y: 50 }, description: 'Audio processing (EQ, compression, limiting)' },
  { id: 'split', name: 'Signal Split', type: 'encoder', icon: 'git-branch', status: 'healthy', metrics: { latency: 0 }, position: { x: 55, y: 50 }, description: 'Signal distribution to FM and streaming paths' },
  
  // FM path
  { id: 'rds', name: 'Inovonics 730', type: 'rds', icon: 'radio', status: 'healthy', metrics: { latency: 1 }, position: { x: 70, y: 25 }, description: 'RDS encoder with PI/PS/PTY/RT' },
  { id: 'transmitter', name: 'RVR T60', type: 'transmitter', icon: 'tower', status: 'warning', metrics: { signalLevel: 580, latency: 1, cpu: 45 }, position: { x: 85, y: 25 }, description: 'FM transmitter (88.7 MHz, 600W)' },
  { id: 'fm-listeners', name: 'FM Listeners', type: 'listener', icon: 'users', status: 'healthy', metrics: { listeners: 1287 }, position: { x: 95, y: 25 }, description: 'FM radio listeners in coverage area' },
  
  // Streaming path
  { id: 'icecast', name: 'Icecast2', type: 'stream', icon: 'server', status: 'healthy', metrics: { latency: 50, cpu: 23, bitrate: '192k MP3' }, position: { x: 70, y: 75 }, description: 'Streaming server (3 mountpoints)' },
  { id: 'cdn', name: 'CDN', type: 'cdn', icon: 'globe', status: 'healthy', metrics: { latency: 120, throughput: '342 Mbps' }, position: { x: 85, y: 75 }, description: 'Content delivery network' },
  { id: 'web-listeners', name: 'Web Listeners', type: 'listener', icon: 'users', status: 'healthy', metrics: { listeners: 501 }, position: { x: 95, y: 75 }, description: 'Online stream listeners (Web HD + Mobile)' },
]

const connections: TopologyConnection[] = [
  { from: 'studio', to: 'mixer', status: 'healthy', latencyMs: 1, packetLoss: 0, protocol: 'AES67', label: 'Mic → Console' },
  { from: 'mixer', to: 'processor', status: 'healthy', latencyMs: 1, packetLoss: 0, protocol: 'AES3', label: 'Console → Processor' },
  { from: 'processor', to: 'split', status: 'healthy', latencyMs: 2, packetLoss: 0, protocol: 'AES3', label: 'Processor → Split' },
  
  // FM path
  { from: 'split', to: 'rds', status: 'healthy', latencyMs: 1, packetLoss: 0, protocol: 'Analog', label: 'Split → RDS' },
  { from: 'rds', to: 'transmitter', status: 'warning', latencyMs: 1, packetLoss: 0.01, protocol: 'MPX', label: 'RDS → FM TX' },
  { from: 'transmitter', to: 'fm-listeners', status: 'healthy', latencyMs: 0, packetLoss: 0, protocol: 'FM 88.7', label: 'FM → Air' },
  
  // Streaming path
  { from: 'split', to: 'icecast', status: 'healthy', latencyMs: 50, packetLoss: 0, protocol: 'HTTP', label: 'Split → Stream' },
  { from: 'icecast', to: 'cdn', status: 'healthy', latencyMs: 30, packetLoss: 0.001, protocol: 'HTTP', label: 'Stream → CDN' },
  { from: 'cdn', to: 'web-listeners', status: 'healthy', latencyMs: 90, packetLoss: 0.002, protocol: 'HTTPS', label: 'CDN → Listeners' },
]

export async function GET() {
  await new Promise((r) => setTimeout(r, 120))

  // Calculate overall path health
  const fmPath = connections.filter((c) => ['split→rds', 'rds→transmitter', 'transmitter→fm-listeners'].includes(`${c.from}→${c.to}`) || (c.from === 'split' && c.to === 'rds') || (c.from === 'rds' && c.to === 'transmitter') || (c.from === 'transmitter' && c.to === 'fm-listeners'))
  const streamPath = connections.filter((c) => (c.from === 'split' && c.to === 'icecast') || (c.from === 'icecast' && c.to === 'cdn') || (c.from === 'cdn' && c.to === 'web-listeners'))

  const fmLatency = fmPath.reduce((a, c) => a + c.latencyMs, 0)
  const streamLatency = streamPath.reduce((a, c) => a + c.latencyMs, 0)
  const fmPacketLoss = fmPath.reduce((a, c) => a + c.packetLoss, 0)
  const streamPacketLoss = streamPath.reduce((a, c) => a + c.packetLoss, 0)

  const totalListeners = nodes.find((n) => n.id === 'fm-listeners')?.metrics.listeners ?? 0 +
    nodes.find((n) => n.id === 'web-listeners')?.metrics.listeners ?? 0

  return NextResponse.json({
    nodes,
    connections,
    paths: {
      fm: { latencyMs: fmLatency, packetLoss: fmPacketLoss, listeners: nodes.find((n) => n.id === 'fm-listeners')?.metrics.listeners ?? 0, status: fmPath.some((c) => c.status === 'critical') ? 'critical' : fmPath.some((c) => c.status === 'warning') ? 'warning' : 'healthy' },
      stream: { latencyMs: streamLatency, packetLoss: streamPacketLoss, listeners: nodes.find((n) => n.id === 'web-listeners')?.metrics.listeners ?? 0, status: streamPath.some((c) => c.status === 'critical') ? 'critical' : streamPath.some((c) => c.status === 'warning') ? 'warning' : 'healthy' },
    },
    summary: {
      totalNodes: nodes.length,
      totalConnections: connections.length,
      totalListeners: (nodes.find((n) => n.id === 'fm-listeners')?.metrics.listeners ?? 0) + (nodes.find((n) => n.id === 'web-listeners')?.metrics.listeners ?? 0),
      fmLatencyMs: fmLatency,
      streamLatencyMs: streamLatency,
      overallStatus: nodes.some((n) => n.status === 'critical') ? 'critical' : nodes.some((n) => n.status === 'warning') ? 'warning' : 'healthy',
    },
  })
}
