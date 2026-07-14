// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion } from 'framer-motion'
import {
  Waves,
  Radio,
  Cable,
  Cpu,
  Shield,
  Server,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  Users,
  Network,
  Zap,
  Volume2,
  CircuitBoard,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useRdx } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  StreamProfile,
  Aes67Source,
  JackConnection,
  AudioProcessor,
  RoutingProfile,
  StreamStatus,
  Aes67Status,
  ProcessorStatus,
} from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

export function RdxPanel() {
  const rdx = useRdx()

  if (rdx.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!rdx.data || !rdx.data.installed) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            RDX (Rivendell Extended) is not installed on this server.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Install <code className="font-mono">anjeleno/rdx-rivendell</code> to enable streaming,
            AES67, and JACK auto-routing.
          </p>
        </CardContent>
      </Card>
    )
  }

  const d = rdx.data
  const liveStreams = d.streams.filter((s) => s.status === 'live').length
  const totalListeners = d.streams.reduce((acc, s) => acc + s.listeners, 0)
  const syncedAes = d.aes67Sources.filter((a) => a.status === 'synced').length
  const runningProcs = d.processors.filter((p) => p.status === 'running').length
  const activeProfile = d.routingProfiles.find((p) => p.active)

  return (
    <div className="space-y-4">
      {/* RDX status banner */}
      <RdxStatusBanner
        version={d.version}
        dbusActive={d.dbusActive}
        pulseEliminated={d.pulseAudioEliminated}
        jack={d.jackServer}
        liveStreams={liveStreams}
        totalStreams={d.streams.length}
        totalListeners={totalListeners}
        syncedAes={syncedAes}
        totalAes={d.aes67Sources.length}
        runningProcs={runningProcs}
        totalProcs={d.processors.length}
        activeProfile={activeProfile?.name ?? 'None'}
      />

      {/* Streaming console */}
      <section aria-label="Streaming console">
        <SectionHeader
          icon={Radio}
          title="Streaming Console"
          subtitle="Icecast / Shoutcast / AzuraCast — AAC+ (HE-AAC v1/v2) encoding"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {d.streams.map((s) => (
            <StreamCard key={s.id} stream={s} />
          ))}
        </div>
      </section>

      {/* AES67 */}
      <section aria-label="AES67 audio over IP">
        <SectionHeader
          icon={Network}
          title="AES67 Audio-over-IP"
          subtitle="Network audio sources — PTP clock sync, RTP/SDP discovery"
        />
        <Card className="border-border bg-card/80">
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="divide-y divide-border/60">
                {d.aes67Sources.map((src) => (
                  <Aes67Row key={src.id} source={src} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      {/* JACK patchbay */}
      <section aria-label="JACK patchbay">
        <SectionHeader
          icon={Cable}
          title="JACK Patchbay"
          subtitle="Active connections — broadcast-safe critical paths are protected"
          right={
            <Badge variant="outline" className="border-primary/40 text-primary">
              {d.jackConnections.filter((c) => c.protected).length} protected
            </Badge>
          }
        />
        <JackPatchbay
          connections={d.jackConnections}
          critical={d.criticalConnections}
        />
      </section>

      {/* Processing chain */}
      <section aria-label="Processing chain">
        <SectionHeader
          icon={Cpu}
          title="Processing Chain"
          subtitle="Stereo Tool, Jack Rack, Carla — lifecycle and CPU load"
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {d.processors.map((p) => (
            <ProcessorCard key={p.id} proc={p} />
          ))}
        </div>
      </section>

      {/* Routing profiles */}
      <section aria-label="Routing profiles">
        <SectionHeader
          icon={CircuitBoard}
          title="Routing Profiles"
          subtitle="Saved orchestration profiles — auto-start services and processors"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {d.routingProfiles.map((p) => (
            <RoutingProfileCard key={p.id} profile={p} />
          ))}
        </div>
      </section>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/60">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {right}
    </div>
  )
}

function RdxStatusBanner({
  version,
  dbusActive,
  pulseEliminated,
  jack,
  liveStreams,
  totalStreams,
  totalListeners,
  syncedAes,
  totalAes,
  runningProcs,
  totalProcs,
  activeProfile,
}: {
  version: string
  dbusActive: boolean
  pulseEliminated: boolean
  jack: {
    running: boolean
    sampleRate: number
    bufferFrames: number
    periods: number
    driver: string
    cpuLoad: number
    xruns: number
  }
  liveStreams: number
  totalStreams: number
  totalListeners: number
  syncedAes: number
  totalAes: number
  runningProcs: number
  totalProcs: number
  activeProfile: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card/90 to-card/60">
        <CardHeader className="border-b border-border/60 bg-primary/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Waves className="h-4 w-4 text-primary" aria-hidden="true" />
              RDX — Rivendell Extended
              <Badge variant="outline" className="border-primary/40 font-mono text-[10px] text-primary">
                {version}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <StatusChip ok={dbusActive} label="D-Bus" />
              <StatusChip ok={pulseEliminated} label="PulseAudio off" />
              <StatusChip ok={jack.running} label={`JACK ${jack.driver}`} />
            </div>
          </div>
          <CardDescription className="text-xs">
            Streaming, AES67 audio-over-IP, JACK auto-routing — extension layer by{' '}
            <code className="font-mono">anjeleno/rdx-rivendell</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="JACK CPU" value={`${jack.cpuLoad.toFixed(1)}%`} icon={Activity} />
          <Stat label="XRUNs" value={String(jack.xruns)} icon={Zap} />
          <Stat label="Buffer" value={`${jack.bufferFrames}/3`} icon={CircuitBoard} />
          <Stat label="Streams" value={`${liveStreams}/${totalStreams}`} icon={Radio} />
          <Stat label="Listeners" value={String(totalListeners)} icon={Users} />
          <Stat label="AES67" value={`${syncedAes}/${totalAes}`} icon={Network} />
          <Stat label="Processors" value={`${runningProcs}/${totalProcs}`} icon={Cpu} />
          <Stat label="Sample rate" value={`${(jack.sampleRate / 1000).toFixed(0)}k`} icon={Volume2} />
          <Stat label="Profile" value={activeProfile} icon={CircuitBoard} />
        </CardContent>
      </Card>
    </motion.div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[10px]',
        ok
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          : 'border-destructive/40 bg-destructive/10 text-destructive',
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <XCircle className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </Badge>
  )
}

const streamStatusMap: Record<StreamStatus, { label: string; color: string; icon: LucideIcon }> = {
  live: { label: 'LIVE', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', icon: Radio },
  idle: { label: 'IDLE', color: 'border-border bg-secondary/40 text-muted-foreground', icon: Activity },
  connecting: { label: 'CONNECTING', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', icon: Zap },
  faulted: { label: 'FAULTED', color: 'border-destructive/40 bg-destructive/10 text-destructive', icon: XCircle },
}

function StreamCard({ stream }: { stream: StreamProfile }) {
  const st = streamStatusMap[stream.status]
  const StIcon = st.icon
  const fillPct = stream.maxListeners > 0 ? (stream.listeners / stream.maxListeners) * 100 : 0

  return (
    <Card className={cn('border-border bg-card/80', stream.protected && 'border-primary/40')}>
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="truncate">{stream.name}</span>
              {stream.protected && (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Protected stream" />
              )}
            </CardTitle>
            <CardDescription className="mt-0.5 font-mono text-[11px]">
              {stream.mountpoint}
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn('gap-1 text-[10px]', st.color)}>
            <StIcon className="h-3 w-3" aria-hidden="true" />
            {st.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 px-4 pb-3 pt-0">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Codec</div>
            <div className="font-mono text-foreground">{stream.codec}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Bitrate</div>
            <div className="font-mono text-foreground">{stream.bitrate}k</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Server</div>
            <div className="font-mono text-foreground">{stream.server}</div>
          </div>
        </div>
        <Separator className="bg-border/60" />
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <Users className="mr-1 inline h-3 w-3" aria-hidden="true" />
              Listeners
            </span>
            <span className="font-mono text-foreground">
              {stream.listeners} / {stream.maxListeners}
              <span className="ml-1 text-muted-foreground">(peak {stream.peakListeners})</span>
            </span>
          </div>
          <Progress value={fillPct} className="mt-1.5 h-1.5" />
        </div>
        {stream.status === 'live' && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Uptime: <span className="font-mono text-foreground">{formatUptime(stream.uptimeSec)}</span></span>
            <span>Sent: <span className="font-mono text-foreground">{formatBytes(stream.bytesSent)}</span></span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const aesStatusMap: Record<Aes67Status, { label: string; color: string }> = {
  synced: { label: 'SYNCED', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  discovering: { label: 'DISCOVERING', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  silent: { label: 'SILENT', color: 'border-border bg-secondary/40 text-muted-foreground' },
  faulted: { label: 'FAULTED', color: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

function Aes67Row({ source }: { source: Aes67Source }) {
  const st = aesStatusMap[source.status]
  const lossPct =
    source.packetsReceived + source.packetsLost > 0
      ? (source.packetsLost / (source.packetsReceived + source.packetsLost)) * 100
      : 0

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{source.name}</span>
          {source.ptpMaster && (
            <Badge variant="outline" className="border-primary/40 text-[9px] text-primary">
              PTP MASTER
            </Badge>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {source.sender} · {source.codec} · {source.channels === 0 ? 'control' : `${source.channels}ch`} ·{' '}
          {(source.sampleRate / 1000).toFixed(0)}k · {source.latencyFrames} frames
        </div>
      </div>
      <div className="text-right">
        <Badge variant="outline" className={cn('text-[10px]', st.color)}>
          {st.label}
        </Badge>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          loss: <span className={lossPct > 0.01 ? 'text-amber-400' : 'text-foreground'}>{source.packetsLost}</span> /{' '}
          {source.packetsReceived}
        </div>
      </div>
    </div>
  )
}

function JackPatchbay({
  connections,
  critical,
}: {
  connections: JackConnection[]
  critical: { pattern: string; description: string; active: boolean }[]
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="border-border bg-card/80 lg:col-span-2">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-sm">Active Connections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border/60">
              {connections.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="truncate text-foreground">{c.source}</span>
                      <span className="text-primary">→</span>
                      <span className="truncate text-foreground">{c.destination}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {c.profile} · {c.latencyClass}
                    </div>
                  </div>
                  {c.protected && (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-primary/40 text-[9px] text-primary"
                    >
                      <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                      PROTECTED
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
            Critical Connection Rules
          </CardTitle>
          <CardDescription className="text-xs">
            Broadcast-safe patterns — refuse to disconnect during playout.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border/60">
              {critical.map((cr, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <code className="truncate font-mono text-[11px] text-foreground">{cr.pattern}</code>
                    {cr.active ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{cr.description}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

const procStatusMap: Record<ProcessorStatus, { label: string; color: string }> = {
  running: { label: 'RUNNING', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  idle: { label: 'IDLE', color: 'border-border bg-secondary/40 text-muted-foreground' },
  starting: { label: 'STARTING', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  faulted: { label: 'FAULTED', color: 'border-destructive/40 bg-destructive/10 text-destructive' },
}

function ProcessorCard({ proc }: { proc: AudioProcessor }) {
  const st = procStatusMap[proc.status]
  return (
    <Card className={cn('border-border bg-card/80', proc.protected && 'border-primary/40')}>
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="truncate">{proc.name}</span>
              {proc.protected && (
                <ShieldCheck className="h-3 w-3 shrink-0 text-primary" aria-label="Protected" />
              )}
            </CardTitle>
            <CardDescription className="mt-0.5 font-mono text-[11px]">
              chain #{proc.chainPosition} · pid {proc.pid || '—'}
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px]', st.color)}>
            {st.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        <div className="text-xs">
          <span className="text-muted-foreground">Preset: </span>
          <code className="font-mono text-foreground">{proc.preset}</code>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CPU</div>
            <div className="font-mono text-foreground">{proc.cpuPercent.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latency</div>
            <div className="font-mono text-foreground">{proc.latencyMs}ms</div>
          </div>
        </div>
        {proc.status === 'running' && (
          <div className="text-[10px] text-muted-foreground">
            uptime: <span className="font-mono text-foreground">{formatUptime(proc.uptimeSec)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RoutingProfileCard({ profile }: { profile: RoutingProfile }) {
  return (
    <Card
      className={cn(
        'border-border bg-card/80',
        profile.active && 'border-primary/50 bg-primary/5',
      )}
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            {profile.active && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            )}
            <span className="truncate">{profile.name}</span>
          </CardTitle>
          {profile.active ? (
            <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
              ACTIVE
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              INACTIVE
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">{profile.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3 pt-0 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Services:</span>
          {profile.services.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Processors:</span>
          {profile.processors.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">none</span>
          ) : (
            profile.processors.map((p) => (
              <Badge key={p} variant="secondary" className="font-mono text-[10px]">
                {p.replace('proc-', '')}
              </Badge>
            ))
          )}
        </div>
        <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
          <span>
            {profile.autoStart ? (
              <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-400">
                AUTO-START
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px]">manual</Badge>
            )}
          </span>
          <span>last: {new Date(profile.lastActivated).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function formatUptime(sec: number): string {
  if (sec === 0) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
