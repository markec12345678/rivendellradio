'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, Check, X, Play, MessageSquare, User, Clock, Sparkles } from 'lucide-react'
import { useRequests, useUpdateRequest } from '@/lib/rivendell/api'
import { formatRelative } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const statusConfig = {
  pending: { label: 'PENDING', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  approved: { label: 'APPROVED', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  rejected: { label: 'REJECTED', color: 'border-destructive/40 bg-destructive/10 text-destructive' },
  played: { label: 'PLAYED', color: 'border-border bg-secondary/40 text-muted-foreground' },
}

export function RequestsPanel() {
  const requests = useRequests()
  const update = useUpdateRequest()

  const handleAction = (id: string, action: 'approved' | 'rejected' | 'played', title: string) => {
    update.mutate({ requestId: id, action }, {
      onSuccess: () => {
        const msgs = { approved: 'Request approved', rejected: 'Request rejected', played: 'Marked as played' }
        toast.success(msgs[action], { description: title })
      },
    })
  }

  const pending = requests.data?.requests.filter((r) => r.status === 'pending') ?? []
  const recent = requests.data?.requests.filter((r) => r.status !== 'pending').slice(0, 4) ?? []

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Inbox className="h-4 w-4 text-primary" aria-hidden="true" />
          Listener Requests
          {pending.length > 0 && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">
              {pending.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-72">
          {requests.isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : requests.data && requests.data.requests.length > 0 ? (
            <div className="divide-y divide-border/60">
              <AnimatePresence>
                {requests.data.requests.map((req) => {
                  const st = statusConfig[req.status]
                  return (
                    <motion.div
                      key={req.id}
                      layout
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5',
                        req.status === 'pending' && 'bg-amber-500/5',
                        req.status === 'played' && 'opacity-40',
                      )}
                    >
                      {/* Album art */}
                      <img
                        src={req.albumArt ?? '/album-art/rock-1.png'}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded object-cover"
                        onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0' }}
                      />

                      {/* Track info + listener */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-foreground">{req.title}</div>
                        <div className="flex items-center gap-2 truncate text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{req.listenerName}</span>
                          <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{formatRelative(req.requestedAt)}</span>
                        </div>
                        {req.listenerMessage && (
                          <div className="mt-0.5 flex items-start gap-1 truncate text-[9px] text-muted-foreground/80">
                            <MessageSquare className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                            <span className="truncate italic">"{req.listenerMessage}"</span>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <Badge variant="outline" className={cn('shrink-0 text-[9px]', st.color)}>
                        {st.label}
                      </Badge>

                      {/* Actions (only for pending) */}
                      {req.status === 'pending' && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleAction(req.id, 'approved', req.title)}
                            disabled={update.isPending}
                            aria-label="Approve request"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(req.id, 'rejected', req.title)}
                            disabled={update.isPending}
                            aria-label="Reject request"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Play button (only for approved) */}
                      {req.status === 'approved' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0 text-primary hover:bg-primary/10"
                          onClick={() => handleAction(req.id, 'played', req.title)}
                          disabled={update.isPending}
                          aria-label="Mark as played"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Inbox className="mx-auto mb-2 h-8 w-8 opacity-30" aria-hidden="true" />
              No listener requests yet.
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        {pending.length > 0 && (
          <div className="border-t border-border/60 px-4 py-2 text-[9px] text-muted-foreground">
            <Sparkles className="mr-1 inline h-2.5 w-2.5 text-amber-400" aria-hidden="true" />
            {pending.length} request{pending.length !== 1 ? 's' : ''} waiting for approval
          </div>
        )}
      </CardContent>
    </Card>
  )
}
