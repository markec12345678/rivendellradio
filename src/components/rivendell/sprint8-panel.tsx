'use client'

import { useState, useEffect } from 'react'
import {
  GitBranch, BookOpen, FlaskConical, Users, CheckSquare, Radio,
  Image, Globe, Share2, BarChart3, Shield, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * Sprint8Panel — DevOps + Collaboration + Compliance depth.
 */

export function Sprint8Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-primary" aria-hidden="true" />
              DevOps · Collaboration · Compliance Depth
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              CI/CD · Scalar API · Sandbox · Yjs collab · Approvals · RDS validation · DAB+ SLS · SPI/DPI · Social ROI · Retention
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Sprint 8</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <CICDCard />
          <ScalarCard />
          <SandboxCard />
          <CollabCard />
          <ApprovalsCard />
          <RdsValidationCard />
          <DabSlideshowCard />
          <SpiEpgCard />
          <SocialRoiCard />
          <RetentionCard />
        </div>
      </CardContent>
    </Card>
  )
}

function Sprint8Card({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof GitBranch; title: string; status: 'healthy' | 'warning' | 'critical'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue' | 'red'; children: React.ReactNode
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
function Metric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return <div><div className={cn('font-mono text-xs font-bold', color ?? 'text-foreground')}>{value}</div><div className="text-[9px] uppercase text-muted-foreground">{label}</div></div>
}

function CICDCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/health/deploy').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <Sprint8Card icon={GitBranch} title="CI/CD Blue-Green" status="healthy" statusLabel={data?.color ?? '—'} accent="emerald">
      <p className="text-[11px] text-muted-foreground">GitHub Actions + GHCR + auto-rollback.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div><div className="text-muted-foreground">Version</div><div className="font-mono text-foreground">{data?.version ?? '—'}</div></div>
        <div><div className="text-muted-foreground">Slot</div><div className="font-mono text-emerald-400">{data?.color ?? '—'}</div></div>
      </div>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between"><span className="text-foreground">Lint+Build</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">SBOM+Trivy</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Health probe</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Auto-rollback</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
      </div>
    </Sprint8Card>
  )
}

function ScalarCard() {
  return (
    <Sprint8Card icon={BookOpen} title="Scalar API Docs" status="healthy" statusLabel="interactive" accent="purple">
      <p className="text-[11px] text-muted-foreground">Try-it-out API explorer from OpenAPI 3.1.</p>
      <a href="/api/docs" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
        <BookOpen className="h-3 w-3" /> Open /api/docs
      </a>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Features: Try-it-out, API key prefill, SDK auto-gen, dark theme
      </div>
    </Sprint8Card>
  )
}

function SandboxCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/sandbox').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const active = data?.state?.active
  return (
    <Sprint8Card icon={FlaskConical} title="Sandbox Mode" status={active ? 'warning' : 'healthy'} statusLabel={active ? 'ACTIVE' : 'live'} accent={active ? 'amber' : 'emerald'}>
      <p className="text-[11px] text-muted-foreground">Shadow pipeline za training & testing.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="RML" value={data?.state?.rmlCommands ?? 0} />
        <Metric label="events" value={data?.state?.eventBusPublishes ?? 0} />
        <Metric label="mock lis" value={data?.state?.mockIcecastListeners ?? 0} />
      </div>
      <div className={cn('mt-2 rounded border p-1.5 text-[10px]', active ? 'border-amber-500/40 bg-amber-500/5 text-amber-400' : 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400')}>
        {active ? '⚠️ Sandbox active — no on-air impact' : '🔴 Live mode — real broadcast chain'}
      </div>
    </Sprint8Card>
  )
}

function CollabCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/collab').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <Sprint8Card icon={Users} title="Yjs Concurrent Edit" status="healthy" statusLabel={`${data?.stats?.totalActiveUsers ?? 0} active`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Google-Docs-style show editing + comments.</p>
      <div className="mt-2 space-y-0.5">
        {(data?.sessions ?? []).slice(0, 2).map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{s.entityName}</span>
            <span className="flex items-center gap-0.5">
              {s.activeUsers.map((u: any) => <span key={u.userId} className="h-2 w-2 rounded-full" style={{ backgroundColor: u.color }} />)}
              <span className="text-[9px] text-muted-foreground">{s.activeUsers.length}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{data?.stats?.unresolvedComments ?? 0} unresolved comments</span>
      </div>
    </Sprint8Card>
  )
}

function ApprovalsCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/approvals').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <Sprint8Card icon={CheckSquare} title="Approval Workflows" status={stats?.overdue > 0 ? 'warning' : 'healthy'} statusLabel={`${stats?.overdue ?? 0} overdue`} accent={stats?.overdue > 0 ? 'amber' : 'emerald'}>
      <p className="text-[11px] text-muted-foreground">Kanban: draft → review → approved → live.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="review" value={stats?.byStage?.in_review ?? 0} color="text-amber-400" />
        <Metric label="approved" value={stats?.byStage?.approved ?? 0} color="text-emerald-400" />
        <Metric label="SLA" value={`${stats?.slaCompliance ?? 0}%`} />
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Avg decision: {stats?.avgDecisionHours ?? '—'}h
      </div>
    </Sprint8Card>
  )
}

function RdsValidationCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/rds/validate').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <Sprint8Card icon={Radio} title="EBU RDS Validation" status={data?.summary?.errorCount > 0 ? 'critical' : 'healthy'} statusLabel={data?.summary?.allValid ? 'clean' : `${data?.summary?.errorCount} err`} accent={data?.summary?.errorCount > 0 ? 'red' : 'emerald'}>
      <p className="text-[11px] text-muted-foreground">EBU Tech 3299 field-level compliance.</p>
      <div className="mt-2 space-y-0.5">
        {(data?.fields ?? []).slice(0, 4).map((f: any) => (
          <div key={f.field} className="flex items-center justify-between text-[10px]">
            <span className="font-mono text-foreground">{f.field}</span>
            {f.valid ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-destructive" />}
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {data?.summary?.warningCount ?? 0} warnings · PI/PS/PTY/RT/RT+/AF
      </div>
    </Sprint8Card>
  )
}

function DabSlideshowCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/dab/sls').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const onAir = data?.onAir
  return (
    <Sprint8Card icon={Image} title="DAB+ DLS+ Slideshow" status="healthy" statusLabel={onAir ? 'on-air' : 'idle'} accent="purple">
      <p className="text-[11px] text-muted-foreground">ETSI TS 101 499 MOT slideshow (SLS).</p>
      {onAir && (
        <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5">
          <div className="truncate text-[10px] font-medium text-foreground">{onAir.title}</div>
          <div className="text-[9px] text-muted-foreground">{onAir.width}×{onAir.height} {onAir.format} · {onAir.durationSec}s</div>
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="queued" value={data?.queue?.length ?? 0} />
        <Metric label="today" value={data?.stats?.slidesToday ?? 0} />
        <Metric label="cycle" value={`${data?.config?.cycleIntervalSec ?? 15}s`} />
      </div>
    </Sprint8Card>
  )
}

function SpiEpgCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/radiodns/spi').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <Sprint8Card icon={Globe} title="SPI/DPI EPG + Service Following" status="healthy" statusLabel="3 bearers" accent="blue">
      <p className="text-[11px] text-muted-foreground">ETSI TS 102 410 — FM ↔ DAB+ ↔ IP handoff.</p>
      <div className="mt-2 space-y-0.5">
        {Object.entries(data?.bearers ?? {}).map(([k, v]: [string, any]) => (
          <div key={k} className="flex items-center justify-between text-[10px]">
            <span className="uppercase text-foreground">{k}</span>
            <span className="truncate font-mono text-[9px] text-muted-foreground">{v}</span>
          </div>
        ))}
      </div>
      <a href="/api/v1/radiodns/spi?format=xml" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
        <Globe className="h-3 w-3" /> SPI XML
      </a>
    </Sprint8Card>
  )
}

function SocialRoiCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/social').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <Sprint8Card icon={Share2} title="Social ROI Dashboard" status="healthy" statusLabel={`${stats?.totalTuneIns ?? 0} tune-ins`} accent="amber">
      <p className="text-[11px] text-muted-foreground">Post → engagement → stream tune-in loop.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="reach" value={(stats?.totalReach ?? 0).toLocaleString()} />
        <Metric label="eng rate" value={`${stats?.engagementRate ?? 0}%`} color="text-emerald-400" />
        <Metric label="$/tune" value={`$${stats?.avgCostPerTuneIn ?? 0}`} />
      </div>
      <div className="mt-2 space-y-0.5">
        {(data?.leaderboard ?? []).slice(0, 2).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.platform}</span>
            <span className="font-mono text-[9px] text-emerald-400">{p.tuneIns} tune-ins</span>
          </div>
        ))}
      </div>
    </Sprint8Card>
  )
}

function RetentionCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/analytics/retention').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <Sprint8Card icon={BarChart3} title="Cohort + ATS/TTL" status="healthy" statusLabel={`${stats?.p1Listeners ?? 0} P1`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">Heatmap + funnel + time-spent-listening.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="ATS" value={`${stats?.avgAtsMin ?? 0}m`} color="text-emerald-400" />
        <Metric label="TTL" value={`${stats?.medianTtlSec ?? 0}s`} />
        <Metric label="P1%" value={`${stats?.p1ConversionRate ?? 0}%`} color="text-purple-400" />
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        W4 retention: {data?.heatmap?.avgRetentionW4 ?? '—'}% · W12: {data?.heatmap?.avgRetentionW12 ?? '—'}%
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Funnel: {stats?.totalListeners ?? 0} → {stats?.p1Listeners ?? 0} P1
      </div>
    </Sprint8Card>
  )
}
