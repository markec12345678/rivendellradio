'use client'

import { useState, useEffect } from 'react'
import {
  Music, Shuffle, Clock, Mic, Fingerprint, Waves, Play,
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Calendar, Shield, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * AIPlayoutPanel — Sprint 5 AI/Playout upgrades.
 * Cards: Music Scheduler, Separation Matrix, Category Clocks,
 *        Voice Cloning, Acoustic Fingerprinting, Speech Enhancement.
 */

export function AIPlayoutPanel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Music className="h-4 w-4 text-primary" aria-hidden="true" />
              AI / Playout Engine
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Rule-based scheduler · voice cloning · acoustic fingerprinting · speech enhancement
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            Sprint 5
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SchedulerCard />
          <SeparationCard />
          <ClocksCard />
          <VoiceCloningCard />
          <FingerprintCard />
          <SpeechEnhanceCard />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 1. Music Scheduler
// ============================================================================
function SchedulerCard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = () => {
    setLoading(true)
    fetch('/api/v1/scheduler')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/scheduler')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const scheduled = data?.scheduled ?? []
  const stats = data?.stats
  const clock = data?.clock
  const daypart = data?.daypart

  return (
    <PlayoutCard
      icon={Shuffle}
      title="Music Scheduler"
      status={stats && stats.hardViolations === 0 ? 'healthy' : 'warning'}
      statusLabel={stats ? `${stats.totalScheduled} tracks` : '—'}
      accent="purple"
    >
      <p className="text-[11px] text-muted-foreground">
        GSelector-class rule-based scheduler z backtracking.
      </p>
      {clock && (
        <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-foreground">{clock.name}</span>
            <Badge variant="outline" className="text-[9px]">{daypart?.name ?? '—'}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {clock.slots?.map((s: any) => (
              <Badge key={s.category} variant="outline" className="text-[9px] text-muted-foreground">
                {s.category}: {s.percentage}%
              </Badge>
            ))}
          </div>
        </div>
      )}
      {stats && (
        <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
          <Metric label="scheduled" value={stats.totalScheduled} />
          <Metric label="hard" value={stats.hardViolations} color={stats.hardViolations > 0 ? 'text-destructive' : 'text-emerald-400'} />
          <Metric label="demand" value={stats.avgDemandScore?.toFixed(1) ?? '—'} />
        </div>
      )}
      <Button variant="outline" size="sm" className="mt-2 h-7 w-full text-[10px]" onClick={refresh} disabled={loading}>
        {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
        Regenerate
      </Button>
    </PlayoutCard>
  )
}

// ============================================================================
// 2. Separation Matrix
// ============================================================================
function SeparationCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/scheduler/separation')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const rules = data?.rules ?? []

  return (
    <PlayoutCard
      icon={Activity}
      title="Separation Matrix"
      status="healthy"
      statusLabel={`${rules.length} rules`}
      accent="emerald"
    >
      <p className="text-[11px] text-muted-foreground">
        Artist/title/BPM/key/soundCode/gender separation.
      </p>
      <div className="mt-2 space-y-0.5">
        {rules.slice(0, 6).map((r: any) => (
          <div key={r.attribute} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              {r.hardRule ? (
                <Shield className="h-2.5 w-2.5 text-destructive" />
              ) : (
                <Activity className="h-2.5 w-2.5 text-amber-400" />
              )}
              <span className="text-foreground">{r.attribute}</span>
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {r.windowMinutes === 0 ? 'off' : `${r.windowMinutes}min`}
              {r.tolerance ? ` ±${r.tolerance}` : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Preset:</span>
        <Badge variant="outline" className="text-[9px]">MusicMaster</Badge>
      </div>
    </PlayoutCard>
  )
}

// ============================================================================
// 3. Category Clocks
// ============================================================================
function ClocksCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/scheduler/clocks')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const clocks = data?.clocks ?? []
  const dayparts = data?.dayparts ?? []

  return (
    <PlayoutCard
      icon={Clock}
      title="Category Clocks"
      status="healthy"
      statusLabel={`${clocks.length} clocks`}
      accent="amber"
    >
      <p className="text-[11px] text-muted-foreground">
        Hour-grid z category percentages + daypart variants.
      </p>
      <ScrollArea className="mt-2 max-h-32">
        <div className="space-y-1">
          {clocks.map((c: any) => (
            <div key={c.id} className={cn('rounded border p-1.5', c.valid ? 'border-border/40 bg-background/30' : 'border-destructive/40 bg-destructive/5')}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-foreground">{c.name}</span>
                {c.valid ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                )}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {c.slots?.map((s: any) => `${s.category} ${s.percentage}%`).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        {dayparts.length} dayparts · 24/7 coverage
      </div>
    </PlayoutCard>
  )
}

// ============================================================================
// 4. Voice Cloning
// ============================================================================
function VoiceCloningCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/voice-cloning')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const consents = data?.consents ?? []
  const stats = data?.stats

  return (
    <PlayoutCard
      icon={Mic}
      title="Voice Cloning"
      status={stats?.active > 0 ? 'healthy' : 'warning'}
      statusLabel={`${stats?.active ?? 0} active`}
      accent="purple"
    >
      <p className="text-[11px] text-muted-foreground">
        Consent registry + C2PA watermarking.
      </p>
      <div className="mt-2 space-y-0.5">
        {consents.slice(0, 3).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{c.voiceName}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[9px]',
                c.status === 'active' ? 'border-emerald-500/40 text-emerald-400'
                  : c.status === 'expired' ? 'border-amber-500/40 text-amber-400'
                  : 'border-destructive/40 text-destructive',
              )}
            >
              {c.status === 'active' ? `${c.daysUntilExpiry}d` : c.status}
            </Badge>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
        <div>
          <span className="text-muted-foreground">C2PA:</span>{' '}
          <span className="font-mono text-emerald-400">enabled</span>
        </div>
        <div>
          <span className="text-muted-foreground">Synth:</span>{' '}
          <span className="font-mono text-foreground">{stats?.successfulSyntheses ?? 0}</span>
        </div>
      </div>
    </PlayoutCard>
  )
}

// ============================================================================
// 5. Acoustic Fingerprinting
// ============================================================================
function FingerprintCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/fingerprint')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const stats = data?.stats
  const queue = data?.queue ?? []
  const config = data?.config

  return (
    <PlayoutCard
      icon={Fingerprint}
      title="Acoustic Fingerprinting"
      status={config?.enabled ? 'healthy' : 'warning'}
      statusLabel={config?.enabled ? 'active' : 'disabled'}
      accent="emerald"
    >
      <p className="text-[11px] text-muted-foreground">
        chromaprint + acoustid + librosa pipeline.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="processed" value={stats?.totalProcessed ?? 0} />
        <Metric label="queue" value={stats?.queueDepth ?? 0} color={stats?.queueDepth > 0 ? 'text-amber-400' : 'text-foreground'} />
        <Metric label="dups" value={stats?.duplicatesDetected ?? 0} />
      </div>
      {queue.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {queue.slice(0, 2).map((q: any) => (
            <div key={q.id} className="flex items-center gap-1 text-[10px]">
              <Loader2 className="h-2.5 w-2.5 animate-spin text-amber-400" />
              <span className="truncate text-foreground">{q.stage}</span>
              <span className="ml-auto font-mono text-[9px] text-muted-foreground">{q.progress}%</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>AcoustID:</span>
        <span className={cn('font-mono', config?.acoustid?.apiKey?.includes('not configured') ? 'text-amber-400' : 'text-emerald-400')}>
          {config?.acoustid?.apiKey?.includes('not configured') ? 'sandbox' : 'live'}
        </span>
      </div>
    </PlayoutCard>
  )
}

// ============================================================================
// 6. Speech Enhancement
// ============================================================================
function SpeechEnhanceCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/speech-enhance')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const stats = data?.stats
  const config = data?.config
  const completed = data?.completed ?? []

  return (
    <PlayoutCard
      icon={Waves}
      title="Speech Enhancement"
      status={config?.enabled ? 'healthy' : 'warning'}
      statusLabel={`${stats?.complianceRate ?? '—'}`}
      accent="amber"
    >
      <p className="text-[11px] text-muted-foreground">
        RNNoise + ffmpeg loudnorm → EBU R128 compliant.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground">SNR before</div>
          <div className="font-mono text-foreground">{stats?.avgSnrBefore ?? '—'} dB</div>
        </div>
        <div>
          <div className="text-muted-foreground">SNR after</div>
          <div className="font-mono text-emerald-400">{stats?.avgSnrAfter ?? '—'} dB</div>
        </div>
        <div>
          <div className="text-muted-foreground">LUFS before</div>
          <div className="font-mono text-foreground">{stats?.avgLufsBefore ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">LUFS after</div>
          <div className="font-mono text-emerald-400">{stats?.avgLufsAfter ?? '—'}</div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        +{stats?.snrImprovementDb ?? 0} dB SNR improvement
      </div>
      {completed.length > 0 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {completed.length} clips processed · {config?.complianceStandard}
        </div>
      )}
    </PlayoutCard>
  )
}

// ============================================================================
// Shared
// ============================================================================
function PlayoutCard({
  icon: Icon,
  title,
  status,
  statusLabel,
  accent,
  children,
}: {
  icon: typeof Music
  title: string
  status: 'healthy' | 'warning' | 'critical' | 'loading'
  statusLabel: string
  accent: 'emerald' | 'amber' | 'purple' | 'red'
  children: React.ReactNode
}) {
  const accentMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    red: 'bg-destructive/10 text-destructive',
  }
  const statusMap = {
    healthy: 'border-emerald-500/40 text-emerald-400',
    warning: 'border-amber-500/40 text-amber-400',
    critical: 'border-destructive/40 text-destructive',
    loading: 'border-border text-muted-foreground',
  }
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', accentMap[accent])}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <Badge variant="outline" className={cn('text-[9px]', statusMap[status])}>
          {statusLabel}
        </Badge>
      </div>
      {children}
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className={cn('font-mono text-xs font-bold', color ?? 'text-foreground')}>{value}</div>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}
