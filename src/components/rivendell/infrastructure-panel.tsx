'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Radio, Wifi, Activity, Shield, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, Zap, ArrowRightLeft, TrendingDown, Gauge, Siren, Server,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * InfrastructurePanel — Sprint 3 infrastructure & DR features.
 * Cards: SRT Contribution, Liquidsoap Router, RF Quality, STL Failover,
 *        Anomaly Detection, DR Failover Orchestrator.
 */

export function InfrastructurePanel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Server className="h-4 w-4 text-primary" aria-hidden="true" />
              Infrastructure & Disaster Recovery
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              SRT contribution · Liquidsoap router · RF quality · STL failover · anomaly detection · DR orchestrator
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            Sprint 3
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SrtCard />
          <LiquidsoapCard />
          <RfQualityCard />
          <StlCard />
          <AnomalyCard />
          <DrFailoverCard />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 1. SRT Contribution
// ============================================================================
function SrtCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/srt').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const stats = data?.stats
  const listener = data?.listener
  const connections = data?.connections ?? []

  return (
    <InfraCard
      icon={Radio}
      title="SRT Contribution"
      status={listener?.enabled ? 'healthy' : 'warning'}
      statusLabel={listener?.enabled ? `${stats?.activeConnections ?? 0}/${listener?.maxConnections ?? 0}` : 'disabled'}
      accent="purple"
    >
      <p className="text-[11px] text-muted-foreground">
        Remote studio / OB-van contribution via SRT (port {listener?.port ?? 9000}).
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <Metric label="RTT" value={stats ? `${Math.round(stats.avgRttMs)}ms` : '—'} />
        <Metric label="Loss" value={stats ? `${stats.avgPacketLossPct.toFixed(3)}%` : '—'} />
        <Metric label="BW" value={stats ? `${stats.totalBandwidthMbps.toFixed(1)}M` : '—'} />
      </div>
      {connections.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {connections.slice(0, 2).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between text-[10px]">
              <span className="truncate text-foreground">{c.streamId}</span>
              <Badge variant="outline" className={cn('text-[9px]', qualityColor(c.quality))}>
                {c.quality}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </InfraCard>
  )
}

// ============================================================================
// 2. Liquidsoap Source Router
// ============================================================================
function LiquidsoapCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/liquidsoap').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const active = data?.activeName
  const sources = data?.sources ?? []
  const config = data?.config

  return (
    <InfraCard
      icon={ArrowRightLeft}
      title="Liquidsoap Router"
      status={active ? 'healthy' : 'warning'}
      statusLabel={active ? 'on-air' : 'no source'}
      accent="emerald"
    >
      <p className="text-[11px] text-muted-foreground">
        Source switcher z fallback chain + crossfade.
      </p>
      <div className="mt-2 space-y-0.5">
        {sources.slice(0, 5).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              {s.active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
              <span className={cn(s.active ? 'text-foreground' : 'text-muted-foreground')}>{s.name}</span>
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {s.active ? `${s.signalDbfs.toFixed(1)}dB` : s.status}
            </span>
          </div>
        ))}
      </div>
      {config?.autoFallback && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
          <Shield className="h-3 w-3" /> Auto-failover {config.silenceDurationSec}s
        </div>
      )}
    </InfraCard>
  )
}

// ============================================================================
// 3. RF Quality Reference Receiver
// ============================================================================
function RfQualityCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/rf-quality?limit=0').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const cur = data?.current
  const compliant = data?.compliant
  const stats = data?.stats24h

  return (
    <InfraCard
      icon={Wifi}
      title="RF Quality (off-air)"
      status={compliant ? 'healthy' : 'warning'}
      statusLabel={cur?.status ?? '—'}
      accent={compliant ? 'emerald' : 'amber'}
    >
      <p className="text-[11px] text-muted-foreground">
        RTL-SDR reference receiver @ 88.7 MHz.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-muted-foreground">SNR</span>{' '}
          <span className="font-mono text-foreground">{cur?.snrDb?.toFixed(1) ?? '—'} dB</span>
        </div>
        <div>
          <span className="text-muted-foreground">Multipath</span>{' '}
          <span className="font-mono text-foreground">{cur?.multipathPct?.toFixed(2) ?? '—'}%</span>
        </div>
        <div>
          <span className="text-muted-foreground">MER</span>{' '}
          <span className="font-mono text-foreground">{cur?.merDb?.toFixed(1) ?? '—'} dB</span>
        </div>
        <div>
          <span className="text-muted-foreground">Field</span>{' '}
          <span className="font-mono text-foreground">{cur?.fieldStrengthDbuv?.toFixed(1) ?? '—'} dBµV</span>
        </div>
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        24h avg SNR: {stats?.avgSnrDb?.toFixed(1) ?? '—'} dB
      </div>
    </InfraCard>
  )
}

