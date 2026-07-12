'use client'

import { useState, useEffect } from 'react'
import { Puzzle, FlaskConical, Server, BrainCircuit, CheckCircle2, XCircle, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Sprint11Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BrainCircuit className="h-4 w-4 text-primary" aria-hidden="true" />
              Operational Excellence
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Plugin SDK · Test Harness · Cluster HA · AI Incident Commander — funkcije za vsakdanjo uporabo operaterjev
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Sprint 11</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PluginsCard />
          <TestHarnessCard />
          <ClusterCard />
          <IncidentCommanderCard />
          <HonestyCard />
        </div>
      </CardContent>
    </Card>
  )
}

function S11Card({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof Puzzle; title: string; status: 'healthy' | 'warning' | 'critical'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue' | 'red'; children: React.ReactNode
}) {
  const accentMap = { emerald: 'bg-emerald-500/10 text-emerald-400', amber: 'bg-amber-500/10 text-amber-400', purple: 'bg-purple-500/10 text-purple-400', blue: 'bg-blue-500/10 text-blue-400', red: 'bg-destructive/10 text-destructive' }
  const statusMap = { healthy: 'border-emerald-500/40 text-emerald-400', warning: 'border-amber-500/40 text-amber-400', critical: 'border-destructive/40 text-destructive' }
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', accentMap[accent])}><Icon className="h-3.5 w-3.5" /></div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <Badge variant="outline" className={cn('text-[9px]', statusMap[status])}>{statusLabel}</Badge>
      </div>
      {children}
    </div>
  )
}

function PluginsCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/plugins').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S11Card icon={Puzzle} title="Plugin SDK" status="healthy" statusLabel={`${stats?.enabled ?? 0}/${stats?.totalInstalled ?? 0} enabled`} accent="purple">
      <p className="text-[11px] text-muted-foreground">Third-party module development framework.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalInstalled ?? 0}</div><div className="text-[9px] text-muted-foreground">installed</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.enabled ?? 0}</div><div className="text-[9px] text-muted-foreground">enabled</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalEventsHandled ?? 0}</div><div className="text-[9px] text-muted-foreground">events</div></div>
      </div>
      <div className="mt-2 space-y-0.5">
        {(data?.plugins ?? []).slice(0, 2).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.name}</span>
            <Badge variant="outline" className={cn('text-[9px]', p.status === 'enabled' ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')}>{p.status}</Badge>
          </div>
        ))}
      </div>
    </S11Card>
  )
}

function TestHarnessCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/test-harness').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S11Card icon={FlaskConical} title="Test Harness" status="healthy" statusLabel={`${stats?.coveragePct ?? 0}%`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Automated failure simulation + reliability testing.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalScenarios ?? 0}</div><div className="text-[9px] text-muted-foreground">scenarios</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.lastRunPass ?? 0}</div><div className="text-[9px] text-muted-foreground">pass</div></div>
        <div><div className="font-mono text-xs font-bold text-amber-400">{stats?.lastRunFail ?? 0}</div><div className="text-[9px] text-muted-foreground">fail</div></div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Pass rate: {stats?.passRate ?? 0}% · {stats?.totalRuns ?? 0} total runs
      </div>
    </S11Card>
  )
}

function ClusterCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/cluster').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const cluster = data?.cluster
  const nodes = data?.nodes ?? []
  return (
    <S11Card icon={Server} title="Cluster & HA" status={cluster?.quorumMet ? 'healthy' : 'critical'} statusLabel={cluster?.quorumMet ? 'quorum OK' : 'NO QUORUM'} accent="emerald">
      <p className="text-[11px] text-muted-foreground">Multi-server Raft cluster z avtomatskim failoverjem.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{cluster?.totalNodes ?? 0}</div><div className="text-[9px] text-muted-foreground">nodes</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{cluster?.healthyNodes ?? 0}</div><div className="text-[9px] text-muted-foreground">healthy</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{cluster?.avgFailoverMs ?? 0}ms</div><div className="text-[9px] text-muted-foreground">RTO</div></div>
      </div>
      <div className="mt-2 space-y-0.5">
        {nodes.slice(0, 3).map((n: any) => (
          <div key={n.id} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', n.role === 'leader' ? 'bg-amber-400' : n.health === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400')} />
              <span className="truncate text-foreground">{n.hostname}</span>
            </span>
            <span className="font-mono text-[9px] text-muted-foreground">{n.role}</span>
          </div>
        ))}
      </div>
    </S11Card>
  )
}

function IncidentCommanderCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/incident-commander').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  const active = data?.activeAnalyses ?? []
  return (
    <S11Card icon={BrainCircuit} title="AI Incident Commander" status={stats?.activeNow > 0 ? 'warning' : 'healthy'} statusLabel={`${stats?.activeNow ?? 0} active`} accent="amber">
      <p className="text-[11px] text-muted-foreground">Unified AI analysis of ALL events + proposed solutions.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.autoExecuted ?? 0}</div><div className="text-[9px] text-muted-foreground">auto</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{Math.round((stats?.avgConfidence ?? 0) * 100)}%</div><div className="text-[9px] text-muted-foreground">conf</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.resolvedAuto ?? 0}</div><div className="text-[9px] text-muted-foreground">resolved</div></div>
      </div>
      {active.length > 0 && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 p-1.5">
          <div className="truncate text-[10px] font-medium text-foreground">{active[0].rootCause}</div>
          <div className="mt-0.5 text-[9px] text-muted-foreground">{active[0].recommendedActions?.length} recommended actions</div>
        </div>
      )}
    </S11Card>
  )
}

function HonestyCard() {
  return (
    <S11Card icon={AlertTriangle} title="Implementation Status" status="healthy" statusLabel="honest" accent="emerald">
      <p className="text-[11px] text-muted-foreground">Transparentnost o tem, kaj je realno implementirano vs. simulacija.</p>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between"><span className="text-foreground">Rivendell RDX</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">WebSocket feed</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Event Bus + Webhooks</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">RBAC + Audit + MFA</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">EAS/CAP pipeline</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">ATSC 3.0 / 5G</span><AlertTriangle className="h-3 w-3 text-amber-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Dolby Atmos</span><AlertTriangle className="h-3 w-3 text-amber-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Blockchain</span><AlertTriangle className="h-3 w-3 text-amber-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">XGBoost 87%</span><AlertTriangle className="h-3 w-3 text-amber-400" /></div>
      </div>
      <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/5 p-1.5 text-[10px] text-emerald-400">
        ✓ Real: API + UI + Event Bus integration
        ⚠️ Sim: zahteva hardver/prod integracijo
      </div>
    </S11Card>
  )
}
