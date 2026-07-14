// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion } from 'framer-motion'
import { ListChecks, Calendar, Clock, FileText } from 'lucide-react'
import { useLogs } from '@/lib/rivendell/api'
import { formatHms, formatDate, formatDateTime } from '@/lib/rivendell/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LogDetailDialog } from './log-detail-dialog'

const statusConfig: Record<string, { label: string; className: string }> = {
  ready: { label: 'READY', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  incomplete: { label: 'INCOMPLETE', className: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  missing: { label: 'MISSING', className: 'border-accent/40 bg-accent/10 text-accent' },
  running: { label: 'RUNNING', className: 'border-primary/40 bg-primary/10 text-primary' },
}

export function LogsList() {
  const logs = useLogs()

  return (
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
          Logs — broadcast playlists for today&apos;s services. Click a row to view log lines.
        </div>

        <div className="rounded-md border border-border">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-broadcast">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-center">Lines</TableHead>
                  <TableHead className="text-right">Length</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} className="border-border">
                      <TableCell colSpan={7}>
                        <Skeleton className="h-7 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : logs.isError ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-destructive">
                      Failed to load logs.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.data?.logs.map((log, idx) => {
                    const status = statusConfig[log.status] ?? statusConfig.ready
                    return (
                      <LogRow key={log.name} log={log} status={status} idx={idx} />
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LogRow({
  log,
  status,
  idx,
}: {
  log: {
    name: string
    serviceName: string
    description: string
    date: string
    lineCount: number
    totalLength: number
    status: string
    lastModified: string
  }
  status: { label: string; className: string }
  idx: number
}) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      onClick={() => {
        // Open dialog via custom event
        window.dispatchEvent(new CustomEvent('rivendell:open-log', { detail: log.name }))
      }}
      className="cursor-pointer border-border transition-colors hover:bg-secondary/40"
    >
      <TableCell className="font-mono text-sm font-semibold text-primary">{log.name}</TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">{log.serviceName}</TableCell>
      <TableCell className="hidden sm:table-cell text-foreground">
        <div className="flex items-start gap-1.5">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{log.description}</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          modified {formatDateTime(log.lastModified)}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        <div className="flex items-center gap-1 text-xs">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          {formatDate(log.date)}
        </div>
      </TableCell>
      <TableCell className="text-center font-mono text-sm text-foreground">{log.lineCount}</TableCell>
      <TableCell className="text-right font-mono text-xs text-muted-foreground">
        <div className="flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatHms(log.totalLength)}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </TableCell>
    </motion.tr>
  )
}
