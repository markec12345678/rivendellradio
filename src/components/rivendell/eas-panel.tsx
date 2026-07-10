'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, Radio, FileText, RefreshCw, Shield, Clock,
  CheckCircle2, XCircle, Bell, Download, Play, Siren, Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * EasPanel — EAS/CAP compliance dashboard.
 * Shows: CAP alerts feed, FCC EasLog, IPAWS-OPEN status, test scheduler, interrupt status.
 */

export function EasPanel() {
  const [tab, setTab] = useState<'alerts' | 'log' | 'ipaws' | 'test'>('alerts')

  return (
    <Card className="border-destructive/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Siren className="h-4 w-4 text-destructive" aria-hidden="true" />
              EAS / CAP Compliance
              <Badge variant="outline" className="border-destructive/40 text-destructive text-[9px]">
                FCC 47 CFR Part 11
              </Badge>
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              OASIS CAP 1.2 · FEMA IPAWS-OPEN · SAME codes · 4-year FCC retention
            </CardDescription>
          </div>
        </div>
        {/* Sub-tabs */}
        <div className="mt-3 flex gap-1 border-b border-border/40 pb-px">
          {(['alerts', 'log', 'ipaws', 'test'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                tab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'alerts' ? 'CAP Alerts' : t === 'log' ? 'FCC Log' : t === 'ipaws' ? 'IPAWS' : 'Tests'}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {tab === 'alerts' && <AlertsTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'ipaws' && <IpawsTab />}
        {tab === 'test' && <TestTab />}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Alerts sub-tab — recent CAP alerts
// ============================================================================
function AlertsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/v1/eas/cap?limit=10')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/eas/cap?limit=10')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading && !data) return <Skeleton className="h-64 w-full" />

  const alerts = data?.alerts ?? []
  const critical = alerts.filter((a: any) => a.severity === 'Extreme' || a.severity === 'Severe').length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Total" value={alerts.length} color="text-foreground" />
        <StatBox label="Critical" value={critical} color="text-destructive" />
        <StatBox label="Sig Valid" value={alerts.filter((a: any) => a.signatureValid).length} color="text-emerald-400" />
      </div>

      <ScrollArea className="max-h-80">
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No CAP alerts received yet
            </div>
          ) : (
            alerts.map((alert: any) => <AlertRow key={alert.id} alert={alert} />)
          )}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={refresh} className="w-full">
        <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh
      </Button>
    </div>
  )
}

