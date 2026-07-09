'use client'

import { motion } from 'framer-motion'
import {
  Server, Wifi, WifiOff, Activity, Thermometer, Zap, Radio, Cpu,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SnmpOid {
  oid: string
  name: string
  value: string
  unit: string
  status: 'normal' | 'warning' | 'critical'
}

interface SnmpDevice {
  id: string
  name: string
  type: string
  ip: string
  port: number
  status: 'online' | 'offline' | 'warning' | 'critical'
  uptime: number
  uptimeFormatted: string
  oids: SnmpOid[]
}

const deviceTypeIcons: Record<string, LucideIcon> = {
  transmitter: Radio,
  encoder: Cpu,
  processor: Zap,
  mixer: Activity,
  'rds-encoder': Radio,
  'dab-mux': Server,
  'stream-server': Server,
}

const statusColors = {
  online: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  offline: 'border-border bg-secondary/40 text-muted-foreground',
}

const oidStatusColors = {
  normal: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-destructive',
}

export function SnmpPanel({ devices, healthScore, isLoading }: {
  devices?: SnmpDevice[]
  healthScore?: number
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  if (!devices || devices.length === 0) return null

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Server className="h-4 w-4 text-primary" aria-hidden="true" />
          SNMP Device Monitoring
          <Badge variant="outline" className={cn(
            'text-[10px]',
            (healthScore ?? 0) >= 80 ? 'border-emerald-500/40 text-emerald-400' :
            (healthScore ?? 0) >= 50 ? 'border-amber-500/40 text-amber-400' :
            'border-destructive/40 text-destructive',
          )}>
            Health: {healthScore ?? 0}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          <div className="divide-y divide-border/60">
            {devices.map((device, idx) => {
              const Icon = deviceTypeIcons[device.type] ?? Server
              const st = statusColors[device.status] ?? statusColors.offline
              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="px-4 py-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="text-sm font-medium text-foreground">{device.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{device.ip}:{device.port}</span>
                      <Badge variant="outline" className={cn('text-[9px]', st)}>
                        {device.status === 'online' ? <Wifi className="mr-1 h-2.5 w-2.5" /> : <WifiOff className="mr-1 h-2.5 w-2.5" />}
                        {device.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {device.status !== 'offline' && (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {device.oids.slice(0, 6).map((oid) => (
                        <div key={oid.oid} className="rounded border border-border/40 bg-background/40 px-2 py-1">
                          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{oid.name}</div>
                          <div className={cn('font-mono text-[10px]', oidStatusColors[oid.status])}>
                            {oid.value}{oid.unit && <span className="ml-0.5 text-muted-foreground">{oid.unit}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {device.uptime > 0 && (
                    <div className="mt-1 text-[9px] text-muted-foreground">Uptime: {device.uptimeFormatted}</div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
