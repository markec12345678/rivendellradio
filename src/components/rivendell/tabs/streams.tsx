'use client'

import { Radio, Users, Activity, Volume2 } from 'lucide-react'
import { useStations } from '@/lib/rivendell/api'
import { useLiveStore } from '@/lib/stores/live'
import { formatNumber } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function StreamsTab() {
  const stations = useStations()
  const listeners = useLiveStore((s) => s.listeners)

  const totalListeners = Object.values(listeners).reduce((a, b) => a + b, 0) || stations.data?.stations.reduce((a, s) => a + s.listeners, 0) || 0
  const maxListeners = Math.max(...(stations.data?.stations.map((s) => listeners[s.id] ?? s.listeners) ?? [1]))

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <Radio className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Streams</h1>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {formatNumber(totalListeners)} total listeners
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {stations.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)
        ) : (
          stations.data?.stations.map((st) => {
            const live = listeners[st.id] ?? st.listeners
            const pct = maxListeners > 0 ? (live / maxListeners) * 100 : 0
            return (
              <Card key={st.id} className={cn('border-border bg-card/80', st.onAir && 'border-emerald-500/30')}>
                <CardHeader className="border-b border-border/60 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', st.onAir ? 'bg-emerald-500/15 text-emerald-400' : 'bg-secondary/40 text-muted-foreground')}>
                        <Radio className="h-4 w-4" aria-hidden="true" />
                      </div>
                      {st.name}
                    </CardTitle>
                    {st.onAir ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-400">
                        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        ON AIR
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">OFFLINE</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Frequency</div>
                    <div className="font-mono text-sm text-foreground">{st.frequency}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Format</div>
                    <div className="text-sm text-foreground">{st.format}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />Listeners</span>
                      <span className="font-mono text-primary">{formatNumber(live)}</span>
                    </div>
                    <Progress value={pct} className="mt-1 h-1.5 bg-secondary/60 [&>div]:bg-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stream URL</div>
                    <code className="block truncate rounded bg-background/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">{st.streamUrl}</code>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Volume2 className="h-3 w-3" />{(st.sampleRate / 1000).toFixed(0)}kHz</span>
                    <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Stereo</span>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
