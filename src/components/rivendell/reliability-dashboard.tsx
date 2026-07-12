'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, TrendingUp, Clock, AlertTriangle, CheckCircle2, Activity, Gauge, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * ReliabilityDashboard — merljive metrike zanesljivosti za stranke.
 * Prikaže: SLA compliance, MTTR, RTO, RPO, uptime history, incident evidence, SLO error budget.
 */

export function ReliabilityDashboard() {
  return (
    <Card className="border-emerald-500/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              Reliability Validation
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Merljive metrike zanesljivosti — SLO error budget, MTTR, RTO, incident history
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-400">
            <AlertTriangle className="mr-1 h-3 w-3" /> Demo data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <SLASummary />
        <SLODashboard />
        <MetricsGrid />
        <UptimeHistory />
        <IncidentHistory />
        <CustomerReadySummary />
      </CardContent>
    </Card>
  )
}

function SLASummary() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/reliability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const sla = data?.sla
  const stats = data?.stats
  if (!sla || !stats) return null

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase text-emerald-400">SLA Compliance</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-foreground">{sla.actual30d}%</span>
            <span className="text-xs text-muted-foreground">/ {sla.target}% target</span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            YTD: {sla.actualYtd}% · Remaining allowance: {sla.remainingAllowance}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-right">
          <div>
            <div className="font-mono text-2xl font-bold text-emerald-400">{stats.avgMttrSec}s</div>
            <div className="text-[10px] text-muted-foreground">MTTR (target &lt;60s)</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-foreground">{stats.autoResolutionRate}%</div>
            <div className="text-[10px] text-muted-foreground">Auto-resolved (target &gt;80%)</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsGrid() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/reliability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const metrics = data?.metrics ?? []
  if (metrics.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
        <Gauge className="h-3 w-3" /> Measured Reliability Metrics
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {metrics.map((m: any) => (
          <div key={m.name} className="rounded border border-border/60 bg-background/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-foreground">{m.name}</span>
              {m.status === 'exceeding' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : m.status === 'meeting' ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-amber-400" />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="font-mono text-lg font-bold text-foreground">{m.actual}</span>
              <span className="text-[9px] text-muted-foreground">{m.unit}</span>
            </div>
            <div className="text-[9px] text-muted-foreground">Target: {m.target}</div>
            <div className="mt-1 flex items-center gap-1">
              {m.trend30d === 'improving' && <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />}
              <span className={cn('text-[9px]', m.trend30d === 'improving' ? 'text-emerald-400' : m.trend30d === 'degrading' ? 'text-amber-400' : 'text-muted-foreground')}>
                {m.trend30d}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UptimeHistory() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/reliability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const history = data?.uptimeHistory ?? []
  if (history.length === 0) return null

  // Render as ASCII-art bar chart
  const maxBars = 30
  const bars = history.slice(-maxBars)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
        <Activity className="h-3 w-3" /> Uptime History (30 days)
      </div>
      <div className="flex items-end gap-px rounded border border-border/40 bg-background/30 p-2" style={{ height: '60px' }}>
        {bars.map((u: any, i: number) => {
          const height = u.uptimePct >= 99.99 ? 100 : u.uptimePct >= 99.9 ? 80 : 50
          const isIncident = u.incidents > 0
          return (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${height}%`,
                backgroundColor: isIncident ? '#f59e0b' : '#10b981',
                opacity: 0.8,
              }}
              title={`${u.date}: ${u.uptimePct}%${isIncident ? ` (${u.incidents} incident, ${u.mttrSec}s MTTR)` : ''}`}
            />
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>30 days ago</span>
        <span>today</span>
      </div>
    </div>
  )
}

function IncidentHistory() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/reliability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const incidents = data?.incidents ?? []
  if (incidents.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
        <Clock className="h-3 w-3" /> Incident History (with measured MTTR/RTO)
      </div>
      <ScrollArea className="max-h-48">
        <div className="space-y-1.5">
          {incidents.map((inc: any) => (
            <div key={inc.id} className="rounded border border-border/40 bg-background/30 p-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-foreground">{inc.id}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn('text-[9px]', inc.severity === 'critical' ? 'border-destructive/40 text-destructive' : inc.severity === 'high' ? 'border-amber-500/40 text-amber-400' : 'border-border text-muted-foreground')}>
                    {inc.severity}
                  </Badge>
                  {inc.preventedByAutomation && (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">
                      <CheckCircle2 className="mr-0.5 h-2 w-2" /> auto
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-0.5 text-[10px] text-foreground">{inc.rootCause}</div>
              <div className="mt-1 grid grid-cols-4 gap-1 text-[9px] text-muted-foreground">
                <span>MTTD: <span className="font-mono text-foreground">{inc.mttdSec}s</span></span>
                <span>MTTR: <span className="font-mono text-foreground">{inc.mttrSec}s</span></span>
                <span>RTO: <span className="font-mono text-foreground">{inc.rtoSec}s</span></span>
                <span>RPO: <span className="font-mono text-foreground">{inc.rpoSec}s</span></span>
              </div>
              {inc.listenerImpact > 0 && (
                <div className="mt-1 text-[9px] text-amber-400">
                  Impact: {inc.listenerImpact} listeners · ${inc.revenueImpactUsd}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function CustomerReadySummary() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/reliability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const summary = data?.customerReady
  if (!summary) return null

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase text-primary">
        <Target className="h-3 w-3" /> Customer-Ready Summary
      </div>
      <p className="text-[11px] leading-relaxed text-foreground">{summary.summary}</p>
      <div className="mt-2 space-y-0.5">
        {summary.proofPoints?.map((point: string, i: number) => (
          <div key={i} className="flex items-start gap-1 text-[10px]">
            <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
            <span className="text-muted-foreground">{point}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SLODashboard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/slo').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const slos = data?.slos ?? []
  const stats = data?.stats
  if (slos.length === 0) return null

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <Target className="h-3 w-3" /> SLO Error Budgets (Google SRE pattern)
        </div>
        <div className="flex items-center gap-2 text-[9px]">
          <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> {stats?.healthy ?? 0} healthy</span>
          <span className="flex items-center gap-0.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> {stats?.atRisk ?? 0} at-risk</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {slos.map((slo: any) => {
          const budget = slo.errorBudget
          const budgetColor = budget.status === 'healthy' ? 'text-emerald-400' : budget.status === 'at-risk' ? 'text-amber-400' : 'text-destructive'
          return (
            <div key={slo.id} className="rounded border border-border/40 bg-background/30 p-2">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-medium text-foreground">{slo.name}</div>
                  <div className="text-[9px] text-muted-foreground">
                    Target: {slo.target}% · Current: <span className={budgetColor}>{slo.current}%</span>
                  </div>
                </div>
                <div className="ml-2 text-right">
                  <div className={cn('font-mono text-sm font-bold', budgetColor)}>{budget.remainingPct}%</div>
                  <div className="text-[9px] text-muted-foreground">budget left</div>
                </div>
              </div>
              {/* Error budget progress bar */}
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    budget.status === 'healthy' ? 'bg-emerald-400' : budget.status === 'at-risk' ? 'bg-amber-400' : 'bg-destructive',
                  )}
                  style={{ width: `${budget.remainingPct}%` }}
                />
              </div>
              {/* 12-month trend (mini sparkline) */}
              <div className="mt-1.5 flex items-end gap-px" style={{ height: '20px' }}>
                {slo.trend12m?.map((t: any, i: number) => {
                  const height = ((t.value - 99.5) / 0.5) * 100 // scale 99.5-100.0 to 0-100%
                  return (
                    <div
                      key={i}
                      className={cn('flex-1 rounded-t', t.value >= slo.target ? 'bg-emerald-400/60' : 'bg-amber-400/60')}
                      style={{ height: `${Math.max(10, Math.min(100, height))}%` }}
                      title={`${t.month}: ${t.value}% (${t.incidents} incidents)`}
                    />
                  )
                })}
              </div>
              <div className="mt-0.5 flex justify-between text-[8px] text-muted-foreground">
                <span>12 months ago</span>
                <span>burn rate: {budget.burnRate}x</span>
                <span>now</span>
              </div>
              {budget.projectedExhaustion && (
                <div className="mt-1 text-[9px] text-amber-400">
                  ⚠️ Budget exhausts in {budget.projectedExhaustion}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
