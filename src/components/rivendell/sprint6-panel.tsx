'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, Rss, MessageSquare, Vote, Smartphone, Radio,
  RefreshCw, CheckCircle2, XCircle, Loader2, Pin, ThumbsUp,
  TrendingUp, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * Sprint6Panel — Traffic, Podcast, Engagement features.
 * Cards: Traffic & Billing, Podcast RSS, Live Chat, Polls, PWA.
 */

export function Sprint6Panel() {
  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
              Traffic · Podcast · Engagement
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              BXF traffic · RSS 2.0 podcast · live chat · polls · PWA offline
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            Sprint 6
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <TrafficCard />
          <PodcastCard />
          <ChatCard />
          <PollsCard />
          <PwaCard />
          <EngagementSummaryCard />
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 1. Traffic & Billing
// ============================================================================
function TrafficCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/traffic')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const summary = data?.summary

  return (
    <Sprint6Card
      icon={DollarSign}
      title="Traffic & Billing"
      status="healthy"
      statusLabel={`$${summary?.totalBilledUsd?.toLocaleString() ?? '—'}`}
      accent="emerald"
    >
      <p className="text-[11px] text-muted-foreground">
        BXF v3.1 + affidavit + make-goods.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
        <Metric label="advertisers" value={summary?.totalAdvertisers ?? '—'} />
        <Metric label="fill rate" value={summary ? `${summary.fillRate}%` : '—'} color="text-emerald-400" />
        <Metric label="spots" value={summary?.totalSpots ?? '—'} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[9px] text-muted-foreground">BXF v3.1</Badge>
        <Badge variant="outline" className="text-[9px] text-muted-foreground">QuickBooks IIF</Badge>
        <a
          href="/api/v1/traffic/bxf?format=xml"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-[9px] text-primary hover:underline"
        >
          <ExternalLink className="h-2.5 w-2.5" /> BXF XML
        </a>
      </div>
    </Sprint6Card>
  )
}

// ============================================================================
// 2. Podcast RSS
// ============================================================================
function PodcastCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/podcast')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const podcasts = data?.podcasts ?? []
  const stats = data?.stats

  return (
    <Sprint6Card
      icon={Rss}
      title="Podcast RSS 2.0"
      status="healthy"
      statusLabel={`${stats?.totalDownloads?.toLocaleString() ?? '—'} dl`}
      accent="purple"
    >
      <p className="text-[11px] text-muted-foreground">
        Podcast:2.0 namespace + auto-distribution.
      </p>
      <div className="mt-2 space-y-0.5">
        {podcasts.slice(0, 2).map((p: any) => (
          <div key={p.id} className="flex items-center justify-between text-[10px]">
            <span className="truncate text-foreground">{p.title}</span>
            <div className="flex gap-0.5">
              {p.distribution.applePodcasts === 'approved' && <span className="text-[9px]">🍎</span>}
              {p.distribution.spotify === 'approved' && <span className="text-[9px]">🟢</span>}
              {p.distribution.youtubeMusic === 'approved' && <span className="text-[9px]">▶️</span>}
              {p.podpingEnabled && <span className="text-[9px]">📡</span>}
            </div>
          </div>
        ))}
      </div>
      <a
        href="/api/v1/podcast/feed?id=pod-001"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> RSS feed XML
      </a>
    </Sprint6Card>
  )
}

// ============================================================================
// 3. Live Chat
// ============================================================================
function ChatCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/chat')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const messages = data?.messages ?? []
  const stats = data?.stats
  const pinned = data?.pinned ?? []

  return (
    <Sprint6Card
      icon={MessageSquare}
      status={stats && stats.pending > 0 ? 'warning' : 'healthy'}
      statusLabel={`${stats?.pending ?? 0} pending`}
      accent="blue"
      title="Live Listener Chat"
    >
      <p className="text-[11px] text-muted-foreground">
        Moderated message wall z profanity filter.
      </p>
      {pinned.length > 0 && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 p-1.5">
          <div className="flex items-center gap-1 text-[9px] font-semibold uppercase text-amber-400">
            <Pin className="h-2.5 w-2.5" /> Pinned
          </div>
          <div className="mt-0.5 text-[10px] text-foreground">{pinned[0].message}</div>
        </div>
      )}
      <div className="mt-2 space-y-0.5">
        {messages.filter((m: any) => m.status === 'approved').slice(0, 2).map((m: any) => (
          <div key={m.id} className="flex items-start gap-1.5 text-[10px]">
            <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.avatarColor }} />
            <span className="font-medium text-foreground">{m.listenerName}:</span>
            <span className="truncate text-muted-foreground">{m.message}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {stats?.total ?? 0} msgs · {stats?.profanityFlagged ?? 0} flagged
      </div>
    </Sprint6Card>
  )
}

