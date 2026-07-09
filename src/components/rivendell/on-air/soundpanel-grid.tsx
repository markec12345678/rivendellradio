'use client'

import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSendRml } from '@/lib/rivendell/api'
import { soundpanelButtons } from '@/lib/rivendell/mock-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
        toast.error('Soundpanel fire failed', {
          description: e instanceof Error ? e.message : '',
        }),
    })
  }

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Volume2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Soundpanel — Quick Fire
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        {soundpanelButtons.map((btn, idx) => (
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
              'flex min-h-16 flex-col items-start justify-center gap-0.5 rounded-md border px-3 py-2 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              colorClasses[btn.color] ?? colorClasses.amber,
              'disabled:opacity-50',
            )}
          >
            <span className="text-sm font-semibold leading-tight">{btn.label}</span>
            <span className="font-mono text-[10px] opacity-70">
              #{String(btn.cart).padStart(6, '0')} · {btn.rml}
            </span>
          </motion.button>
        ))}
      </CardContent>
    </Card>
  )
}
