'use client'

import { useState, useEffect } from 'react'
import { Radio, Play, Pause, RefreshCw, Zap, Activity, Clock, Music } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Auto-Pilot Dashboard — 24/7 AI radio control panel.
 *
 * Shows:
 *   - Auto-pilot status (enabled/disabled)
 *   - Current show name
 *   - Last/next generation time
 *   - Live listener count (from realtime endpoint)
 *   - Generate Now button
 *   - Enable/Disable toggle
 */

interface AutopilotState {
  enabled: boolean
  startedAt: string | null
  lastGeneratedAt: string | null
  nextGenerationAt: string | null
  showsGenerated: number
  currentShowName: string | null
  generationIntervalMin: number
  playlistExhausted: boolean
}

interface LiveListeners {
  activeListeners: number
  trend: string
  totalSessionsToday: number
}

export function AutopilotDashboard() {
  const [state, setState] = useState<AutopilotState | null>(null)
  const [listeners, setListeners] = useState<LiveListeners | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchState = async () => {
    try {
      const res = await fetch('/api/v1/ai/auto-pilot')
      const data = await res.json()
      setState(data.state)
    } catch {}
  }

  const fetchListeners = async () => {
    try {
      const res = await fetch('/api/v1/realtime/listeners')
      const data = await res.json()
      setListeners({
        activeListeners: data.live?.activeListeners || 0,
        trend: data.live?.trend || 'no-data',
        totalSessionsToday: data.today?.totalSessions || 0,
      })
    } catch {}
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      await Promise.all([fetchState(), fetchListeners()])
      if (mounted) setLoading(false)
    }
    init()

    // Poll state every 30 seconds
    const stateInterval = setInterval(fetchState, 30000)
    // Poll listeners every 5 seconds
    const listenerInterval = setInterval(fetchListeners, 5000)

    return () => {
      mounted = false
      clearInterval(stateInterval)
      clearInterval(listenerInterval)
    }
  }, [])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      await fetch('/api/v1/ai/auto-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      await fetchState()
    } catch {}
    setActionLoading(false)
  }

  if (loading) {
    return (
      <Card className="border-primary/30 bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            AI Auto-Pilot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!state) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm">AI Auto-Pilot — Unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Could not fetch auto-pilot state.
        </CardContent>
      </Card>
    )
  }

  const trendColor =
    listeners?.trend === 'increasing' ? 'text-emerald-400' :
    listeners?.trend === 'decreasing' ? 'text-destructive' :
    'text-muted-foreground'

  const trendIcon =
    listeners?.trend === 'increasing' ? '↑' :
    listeners?.trend === 'decreasing' ? '↓' :
    '→'

  return (
    <Card className={cn(
      'border-primary/30 bg-card/80',
      state.enabled && 'border-emerald-500/40 bg-emerald-500/5',
    )}>
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
          AI Auto-Pilot
          <Badge
            variant="outline"
            className={cn(
              'ml-auto text-[9px]',
              state.enabled
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-border text-muted-foreground',
            )}
          >
            {state.enabled ? '● LIVE 24/7' : '○ DISABLED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {/* Status grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current show */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              <Music className="h-2.5 w-2.5" /> Current Show
            </div>
            <div className="mt-1 truncate font-mono text-xs font-semibold text-foreground">
              {state.currentShowName || '—'}
            </div>
          </div>

          {/* Live listeners */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              <Activity className="h-2.5 w-2.5" /> Listeners
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-mono text-sm font-bold text-foreground">
                {listeners?.activeListeners ?? 0}
              </span>
              <span className={cn('text-[10px]', trendColor)}>
                {trendIcon} {listeners?.trend}
              </span>
            </div>
          </div>

          {/* Shows generated */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              <Zap className="h-2.5 w-2.5" /> Shows Generated
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-foreground">
              {state.showsGenerated}
            </div>
          </div>

          {/* Next generation */}
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              <Clock className="h-2.5 w-2.5" /> Next Generation
            </div>
            <div className="mt-1 truncate font-mono text-xs text-foreground">
              {state.nextGenerationAt
                ? new Date(state.nextGenerationAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </div>
          </div>
        </div>

        {/* Playlist status */}
        {state.playlistExhausted && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
            <div className="text-[10px] text-amber-400">
              ⚠ Playlist exhausted — generate a new show to continue broadcasting
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!state.enabled ? (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-[11px]"
              disabled={actionLoading}
              onClick={() => handleAction('enable')}
            >
              <Play className="mr-1 h-3 w-3" /> Enable 24/7
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] border-destructive/40 text-destructive"
              disabled={actionLoading}
              onClick={() => handleAction('disable')}
            >
              <Pause className="mr-1 h-3 w-3" /> Disable
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={actionLoading || !state.enabled}
            onClick={() => handleAction('generate')}
          >
            <RefreshCw className={cn('mr-1 h-3 w-3', actionLoading && 'animate-spin')} />
            Generate Now
          </Button>
        </div>

        {/* Last generated */}
        {state.lastGeneratedAt && (
          <div className="text-[9px] text-muted-foreground">
            Last show: {new Date(state.lastGeneratedAt).toLocaleString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        )}

        {/* Honest note */}
        <div className="rounded-md border border-border/40 bg-background/20 p-2">
          <div className="text-[9px] leading-relaxed text-muted-foreground">
            <strong>Auto-Pilot</strong> generates shows every {state.generationIntervalMin} min
            with real weather (Open-Meteo), real news (RSS), and free TTS (Piper/ElevenLabs).
            Liquidsoap plays the playlist automatically.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
