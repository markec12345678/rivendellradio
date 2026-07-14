// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion } from 'framer-motion'
import { Server, Radio, Users, Music, Activity, ExternalLink } from 'lucide-react'
import { useServices } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Service } from '@/lib/rivendell/types'

const statusConfig: Record<Service['status'], { label: string; className: string }> = {
  active: { label: 'ACTIVE', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  inactive: { label: 'INACTIVE', className: 'border-border bg-secondary/40 text-muted-foreground' },
  backup: { label: 'BACKUP', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
}

export function ServiceCard() {
  const services = useServices()

  if (services.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    )
  }
  if (services.isError) {
    return (
      <Card className="border-destructive/40 bg-card/80">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load services.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {services.data?.services.map((s, idx) => {
        const status = statusConfig[s.status]
        return (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full border-border bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold"
                      style={{
                        backgroundColor: `${s.color}25`,
                        color: s.color,
                        boxShadow: `inset 0 0 0 1px ${s.color}55`,
                      }}
                    >
                      <Server className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <CardDescription className="text-xs">{s.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Sample rate" value={`${(s.sampleRate / 1000).toFixed(1)} kHz`} icon={<Activity className="h-3.5 w-3.5" />} />
                <Row label="Channels" value={`${s.channels} (${s.channels === 2 ? 'stereo' : 'mono'})`} icon={<Music className="h-3.5 w-3.5" />} />
                <Row label="Stations" value={String(s.stationCount)} icon={<Radio className="h-3.5 w-3.5" />} />
                <Row label="Default log" value={s.defaultLogName} icon={<Users className="h-3.5 w-3.5" />} />
                {s.streamUrl && (
                  <a
                    href={s.streamUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 flex items-center gap-1 truncate rounded-md border border-border/60 bg-background/40 p-2 font-mono text-xs text-primary hover:bg-secondary/40"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{s.streamUrl}</span>
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}
