'use client'

import { motion } from 'framer-motion'
import {
  Radio, Signal, Wifi, WifiOff, Clock, Tag, Hash, Monitor, Server, Zap,
} from 'lucide-react'
import { useRds } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatRelative } from '@/lib/rivendell/format'
import { cn } from '@/lib/utils'

export function RdsPanel() {
  const rds = useRds()

  if (rds.isLoading) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  if (!rds.data) return null

  const { rds: data, targets } = rds.data
  const connectedCount = targets.filter((t) => t.status === 'connected').length

  return (
    <div className="space-y-4">
      {/* RDS metadata overview */}
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
            RDS / DAB+ Metadata Output
            <Badge variant="outline" className={data.encoderConnected ? 'border-emerald-500/40 text-emerald-400' : 'border-destructive/40 text-destructive'}>
              {data.encoderConnected ? 'ENCODER ONLINE' : 'ENCODER OFFLINE'}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Now-playing metadata distributed to FM RDS, DAB+, HD Radio, and streaming targets
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
          {/* FM RDS */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">FM RDS (RBDS)</div>
            <div className="grid grid-cols-2 gap-2">
              <RdsField icon={Hash} label="PI" value={data.pi} mono />
              <RdsField icon={Tag} label="PTY" value={`${data.pty} (${data.ptyLabel})`} />
              <RdsField icon={Radio} label="PS (8ch)" value={data.ps} mono />
              <RdsField icon={Monitor} label="RT (64ch)" value={data.rt} mono />
            </div>

            {/* RDS receiver preview */}
            <div className="rounded-md border border-border/60 bg-background/60 p-3">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">RDS Receiver Preview</div>
              <div className="font-mono">
                <div className="flex items-center gap-2 text-lg font-bold text-emerald-400">
                  <span className="text-[10px] text-muted-foreground">88.7</span>
                  <span>{data.ps.trim()}</span>
                </div>
                <div className="mt-1 truncate text-xs text-amber-400">{data.rt}</div>
                <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                  <span>PTY: {data.ptyLabel}</span>
                  <span>·</span>
                  <span>PI: {data.pi}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DAB+ / HD Radio / Streaming */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Digital & Streaming</div>
            <div className="space-y-2">
              <RdsField icon={Monitor} label="DAB+ DLS" value={data.dls} mono />
              <RdsField icon={Zap} label="HD Radio Title" value={data.hdTitle} />
              <RdsField icon={Zap} label="HD Radio Artist" value={data.hdArtist} />
              <RdsField icon={Server} label="Stream Title" value={data.streamTitle} mono />
            </div>

            {/* UECP command */}
            <div className="rounded-md border border-border/60 bg-background/60 p-3">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">UECP Command</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                <div>Addr: 0x{data.uecpCommand.address.toString(16).toUpperCase().padStart(4, '0')} · Dataset: {data.uecpCommand.dataset}</div>
                {data.uecpCommand.elements.map((el, i) => (
                  <div key={i} className="mt-0.5">
                    <span className="text-primary">[{el.type}]</span> {el.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected targets */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-primary" aria-hidden="true" />
            Metadata Targets
            <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
              {connectedCount}/{targets.length} connected
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {targets.map((target) => (
              <motion.div
                key={target.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {target.status === 'connected' ? (
                  <Wifi className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                ) : (
                  <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{target.name}</div>
                  <code className="truncate font-mono text-[10px] text-muted-foreground">{target.address}</code>
                </div>
                <Badge variant="outline" className="shrink-0 text-[9px] text-muted-foreground">{target.protocol}</Badge>
                <div className="shrink-0 text-right">
                  <Badge
                    variant="outline"
                    className={target.status === 'connected' ? 'border-emerald-500/40 text-[9px] text-emerald-400' : 'border-border text-[9px] text-muted-foreground'}
                  >
                    {target.status === 'connected' ? 'CONNECTED' : 'OFFLINE'}
                  </Badge>
                  {target.lastSent && (
                    <div className="mt-0.5 flex items-center justify-end gap-0.5 text-[9px] text-muted-foreground">
                      <Clock className="h-2 w-2" />
                      {formatRelative(target.lastSent)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RdsField({ icon: Icon, label, value, mono }: { icon: typeof Hash; label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className={cn('truncate text-xs text-foreground', mono && 'font-mono')}>{value}</div>
    </div>
  )
}
