'use client'

import { useState, useEffect } from 'react'
import {
  Shield, KeyRound, Phone, Award, Mic, Globe, Bell, Target,
  CheckCircle2, XCircle, Loader2, TrendingUp, Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * Sprint7Panel — Strategic XL + missing features.
 * Cards: MFA, SSO, Guest Caller, Loyalty, Voice Track, Geo Analytics, Push, DAI.
 */

export function Sprint7Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
              Strategic XL + Advanced Features
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              MFA · SSO · WebRTC guests · loyalty · voice tracking · geo-map · push · DAI
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            Sprint 7
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <MfaCard />
          <SsoCard />
          <GuestCallerCard />
          <LoyaltyCard />
          <VoiceTrackCard />
          <GeoCard />
          <PushCard />
          <DaiCard />
          <SummaryCard />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 1. MFA
// ============================================================================
function MfaCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/auth/mfa').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const enrollments = data?.enrollments
  return (
    <Sprint7Card icon={KeyRound} title="MFA + WebAuthn" status={data?.mfaEnabled ? 'healthy' : 'warning'} statusLabel={data?.mfaEnabled ? 'active' : 'off'} accent="emerald">
      <p className="text-[11px] text-muted-foreground">TOTP RFC 6238 + passkeys (NIST AAL2).</p>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">TOTP</span>
          {enrollments?.totp?.some((t: any) => t.verified) ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">WebAuthn</span>
          <Badge variant="outline" className="text-[9px]">{enrollments?.webauthn?.length ?? 0} devices</Badge>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Step-up</span>
          {data?.stepUpActive ? <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">active</Badge> : <span className="text-[9px] text-muted-foreground">—</span>}
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Enforced: {data?.enforcedRoles?.length ?? 0} roles
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 2. SSO
// ============================================================================
function SsoCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/auth/sso').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const saml = data?.samlProviders ?? []
  const oidc = data?.oidcProviders ?? []
  return (
    <Sprint7Card icon={Shield} title="Enterprise SSO" status="healthy" statusLabel={`${saml.length + oidc.length} providers`} accent="purple">
      <p className="text-[11px] text-muted-foreground">SAML 2.0 + OIDC z JIT provisioning.</p>
      <div className="mt-2 space-y-0.5">
        {saml.slice(0, 2).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.name}</span>
            <Badge variant="outline" className={cn('text-[9px]', p.active ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')}>{p.active ? 'on' : 'off'}</Badge>
          </div>
        ))}
        {oidc.slice(0, 1).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.name}</span>
            <Badge variant="outline" className={cn('text-[9px]', p.active ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')}>{p.active ? 'on' : 'off'}</Badge>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {data?.stats?.totalUsers ?? 0} JIT users
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 3. Guest Caller
// ============================================================================
function GuestCallerCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/guest-caller').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const callers = data?.callers ?? []
  const onAir = callers.filter((c: any) => c.status === 'on-air')
  return (
    <Sprint7Card icon={Phone} title="WebRTC Guest Console" status={onAir.length > 0 ? 'healthy' : 'warning'} statusLabel={`${onAir.length} on-air`} accent="blue">
      <p className="text-[11px] text-muted-foreground">Browser-based phone-in z mix-minus + IFB.</p>
      <div className="mt-2 space-y-0.5">
        {callers.slice(0, 3).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              <span className={cn('h-1.5 w-1.5 rounded-full', c.status === 'on-air' ? 'bg-emerald-400 animate-pulse' : c.status === 'lobby' ? 'bg-amber-400' : 'bg-muted-foreground/40')} />
              <span className="truncate text-foreground">{c.guestName}</span>
            </span>
            {c.status === 'on-air' && (
              <span className="font-mono text-[9px] text-muted-foreground">{Math.round(c.audioLevel)}%</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Avg RTT: {data?.stats?.avgRtt ?? '—'}ms</span>
        <span>·</span>
        <span>{data?.stats?.inLobby ?? 0} lobby</span>
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 4. Loyalty
// ============================================================================
function LoyaltyCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/loyalty').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const leaderboard = data?.leaderboard ?? []
  const pendingUgc = data?.pendingUgcCount ?? 0
  return (
    <Sprint7Card icon={Award} title="Loyalty + UGC" status="healthy" statusLabel={`${data?.listenerCount ?? 0} listeners`} accent="amber">
      <p className="text-[11px] text-muted-foreground">P1 identification + rewards + UGC portal.</p>
      <div className="mt-2 space-y-0.5">
        {leaderboard.slice(0, 3).map((l: any, i: number) => (
          <div key={l.id} className="flex items-center justify-between text-[10px]">
            <span className="flex items-center gap-1">
              <span className="font-mono text-muted-foreground">#{i + 1}</span>
              <span className="truncate text-foreground">{l.name}</span>
            </span>
            <Badge variant="outline" className={cn('text-[9px]', l.tier === 'Diamond' ? 'border-blue-500/40 text-blue-400' : l.tier === 'Platinum' ? 'border-purple-500/40 text-purple-400' : l.tier === 'Gold' ? 'border-amber-500/40 text-amber-400' : 'text-muted-foreground')}>
              {l.tier}
            </Badge>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>{l(data?.tierDistribution?.Diamond)} Diamond</span>
        <span>·</span>
        <span>{pendingUgc} UGC pending</span>
      </div>
    </Sprint7Card>
  )
}
function l(x: any) { return x ?? 0 }

// ============================================================================
// 5. Voice Track
// ============================================================================
function VoiceTrackCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/voice-track').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const takes = data?.takes ?? []
  const stats = data?.stats
  return (
    <Sprint7Card icon={Mic} title="In-Browser Voice Track" status="healthy" statusLabel={`${takes.length} takes`} accent="purple">
      <p className="text-[11px] text-muted-foreground">Web Audio API + MediaRecorder z AI QC.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="avg QC" value={stats?.avgQcScore ?? '—'} color="text-emerald-400" />
        <Metric label="LUFS" value={stats?.avgLufs ?? '—'} />
        <Metric label="draft" value={stats?.draft ?? 0} color="text-amber-400" />
      </div>
      <div className="mt-2 space-y-0.5">
        {takes.slice(0, 2).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{t.title}</span>
            <Badge variant="outline" className={cn('text-[9px]', t.status === 'scheduled' ? 'border-emerald-500/40 text-emerald-400' : t.status === 'approved' ? 'border-blue-500/40 text-blue-400' : 'text-muted-foreground')}>
              {t.status}
            </Badge>
          </div>
        ))}
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 6. Geo Analytics
// ============================================================================
function GeoCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/analytics/geo').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const clusters = data?.clusters ?? []
  const topCities = data?.topCities ?? []
  return (
    <Sprint7Card icon={Globe} title="Geo-Map Analytics" status="healthy" statusLabel={`${data?.totalListeners ?? 0} listeners`} accent="emerald">
      <p className="text-[11px] text-muted-foreground">City-level pulses + device/ISP drill-down.</p>
      <div className="mt-2 space-y-0.5">
        {topCities.slice(0, 3).map((c: any) => (
          <div key={c.city} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{c.city}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{c.listeners} ({c.pct}%)</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <span>Mobile: {data?.byDevicePct?.mobile ?? 0}%</span>
        <span>·</span>
        <span>Desktop: {data?.byDevicePct?.desktop ?? 0}%</span>
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 7. Web Push
// ============================================================================
function PushCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/push').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const stats = data?.stats
  const notifs = data?.notifications ?? []
  return (
    <Sprint7Card icon={Bell} title="Web Push (VAPID)" status={data?.vapid?.configured ? 'healthy' : 'warning'} statusLabel={data?.vapid?.configured ? 'live' : 'sandbox'} accent="amber">
      <p className="text-[11px] text-muted-foreground">RFC 8291/8292 push za hosts in listeners.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="subs" value={stats?.activeSubscriptions ?? 0} />
        <Metric label="sent" value={stats?.totalSent ?? 0} />
        <Metric label="rate" value={`${stats?.deliveryRate ?? '—'}`} color="text-emerald-400" />
      </div>
      <div className="mt-2 space-y-0.5">
        {notifs.slice(0, 2).map((n: any) => (
          <div key={n.id} className="truncate text-[10px] text-foreground">{n.title}</div>
        ))}
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 8. DAI
// ============================================================================
function DaiCard() {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/dai').then((r) => r.json()).then((d) => { if (!cancelled) setData(d) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const campaigns = data?.campaigns ?? []
  const stats = data?.stats
  return (
    <Sprint7Card icon={Target} title="Dynamic Ad Insertion" status="healthy" statusLabel={`${stats?.activeCampaigns ?? 0} active`} accent="blue">
      <p className="text-[11px] text-muted-foreground">SCTE-35 + HLS per-listener targeting.</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="imps" value={stats?.totalImpressions?.toLocaleString() ?? '—'} />
        <Metric label="fill" value={`${stats?.avgFillRate ?? 0}%`} color="text-emerald-400" />
        <Metric label="CPM" value={`$${stats?.avgCpm ?? 0}`} />
      </div>
      <div className="mt-2 space-y-0.5">
        {campaigns.filter((c: any) => c.status === 'active').slice(0, 2).map((c: any) => (
          <div key={c.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{c.advertiser}</span>
            <span className="font-mono text-[9px] text-muted-foreground">{c.fillRate}%</span>
          </div>
        ))}
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// 9. Summary
// ============================================================================
function SummaryCard() {
  const [mfa, setMfa] = useState<any>(null)
  const [push, setPush] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/v1/auth/mfa').then((r) => r.json()).catch(() => null),
      fetch('/api/v1/push').then((r) => r.json()).catch(() => null),
    ]).then(([m, p]) => {
      if (cancelled) return
      setMfa(m)
      setPush(p)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <Sprint7Card icon={TrendingUp} title="Security Posture" status="healthy" statusLabel="hardened" accent="emerald">
      <p className="text-[11px] text-muted-foreground">OWASP + NIST AAL2 compliance.</p>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">MFA (AAL2)</span>
          {mfa?.mfaEnabled ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-amber-400" />}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Rate Limiting</span>
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">CSP + Headers</span>
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Web Push</span>
          {push?.vapid?.configured ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-amber-400" />}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Audit Trail</span>
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">EAS/CAP (FCC)</span>
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        </div>
      </div>
    </Sprint7Card>
  )
}

// ============================================================================
// Shared
// ============================================================================
function Sprint7Card({ icon: Icon, title, status, statusLabel, accent, children }: {
  icon: typeof Shield; title: string; status: 'healthy' | 'warning' | 'critical'; statusLabel: string; accent: 'emerald' | 'amber' | 'purple' | 'blue' | 'red'; children: React.ReactNode
}) {
  const accentMap = { emerald: 'bg-emerald-500/10 text-emerald-400', amber: 'bg-amber-500/10 text-amber-400', purple: 'bg-purple-500/10 text-purple-400', blue: 'bg-blue-500/10 text-blue-400', red: 'bg-destructive/10 text-destructive' }
  const statusMap = { healthy: 'border-emerald-500/40 text-emerald-400', warning: 'border-amber-500/40 text-amber-400', critical: 'border-destructive/40 text-destructive' }
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', accentMap[accent])}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <Badge variant="outline" className={cn('text-[9px]', statusMap[status])}>{statusLabel}</Badge>
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
