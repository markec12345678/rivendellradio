'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, SkipBack, SkipForward, Clock, Radio, Zap, Activity,
  AlertTriangle, Bot, Server, Cable, Users, Disc3, ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatRelative } from '@/lib/rivendell/format'
import { cn } from '@/lib/utils'

interface ReplayEvent {
  id: string
  timestamp: string
  category: 'track' | 'rds' | 'gpio' | 'snmp' | 'ai' | 'webhook' | 'incident' | 'playlist' | 'listener' | 'system'
  type: string
  title: string
  description: string
  source: string
  severity: 'info' | 'warning' | 'critical'
  data?: Record<string, unknown>
}

const categoryIcons: Record<string, LucideIcon> = {
  track: Disc3,
  rds: Radio,
  gpio: Cable,
  snmp: Server,
  ai: Bot,
  webhook: Zap,
  incident: AlertTriangle,
  playlist: Activity,
  listener: Users,
  system: Activity,
}

const categoryColors: Record<string, string> = {
  track: 'text-primary',
  rds: 'text-blue-400',
  gpio: 'text-amber-400',
  snmp: 'text-emerald-400',
  ai: 'text-purple-400',
  webhook: 'text-cyan-400',
  incident: 'text-destructive',
  listener: 'text-emerald-400',
  system: 'text-muted-foreground',
}

const severityColors: Record<string, string> = {
  info: 'border-border/40',
  warning: 'border-amber-500/40 bg-amber-500/5',
  critical: 'border-destructive/40 bg-destructive/5',
}

export function ReplayStudio() {
  const [events, setEvents] = useState<ReplayEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const playTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load replay data
  const loadReplay = async () => {
    setLoading(true)
    setPlaying(false)
    setCurrentIdx(0)
    try {
      const params = new URLSearchParams()
      if (fromTime) params.set('from', new Date(fromTime).toISOString())
      if (toTime) params.set('to', new Date(toTime).toISOString())
      const res = await fetch(`/api/v1/replay?${params}`)
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReplay()
  }, [])

  // Playback
  useEffect(() => {
    if (playing && currentIdx < events.length - 1) {
      playTimer.current = setInterval(() => {
        setCurrentIdx((prev) => {
          if (prev >= events.length - 1) {
            setPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 800) // 800ms per event
    } else {
      if (playTimer.current) clearInterval(playTimer.current)
    }
    return () => {
      if (playTimer.current) clearInterval(playTimer.current)
    }
  }, [playing, currentIdx, events.length])

  const togglePlay = () => {
    if (currentIdx >= events.length - 1) setCurrentIdx(0)
    setPlaying(!playing)
  }

  const stepBack = () => {
    setPlaying(false)
    setCurrentIdx((prev) => Math.max(0, prev - 1))
  }

  const stepForward = () => {
    setPlaying(false)
    setCurrentIdx((prev) => Math.min(events.length - 1, prev + 1))
  }

  const progress = events.length > 0 ? ((currentIdx + 1) / events.length) * 100 : 0

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <SkipBack className="h-4 w-4 text-primary" aria-hidden="true" />
          Replay Studio
          <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
            {events.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {/* Time range selector */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">From</Label>
            <Input
              type="datetime-local"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="h-8 w-44 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">To</Label>
            <Input
              type="datetime-local"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="h-8 w-44 text-xs"
            />
          </div>
          <Button type="button" size="sm" variant="outline" onClick={loadReplay} disabled={loading} className="h-8">
            Load Replay
          </Button>
        </div>

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Clock className="mx-auto mb-2 h-8 w-8 opacity-30" />
            No events in selected time range.
          </div>
        ) : (
          <>
            {/* Playback controls */}
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 p-2">
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={stepBack} disabled={currentIdx === 0}>
                <SkipBack className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" className="h-8 w-8 p-0" onClick={togglePlay}>
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={stepForward} disabled={currentIdx >= events.length - 1}>
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
              <div className="ml-2 flex-1">
                <div className="relative h-1.5 rounded-full bg-secondary/60">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-primary bg-card transition-all"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {currentIdx + 1}/{events.length}
              </span>
            </div>

            {/* Current event (highlighted) */}
            {events[currentIdx] && (
              <motion.div
                key={events[currentIdx].id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'rounded-md border-2 p-3',
                  severityColors[events[currentIdx].severity],
                )}
              >
                <CurrentEventCard event={events[currentIdx]} />
              </motion.div>
            )}

            {/* Event list */}
            <ScrollArea className="max-h-48">
              <div className="space-y-0.5">
                {events.map((event, idx) => {
                  const Icon = categoryIcons[event.category] ?? Activity
                  const color = categoryColors[event.category] ?? 'text-muted-foreground'
                  const isCurrent = idx === currentIdx
                  const isPast = idx < currentIdx
                  return (
                    <div
                      key={event.id}
                      onClick={() => { setPlaying(false); setCurrentIdx(idx) }}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors',
                        isCurrent ? 'bg-primary/10' : 'hover:bg-secondary/30',
                        isPast && !isCurrent && 'opacity-50',
                      )}
                    >
                      <Icon className={cn('h-3 w-3 shrink-0', color)} aria-hidden="true" />
                      <span className="truncate text-[10px] text-foreground">{event.title}</span>
                      <span className="ml-auto shrink-0 font-mono text-[8px] text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {isCurrent && <ChevronRight className="h-3 w-3 shrink-0 text-primary" />}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CurrentEventCard({ event }: { event: ReplayEvent }) {
  const Icon = categoryIcons[event.category] ?? Activity
  const color = categoryColors[event.category] ?? 'text-muted-foreground'

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', color, 'bg-current/10')}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{event.title}</div>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Badge variant="outline" className="text-[8px]">{event.category}</Badge>
            <span>{event.source}</span>
            <span>·</span>
            <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{event.description}</p>
      {event.data && Object.keys(event.data).length > 0 && (
        <div className="mt-1.5 rounded border border-border/40 bg-background/40 p-1.5">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Event Data</div>
          <pre className="mt-0.5 font-mono text-[9px] text-foreground overflow-x-auto">{JSON.stringify(event.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
