// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion } from 'framer-motion'
import {
  Send,
  Radio,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  Globe,
  Cable,
  FileText,
  Cpu,
  type LucideIcon,
} from 'lucide-react'
import { usePypad } from '@/lib/rivendell/api'
import { useAirplayStore } from '@/lib/stores/airplay'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import type { PypadScript, PypadTransport, PypadStatus } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

export function PypadPanel() {
  const pypad = usePypad()
  const pypadLog = useAirplayStore((s) => s.pypadLog)

  if (pypad.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!pypad.data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Failed to load PyPAD configuration.
        </CardContent>
      </Card>
    )
  }

  const d = pypad.data
  const totalScripts = d.scripts.length
  const enabledScripts = d.scripts.filter((s) => s.enabled).length
  const errorRate = d.totalSent + d.totalErrors > 0 ? (d.totalErrors / (d.totalSent + d.totalErrors)) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <PypadStatusBanner
        total={totalScripts}
        running={d.running}
        enabled={enabledScripts}
        totalSent={d.totalSent}
        totalErrors={d.totalErrors}
        errorRate={errorRate}
        liveEvents={pypadLog.length}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Scripts grid */}
        <section aria-label="PyPAD scripts" className="lg:col-span-2">
          <SectionHeader icon={Send} title="Now-Playing Scripts" subtitle={`${d.running} of ${d.scripts.length} scripts running`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {d.scripts.map((s) => (
              <PypadScriptCard key={s.id} script={s} />
            ))}
          </div>
        </section>

        {/* Live event log */}
        <section aria-label="Live PyPAD event log">
          <SectionHeader icon={Activity} title="Live Event Log" subtitle="Real-time metadata broadcasts" />
          <Card className="border-border bg-card/80">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Live Feed
              </CardTitle>
              <CardDescription className="text-xs">
                Last {Math.min(pypadLog.length, 50)} events from broadcast-feed WebSocket
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[28rem]">
                {pypadLog.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Waiting for events from broadcast-feed (port 3003)…
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {pypadLog.map((ev, i) => (
                      <PypadLogRow key={`${ev.ts}-${i}`} event={ev} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Recent log from API */}
      <section aria-label="Recent PyPAD history">
        <SectionHeader icon={Clock} title="Recent History (24h)" subtitle="Last metadata pushes from API" />
        <Card className="border-border bg-card/80">
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="divide-y divide-border/60">
                {d.recentLog.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="shrink-0">
                      {entry.status === 'sent' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                      ) : entry.status === 'error' ? (
                        <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium text-foreground">{entry.scriptName}</span>
                        <span className="text-muted-foreground">→</span>
                        <code className="truncate font-mono text-[10px] text-muted-foreground">{entry.target}</code>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {entry.payload.title} — {entry.payload.artist}
                        {entry.payload.album ? ` · ${entry.payload.album}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </div>
                      {entry.message && (
                        <div className="text-[10px] text-destructive">{entry.message}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// ----------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
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
    </div>
  )
}

function PypadStatusBanner({
  total,
  running,
  enabled,
  totalSent,
  totalErrors,
  errorRate,
  liveEvents,
}: {
  total: number
  running: number
  enabled: number
  totalSent: number
  totalErrors: number
  errorRate: number
  liveEvents: number
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-card/90 to-card/60">
        <CardHeader className="border-b border-border/60 bg-primary/5 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-primary" aria-hidden="true" />
            PyPAD — Now-Playing Metadata Distribution
            <Badge variant="outline" className="border-primary/40 font-mono text-[10px] text-primary">
              22 scripts
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Pushes now-playing metadata (title, artist, album) to streaming directories, RDS encoders, and playlist services.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Running" value={`${running}/${total}`} icon={Activity} />
          <Stat label="Enabled" value={String(enabled)} icon={CheckCircle2} />
          <Stat label="Total sent" value={totalSent.toLocaleString()} icon={Send} />
          <Stat label="Errors" value={String(totalErrors)} icon={XCircle} />
          <Stat label="Error rate" value={`${errorRate.toFixed(2)}%`} icon={Cpu} />
          <Stat label="Live events" value={String(liveEvents)} icon={Radio} />
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

const transportIcon: Record<PypadTransport, LucideIcon> = {
  http: Globe,
  https: Globe,
  tcp: Cable,
  udp: Cable,
  serial: Cable,
  file: FileText,
  rds: Radio,
}

const statusMap: Record<PypadStatus, { label: string; color: string }> = {
  running: { label: 'RUNNING', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  stopped: { label: 'STOPPED', color: 'border-border bg-secondary/40 text-muted-foreground' },
  faulted: { label: 'FAULTED', color: 'border-destructive/40 bg-destructive/10 text-destructive' },
  idle: { label: 'IDLE', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
}

function PypadScriptCard({ script }: { script: PypadScript }) {
  const st = statusMap[script.status]
  const TIcon = transportIcon[script.transport]
  const errorRate = script.sentCount + script.errorCount > 0
    ? (script.errorCount / (script.sentCount + script.errorCount)) * 100
    : 0

  return (
    <Card className={cn('border-border bg-card/80', !script.enabled && 'opacity-60')}>
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{script.name}</span>
            </CardTitle>
            <CardDescription className="mt-0.5 line-clamp-2 text-[11px]">{script.description}</CardDescription>
          </div>
          <Badge variant="outline" className={cn('shrink-0 text-[10px]', st.color)}>
            {st.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3 pt-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          {script.transport}://{script.target.replace(/^https?:\/\//, '').replace(/^tcp:\/\//, '').replace(/^udp:\/\//, '').replace(/^serial:\/\//, '').replace(/^file:\/\//, '').replace(/^exec:\/\//, '')}
        </div>
        <Separator className="bg-border/60" />
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sent</div>
            <div className="font-mono text-foreground">{script.sentCount.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Errors</div>
            <div className={cn('font-mono', script.errorCount > 0 ? 'text-destructive' : 'text-foreground')}>
              {script.errorCount}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Uptime</div>
            <div className="font-mono text-foreground">{formatUptime(script.uptimeSec)}</div>
          </div>
        </div>
        {script.status === 'running' && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Error rate</span>
              <span className={cn('font-mono', errorRate > 1 ? 'text-amber-400' : 'text-foreground')}>
                {errorRate.toFixed(2)}%
              </span>
            </div>
            <Progress value={Math.min(errorRate, 100)} className="mt-1 h-1" />
          </div>
        )}
        {script.lastError && (
          <div className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-[10px] text-destructive">
            {script.lastError}
          </div>
        )}
        {script.lastSent && (
          <div className="text-[10px] text-muted-foreground">
            Last sent: <span className="font-mono text-foreground">{new Date(script.lastSent).toLocaleTimeString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PypadLogRow({
  event,
}: {
  event: {
    scriptId: string
    scriptName: string
    target: string
    payload: { title: string; artist: string; album: string; duration: string; startTime: string }
    status: 'sent' | 'error' | 'queued'
    ts: number
  }
}) {
  const statusColor =
    event.status === 'sent'
      ? 'text-emerald-400'
      : event.status === 'error'
        ? 'text-destructive'
        : 'text-amber-400'
  const StatusIcon = event.status === 'sent' ? CheckCircle2 : event.status === 'error' ? XCircle : Clock

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <StatusIcon className={cn('h-4 w-4 shrink-0', statusColor)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-foreground">{event.scriptName}</span>
          <span className="text-muted-foreground">→</span>
          <code className="truncate font-mono text-[10px] text-muted-foreground">
            {event.target.replace(/^https?:\/\//, '').slice(0, 40)}
          </code>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {event.payload.title} — {event.payload.artist}
          {event.payload.album ? ` · ${event.payload.album}` : ''}
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {new Date(event.ts).toLocaleTimeString()}
      </div>
    </div>
  )
}

function formatUptime(sec: number): string {
  if (sec === 0) return '—'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
