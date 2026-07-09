'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useLog } from '@/lib/rivendell/api'
import { LogEditor } from './log-editor'

export function LogDetailDialog() {
  const [name, setName] = useState<string | null>(null)
  const log = useLog(name)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      setName(detail)
    }
    window.addEventListener('rivendell:open-log', handler as EventListener)
    return () => window.removeEventListener('rivendell:open-log', handler as EventListener)
  }, [])

  return (
    <Dialog open={!!name} onOpenChange={(open) => !open && setName(null)}>
      <DialogContent className="max-w-5xl border-border bg-card text-card-foreground max-h-[88vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="font-mono text-primary">{name ?? ''}</span>
            {log.data && (
              <Badge variant="outline" className="border-border/70 text-muted-foreground">
                {log.data.serviceName}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {log.data?.description ?? 'Loading log…'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {log.isLoading ? (
            <div className="space-y-2" key="loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : log.isError ? (
            <div className="py-8 text-center text-sm text-destructive">Failed to load log.</div>
          ) : log.data ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LogEditor log={log.data} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