function AlertRow({ alert }: { alert: any }) {
  const sevColor: Record<string, string> = {
    Extreme: 'border-destructive/40 bg-destructive/5 text-destructive',
    Severe: 'border-amber-500/40 bg-amber-500/5 text-amber-400',
    Moderate: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
    Minor: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
    Unknown: 'border-border text-muted-foreground',
  }

  return (
    <div className={cn('rounded-md border p-2.5', sevColor[alert.severity ?? 'Unknown'] ?? sevColor.Unknown)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{alert.event ?? 'Unknown Event'}</span>
            {alert.sameCode && (
              <Badge variant="outline" className="border-current text-[9px]">
                {alert.sameCode}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{alert.areaDesc ?? 'No area specified'}</div>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
            <span>{new Date(alert.sent).toLocaleString()}</span>
            <span>·</span>
            <span>{alert.origin}</span>
            {alert.signatureValid ? (
              <span className="flex items-center gap-0.5 text-emerald-400">
                <Shield className="h-2.5 w-2.5" /> signed
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-destructive">
                <XCircle className="h-2.5 w-2.5" /> unsigned
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[9px]', sevColor[alert.severity ?? 'Unknown'])}>
          {alert.severity ?? 'Unknown'}
        </Badge>
      </div>
    </div>
  )
}

// ============================================================================
// FCC Log sub-tab
// ============================================================================
function LogTab() {
  const [data, setData] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/eas/log?limit=20').then((r) => r.json()).catch(() => null),
      fetch('/api/v1/eas/log?stats=true').then((r) => r.json()).catch(() => null),
    ]).then(([d, s]) => {
      setData(d)
      setStats(s)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/v1/eas/log?limit=20').then((r) => r.json()).catch(() => null),
      fetch('/api/v1/eas/log?stats=true').then((r) => r.json()).catch(() => null),
    ]).then(([d, s]) => {
      if (cancelled) return
      setData(d)
      setStats(s)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (loading) return <Skeleton className="h-64 w-full" />

  const entries = data?.entries ?? []
  const compliance = stats?.compliance ?? {}

  return (
    <div className="space-y-3">
      {/* Compliance summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted-foreground">Weekly Test</span>
            {compliance.weeklyTestCompliant ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Last: {compliance.lastWeeklyTest ? new Date(compliance.lastWeeklyTest).toLocaleDateString() : 'never'}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-muted-foreground">Monthly Test</span>
            {compliance.monthlyTestCompliant ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Last: {compliance.lastMonthlyTest ? new Date(compliance.lastMonthlyTest).toLocaleDateString() : 'never'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {entries.length} entries · {compliance.retentionYears}-year FCC retention
        </span>
        <a
          href="/api/v1/eas/log?format=csv"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <Download className="h-3 w-3" /> CSV export
        </a>
      </div>

      <ScrollArea className="max-h-72">
        <div className="space-y-1.5">
          {entries.map((e: any) => (
            <LogRow key={e.id} entry={e} />
          ))}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={refresh} className="w-full">
        <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh
      </Button>
    </div>
  )
}

function LogRow({ entry }: { entry: any }) {
  const typeColors: Record<string, string> = {
    received: 'text-blue-400',
    interrupted: 'text-destructive',
    'weekly-test': 'text-emerald-400',
    'monthly-test': 'text-emerald-400',
    manual: 'text-amber-400',
    ignored: 'text-muted-foreground',
    test: 'text-emerald-400',
  }

  return (
    <div className="flex items-start gap-2 rounded border border-border/40 bg-background/30 p-2">
      <div className="mt-0.5">
        {entry.result === 'success' ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        ) : entry.result === 'ignored' ? (
          <XCircle className="h-3 w-3 text-muted-foreground" />
        ) : (
          <AlertTriangle className="h-3 w-3 text-amber-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className={cn('text-[10px] font-semibold uppercase', typeColors[entry.eventType] ?? 'text-foreground')}>
            {entry.sameCode ?? entry.eventType}
          </span>
          <span className="font-mono text-[9px] text-muted-foreground">
            {new Date(entry.receivedAt).toLocaleString()}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-foreground line-clamp-2">
          {entry.resultDetail}
        </div>
        {entry.durationMs && (
          <div className="mt-0.5 text-[9px] text-muted-foreground">
            {entry.originator} · {entry.durationMs}ms
            {entry.operatorId && ` · ${entry.operatorId}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// IPAWS sub-tab
// ============================================================================
function IpawsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/v1/eas/ipaws')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const poll = async () => {
    setPolling(true)
    try {
      await fetch('/api/v1/eas/ipaws', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      refresh()
    } finally {
      setPolling(false)
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  const config = data?.config ?? {}
  const stats = data?.stats ?? {}
  const recent = data?.recentAlerts ?? []
  const isLive = config.mode === 'live'

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-foreground">FEMA IPAWS-OPEN</div>
            <div className="text-[10px] text-muted-foreground">{config.cogId}</div>
          </div>
          <Badge variant="outline" className={isLive ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400'}>
            {config.mode}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="font-mono text-sm font-bold text-foreground">{stats.totalReceived ?? 0}</div>
            <div className="text-[9px] text-muted-foreground">received</div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-muted-foreground">{stats.totalIgnored ?? 0}</div>
            <div className="text-[9px] text-muted-foreground">ignored</div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-destructive">{stats.totalInterrupted ?? 0}</div>
            <div className="text-[9px] text-muted-foreground">interrupted</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded border border-border/40 bg-background/30 p-2">
          <div className="text-muted-foreground">Last poll</div>
          <div className="font-mono text-foreground">{stats.lastPoll ? new Date(stats.lastPoll).toLocaleTimeString() : '—'}</div>
        </div>
        <div className="rounded border border-border/40 bg-background/30 p-2">
          <div className="text-muted-foreground">Next poll</div>
          <div className="font-mono text-foreground">{stats.nextPoll ? new Date(stats.nextPoll).toLocaleTimeString() : '—'}</div>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={poll} disabled={polling} className="w-full">
        {polling ? <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" /> : <Radio className="mr-1.5 h-3 w-3" />}
        {polling ? 'Polling…' : 'Poll IPAWS now'}
      </Button>

      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
          Recent IPAWS alerts ({recent.length})
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1.5">
            {recent.map((a: any, i: number) => (
              <div key={i} className="rounded border border-border/40 bg-background/30 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">{a.event}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px]',
                      a.severity === 'Extreme' ? 'border-destructive/40 text-destructive' : 'border-amber-500/40 text-amber-400',
                    )}
                  >
                    {a.severity}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{a.areaDesc}</div>
                <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span className="font-mono">{a.sameCode}</span>
                  {a.autoInterrupted && (
                    <span className="flex items-center gap-0.5 text-destructive">
                      <Siren className="h-2.5 w-2.5" /> interrupted
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {!isLive && (
        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-400">
          Sandbox mode. Set <code className="font-mono">IPAWS_COG_ID</code>, <code className="font-mono">IPAWS_USER_ID</code>,{' '}
          <code className="font-mono">IPAWS_PASSWORD</code> env vars to enable live polling.
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Test sub-tab — RWT / RMT scheduler
// ============================================================================
function TestTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    fetch('/api/v1/eas/test')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runTest = async (type: 'RWT' | 'RMT') => {
    setTesting(true)
    setResult(null)
    try {
      const res = await fetch('/api/v1/eas/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const r = await res.json()
      setResult(r)
      refresh()
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />

  const req = data?.testRequirements ?? {}
  const upcoming = data?.upcomingDue ?? {}

  return (
    <div className="space-y-3">
      {/* Compliance status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-emerald-400">RWT (Weekly)</span>
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Due by {new Date(upcoming.rwt).toLocaleDateString()}
          </div>
        </div>
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-emerald-400">RMT (Monthly)</span>
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Due by {new Date(upcoming.rmt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Test buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => runTest('RWT')} disabled={testing}>
          <Play className="mr-1.5 h-3 w-3" />
          {testing ? 'Running…' : 'Run RWT'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => runTest('RMT')} disabled={testing}>
          <Play className="mr-1.5 h-3 w-3" />
          {testing ? 'Running…' : 'Run RMT'}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2.5">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">{result.typeName}</span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">
              {result.typeCode}
            </Badge>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {result.message}
          </div>
          <div className="mt-1 font-mono text-[9px] text-muted-foreground">
            ID: {result.testIdentifier}
          </div>
        </div>
      )}

      {/* Requirements reference */}
      <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <FileText className="h-3 w-3" /> FCC §11.61 requirements
        </div>
        <div className="space-y-1.5 text-[10px]">
          <div>
            <span className="font-semibold text-foreground">RWT</span>
            <span className="text-muted-foreground">: {req.weekly?.frequency ?? 'Once per week'} · 5-15s duration</span>
          </div>
          <div>
            <span className="font-semibold text-foreground">RMT</span>
            <span className="text-muted-foreground">: {req.monthly?.frequency ?? 'Once per month'} · relay within 60 min</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Shared
// ============================================================================
function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded border border-border/60 bg-background/40 p-2 text-center">
      <div className={cn('font-mono text-lg font-bold', color)}>{value}</div>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}
