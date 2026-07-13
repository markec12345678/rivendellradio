'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu, Activity, Clock, Server, ShieldCheck, AlertCircle, CheckCircle2, XCircle,
  Radio, HardDrive, Zap,
} from 'lucide-react'
import { useSystemStatus, useDaemons } from '@/lib/rivendell/api'
import { useLiveStore } from '@/lib/stores/live'
import { RdsPanel } from '@/components/rivendell/rds-panel'
import { SnmpPanel } from '@/components/rivendell/snmp-panel'
import { GpioPanel } from '@/components/rivendell/gpio-panel'
import { ProductionReadinessPanel } from '@/components/rivendell/production-readiness-panel'
import { IncidentTimeline, CopilotChat } from '@/components/rivendell/incident-copilot'
import { TopologyPanel } from '@/components/rivendell/topology-panel'
import { ReplayStudio } from '@/components/rivendell/replay-studio'
import { UpgradesPanel } from '@/components/rivendell/upgrades-panel'
import { EasPanel } from '@/components/rivendell/eas-panel'
import { InfrastructurePanel } from '@/components/rivendell/infrastructure-panel'
import { ModernizationPanel } from '@/components/rivendell/modernization-panel'
import { AIPlayoutPanel } from '@/components/rivendell/ai-playout-panel'
import { Sprint6Panel } from '@/components/rivendell/sprint6-panel'
import { Sprint7Panel } from '@/components/rivendell/sprint7-panel'
import { Sprint8Panel } from '@/components/rivendell/sprint8-panel'
import { Sprint9Panel } from '@/components/rivendell/sprint9-panel'
import { CollabPresenceIndicator } from '@/components/rivendell/collab-presence'
import { Sprint10Panel } from '@/components/rivendell/sprint10-panel'
import { Sprint11Panel } from '@/components/rivendell/sprint11-panel'
import { ReliabilityDashboard } from '@/components/rivendell/reliability-dashboard'
import { ObservabilityPanel } from '@/components/rivendell/observability-panel'
import { ProfessionalBroadcastPanel } from '@/components/rivendell/professional-broadcast-panel'
import { AIRadioControlPanel } from '@/components/rivendell/ai-radio-control-panel'
import { GovernanceDashboard } from '@/components/rivendell/governance-dashboard'
import { formatHms, formatClock, formatNumber } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SystemTab() {
  const status = useSystemStatus()
  const daemons = useDaemons()
  const now = useLiveStore((s) => s.now)
  const daemonLoads = useLiveStore((s) => s.daemonLoads)
  const feedConnected = useLiveStore((s) => s.feedConnected)

  const uptime = status.data?.uptime ?? 0

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Cpu className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">System Status</h1>
        {status.data && (
          <Badge variant="outline" className={cn(
            'border-emerald-500/40 text-emerald-400',
            !status.data.online && 'border-destructive/40 text-destructive',
          )}>
            <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', status.data.online ? 'bg-emerald-400 animate-pulse' : 'bg-destructive')} />
            {status.data.online ? 'ONLINE' : 'OFFLINE'}
          </Badge>
        )}
      </div>

      {/* Studio Clock + System overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Studio Clock (Zetta signature feature) */}
        <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
              Studio Clock
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-6">
            <div className="relative">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-primary/30 bg-background/40"
              >
                <span
                  className="font-mono text-3xl font-bold tabular-nums text-primary"
                  suppressHydrationWarning
                >
                  {now ? formatClock(now).slice(0, 5) : '--:--'}
                </span>
              </motion.div>
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary" />
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Radio className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span className="text-[10px] text-emerald-400">ON AIR</span>
                <span className="mx-1 text-border">·</span>
                <span className="text-[10px] text-muted-foreground">Rock 88.7 FM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System overview */}
        <Card className="border-border bg-card/80 lg:col-span-2">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4 text-primary" aria-hidden="true" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {status.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : status.data ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard icon={Activity} label="Version" value={status.data.version} color="amber" />
                <StatCard icon={HardDrive} label="DB Schema" value={String(status.data.schemaVersion)} color="blue" />
                <StatCard icon={Clock} label="Uptime" value={formatHms(uptime * 1000)} color="emerald" />
                <StatCard icon={Zap} label="Daemons" value={`${status.data.daemonsRunning}/${status.data.daemonsTotal}`} color="purple" />
                <StatCard icon={Server} label="Tracks" value={formatNumber(status.data.tracks)} color="amber" />
                <StatCard icon={Radio} label="Stations" value={String(status.data.stations)} color="emerald" />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Daemons grid */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Daemons
            {daemons.data && (
              <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
                {daemons.data.running}/{daemons.data.count} running
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Rivendell background services — real-time CPU and memory usage
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {daemons.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : daemons.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {daemons.data.daemons.map((daemon) => {
                const liveLoad = daemonLoads[daemon.name]
                const cpu = liveLoad?.cpuPercent ?? daemon.cpuPercent
                const mem = liveLoad?.memoryMb ?? daemon.memoryMb
                return (
                  <motion.div
                    key={daemon.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-md border p-3',
                      daemon.status === 'running' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      daemon.status === 'faulted' ? 'border-destructive/30 bg-destructive/5' :
                      'border-border bg-secondary/20',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {daemon.status === 'running' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        ) : daemon.status === 'faulted' ? (
                          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        )}
                        <span className="font-mono text-sm font-semibold text-foreground">{daemon.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px]',
                          daemon.status === 'running' ? 'border-emerald-500/40 text-emerald-400' :
                          daemon.status === 'faulted' ? 'border-destructive/40 text-destructive' :
                          'border-border text-muted-foreground',
                        )}
                      >
                        {daemon.status.toUpperCase()}
                      </Badge>
                    </div>
                    {daemon.status === 'running' && (
                      <div className="mt-2 space-y-1.5">
                        <div>
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                            <span>CPU</span>
                            <span className="font-mono text-foreground">{cpu.toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(cpu, 100)} className="mt-0.5 h-1 bg-secondary/60 [&>div]:bg-primary" />
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>Memory</span>
                          <span className="font-mono text-foreground">{mem} MB</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>PID</span>
                          <span className="font-mono text-foreground">{daemon.pid}</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>Uptime</span>
                          <span className="font-mono text-foreground">{formatHms(daemon.uptime * 1000)}</span>
                        </div>
                      </div>
                    )}
                    {daemon.status !== 'running' && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        PID: <span className="font-mono text-foreground">{daemon.pid || '—'}</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Feed status + Detached Playout */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              WebSocket Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-md',
              feedConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive',
            )}>
              {feedConnected ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {feedConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Port 3003 · {feedConnected ? 'Real-time telemetry active' : 'Awaiting connection…'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Detached Playout
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Protected</div>
              <div className="text-[10px] text-muted-foreground">
                Closing this dashboard will NOT interrupt on-air audio
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RDS / DAB+ Metadata Output */}
      <RdsPanel />

      {/* SNMP Device Monitoring */}
      <SnmpWrapper />

      {/* GPIO / GPI */}
      <GpioWrapper />

      {/* Production Readiness — Health + Backup */}
      <ProductionReadinessWrapper />

      {/* Live Collaboration Presence — Yjs CRDT demo */}
      <CollabPresenceIndicator />

      {/* Upgrades & Hardening — Top 10 quick wins */}
      <UpgradesPanel />

      {/* EAS / CAP Compliance — FCC 47 CFR Part 11 */}
      <EasPanel />

      {/* Infrastructure & DR — Sprint 3 */}
      <InfrastructurePanel />

      {/* Next.js 16 + React 19 Modernization — Sprint 4 */}
      <ModernizationPanel />

      {/* AI Radio Control — the brain that runs the radio */}
      <AIRadioControlPanel />

      {/* AI Governance & Trust Layer — Sprint 31 */}
      <GovernanceDashboard />

      {/* AI / Playout Engine — Sprint 5 */}
      <AIPlayoutPanel />

      {/* Traffic · Podcast · Engagement — Sprint 6 */}
      <Sprint6Panel />

      {/* Strategic XL + Advanced Features — Sprint 7 */}
      <Sprint7Panel />

      {/* DevOps + Collaboration + Compliance Depth — Sprint 8 */}
      <Sprint8Panel />

      {/* Final Polish + Missing Features — Sprint 9 */}
      <Sprint9Panel />

      {/* Next-Gen + Emerging Tech — Sprint 10 */}
      <Sprint10Panel />

      {/* Operational Excellence — Sprint 11 */}
      <Sprint11Panel />

      {/* Reliability Metrics & Production Proof — Sprint 12 */}
      <ReliabilityDashboard />

      {/* Observability + Performance — Sprint 13 */}
      <ObservabilityPanel />

      {/* Professional Broadcast Infrastructure — Sprint 15 */}
      <ProfessionalBroadcastPanel />

      {/* Broadcast Topology */}
      <TopologyPanel />

      {/* Incident Timeline + AI Copilot */}
      <div className="grid gap-4 lg:grid-cols-2">
        <IncidentTimelineWrapper />
        <CopilotChat />
      </div>

      {/* Replay Studio */}
      <ReplayStudio />
    </div>
  )
}

// Wrapper components that fetch data from v1 APIs

function SnmpWrapper() {
  const [data, setData] = useState<{ devices: unknown[]; healthScore: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/snmp').then(r => r.json()).then(d => {
      setData({ devices: d.devices ?? [], healthScore: d.healthScore ?? 0 })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return <SnmpPanel devices={data?.devices as never} healthScore={data?.healthScore} isLoading={loading} />
}

function GpioWrapper() {
  const [data, setData] = useState<{ inputs: unknown[]; outputs: unknown[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/gpio').then(r => r.json()).then(d => {
      setData({ inputs: d.inputs ?? [], outputs: d.outputs ?? [] })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return <GpioPanel inputs={data?.inputs as never} outputs={data?.outputs as never} isLoading={loading} />
}

function ProductionReadinessWrapper() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [backup, setBackup] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/health/diagnostics').then(r => r.json()).catch(() => null),
      fetch('/api/v1/backup').then(r => r.json()).catch(() => null),
    ]).then(([h, b]) => {
      setHealth(h)
      setBackup(b)
      setLoading(false)
    })
  }, [])

  return <ProductionReadinessPanel health={health as never} backup={backup as never} isLoading={loading} />
}

function IncidentTimelineWrapper() {
  const [data, setData] = useState<{ incidents: unknown[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/incidents').then(r => r.json()).then(d => {
      setData({ incidents: d.incidents ?? [] })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return <IncidentTimeline incidents={data?.incidents as never} isLoading={loading} />
}

function StatCard({ icon: Icon, label, value, color = 'amber' }: { icon: typeof Cpu; label: string; value: string; color?: 'amber' | 'emerald' | 'blue' | 'purple' }) {
  const colorMap = {
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className={cn('mb-1 flex h-8 w-8 items-center justify-center rounded-md', colorMap[color])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}