// ============================================================================
// 4. Polls + Song Voting
// ============================================================================
function PollsCard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch('/api/v1/polls?active=true')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    poll()
    const id = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const polls = data?.polls ?? []
  const songVote = polls.find((p: any) => p.type === 'song-vote')
  const trackScores = data?.trackScores ?? {}

  return (
    <Sprint6Card
      icon={Vote}
      status={polls.length > 0 ? 'healthy' : 'warning'}
      statusLabel={`${polls.length} active`}
      accent="amber"
      title="Polls + Song Voting"
    >
      <p className="text-[11px] text-muted-foreground">
        Live polls feed AI Music Director rotation.
      </p>
      {songVote && (
        <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5">
          <div className="truncate text-[10px] font-medium text-foreground">{songVote.trackTitle}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <ThumbsUp className="h-2.5 w-2.5" /> {songVote.options[0]?.votes ?? 0}
            </span>
            <span className="text-[10px] text-muted-foreground">+{songVote.options[1]?.votes ?? 0}</span>
            <span className="ml-auto text-[9px] text-muted-foreground">
              score: {trackScores[songVote.trackId]?.rollingScore?.toFixed(2) ?? '—'}
            </span>
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>{data?.stats?.totalVotes?.toLocaleString() ?? 0} total votes</span>
      </div>
    </Sprint6Card>
  )
}

// ============================================================================
// 5. PWA
// ============================================================================
function PwaCard() {
  const [pwaStatus, setPwaStatus] = useState<{ manifest: boolean; serviceWorker: boolean }>({ manifest: false, serviceWorker: false })

  useEffect(() => {
    let cancelled = false
    // Check if manifest is registered
    fetch('/manifest.webmanifest')
      .then((r) => { if (!cancelled) setPwaStatus((s) => ({ ...s, manifest: r.ok })) })
      .catch(() => {})
    // Check if service worker is registered
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/sw.js').then((reg) => {
        if (!cancelled) setPwaStatus((s) => ({ ...s, serviceWorker: !!reg }))
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [])

  return (
    <Sprint6Card
      icon={Smartphone}
      status={pwaStatus.manifest ? 'healthy' : 'warning'}
      statusLabel={pwaStatus.manifest ? 'ready' : 'pending'}
      accent="purple"
      title="PWA + Offline"
    >
      <p className="text-[11px] text-muted-foreground">
        Installable + offline mode + push notifications.
      </p>
      <div className="mt-2 space-y-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Manifest</span>
          {pwaStatus.manifest ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          ) : (
            <XCircle className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Service Worker</span>
          {pwaStatus.serviceWorker ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          ) : (
            <XCircle className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-foreground">Push (VAPID)</span>
          <Badge variant="outline" className="text-[9px] text-muted-foreground">ready</Badge>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        NetworkFirst API · StaleWhileRevalidate images
      </div>
    </Sprint6Card>
  )
}

// ============================================================================
// 6. Engagement Summary
// ============================================================================
function EngagementSummaryCard() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/v1/chat').then((r) => r.json()).catch(() => null),
      fetch('/api/v1/polls').then((r) => r.json()).catch(() => null),
    ]).then(([chat, polls]) => {
      if (cancelled) return
      setStats({
        chatMessages: chat?.stats?.total ?? 0,
        chatApproved: chat?.stats?.approved ?? 0,
        pollVotes: polls?.stats?.totalVotes ?? 0,
        activePolls: polls?.stats?.totalPolls ?? 0,
      })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <Sprint6Card
      icon={TrendingUp}
      title="Engagement Loop"
      status="healthy"
      statusLabel="live"
      accent="emerald"
    >
      <p className="text-[11px] text-muted-foreground">
        Listener feedback → AI Music Director rotation.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <div className="text-muted-foreground">Chat msgs</div>
          <div className="font-mono text-foreground">{stats?.chatMessages ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Poll votes</div>
          <div className="font-mono text-foreground">{stats?.pollVotes?.toLocaleString() ?? '—'}</div>
        </div>
      </div>
      <div className="mt-2 rounded border border-border/40 bg-background/30 p-1.5">
        <div className="text-[9px] font-semibold uppercase text-muted-foreground">Feedback loop</div>
        <div className="mt-0.5 text-[10px] text-foreground">
          👍 votes → rolling score → AI rotation weight
        </div>
      </div>
    </Sprint6Card>
  )
}

// ============================================================================
// Shared
// ============================================================================
function Sprint6Card({
  icon: Icon,
  title,
  status,
  statusLabel,
  accent,
  children,
}: {
  icon: typeof DollarSign
  title: string
  status: 'healthy' | 'warning' | 'critical' | 'loading'
  statusLabel: string
  accent: 'emerald' | 'amber' | 'purple' | 'blue' | 'red'
  children: React.ReactNode
}) {
  const accentMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    blue: 'bg-blue-500/10 text-blue-400',
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
