'use client'

import { useState } from 'react'
import { Calendar, Clock, User, Play, Pencil } from 'lucide-react'
import { useSchedule } from '@/lib/rivendell/api'
import { formatHms } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

export function ScheduleTab() {
  const schedule = useSchedule()
  const [selectedShow, setSelectedShow] = useState<ScheduleShow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const openEditor = (show: ScheduleShow) => {
    setSelectedShow(show)
    setDialogOpen(true)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Today&apos;s Schedule</h1>
        {schedule.data && (
          <Badge variant="outline" className="border-border/70 text-muted-foreground">
            {schedule.data.count} shows
          </Badge>
        )}
      </div>

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

      <LogEditorDialog show={selectedShow} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
