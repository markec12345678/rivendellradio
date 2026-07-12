'use client'

import { useState, useEffect } from 'react'
import { Activity, Gauge, Server, Puzzle, CheckCircle2, XCircle, TrendingUp, Cpu, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ObservabilityPanel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              Observability & Performance
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              OpenTelemetry · real performance benchmarks · K8s operator · plugin marketplace
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Real metrics
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <ObservabilityCard />
        <BenchmarkCard />
        <K8sOperatorCard />
        <MarketplaceCard />
      </CardContent>
    </Card>
  )
}

function ObservabilityCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/observability').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"><Activity className="h-3.5 w-3.5" /></div>
          <span className="text-xs font-semibold text-foreground">OpenTelemetry Instrumentation</span>
        </div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">{data?.status ?? '—'}</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">Real traces + metrics export (OTLP to Grafana/Tempo/Jaeger).</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{data?.traces?.totalSpans ?? 0}</div><div className="text-[9px] text-muted-foreground">spans</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{data?.metrics?.latencyP95 ?? '—'}ms</div><div className="text-[9px] text-muted-foreground">P95 lat</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{data?.instrumentation?.length ?? 0}</div><div className="text-[9px] text-muted-foreground">libraries</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(data?.instrumentation ?? []).slice(0, 4).map((inst: any) => (
          <Badge key={inst.library} variant="outline" className={cn('text-[9px]', inst.enabled ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')}>
            {inst.library.replace('@opentelemetry/instrumentation-', '')}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function BenchmarkCard() {
  const [data, setData] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => { let c = false; fetch('/api/v1/benchmark').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])

  const runBenchmark = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/v1/benchmark', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const r = await res.json()
      setResult(r)
    } catch {} finally {
      setRunning(false)
    }
  }

  const bench = result?.result ?? data?.lastBenchmark
  const results = bench?.results

  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-400"><Gauge className="h-3.5 w-3.5" /></div>
          <span className="text-xs font-semibold text-foreground">Performance Benchmark</span>
        </div>
        <Badge variant="outline" className={cn('text-[9px]', bench ? (bench.summary.overallStatus === 'pass' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400') : 'text-muted-foreground')}>
          {bench ? `${bench.summary.passCount}/${bench.summary.totalTests}` : 'not run'}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">✅ Real measurements (performance.now) — not simulated.</p>
      {results ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API P95</span>
            <span className={cn('font-mono', results.apiLatency.status === 'pass' ? 'text-emerald-400' : 'text-amber-400')}>{results.apiLatency.p95}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Event Bus</span>
            <span className={cn('font-mono', results.eventBusThroughput.status === 'pass' ? 'text-emerald-400' : 'text-amber-400')}>{(results.eventBusThroughput.eventsPerSec / 1000000).toFixed(1)}M/s</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Prisma P95</span>
            <span className={cn('font-mono', results.prismaQuery.status === 'pass' ? 'text-emerald-400' : 'text-amber-400')}>{results.prismaQuery.p95Ms}ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Memory</span>
            <span className={cn('font-mono', results.memoryUsage.status === 'pass' ? 'text-emerald-400' : 'text-amber-400')}>{results.memoryUsage.heapUsedMb}MB</span>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-muted-foreground">No benchmark run yet — click below</div>
      )}
      <Button variant="outline" size="sm" className="mt-2 h-7 w-full text-[10px]" onClick={runBenchmark} disabled={running}>
        {running ? 'Running (~3s)…' : '▶ Run Real Benchmark'}
      </Button>
      {bench && (
        <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5 text-[10px] text-foreground">
          {bench.summary.customerReady.slice(0, 120)}…
        </div>
      )}
    </div>
  )
}

function K8sOperatorCard() {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-400"><Server className="h-3.5 w-3.5" /></div>
          <span className="text-xs font-semibold text-foreground">Kubernetes Operator</span>
        </div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px]">manifest ready</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">CRD + controller for automated K8s deployment.</p>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between"><span className="text-foreground">CRD</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">RBAC</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Controller</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Example instance</span><CheckCircle2 className="h-3 w-3 text-emerald-400" /></div>
      </div>
      <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5 text-[10px] text-muted-foreground">
        <code className="font-mono text-foreground">kubectl apply -f k8s/operator.yaml</code>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Rolling updates</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Auto-recovery</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">H scaling</Badge>
      </div>
    </div>
  )
}

function MarketplaceCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/plugins/registry').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  const registry = data?.registry
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400"><Puzzle className="h-3.5 w-3.5" /></div>
          <span className="text-xs font-semibold text-foreground">Plugin Marketplace</span>
        </div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px]">demo registry</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">PGP-signed registry z ratings + auto-updates.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalPlugins ?? 0}</div><div className="text-[9px] text-muted-foreground">plugins</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalDownloads?.toLocaleString() ?? 0}</div><div className="text-[9px] text-muted-foreground">downloads</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.avgRating ?? '—'}</div><div className="text-[9px] text-muted-foreground">avg rating</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">PGP signed</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Auto-update</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Revenue share</Badge>
      </div>
      <div className="mt-2 space-y-0.5">
        {(data?.plugins ?? []).slice(0, 3).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.name}</span>
            <span className="font-mono text-[9px] text-muted-foreground">★{p.rating}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
