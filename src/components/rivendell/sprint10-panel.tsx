'use client'

import { useState, useEffect } from 'react'
import { Radio, Headphones, Sparkles, Mic, TrendingUp, Link2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function Sprint10Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              Next-Gen + Emerging Tech
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              ATSC 3.0 · 5G broadcast · spatial audio · AI mastering · voice assistants · predictive AI · blockchain rights
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Sprint 10</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <NextGenCard />
          <SpatialCard />
          <MasteringCard />
          <VoiceAssistantCard />
          <PredictiveCard />
          <BlockchainCard />
        </div>
      </CardContent>
    </Card>
  )
}

function S10Card({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof Radio; title: string; status: 'healthy' | 'warning'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue'; children: React.ReactNode
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

function NextGenCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/next-gen-broadcast').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <S10Card icon={Radio} title="ATSC 3.0 + 5G Broadcast" status="healthy" statusLabel={`${data?.stats?.deployed ?? 0} live`} accent="blue">
      <p className="text-[11px] text-muted-foreground">NextGen TV + 5G eMBMS free-to-air mobile.</p>
      <div className="mt-2 space-y-0.5">
        {(data?.capabilities ?? []).slice(0, 3).map((c: any) => (
          <div key={c.standard} className="flex items-center justify-between text-[10px]">
            <span className="text-foreground">{c.standard}</span>
            <Badge variant="outline" className={cn('text-[9px]', c.status === 'deployed' ? 'border-emerald-500/40 text-emerald-400' : c.status === 'testing' ? 'border-amber-500/40 text-amber-400' : 'text-muted-foreground')}>{c.status}</Badge>
          </div>
        ))}
      </div>
    </S10Card>
  )
}

function SpatialCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/spatial-audio').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const config = data?.config
  return (
    <S10Card icon={Headphones} title="Spatial Audio (Atmos)" status="healthy" statusLabel={config?.bedConfiguration ?? '—'} accent="purple">
      <p className="text-[11px] text-muted-foreground">Dolby Atmos + MPEG-H 3D object-based.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{config?.objects?.length ?? 0}</div><div className="text-[9px] text-muted-foreground">objects</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{config?.languageTracks?.length ?? 0}</div><div className="text-[9px] text-muted-foreground">langs</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{config?.dialogueBoost ? '+6dB' : 'off'}</div><div className="text-[9px] text-muted-foreground">dialog</div></div>
      </div>
    </S10Card>
  )
}

function MasteringCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai-mastering').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S10Card icon={Sparkles} title="AI Mastering" status="healthy" statusLabel={`${stats?.totalMastered ?? 0} done`} accent="amber">
      <p className="text-[11px] text-muted-foreground">LANDR-class auto-mastering to EBU R128.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.queueDepth ?? 0}</div><div className="text-[9px] text-muted-foreground">queue</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.successRate ?? 0}%</div><div className="text-[9px] text-muted-foreground">success</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{Math.round((stats?.avgProcessingMs ?? 0) / 1000)}s</div><div className="text-[9px] text-muted-foreground">avg</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(data?.styles ?? []).slice(0, 4).map((s: any) => <Badge key={s.id} variant="outline" className="text-[9px] text-muted-foreground">{s.name}</Badge>)}
      </div>
    </S10Card>
  )
}

function VoiceAssistantCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/voice-assistant').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S10Card icon={Mic} title="Voice Assistant Skills" status="healthy" statusLabel={`${stats?.published ?? 0} live`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">Alexa + Google + Siri voice control.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalWeeklyInvocations ?? 0}</div><div className="text-[9px] text-muted-foreground">weekly</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalMonthlyUsers ?? 0}</div><div className="text-[9px] text-muted-foreground">users</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{stats?.avgRating ?? '—'}</div><div className="text-[9px] text-muted-foreground">rating</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(data?.skills ?? []).slice(0, 3).map((s: any) => <Badge key={s.id} variant="outline" className="text-[9px] text-muted-foreground">{s.platform}</Badge>)}
      </div>
    </S10Card>
  )
}

function PredictiveCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/predictive').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  const model = data?.modelInfo
  return (
    <S10Card icon={TrendingUp} title="Predictive AI Analytics" status="healthy" statusLabel={`${Math.round((model?.accuracy ?? 0) * 100)}% acc`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Churn prediction + listener forecast.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-destructive">{stats?.highRiskListeners ?? 0}</div><div className="text-[9px] text-muted-foreground">churn</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{model?.features ?? 0}</div><div className="text-[9px] text-muted-foreground">features</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{Math.round((stats?.avgForecastAccuracy ?? 0) * 100)}%</div><div className="text-[9px] text-muted-foreground">forecast</div></div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Algorithm: {model?.algorithm ?? '—'}
      </div>
    </S10Card>
  )
}

function BlockchainCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/blockchain-rights').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S10Card icon={Link2} title="Blockchain Rights" status="healthy" statusLabel={`${stats?.activeContracts ?? 0} contracts`} accent="purple">
      <p className="text-[11px] text-muted-foreground">Smart contract royalty distribution.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <div><div className="font-mono text-xs font-bold text-foreground">{stats?.totalPlaysTracked ?? 0}</div><div className="text-[9px] text-muted-foreground">plays</div></div>
        <div><div className="font-mono text-xs font-bold text-emerald-400">{(stats?.totalRoyaltiesPaid ?? 0).toFixed(2)}</div><div className="text-[9px] text-muted-foreground">MATIC</div></div>
        <div><div className="font-mono text-xs font-bold text-foreground">{(stats?.avgRoyaltyPerPlay ?? 0).toFixed(4)}</div><div className="text-[9px] text-muted-foreground">/play</div></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Polygon</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">ERC-721</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">Chainlink</Badge>
      </div>
    </S10Card>
  )
}
