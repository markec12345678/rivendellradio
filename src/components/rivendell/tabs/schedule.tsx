'use client'

import { useState } from 'react'
import { Calendar, Clock, User, Play, Pencil, Grid3x3, List } from 'lucide-react'
import { useSchedule, useWeeklySchedule } from '@/lib/rivendell/api'
import { formatHms } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LogEditorDialog } from '@/components/rivendell/log-editor-dialog'
import type { ScheduleShow } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

const statusConfig = {
  live: { label: 'LIVE', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  scheduled: { label: 'SCHEDULED', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  completed: { label: 'COMPLETED', color: 'border-border bg-secondary/40 text-muted-foreground' },
  empty: { label: 'EMPTY', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const colorClasses: Record<string, string> = {
  amber: 'bg-amber-500/30 border-amber-500/50 text-amber-100',
  emerald: 'bg-emerald-500/30 border-emerald-500/50 text-emerald-100',
  blue: 'bg-blue-500/30 border-blue-500/50 text-blue-100',
  purple: 'bg-purple-500/30 border-purple-500/50 text-purple-100',
  red: 'bg-red-500/30 border-red-500/50 text-red-100',
  gray: 'bg-gray-500/30 border-gray-500/50 text-gray-100',
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function ScheduleTab() {
  const schedule = useSchedule()
  const weekly = useWeeklySchedule()
  const [selectedShow, setSelectedShow] = useState<ScheduleShow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [view, setView] = useState<'today' | 'week'>('today')

  const openEditor = (show: ScheduleShow) => {
    setSelectedShow(show)
    setDialogOpen(true)
  }

  const currentDay = new Date().getDay()
  const currentHour = new Date().getHours()
  const currentMinute = new Date().getMinutes()
  const nowMinutes = currentHour * 60 + currentMinute

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Schedule</h1>
        {schedule.data && (
          <Badge variant="outline" className="border-border/70 text-muted-foreground">
            {schedule.data.count} shows today
          </Badge>
        )}
        <div className="ml-auto flex items-center rounded-md border border-border bg-background/40 p-0.5">
          <Button
            type="button"
            variant={view === 'today' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('today')}
            className="h-8 gap-1.5 text-xs"
          >
            <List className="h-3.5 w-3.5" />
            Today
          </Button>
          <Button
            type="button"
            variant={view === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('week')}
            className="h-8 gap-1.5 text-xs"
          >
            <Grid3x3 className="h-3.5 w-3.5" />
            Week
          </Button>
        </div>
      </div>

      {view === 'today' ? (
        /* Today's shows — list view */
        <div className="space-y-3">
          {schedule.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : (
            schedule.data?.shows.map((show) => {
              const st = statusConfig[show.status]
              const totalLength = show.logLines.reduce((a, l) => a + l.length, 0)
              return (
                <Card
                  key={show.id}
                  className={cn('cursor-pointer border-border bg-card/80 transition-colors hover:border-primary/40', show.status === 'live' && 'border-emerald-500/40')}
                  onClick={() => openEditor(show)}
                >
                  <CardHeader className="border-b border-border/60 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="font-mono text-sm font-bold text-primary">{show.startTime}</span>
                          <span className="font-mono text-[9px] text-muted-foreground">{show.endTime}</span>
                        </div>
                        <div>
                          <CardTitle className="flex items-center gap-2 text-sm">
                            {show.name}
                            {show.status === 'live' && (
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                              </span>
                            )}
                            <Pencil className="h-3 w-3 text-muted-foreground" aria-label="Edit show" />
                          </CardTitle>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{show.host}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatHms(totalLength)}</span>
                            <span>{show.logLines.length} items</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={st.color}>{st.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className={cn(show.status === 'live' ? 'max-h-64' : 'max-h-40')}>
                      <div className="divide-y divide-border/60">
                        {show.logLines.map((line) => (
                          <div
                            key={line.line}
                            className={cn(
                              'flex items-center gap-3 px-4 py-1.5',
                              line.status === 'playing' && 'bg-emerald-500/10',
                              line.status === 'played' && 'opacity-40',
                            )}
                          >
                            <span className="w-5 shrink-0 text-right font-mono text-[9px] text-muted-foreground">{line.line}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'shrink-0 font-mono text-[8px]',
                                line.type === 'music' && 'border-primary/40 text-primary',
                                line.type === 'jingle' && 'border-emerald-500/40 text-emerald-400',
                                line.type === 'ad' && 'border-accent/40 text-accent',
                                line.type === 'promo' && 'border-purple-500/40 text-purple-400',
                              )}
                            >
                              {line.type.toUpperCase()}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <span className="truncate text-xs text-foreground">{line.title}</span>
                              {line.artist && <span className="ml-1 text-[10px] text-muted-foreground">— {line.artist}</span>}
                            </div>
                            <span className="shrink-0 font-mono text-[9px] text-muted-foreground">{formatHms(line.length)}</span>
                            {line.status === 'playing' && <Play className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        /* Weekly timetable — grid view (AzuraCast pattern) */
        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Grid3x3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Weekly Timetable
              <span className="font-mono text-[10px] text-muted-foreground">
                {weekly.data?.count ?? 0} slots
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-2">
            {weekly.isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <div className="min-w-[900px]">
                {/* Day headers */}
                <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1 border-b border-border/60 pb-1">
                  <div className="text-center text-[10px] font-mono text-muted-foreground">Hour</div>
                  {DAYS.map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        'rounded px-2 py-1 text-center text-xs font-semibold',
                        i === currentDay ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* Time grid */}
                <div className="relative mt-1 grid grid-cols-[48px_repeat(7,1fr)] gap-1">
                  {/* Hour labels column */}
                  <div className="flex flex-col">
                    {HOURS.map((h) => (
                      <div key={h} className="flex h-12 items-start justify-end pr-1 font-mono text-[9px] text-muted-foreground">
                        {String(h).padStart(2, '0')}:00
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {DAYS.map((_, dayIdx) => (
                    <div key={dayIdx} className="relative flex flex-col">
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className={cn(
                            'h-12 border-b border-r border-border/30',
                            dayIdx === currentDay && h === currentHour && 'bg-primary/5',
                          )}
                        />
                      ))}

                      {/* Show slots overlay */}
                      {weekly.data?.schedule
                        .filter((s) => s.day === dayIdx)
                        .map((slot, idx) => {
                          const startMin = timeToMinutes(slot.startTime)
                          let endMin = timeToMinutes(slot.endTime)
                          if (endMin <= startMin) endMin = 24 * 60 // overnight
                          const topPct = (startMin / (24 * 60)) * 100
                          const heightPct = ((endMin - startMin) / (24 * 60)) * 100
                          const isLive = dayIdx === currentDay && nowMinutes >= startMin && nowMinutes < endMin
                          return (
                            <div
                              key={idx}
                              className={cn(
                                'absolute left-0.5 right-0.5 overflow-hidden rounded border px-1.5 py-1 text-[9px] leading-tight',
                                colorClasses[slot.color] ?? colorClasses.gray,
                                isLive && 'ring-2 ring-white/50',
                              )}
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                              }}
                              title={`${slot.name} — ${slot.host}\n${slot.startTime} - ${slot.endTime}`}
                            >
                              <div className="truncate font-semibold">{slot.name}</div>
                              <div className="truncate opacity-70">{slot.startTime}–{slot.endTime}</div>
                              <div className="truncate opacity-60">{slot.host}</div>
                              {isLive && (
                                <div className="mt-0.5 flex items-center gap-0.5 font-bold">
                                  <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-white" />
                                  LIVE
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Legend:</span>
                  {Object.entries(colorClasses).map(([color, cls]) => (
                    <div key={color} className="flex items-center gap-1">
                      <span className={cn('inline-block h-3 w-3 rounded border', cls.split(' ').slice(0, 2).join(' '))} />
                      <span className="text-[10px] text-muted-foreground capitalize">{color}</span>
                    </div>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded border-2 border-white/50 bg-primary/30" />
                    <span className="text-[10px] text-muted-foreground">LIVE now</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <LogEditorDialog show={selectedShow} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
