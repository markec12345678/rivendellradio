'use client'

import { useState, useEffect } from 'react'
import { Network, Database, Brain, Car, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ProfessionalBroadcastPanel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4 text-primary" aria-hidden="true" />
              Professional Broadcast Infrastructure
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              AES67/ST 2110/NMOS · Data Warehouse · Feature Store · AI Program Director · CarPlay/Android Auto
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Sprint 15</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <AES67Card />
        <WarehouseCard />
        <FeatureStoreCard />
        <ProgramDirectorCard />
        <CarPlayCard />
      </CardContent>
    </Card>
  )
}

function PCard({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof Network; title: string; status: 'healthy' | 'warning'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue'; children: React.ReactNode
}) {
  const accentMap = { emerald: 'bg-emerald-500/10 text-emerald-400', amber: 'bg-amber-500/10 text-amber-400', purple: 'bg-purple-500/10 text-purple-400', blue: 'bg-blue-500/10 text-blue-400' }
  const statusMap = { healthy: 'border-emerald-500/40 text-emerald-400', warning: 'border-amber-500/40 text-amber-400' }
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

function AES67Card() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/aes67').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <PCard icon={Network} title="AES67 / SMPTE ST 2110 / NMOS" status="warning" statusLabel={`${stats?.totalNodes ?? 0} nodes`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Professional audio-over-IP interconnect (Lawo, Riedel, Dante).</p>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.senders ?? 0}</div><div className="text-[9px] text-muted-foreground">senders</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.receivers ?? 0}</div><div className="text-[9px] text-muted-foreground">receivers</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.ptpLocked ?? 0}</div><div className="text-[9px] text-muted-foreground">PTP</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalBandwidthMbps ?? 0}M</div><div className="text-[9px] text-muted-foreground">bps</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">AES67-2018</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">ST 2110</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">NMOS IS-04/05/08</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">PTPv2</Badge>
      </div>
    </PCard>
  )
}

function WarehouseCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/warehouse').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <PCard icon={Database} title="Data Warehouse (OLAP)" status="warning" statusLabel={`${stats?.totalTables ?? 0} tables`} accent="purple">
      <p className="text-[11px] text-muted-foreground">ClickHouse/DuckDB za production ML + analytics.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{(stats?.totalRows ?? 0).toLocaleString()}</div><div className="text-[9px] text-muted-foreground">rows</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalSizeMb ?? 0}MB</div><div className="text-[9px] text-muted-foreground">size</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.totalTables ?? 0}</div><div className="text-[9px] text-muted-foreground">tables</div></div>
      </div>
      <div className="mt-2 space-y-0.5">
        {(data?.tables ?? []).slice(0, 3).map((t: any) => (
          <div key={t.name} className="flex items-center justify-between text-[10px]">
            <span className="truncate font-mono text-foreground">{t.name}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{(t.rowCount / 1000000).toFixed(1)}M rows</span>
          </div>
        ))}
      </div>
    </PCard>
  )
}

function FeatureStoreCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/feature-store').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <PCard icon={Zap} title="Feature Store (Feast)" status="warning" statusLabel={`${stats?.totalFeatures ?? 0} features`} accent="amber">
      <p className="text-[11px] text-muted-foreground">Consistent ML features za training + serving.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalViews ?? 0}</div><div className="text-[9px] text-muted-foreground">views</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalFeatures ?? 0}</div><div className="text-[9px] text-muted-foreground">features</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.realtimeViews ?? 0}</div><div className="text-[9px] text-muted-foreground">realtime</div></div>
      </div>
      <div className="mt-2 space-y-0.5">
        {(data?.featureViews ?? []).slice(0, 3).map((fv: any) => (
          <div key={fv.name} className="flex items-center justify-between text-[10px]">
            <span className="truncate font-mono text-foreground">{fv.name}</span>
            <Badge variant="outline" className="text-[9px] text-muted-foreground">{fv.onlineStore}</Badge>
          </div>
        ))}
      </div>
    </PCard>
  )
}

function ProgramDirectorCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/program-director').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const ctx = data?.context
  const recs = data?.recommendations ?? []
  const stats = data?.stats
  return (
    <PCard icon={Brain} title="AI Program Director" status="healthy" statusLabel={`${stats?.activeRecommendations ?? 0} recs`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">Full context: weather, traffic, holiday, sports, energy curve.</p>
      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{ctx?.weather?.tempC ?? 0}°C</div><div className="text-[9px] text-muted-foreground">temp</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{ctx?.trafficLevel ?? '—'}</div><div className="text-[9px] text-muted-foreground">traffic</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{ctx?.minutesSinceLastHit ?? 0}m</div><div className="text-[9px] text-muted-foreground">last hit</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{ctx?.energyLast30min?.toFixed(2) ?? '—'}</div><div className="text-[9px] text-muted-foreground">energy</div></div>
      </div>
      <div className="mt-2 space-y-0.5">
        {recs.slice(0, 2).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{r.type}</span>
            <Badge variant="outline" className={cn('text-[9px]', r.priority === 'high' ? 'border-amber-500/40 text-amber-400' : 'text-muted-foreground')}>{r.priority}</Badge>
          </div>
        ))}
      </div>
    </PCard>
  )
}

function CarPlayCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/carplay').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const np = data?.nowPlaying
  return (
    <PCard icon={Car} title="CarPlay / Android Auto" status="healthy" statusLabel="API ready" accent="blue">
      <p className="text-[11px] text-muted-foreground">Now-playing metadata + queue for automotive.</p>
      <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5">
        <div className="truncate text-[10px] font-medium text-foreground">{np?.title ?? '—'} — {np?.artist ?? '—'}</div>
        <div className="text-[9px] text-muted-foreground">{np?.durationMs ? Math.round(np.durationMs / 1000) : 0}s · {np?.genre ?? '—'}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">CarPlay</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Android Auto</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Siri</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Google Assistant</Badge>
      </div>
    </PCard>
  )
}
