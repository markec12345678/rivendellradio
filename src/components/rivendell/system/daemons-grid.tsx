'use client'

import { motion } from 'framer-motion'
import { Activity, Cpu, MemoryStick, Clock, RotateCcw } from 'lucide-react'
import { useDaemons } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUptime } from '@/lib/rivendell/format'
import type { Daemon } from '@/lib/rivendell/types'

const statusConfig: Record<Daemon['status'], { label: string; className: string; dot: string }> = {
  running: { label: 'RUNNING', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-500' },
  stopped: { label: 'STOPPED', className: 'border-border bg-secondary/40 text-muted-foreground', dot: 'bg-muted-foreground/40' },
  faulted: { label: 'FAULTED', className: 'border-accent/40 bg-accent/10 text-accent', dot: 'bg-accent' },
}

export function DaemonsGrid() {
  const daemons = useDaemons()
  if (daemons.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    )
  }
  if (daemons.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load daemon status.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {daemons.data?.daemons.map((d, idx) => {
        const status = statusConfig[d.status]
        return (
          <motion.div
            key={d.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
          >
            <Card className="h-full border-border bg-card/80">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-md ${
                        d.status === 'running'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-secondary/40 text-muted-foreground'
                      }`}
                    >
                      <Activity className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-mono text-sm">{d.name}</CardTitle>
                      <CardDescription className="text-xs">{d.displayName}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot} ${d.status === 'running' ? 'on-air-pulse' : ''}`} />
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <p className="text-muted-foreground">{d.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Metric icon={<Cpu className="h-3 w-3" />} label="CPU" value={`${d.cpu.toFixed(1)}%`} progress={d.cpu} />
                  <Metric icon={<MemoryStick className="h-3 w-3" />} label="MEM" value={`${d.memory.toFixed(1)} MB`} progress={Math.min(100, d.memory)} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    PID {d.pid}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    up {d.status === 'running' ? formatUptime(d.uptime) : '—'}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    {d.restarts}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  progress,
}: {
  icon: React.ReactNode
  label: string
  value: string
  progress: number
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-mono text-[11px] text-foreground">{value}</span>
      </div>
      <Progress value={progress} className="mt-1 h-1 bg-secondary/60 [&>div]:bg-primary" />
    </div>
  )
}
