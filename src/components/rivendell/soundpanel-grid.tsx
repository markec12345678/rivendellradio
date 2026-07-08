'use client'

import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSendRml } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SoundpanelButton {
  id: string
  label: string
  rml: string
  color: 'amber' | 'green' | 'red'
}

const buttons: SoundpanelButton[] = [
  { id: 'sp1', label: 'Station ID', rml: 'PM 0 0!', color: 'amber' },
  { id: 'sp2', label: 'Top of Hour', rml: 'PM 0 1!', color: 'amber' },
  { id: 'sp3', label: 'Weather Bed', rml: 'PM 0 2!', color: 'amber' },
  { id: 'sp4', label: 'News Intro', rml: 'PM 0 3!', color: 'amber' },
  { id: 'sp5', label: 'Promo: Friday', rml: 'PM 0 4!', color: 'green' },
  { id: 'sp6', label: 'PSA', rml: 'PM 0 5!', color: 'red' },
  { id: 'sp7', label: 'Ad: Guitar', rml: 'PM 0 6!', color: 'red' },
  { id: 'sp8', label: 'Time Temp', rml: 'PM 0 7!', color: 'amber' },
]

const colorClasses: Record<string, string> = {
  amber: 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  red: 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
}

export function SoundpanelGrid() {
  const sendRml = useSendRml()

  const fire = (label: string, rml: string) => {
    sendRml.mutate(rml, {
      onSuccess: () => toast.success(`Fired: ${label}`, { description: `RML: ${rml}` }),
      onError: (e: unknown) =>
        toast.error('Fire failed', { description: e instanceof Error ? e.message : '' }),
    })
  }

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Soundpanel
          <span className="font-mono text-[10px] text-muted-foreground">F1-F8</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-3">
        {buttons.map((btn, idx) => (
          <motion.button
            key={btn.id}
            type="button"
            onClick={() => fire(btn.label, btn.rml)}
            disabled={sendRml.isPending}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'relative flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              colorClasses[btn.color] ?? colorClasses.amber,
              'disabled:opacity-50',
            )}
          >
            <span className="absolute left-1 top-1 font-mono text-[8px] opacity-50">F{idx + 1}</span>
            <span className="text-sm font-semibold leading-tight">{btn.label}</span>
            <span className="font-mono text-[10px] opacity-70">{btn.rml}</span>
          </motion.button>
        ))}
      </CardContent>
    </Card>
  )
}
