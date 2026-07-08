'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Sparkles, Copy, Plus, X, RefreshCw, Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VoiceTrackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prevTrack: { title: string; artist: string } | null
  nextTrack: { title: string; artist: string } | null
  onInsert: (script: string) => void
}

interface VoiceTrackResponse {
  scripts: string[]
  timeOfDay: string
  greeting: string
  station: string
  dj: string
}

export function VoiceTrackDialog({ open, onOpenChange, prevTrack, nextTrack, onInsert }: VoiceTrackDialogProps) {
  const [scripts, setScripts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [generated, setGenerated] = useState(false)

  const generate = async () => {
    setLoading(true)
    setScripts([])
    try {
      const res = await fetch('/api/rivendell/voice-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prevTrackTitle: prevTrack?.title,
          nextTrackTitle: nextTrack?.title,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json() as VoiceTrackResponse
      setScripts(data.scripts)
      setSelectedIdx(0)
      setGenerated(true)
      toast.success('Voice track scripts generated', {
        description: `${data.scripts.length} variations · ${data.timeOfDay} · ${data.dj}`,
      })
    } catch {
      toast.error('Generation failed', { description: 'Could not generate voice tracks' })
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (selectedIdx === null || !scripts[selectedIdx]) return
    onInsert(scripts[selectedIdx])
    toast.success('Voice track inserted', { description: 'Added to log' })
    onOpenChange(false)
  }

  const copyScript = (script: string) => {
    navigator.clipboard.writeText(script)
    toast.success('Copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card text-card-foreground">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Mic className="h-5 w-5 text-primary" aria-hidden="true" />
          AI Voice Track Generator
        </DialogTitle>
        <DialogDescription className="text-xs">
          Generate voice track scripts between songs. AI creates natural DJ links based on track metadata and time of day.
        </DialogDescription>

        {/* Track context */}
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 py-2">
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Previous</div>
            <div className="truncate text-xs text-foreground">{prevTrack?.title ?? '—'}</div>
            <div className="truncate text-[10px] text-muted-foreground">{prevTrack?.artist ?? ''}</div>
          </div>
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Next</div>
            <div className="truncate text-xs text-foreground">{nextTrack?.title ?? '—'}</div>
            <div className="truncate text-[10px] text-muted-foreground">{nextTrack?.artist ?? ''}</div>
          </div>
        </div>

        {/* Generate button */}
        {!generated && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Button type="button" onClick={generate} disabled={loading} className="min-h-11">
              <Sparkles className={cn('mr-2 h-4 w-4', loading && 'animate-pulse')} aria-hidden="true" />
              {loading ? 'Generating scripts…' : 'Generate Voice Track Scripts'}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              AI will create 3 script variations based on track metadata and time of day
            </p>
          </div>
        )}

        {/* Generated scripts */}
        {generated && scripts.length > 0 && (
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                  {scripts.length} scripts generated
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={generate} disabled={loading} className="h-7 text-xs">
                  <RefreshCw className={cn('mr-1 h-3 w-3', loading && 'animate-spin')} aria-hidden="true" />
                  Regenerate
                </Button>
              </div>
              {scripts.map((script, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedIdx(idx)}
                  className={cn(
                    'cursor-pointer rounded-md border p-3 transition-colors',
                    selectedIdx === idx
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/60 hover:bg-secondary/30',
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px]">
                      <Clock className="mr-1 h-2.5 w-2.5" />
                      Variation {idx + 1}
                    </Badge>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyScript(script) }}
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Copy script"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">{script}</p>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}

        {generated && scripts.length > 0 && (
          <>
            <Separator className="bg-border/60" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9">
                <X className="mr-1.5 h-3.5 w-3.5" />Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleInsert} disabled={selectedIdx === null} className="h-9">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Insert Voice Track
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
