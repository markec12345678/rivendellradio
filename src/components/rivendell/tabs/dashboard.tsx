'use client'

import { motion } from 'framer-motion'
import { Disc3, Music2, Clock, Radio, Users, Activity, Play, Square, Pause } from 'lucide-react'
import { useLiveStore } from '@/lib/stores/live'
import { useSchedule, useStations, useSendRml } from '@/lib/rivendell/api'
import { rockTracks } from '@/lib/rivendell/mock-data'
import { formatHms, formatClock, formatNumber } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { WaveformDisplay } from '@/components/rivendell/waveform-display'
import { SoundpanelGrid } from '@/components/rivendell/soundpanel-grid'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function DashboardTab() {
  const now = useLiveStore((s) => s.now)
  const nowPlaying = useLiveStore((s) => s.nowPlaying)
  const vu = useLiveStore((s) => s.vu)
  const listeners = useLiveStore((s) => s.listeners)
  const schedule = useSchedule()
  const stations = useStations()

  // Find the album art for the currently playing track
  const currentTrack = nowPlaying?.trackId
    ? rockTracks.find((t) => t.id === nowPlaying.trackId)
    : null
  const albumArt = currentTrack?.albumArt ?? '/album-art/rock-1.png'

  const liveShow = schedule.data?.shows.find((s) => s.status === 'live')
  const progress = nowPlaying ? (nowPlaying.elapsed / nowPlaying.length) * 100 : 0
  const totalListeners = Object.values(listeners).reduce((a, b) => a + b, 0) || stations.data?.stations.reduce((a, s) => a + s.listeners, 0) || 0

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Now Playing Hero */}
      <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-secondary/30">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 15% 20%, oklch(0.72 0.18 60 / 0.15), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.65 0.22 25 / 0.12), transparent 40%)',
          }}
          aria-hidden="true"
        />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <motion.div
              initial={{ scale: 0.9, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-primary/15 ring-1 ring-primary/30 sm:h-28 sm:w-28"
            >
              {nowPlaying ? (
                <img
                  src={albumArt}
                  alt={`Album art for ${nowPlaying.title}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary">
                  <Disc3 className="h-12 w-12" aria-hidden="true" />
                </div>
              )}
              {nowPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Disc3
                    className="h-10 w-10 animate-spin text-white/90 drop-shadow-lg"
                    style={{ animationDuration: '4s' }}
                    aria-hidden="true"
                  />
                </div>
              )}
            </motion.div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={nowPlaying ? 'border-accent/50 bg-accent/15 text-accent' : 'border-border bg-secondary/40 text-muted-foreground'}
                >
                  {nowPlaying ? 'ON AIR' : 'OFF AIR'}
                </Badge>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {nowPlaying?.album ?? '—'}
                </span>
              </div>

              {nowPlaying ? (
                <>
                  <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {nowPlaying.title}
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground sm:text-base">
                    <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {nowPlaying.artist}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <Progress value={progress} className="h-2 bg-secondary/60 [&>div]:bg-primary" />
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {formatHms(nowPlaying.elapsed)} / {formatHms(nowPlaying.length)}
                      </span>
                      <span className="text-primary">{formatHms(nowPlaying.remaining)} left</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <h2 className="text-2xl font-bold text-muted-foreground">No track playing</h2>
                  <p className="text-sm text-muted-foreground">Waiting for broadcast feed…</p>
                </div>
              )}

              {/* Up Next preview */}
              {liveShow && (() => {
                const playingIdx = liveShow.logLines.findIndex((l) => l.status === 'playing')
                const nextLine = playingIdx >= 0 ? liveShow.logLines[playingIdx + 1] : liveShow.logLines.find((l) => l.status === 'scheduled')
                if (!nextLine) return null
                return (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-1.5">
                    <Badge variant="outline" className="shrink-0 border-blue-500/40 bg-blue-500/10 text-[9px] text-blue-400">
                      UP NEXT
                    </Badge>
                    <span className="truncate text-xs text-foreground">{nextLine.title}</span>
                    {nextLine.artist && <span className="truncate text-[10px] text-muted-foreground">— {nextLine.artist}</span>}
                  </div>
                )
              })()}
            </div>

            {/* VU Meter */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-1.5 rounded-md border border-border bg-background/40 p-2" role="meter" aria-label="VU meter" aria-valuenow={Math.round(Math.max(vu[0], vu[1]) * 100)} aria-valuemin={0} aria-valuemax={100}>
                {[vu[0], vu[1]].map((v, i) => (
                  <div key={i} className="flex h-16 flex-col-reverse gap-0.5">
                    {Array.from({ length: 12 }).map((_, j) => {
                      const seg = (j + 1) / 12
                      const active = v >= seg - 1 / 12
                      return (
                        <div
                          key={j}
                          className={cn(
                            'h-1 w-3 rounded-sm transition-colors',
                            active
                              ? seg >= 0.9 ? 'bg-accent' : seg >= 0.7 ? 'bg-primary' : 'bg-primary/60'
                              : 'bg-border/60',
                          )}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">L / R</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row — color-coded per VLM feedback (not all amber) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Clock} label="Station Time" value={formatClock(now)} color="amber" />
        <StatCard icon={Users} label="Total Listeners" value={formatNumber(totalListeners)} color="emerald" />
        <StatCard icon={Radio} label="Active Stations" value={String(stations.data?.count ?? 0)} color="blue" />
        <StatCard icon={Activity} label="Schedule Shows" value={String(schedule.data?.count ?? 0)} color="purple" />
      </div>

      {/* Real-time waveform (full width) */}
      <WaveformDisplay height={160} />

      {/* Soundpanel */}
      <SoundpanelGrid />

      {/* Split layout: Live show log + Station listeners */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Live show log (LibreTime pattern: currently playing row highlighted) */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card/80">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
                {liveShow ? `${liveShow.name} — ${liveShow.host}` : 'No live show'}
                {liveShow && (
                  <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-400">
                    <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    LIVE
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-80">
                {schedule.isLoading ? (
                  <div className="p-4"><Skeleton className="h-32 w-full" /></div>
                ) : liveShow ? (
                  <div className="divide-y divide-border/60">
                    {liveShow.logLines.map((line) => (
                      <div
                        key={line.line}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2',
                          line.status === 'playing' && 'bg-emerald-500/10',
                          line.status === 'played' && 'opacity-50',
                          line.status === 'scheduled' && 'hover:bg-secondary/30',
                        )}
                      >
                        <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{line.line}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 font-mono text-[9px]',
                            line.type === 'music' && 'border-primary/40 text-primary',
                            line.type === 'jingle' && 'border-emerald-500/40 text-emerald-400',
                            line.type === 'ad' && 'border-accent/40 text-accent',
                            line.type === 'promo' && 'border-purple-500/40 text-purple-400',
                          )}
                        >
                          {line.type.toUpperCase()}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-foreground">{line.title}</div>
                          {line.artist && <div className="truncate text-[10px] text-muted-foreground">{line.artist}</div>}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatHms(line.length)}</span>
                        {line.status === 'playing' && (
                          <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-400">PLAYING</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">No live show currently running.</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Station listeners */}
        <div>
          <Card className="border-border bg-card/80">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
                Station Listeners
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stations.isLoading ? (
                <div className="p-4"><Skeleton className="h-24 w-full" /></div>
              ) : (
                <div className="divide-y divide-border/60">
                  {stations.data?.stations.map((st) => {
                    const live = listeners[st.id] ?? st.listeners
                    const max = Math.max(...(stations.data?.stations.map((s) => s.listeners) ?? [1]))
                    const pct = max > 0 ? (live / max) * 100 : 0
                    return (
                      <div key={st.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium text-foreground">{st.name}</span>
                          <span className="font-mono text-sm text-primary">{formatNumber(live)}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress value={pct} className="h-1 bg-secondary/60 [&>div]:bg-primary" />
                          <span className="font-mono text-[9px] text-muted-foreground">{st.frequency}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'amber' }: { icon: typeof Clock; label: string; value: string; color?: 'amber' | 'emerald' | 'blue' | 'purple' }) {
  const colorMap = {
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
  }
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="flex items-center gap-3 p-3">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', colorMap[color])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="truncate font-mono text-sm font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
