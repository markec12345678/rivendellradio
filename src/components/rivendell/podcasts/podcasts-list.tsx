'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Podcast as PodcastIcon, Rss, Calendar, Clock, ChevronRight, ExternalLink } from 'lucide-react'
import { usePodcasts } from '@/lib/rivendell/api'
import { formatHms, formatDate, formatDateTime } from '@/lib/rivendell/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { mockPodcasts } from '@/lib/rivendell/mock-data'

export function PodcastsList() {
  const podcasts = usePodcasts()
  const [selected, setSelected] = useState<number | null>(null)

  if (podcasts.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    )
  }
  if (podcasts.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load podcasts.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {podcasts.data?.podcasts.map((p, idx) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          whileHover={{ y: -2 }}
        >
          <Card className="h-full border-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
                  <PodcastIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{p.name}</h3>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                      {p.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {p.episodeCount} episodes
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      last {formatDate(p.lastPublished)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <a
                  href={p.feedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 truncate font-mono text-[10px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Rss className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{p.feedUrl}</span>
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(p.id)}
                  className="min-h-11"
                >
                  Episodes
                  <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl border-border bg-card text-card-foreground max-h-[85vh] overflow-hidden">
          <AnimatePresence mode="wait">
            {selected != null && (
              <motion.div
                key={selected}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <PodcastIcon className="h-4 w-4 text-primary" aria-hidden="true" />
                    {mockPodcasts.find((p) => p.id === selected)?.name ?? 'Podcast'}
                  </DialogTitle>
                  <DialogDescription>
                    {mockPodcasts.find((p) => p.id === selected)?.description}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto scrollbar-broadcast pr-1">
                  {mockPodcasts
                    .find((p) => p.id === selected)
                    ?.episodes.map((ep, idx) => (
                      <motion.div
                        key={ep.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="rounded-md border border-border/60 bg-background/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">{ep.title}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{ep.description}</div>
                            <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                {formatDateTime(ep.publishedAt)}
                              </span>
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {formatHms(ep.duration)}
                              </span>
                              <span className="font-mono">cart #{String(ep.cartNumber).padStart(6, '0')}</span>
                            </div>
                          </div>
                          <a
                            href={ep.audioUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="shrink-0 text-primary hover:opacity-80"
                            aria-label="Listen to episode"
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </div>
  )
}
