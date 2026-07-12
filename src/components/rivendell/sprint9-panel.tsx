'use client'

import { useState, useEffect } from 'react'
import {
  Radio, Cpu, Layers, Zap, Globe, Video, Headphones, Smartphone,
  CheckCircle2, XCircle, Activity, Gauge,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function Sprint9Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
              Final Polish + Missing Features
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              HLS adaptive · SNMP SET · processing chain · dynamic placer · voice link · video podcast · IFB · presenter remote
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">Sprint 9</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <StreamingCard />
          <SnmpSetCard />
          <ProcessingCard />
          <PlacerCard />
          <VoiceLinkCard />
          <VideoPodcastCard />
          <CueBusCard />
          <PresenterRemoteCard />
        </div>
      </CardContent>
    </Card>
  )
}

function S9Card({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof Radio; title: string; status: 'healthy' | 'warning' | 'critical'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue' | 'red'; children: React.ReactNode
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

function StreamingCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/streaming').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const outputs = data?.outputs ?? []
  return (
    <S9Card icon={Radio} title="HLS + WebRTC + Multi-Codec" status="healthy" statusLabel={`${data?.stats?.totalListeners ?? 0} lis`} accent="blue">
      <p className="text-[11px] text-muted-foreground">7 outputs: Icecast ×4 + HLS + WebRTC + SRT.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="icecast" value={data?.stats?.icecastListeners ?? 0} />
        <Metric label="hls" value={data?.stats?.hlsListeners ?? 0} color="text-emerald-400" />
        <Metric label="webrtc" value={data?.stats?.webrtcListeners ?? 0} color="text-purple-400" />
      </div>
      <div className="mt-2 space-y-0.5">
        {outputs.slice(0, 3).map((o: any) => (
          <div key={o.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{o.name}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{o.listeners}</span>
          </div>
        ))}
      </div>
    </S9Card>
  )
}

function SnmpSetCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/snmp/set').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S9Card icon={Cpu} title="SNMP SET Control" status="healthy" statusLabel={`${stats?.successful ?? 0} cmds`} accent="amber">
      <p className="text-[11px] text-muted-foreground">Transmitter power/mute/reset via SNMP SET.</p>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between"><span className="text-foreground">Transmitter</span><span className="font-mono text-[9px] text-muted-foreground">4 ops</span></div>
        <div className="flex items-center justify-between"><span className="text-foreground">RDS Encoder</span><span className="font-mono text-[9px] text-muted-foreground">5 ops</span></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Processor</span><span className="font-mono text-[9px] text-muted-foreground">3 ops</span></div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Step-up MFA za destructive ops
      </div>
    </S9Card>
  )
}

function ProcessingCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/processing').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const active = data?.activePreset
  const hotSpare = data?.hotSpare
  return (
    <S9Card icon={Gauge} title="Processing + Hot-Spare" status={hotSpare?.primaryProcessor?.status === 'active' ? 'healthy' : 'warning'} statusLabel={active?.name ?? '—'} accent="purple">
      <p className="text-[11px] text-muted-foreground">Omnia 9 preset automation + Stereo Tool N+1.</p>
      <div className="mt-2 space-y-0.5 text-[10px]">
        <div className="flex items-center justify-between"><span className="text-foreground">Primary</span><Badge variant="outline" className={cn('text-[9px]', hotSpare?.primaryProcessor?.status === 'active' ? 'border-emerald-500/40 text-emerald-400' : 'border-destructive/40 text-destructive')}>{hotSpare?.primaryProcessor?.status ?? '—'}</Badge></div>
        <div className="flex items-center justify-between"><span className="text-foreground">Hot-Spare</span><Badge variant="outline" className="text-[9px]">{hotSpare?.spareProcessor?.status ?? '—'}</Badge></div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Daypart auto-switch · {data?.stats?.presetSwitches24h ?? 0} switches/24h
      </div>
    </S9Card>
  )
}

function PlacerCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/traffic/placer').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S9Card icon={Layers} title="Dynamic Placer" status="healthy" statusLabel={`${stats?.fillRate ?? 0}%`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">Auto-fill unsold avails z ROS/PSA/promo.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="sold" value={stats?.sold ?? 0} color="text-emerald-400" />
        <Metric label="filled" value={stats?.filled ?? 0} />
        <Metric label="unfilled" value={stats?.unfilled ?? 0} color="text-amber-400" />
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Recovery: ${stats?.lostRevenue ?? 0} at risk · 5 priority rules
      </div>
    </S9Card>
  )
}

function VoiceLinkCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/voice-link').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const links = data?.voiceLinks ?? []
  const langs = data?.multilingualSchedule ?? []
  return (
    <S9Card icon={Zap} title="Voice Link + Multilingual" status="healthy" statusLabel={`${data?.stats?.multilingualBulletinsToday ?? 0} bltns`} accent="amber">
      <p className="text-[11px] text-muted-foreground">Context-aware sweepers + 8-language news.</p>
      <div className="mt-2 space-y-0.5">
        {links.slice(0, 2).map((l: any) => (
          <div key={l.id} className="truncate text-[10px] text-foreground">{l.type}: {l.outgoingTrack.artist} → {l.incomingTrack.artist}</div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {langs.slice(0, 4).map((l: any) => (
          <Badge key={l.languageCode} variant="outline" className="text-[9px] text-muted-foreground">{l.languageCode}</Badge>
        ))}
      </div>
    </S9Card>
  )
}

function VideoPodcastCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/podcast/video').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const stats = data?.stats
  return (
    <S9Card icon={Video} title="Video Podcast" status="healthy" statusLabel={`${stats?.totalVideoEpisodes ?? 0} eps`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Video upload → derive audio → YouTube/Spotify/Apple.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="views" value={(stats?.totalVideoViews ?? 0).toLocaleString()} />
        <Metric label="downloads" value={(stats?.totalAudioDownloads ?? 0).toLocaleString()} />
        <Metric label="reach" value={(stats?.totalReach ?? 0).toLocaleString()} color="text-emerald-400" />
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        YouTube: {stats?.youtubePublished ?? 0} published · {stats?.youtubeProcessing ?? 0} processing
      </div>
    </S9Card>
  )
}

function CueBusCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/cue-bus').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  return (
    <S9Card icon={Headphones} title="IFB / Cue Bus" status="healthy" statusLabel={`${data?.stats?.ifbActiveSources ?? 0} IFB`} accent="purple">
      <p className="text-[11px] text-muted-foreground">Program-minus-mic + producer interrupt.</p>
      <div className="mt-2 space-y-0.5">
        {(data?.headphoneMixes ?? []).slice(0, 3).map((m: any) => (
          <div key={m.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{m.name}</span>
            {m.ifbSource ? <Badge variant="outline" className="text-[9px] text-emerald-400">IFB</Badge> : <span className="text-[9px] text-muted-foreground">—</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {data?.stats?.activeChannels ?? 0}/{data?.stats?.totalChannels ?? 0} channels active
      </div>
    </S9Card>
  )
}

function PresenterRemoteCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/presenter-remote').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])
  const remotes = data?.pairedRemotes ?? []
  const connected = remotes.filter((r: any) => r.socketConnected).length
  return (
    <S9Card icon={Smartphone} title="Presenter Remote + Density" status={connected > 0 ? 'healthy' : 'warning'} statusLabel={`${connected} connected`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">QR pair phone → WebSocket trigger + density modes.</p>
      <div className="mt-2 space-y-0.5">
        {remotes.slice(0, 2).map((r: any) => (
          <div key={r.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{r.presenterName}</span>
            {r.socketConnected ? <Activity className="h-3 w-3 text-emerald-400" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Density:</span>
        <Badge variant="outline" className="text-[9px] text-primary">{data?.density?.current ?? 'standard'}</Badge>
      </div>
    </S9Card>
  )
}
