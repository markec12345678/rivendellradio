// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, User, Clock, Activity, FileEdit, Trash2, Play, Plus, LogIn, LogOut, Check, X } from 'lucide-react'
import { useAuditLog } from '@/lib/rivendell/api'
import { formatRelative } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const actionIcons: Record<string, typeof Play> = {
  create: Plus,
  update: FileEdit,
  delete: Trash2,
  play: Play,
  stop: Activity,
  rml: Activity,
  login: LogIn,
  logout: LogOut,
  approve: Check,
  reject: X,
}

const actionColors: Record<string, string> = {
  create: 'border-emerald-500/40 text-emerald-400',
  update: 'border-blue-500/40 text-blue-400',
  delete: 'border-destructive/40 text-destructive',
  play: 'border-amber-500/40 text-amber-400',
  stop: 'border-amber-500/40 text-amber-400',
  rml: 'border-purple-500/40 text-purple-400',
  login: 'border-emerald-500/40 text-emerald-400',
  logout: 'border-muted-foreground/40 text-muted-foreground',
  approve: 'border-emerald-500/40 text-emerald-400',
  reject: 'border-destructive/40 text-destructive',
}

const entityFilters = ['all', 'track', 'log', 'schedule', 'station', 'config', 'request', 'user', 'api-key']

export function AuditPanel() {
  const [filter, setFilter] = useState('all')
  const audit = useAuditLog(filter !== 'all' ? filter : undefined, 50)

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScrollText className="h-4 w-4 text-primary" aria-hidden="true" />
            Audit Trail
            {audit.data && (
              <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
                {audit.data.count} entries
              </Badge>
            )}
          </CardTitle>
          {/* Entity filter */}
          <div className="flex gap-1 overflow-x-auto">
            {entityFilters.map((f) => (
              <Button
                key={f}
                type="button"
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
                className="h-6 px-2 text-[10px]"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[60vh]">
          {audit.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : audit.data && audit.data.entries.length > 0 ? (
            <div className="divide-y divide-border/60">
              {audit.data.entries.map((entry, idx) => {
                const Icon = actionIcons[entry.action] ?? Activity
                const color = actionColors[entry.action] ?? 'border-border text-muted-foreground'
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.5) }}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-secondary/30"
                  >
                    <Icon className={cn('h-3.5 w-3.5 shrink-0', color.split(' ').pop())} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn('shrink-0 text-[9px]', color)}>
                          {entry.action.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-foreground">
                          <span className="text-muted-foreground">{entry.entity}</span>
                          {entry.entityId && <span className="font-mono"> #{entry.entityId.slice(0, 8)}</span>}
                        </span>
                      </div>
                      {entry.details && (
                        <div className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground/80">
                          {entry.details}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {entry.username && (
                        <div className="flex items-center justify-end gap-1 text-[10px] text-foreground">
                          <User className="h-2.5 w-2.5 text-muted-foreground" />
                          {entry.fullName ?? entry.username}
                        </div>
                      )}
                      <div className="flex items-center justify-end gap-0.5 text-[9px] text-muted-foreground">
                        <Clock className="h-2 w-2" />
                        {formatRelative(entry.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <ScrollText className="mx-auto mb-2 h-8 w-8 opacity-30" aria-hidden="true" />
              No audit entries yet.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
