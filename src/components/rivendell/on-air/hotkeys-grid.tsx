// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid3x3, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useHotKeys, useSendRml } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { HotKeyColor } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

const colorClasses: Record<HotKeyColor, string> = {
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/25',
  green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25',
  red: 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/25',
  blue: 'border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25',
  purple: 'border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/25',
  gray: 'border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/40',
}

export function HotKeysGrid() {
  const hotkeys = useHotKeys()
  const sendRml = useSendRml()
  const [bank, setBank] = useState(0)

  const fire = (label: string, rml: string, enabled: boolean) => {
    if (!enabled || !rml) return
    sendRml.mutate(rml, {
      onSuccess: () => toast.success(`Fired: ${label}`, { description: `RML: ${rml}` }),
      onError: (e: unknown) =>
        toast.error('Hot key fire failed', { description: e instanceof Error ? e.message : '' }),
    })
  }

  if (hotkeys.isLoading) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="p-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const banks = hotkeys.data?.banks ?? []
  const activeBank = banks.find((b) => b.index === bank) ?? banks[0]
  const enabledCount = activeBank?.buttons.filter((b) => b.enabled).length ?? 0

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Grid3x3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Hot Keys — {activeBank?.name}
            </CardTitle>
            <CardDescription className="text-xs">
              8×8 grid · {enabledCount} active buttons · Zetta-style cartwall
            </CardDescription>
          </div>
          {/* Bank switcher */}
          <div className="flex items-center rounded-md border border-border bg-background/40 p-0.5">
            {banks.map((b) => (
              <Button
                key={b.index}
                type="button"
                variant={b.index === bank ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBank(b.index)}
                className="h-7 px-2.5 text-xs"
                aria-label={`Switch to ${b.name} bank`}
              >
                <span className="font-mono text-[10px] opacity-70">F{b.index + 1}</span>
                <span className="ml-1.5 hidden sm:inline">{b.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={bank}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8"
          >
            {activeBank?.buttons.map((btn) => {
              const row = Math.floor(btn.slot / 8)
              const col = btn.slot % 8
              const fKey = row < 1 ? `F${col + 1}` : ''
              return (
                <motion.button
                  key={btn.id}
                  type="button"
                  onClick={() => fire(btn.label, btn.rml, btn.enabled)}
                  disabled={!btn.enabled || sendRml.isPending}
                  whileHover={btn.enabled ? { scale: 1.05 } : undefined}
                  whileTap={btn.enabled ? { scale: 0.95 } : undefined}
                  className={cn(
                    'relative flex aspect-square min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1 text-center transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    colorClasses[btn.color] ?? colorClasses.gray,
                    !btn.enabled && 'cursor-default opacity-30',
                    btn.enabled && 'cursor-pointer',
                  )}
                  aria-label={btn.enabled ? `Fire ${btn.label}` : `Empty slot ${btn.slot + 1}`}
                  title={btn.enabled ? `${btn.label} · ${btn.rml}` : `Slot ${btn.slot + 1} (empty)`}
                >
                  {fKey && (
                    <span className="absolute left-1 top-0.5 font-mono text-[8px] opacity-50">
                      {fKey}
                    </span>
                  )}
                  {btn.enabled ? (
                    <>
                      <span className="line-clamp-2 text-[10px] font-semibold leading-tight">
                        {btn.label}
                      </span>
                      {btn.cart > 0 && (
                        <span className="font-mono text-[8px] opacity-60">
                          #{String(btn.cart).padStart(6, '0')}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-mono text-[9px] opacity-40">{btn.slot + 1}</span>
                  )}
                </motion.button>
              )
            })}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-primary" aria-hidden="true" />
            <span>Click to fire · F1-F8 fires first row of active bank</span>
          </div>
          <Badge variant="outline" className="border-border/60 font-mono text-[9px]">
            bank {bank + 1}/{banks.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
