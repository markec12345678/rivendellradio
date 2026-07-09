'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Mic, SlidersHorizontal, Zap, GitBranch, Radio, RadioTower,
  Server, Globe, Users, AlertCircle, CheckCircle2, AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface TopologyNode {
  id: string
  name: string
  type: string
  icon: string
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  metrics: Record<string, number | string | undefined>
  position: { x: number; y: number }
  description: string
}

interface TopologyConnection {
  from: string
  to: string
  status: 'healthy' | 'warning' | 'critical'
  latencyMs: number
  packetLoss: number
  protocol: string
  label: string
}

const nodeIcons: Record<string, LucideIcon> = {
  mic: Mic,
  sliders: SlidersHorizontal,
  zap: Zap,
  'git-branch': GitBranch,
  radio: Radio,
  tower: RadioTower,
  server: Server,
  globe: Globe,
  users: Users,
}

const statusColors = {
  healthy: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  warning: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  critical: { border: 'border-destructive/40', bg: 'bg-destructive/10', text: 'text-destructive', dot: 'bg-destructive' },
  offline: { border: 'border-border', bg: 'bg-secondary/40', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

const connectionColors = {
  healthy: 'bg-emerald-500/50',
  warning: 'bg-amber-500/50',
  critical: 'bg-destructive/50',
}

export function TopologyPanel() {
  const [data, setData] = useState<{ nodes: TopologyNode[]; connections: TopologyConnection[]; summary: Record<string, unknown>; paths: Record<string, unknown> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/topology').then(r => r.json()).then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <Card className="border-border bg-card/80"><CardContent className="p-4"><Skeleton className="h-96 w-full" /></CardContent></Card>
  }

  if (!data) return null

  const getNode = (id: string) => data.nodes.find((n) => n.id === id)

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-primary" aria-hidden="true" />
          Broadcast Topology
          <Badge variant="outline" className={cn(
            'text-[10px]',
            data.summary.overallStatus === 'healthy' ? 'border-emerald-500/40 text-emerald-400' :
            data.summary.overallStatus === 'warning' ? 'border-amber-500/40 text-amber-400' :
            'border-destructive/40 text-destructive',
          )}>
            {String(data.summary.overallStatus).toUpperCase()}
          </Badge>
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
            {String(data.summary.totalListeners)} listeners · FM {String(data.summary.fmLatencyMs)}ms · Stream {String(data.summary.streamLatencyMs)}ms
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Visual topology */}
        <div className="relative h-[400px] overflow-hidden rounded-lg border border-border/40 bg-background/40">
          {/* SVG connections */}
          <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: 'none' }}>
            {data.connections.map((conn, idx) => {
              const from = getNode(conn.from)
              const to = getNode(conn.to)
              if (!from || !to) return null
              const x1 = (from.position.x / 100) * 100
              const y1 = (from.position.y / 100) * 100
              const x2 = (to.position.x / 100) * 100
              const y2 = (to.position.y / 100) * 100
              return (
                <g key={idx}>
                  <line
                    x1={`${x1}%`} y1={`${y1}%`}
                    x2={`${x2}%`} y2={`${y2}%`}
                    className={cn(
                      'stroke-2',
                      conn.status === 'healthy' ? 'stroke-emerald-500/40' :
                      conn.status === 'warning' ? 'stroke-amber-500/40' :
                      'stroke-destructive/40',
                    )}
                    strokeDasharray={conn.status === 'warning' ? '4 2' : undefined}
                  />
                  {/* Latency label at midpoint */}
                  <text
                    x={`${(x1 + x2) / 2}%`}
                    y={`${(y1 + y2) / 2 - 2}%`}
                    className="fill-muted-foreground text-[8px]"
                    textAnchor="middle"
                  >
                    {conn.latencyMs}ms
                  </text>
                  {conn.packetLoss > 0 && (
                    <text
                      x={`${(x1 + x2) / 2}%`}
                      y={`${(y1 + y2) / 2 + 6}%`}
                      className={cn('text-[7px]', conn.packetLoss > 0.01 ? 'fill-amber-400' : 'fill-muted-foreground')}
                      textAnchor="middle"
                    >
                      {conn.packetLoss}% loss
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Nodes */}
          {data.nodes.map((node) => {
            const Icon = nodeIcons[node.icon] ?? Server
            const sc = statusColors[node.status]
            const isSelected = selectedNode === node.id
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
              >
                <div className={cn(
                  'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all',
                  sc.border, sc.bg,
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}>
                  <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', sc.bg)}>
                    <Icon className={cn('h-4 w-4', sc.text)} aria-hidden="true" />
                  </div>
                  <span className="whitespace-nowrap text-[9px] font-medium text-foreground">{node.name}</span>
                  {node.metrics.listeners && (
                    <span className="font-mono text-[8px] text-muted-foreground">{node.metrics.listeners}</span>
                  )}
                  {node.metrics.signalLevel != null && (
                    <span className="font-mono text-[7px] text-muted-foreground">{node.metrics.signalLevel}dB</span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Selected node detail */}
        {selectedNode && (() => {
          const node = getNode(selectedNode)
          if (!node) return null
          const sc = statusColors[node.status]
          const incoming = data.connections.filter((c) => c.to === node.id)
          const outgoing = data.connections.filter((c) => c.from === node.id)
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-md border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('h-2 w-2 rounded-full', sc.dot)} />
                <span className="text-sm font-medium text-foreground">{node.name}</span>
                <Badge variant="outline" className={cn('text-[9px]', sc.border, sc.text)}>
                  {node.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{node.description}</p>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                {Object.entries(node.metrics).map(([key, val]) => (
                  val != null && (
                    <div key={key} className="rounded border border-border/40 bg-background/40 px-2 py-1">
                      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{key}</div>
                      <div className="font-mono text-foreground">{String(val)}</div>
                    </div>
                  )
                ))}
              </div>
              {/* Connections */}
              {(incoming.length > 0 || outgoing.length > 0) && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {incoming.length > 0 && (
                    <div>
                      <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Incoming</div>
                      {incoming.map((c, i) => (
                        <div key={i} className="text-[9px] text-muted-foreground">
                          <span className="text-foreground">{getNode(c.from)?.name}</span> → {c.protocol} ({c.latencyMs}ms)
                        </div>
                      ))}
                    </div>
                  )}
                  {outgoing.length > 0 && (
                    <div>
                      <div className="text-[8px] uppercase tracking-wider text-muted-foreground mb-1">Outgoing</div>
                      {outgoing.map((c, i) => (
                        <div key={i} className="text-[9px] text-muted-foreground">
                          → <span className="text-foreground">{getNode(c.to)?.name}</span> · {c.protocol} ({c.latencyMs}ms)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })()}

        {/* Path summary */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={cn('rounded-md border p-2', data.paths.fm?.status === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
            <div className="flex items-center gap-1.5">
              <RadioTower className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-foreground">FM Path</span>
              <Badge variant="outline" className={cn('text-[8px]', data.paths.fm?.status === 'healthy' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400')}>
                {String(data.paths.fm?.status).toUpperCase()}
              </Badge>
            </div>
            <div className="mt-1 font-mono text-[9px] text-muted-foreground">
              {String(data.paths.fm?.latencyMs)}ms · {String(data.paths.fm?.packetLoss)}% loss · {String(data.paths.fm?.listeners)} listeners
            </div>
          </div>
          <div className={cn('rounded-md border p-2', data.paths.stream?.status === 'healthy' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-foreground">Stream Path</span>
              <Badge variant="outline" className={cn('text-[8px]', data.paths.stream?.status === 'healthy' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400')}>
                {String(data.paths.stream?.status).toUpperCase()}
              </Badge>
            </div>
            <div className="mt-1 font-mono text-[9px] text-muted-foreground">
              {String(data.paths.stream?.latencyMs)}ms · {String(data.paths.stream?.packetLoss)}% loss · {String(data.paths.stream?.listeners)} listeners
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