// ============================================================================
// 4. STL Failover
// ============================================================================
function StlCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/stl').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const links = data?.links ?? []
  const activeName = data?.activeName
  const config = data?.config
  const stats = data?.stats

  return (
    <InfraCard
      icon={ArrowRightLeft}
      title="STL Failover"
      status={stats?.avgHealthScore > 80 ? 'healthy' : 'warning'}
      statusLabel={config?.autoFailover ? 'auto' : 'manual'}
      accent="purple"
    >
      <p className="text-[11px] text-muted-foreground">
        Studio→Transmitter link z backup + auto-failover.
      </p>
      <div className="mt-2 space-y-0.5">
        {links.map((l: any) => (
          <div key={l.id} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              {l.active ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
              <span className={cn(l.active ? 'text-foreground' : 'text-muted-foreground')}>
                {l.name}
              </span>
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">
              {l.healthScore}/100
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 text-[10px] text-muted-foreground">
        Avg health: {stats?.avgHealthScore ?? '—'} · Failovers: {stats?.totalFailovers ?? 0}
      </div>
    </InfraCard>
  )
}

// ============================================================================
// 5. Anomaly Detection
// ============================================================================
function AnomalyCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/anomaly?unresolved=true').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const anomalies = data?.anomalies ?? []
  const stats = data?.stats
  const baselines = data?.baselines ? Object.keys(data.baselines) : []
  const config = data?.config

  return (
    <InfraCard
      icon={TrendingDown}
      title="Anomaly Detection"
      status={stats?.critical > 0 ? 'critical' : stats?.high > 0 ? 'warning' : 'healthy'}
      statusLabel={`${stats?.unresolved ?? 0} active`}
      accent={stats?.critical > 0 ? 'red' : stats?.high > 0 ? 'amber' : 'emerald'}
    >
      <p className="text-[11px] text-muted-foreground">
        Z-score + EWMA + IQR anomaly detection.
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
        <Metric label="crit" value={stats?.critical ?? 0} color="text-destructive" />
        <Metric label="high" value={stats?.high ?? 0} color="text-amber-400" />
        <Metric label="med" value={stats?.medium ?? 0} color="text-blue-400" />
        <Metric label="low" value={stats?.low ?? 0} color="text-muted-foreground" />
      </div>
      {anomalies.length > 0 ? (
        <div className="mt-2 space-y-0.5">
          {anomalies.slice(0, 2).map((a: any) => (
            <div key={a.id} className="text-[10px]">
              <span className="font-mono text-foreground">{a.metric}</span>{' '}
              <span className="text-muted-foreground">z={a.zScore}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> No anomalies detected
        </div>
      )}
      <div className="mt-1 text-[10px] text-muted-foreground">
        {baselines.length} metrics · sens: {config?.sensitivity ?? 'normal'}
      </div>
    </InfraCard>
  )
}

// ============================================================================
// 6. DR Failover Orchestrator
// ============================================================================
function DrFailoverCard() {
  const [data, setData] = useState<any>(null)
  const [action, setAction] = useState<'failover' | 'drill' | 'recover' | null>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/failover').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 10000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const state = data?.state
  const stats = data?.stats

  const runAction = async (a: 'failover' | 'drill' | 'recover') => {
    setAction(a)
    setResult(null)
    try {
      const res = await fetch('/api/v1/failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: a }),
      })
      const r = await res.json()
      setResult(r)
      // Refresh
      fetch('/api/v1/failover').then((r) => r.json()).then(setData).catch(() => {})
    } finally {
      setAction(null)
    }
  }

  return (
    <InfraCard
      icon={Siren}
      title="DR Failover Orchestrator"
      status={state?.status === 'healthy' ? 'healthy' : state?.status === 'failover-active' ? 'critical' : 'warning'}
      statusLabel={state?.status ?? '—'}
      accent={state?.status === 'healthy' ? 'emerald' : state?.status === 'failover-active' ? 'red' : 'amber'}
    >
      <p className="text-[11px] text-muted-foreground">
        Auto-detect studio loss → switch → AI DJ fill → page engineer.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-muted-foreground">Active:</span>{' '}
          <span className="font-mono text-foreground">{state?.activeStudio ?? '—'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">RTO:</span>{' '}
          <span className={cn('font-mono', stats?.rtoCompliance ? 'text-emerald-400' : 'text-destructive')}>
            {state?.rtoActualSec ?? '—'}s/{state?.rtoTargetSec ?? 60}s
          </span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => runAction('failover')} disabled={!!action}>
          Failover
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => runAction('drill')} disabled={!!action}>
          {action === 'drill' ? 'Running…' : 'Drill'}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => runAction('recover')} disabled={!!action}>
          Recover
        </Button>
      </div>
      {result?.message && (
        <div className={cn('mt-1.5 rounded border p-1.5 text-[10px]', result.ok ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' : 'border-destructive/40 bg-destructive/5 text-destructive')}>
          {result.message}
        </div>
      )}
      {state?.autoFailoverEnabled && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-400">
          <Shield className="h-3 w-3" /> Auto-failover armed
        </div>
      )}
    </InfraCard>
  )
}

// ============================================================================
// Shared
// ============================================================================
function InfraCard({
  icon: Icon,
  title,
  status,
  statusLabel,
  accent,
  children,
}: {
  icon: typeof Radio
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

function qualityColor(q: string): string {
  switch (q) {
    case 'excellent': return 'border-emerald-500/40 text-emerald-400'
    case 'good': return 'border-blue-500/40 text-blue-400'
    case 'fair': return 'border-amber-500/40 text-amber-400'
    case 'poor': return 'border-destructive/40 text-destructive'
    default: return 'border-border text-muted-foreground'
  }
}
