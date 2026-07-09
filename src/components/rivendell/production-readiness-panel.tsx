'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, AlertTriangle, AlertCircle, Database, Clock, HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/rivendell/format'
import { cn } from '@/lib/utils'

interface HealthCheck {
  name: string
  category: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  message: string
  value?: string
}

interface BackupInfo {
  lastBackup: string
  backupSize: number
  autoBackup: boolean
  backupInterval: string
  retentionDays: number
  restoreTested: boolean
  lastRestoreTest: string
  recoveryTimeObjective: string
  recoveryPointObjective: string
  databaseSize: number
  snapshots: Array<{ id: string; timestamp: string; size: number; type: string }>
}

const checkIcons: Record<string, typeof ShieldCheck> = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
  unknown: AlertCircle,
}

const checkColors = {
  healthy: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-destructive',
  unknown: 'text-muted-foreground',
}

const statusBadgeColors = {
  healthy: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  unknown: 'border-border bg-secondary/40 text-muted-foreground',
}

export function ProductionReadinessPanel({ health, backup, isLoading }: {
  health?: { healthScore: number; status: string; checks: HealthCheck[]; summary: { uptime: number; memoryMb: number } }
  backup?: BackupInfo
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Health Score + Diagnostics */}
      <Card className={cn(
        'border-border bg-card/80',
        health?.status === 'critical' ? 'border-destructive/30' :
        health?.status === 'warning' ? 'border-amber-500/30' : 'border-emerald-500/30',
      )}>
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            System Health
            {health && (
              <Badge variant="outline" className={cn('text-[10px]', statusBadgeColors[health.status as keyof typeof statusBadgeColors] ?? statusBadgeColors.unknown)}>
                {health.healthScore}% — {health.status.toUpperCase()}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {/* Health score bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Overall Health Score</span>
              <span className="font-mono text-foreground">{health?.healthScore ?? 0}%</span>
            </div>
            <Progress
              value={health?.healthScore ?? 0}
              className={cn(
                'h-2',
                (health?.healthScore ?? 0) >= 80 ? '[&>div]:bg-emerald-500' :
                (health?.healthScore ?? 0) >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive',
              )}
            />
          </div>

          {/* Individual checks */}
          <div className="grid grid-cols-2 gap-1.5">
            {health?.checks.map((check) => {
              const Icon = checkIcons[check.status] ?? AlertCircle
              return (
                <div key={check.name} className="rounded border border-border/40 bg-background/40 px-2 py-1.5">
                  <div className="flex items-center gap-1">
                    <Icon className={cn('h-3 w-3 shrink-0', checkColors[check.status])} aria-hidden="true" />
                    <span className="truncate text-[10px] font-medium text-foreground">{check.name}</span>
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">
                    {check.value ?? check.status}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4 border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
            <span>Uptime: <span className="font-mono text-foreground">{Math.floor((health?.summary.uptime ?? 0) / 60)}m</span></span>
            <span>Memory: <span className="font-mono text-foreground">{health?.summary.memoryMb ?? 0}MB</span></span>
          </div>
        </CardContent>
      </Card>

      {/* Backup & Recovery */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" aria-hidden="true" />
            Backup & Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {/* RTO/RPO */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-emerald-400">RTO</div>
              <div className="font-mono text-sm text-foreground">{backup?.recoveryTimeObjective ?? '—'}</div>
              <div className="text-[8px] text-muted-foreground">Recovery Time Objective</div>
            </div>
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-blue-400">RPO</div>
              <div className="font-mono text-sm text-foreground">{backup?.recoveryPointObjective ?? '—'}</div>
              <div className="text-[8px] text-muted-foreground">Recovery Point Objective</div>
            </div>
          </div>

          {/* Backup info */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last Backup
              </span>
              <span className="font-mono text-foreground">{backup ? formatRelative(backup.lastBackup) : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                Database Size
              </span>
              <span className="font-mono text-foreground">{backup ? `${Math.round(backup.databaseSize / 1024)}KB` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                Auto-Backup
              </span>
              <span className="font-mono text-foreground">{backup ? `${backup.backupInterval}, ${backup.retentionDays}d retention` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                Restore Tested
              </span>
              <span className={cn('font-mono', backup?.restoreTested ? 'text-emerald-400' : 'text-destructive')}>
                {backup?.restoreTested ? `Yes (${formatRelative(backup.lastRestoreTest)})` : 'No'}
              </span>
            </div>
          </div>

          {/* Snapshots */}
          <div className="border-t border-border/60 pt-2">
            <div className="mb-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">Snapshots ({backup?.snapshots.length ?? 0})</div>
            <div className="space-y-1">
              {backup?.snapshots.slice(0, 4).map((snap) => (
                <div key={snap.id} className="flex items-center gap-2 text-[10px]">
                  <Badge variant="outline" className={cn('text-[8px]', snap.type === 'auto' ? 'border-emerald-500/40 text-emerald-400' : 'border-blue-500/40 text-blue-400')}>
                    {snap.type.toUpperCase()}
                  </Badge>
                  <span className="font-mono text-muted-foreground">{formatRelative(snap.timestamp)}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{Math.round(snap.size / 1024)}KB</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
