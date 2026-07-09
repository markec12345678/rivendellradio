'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Newspaper, Calendar, Tag, Share2, ShieldCheck,
  Zap, Clock, Activity, Sparkles, ChevronRight, Settings2,
} from 'lucide-react'
import { useAiOrchestrator } from '@/lib/rivendell/api'
import { formatRelative, formatNumber } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

const moduleIcons: Record<string, typeof Mic> = {
  mic: Mic, newspaper: Newspaper, calendar: Calendar, tag: Tag, share: Share2, shield: ShieldCheck,
}

const statusConfig = {
  active: { label: 'ACTIVE', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', dot: 'bg-emerald-400' },
  processing: { label: 'PROCESSING', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  idle: { label: 'IDLE', color: 'border-border bg-secondary/40 text-muted-foreground', dot: 'bg-muted-foreground' },
  error: { label: 'ERROR', color: 'border-destructive/40 bg-destructive/10 text-destructive', dot: 'bg-destructive' },
}

export function AiOrchestratorPanel() {
  const ai = useAiOrchestrator()
  const [expanded, setExpanded] = useState<string | null>(null)

  const triggerModule = async (moduleId: string, name: string) => {
    setExpanded(moduleId)
    try {
      const res = await fetch('/api/v1/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: moduleId, action: moduleId.replace('ai-', '') }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      if (data.scripts) toast.success(`${name}: ${data.scripts.length} scripts generated`)
      else if (data.headlines) toast.success(`${name}: ${data.headlines.length} headlines generated`)
      else if (data.playlist) toast.success(`${name}: ${data.playlist.length} tracks scheduled`)
      else if (data.analysis) toast.success(`${name}: metadata analysis complete`)
      else if (data.posts) toast.success(`${name}: ${data.posts.length} social posts generated`)
    } catch {
      toast.error(`${name}: generation failed`)
    }
  }

  if (ai.isLoading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
        <CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  if (!ai.data) return null

  const { modules, active, processing, totalRuns } = ai.data

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            AI Orchestrator
            <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
              {active + processing}/{modules.length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Zap className="h-3 w-3 text-amber-400" />
            {formatNumber(totalRuns)} total runs
          </div>
        </div>
        <CardDescription className="text-xs">
          Event Bus → AI Modules — modular AI that responds to broadcast events in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/60">
          {modules.map((mod, idx) => {
            const Icon = moduleIcons[mod.icon] ?? Activity
            const st = statusConfig[mod.status]
            const isExpanded = expanded === mod.id
            return (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-secondary/30"
                  onClick={() => triggerModule(mod.id, mod.name)}
                >
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                    mod.status === 'active' ? 'bg-primary/10 text-primary' :
                    mod.status === 'processing' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-secondary/40 text-muted-foreground',
                  )}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{mod.name}</span>
                      <Badge variant="outline" className={cn('text-[9px]', st.color)}>
                        <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full', st.dot)} />
                        {st.label}
                      </Badge>
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">{mod.description}</div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="font-mono text-[10px] text-muted-foreground">{formatNumber(mod.runsTotal)} runs</div>
                    {mod.lastRun && (
                      <div className="flex items-center justify-end gap-0.5 text-[9px] text-muted-foreground">
                        <Clock className="h-2 w-2" />
                        {formatRelative(mod.lastRun)}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    <Badge variant="outline" className="border-blue-500/40 font-mono text-[8px] text-blue-400">
                      ← {mod.trigger}
                    </Badge>
                  </div>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/40 bg-background/40"
                    >
                      <div className="p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Settings2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Configuration</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {Object.entries(mod.config).map(([key, value]) => (
                            <div key={key} className="rounded-md border border-border/60 bg-background/60 px-2 py-1">
                              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{key}</div>
                              <div className="truncate font-mono text-[10px] text-foreground">{String(value)}</div>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3 h-7 text-xs"
                          onClick={(e) => { e.stopPropagation(); triggerModule(mod.id, mod.name) }}
                        >
                          <Sparkles className="mr-1.5 h-3 w-3" />
                          Trigger Now
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
        {/* Architecture footer */}
        <div className="border-t border-border/60 px-4 py-2">
          <div className="font-mono text-[9px] text-muted-foreground">
            <span className="text-primary">track.started</span> → Event Bus →
            <span className="text-amber-400"> AI DJ</span> ·
            <span className="text-amber-400"> AI Social</span> ·
            <span className="text-amber-400"> AI QC</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
