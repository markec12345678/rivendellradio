'use client'

import { motion } from 'framer-motion'
import { Disc3, Music2, Clock, Calendar, Activity, Hash, Tag, Play, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSendRml } from '@/lib/rivendell/api'
import { formatHms, formatRelative } from '@/lib/rivendell/format'
import type { Track } from '@/lib/rivendell/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface NowPlayingDialogProps {
  track: Track | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NowPlayingDialog({ track, open, onOpenChange }: NowPlayingDialogProps) {
  const sendRml = useSendRml()

  if (!track) return null

  const play = () => {
    sendRml.mutate(`PL 0!`, {
      onSuccess: () => toast.success('Play command sent', { description: track.title }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card text-card-foreground overflow-hidden">
        <DialogTitle className="sr-only">{track.title} — {track.artist}</DialogTitle>
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Album art */}
          <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-lg ring-1 ring-primary/30 sm:h-56 sm:w-56">
            <img
              src={track.albumArt ?? '/album-art/rock-1.png'}
              alt={`Album art for ${track.title}`}
              className="h-full w-full object-cover"
              onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0' }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Disc3 className="h-16 w-16 animate-spin text-white/90 drop-shadow-lg" style={{ animationDuration: '4s' }} aria-hidden="true" />
            </div>
          </div>

          {/* Track info */}
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h2 className="truncate text-xl font-bold text-foreground">{track.title}</h2>
              <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                {track.artist}
              </p>
              <p className="truncate text-xs text-muted-foreground">{track.album} · {track.year}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoRow icon={Clock} label="Length" value={formatHms(track.length)} />
              <InfoRow icon={Activity} label="BPM" value={track.bpm ? String(track.bpm) : '—'} />
              <InfoRow icon={Tag} label="Genre" value={track.genre} />
              <InfoRow icon={Calendar} label="Year" value={String(track.year)} />
              <InfoRow icon={Hash} label="ISRC" value={track.isrc ?? '—'} mono />
              <InfoRow icon={Play} label="Plays" value={track.playCount.toLocaleString()} />
            </div>

            <Separator className="bg-border/60" />

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">{track.group}</Badge>
              <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">Origin: {track.origin.toUpperCase()}</Badge>
              {track.schedCodes.map((code) => (
                <Badge key={code} variant="outline" className="border-blue-500/40 text-[9px] text-blue-400 font-mono">{code}</Badge>
              ))}
            </div>

            <div className="text-[10px] text-muted-foreground">
              Last played: <span className="font-mono text-foreground">{formatRelative(track.lastPlayed ?? null)}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" onClick={play} disabled={sendRml.isPending} className="h-8">
                <Play className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Play Now
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)} className="h-8">
                <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof Clock; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn('truncate text-foreground', mono && 'font-mono text-[11px]')}>{value}</div>
      </div>
    </div>
  )
}
