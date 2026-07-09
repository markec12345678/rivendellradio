'use client'

import { motion } from 'framer-motion'
import { Disc3, Music2, Clock } from 'lucide-react'
import { useAirplayStore } from '@/lib/stores/airplay'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatHms } from '@/lib/rivendell/format'

export function NowPlayingHero() {
  const main = useAirplayStore((s) => s.machines.find((m) => m.machine === 0))
  if (!main) return null
  const cart = main.currentCart
  const elapsed = cart?.elapsed ?? 0
  const length = cart?.length ?? 0
  const progress = length > 0 ? Math.min(100, (elapsed / length) * 100) : 0
  const remaining = Math.max(0, length - elapsed)

  return (
    <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card via-card to-secondary/30">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, oklch(0.72 0.18 60 / 0.15), transparent 40%), radial-gradient(circle at 85% 80%, oklch(0.65 0.22 25 / 0.12), transparent 40%)',
        }}
        aria-hidden="true"
      />
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <motion.div
            initial={{ scale: 0.9, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-28 sm:w-28"
          >
            <Disc3
              className={main.state === 'playing' ? 'h-12 w-12 animate-spin' : 'h-12 w-12'}
              style={main.state === 'playing' ? { animationDuration: '4s' } : undefined}
              aria-hidden="true"
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  main.onAir
                    ? 'border-accent/50 bg-accent/15 text-accent'
                    : 'border-border bg-secondary/40 text-muted-foreground'
                }
              >
                {main.onAir ? 'ON AIR — MAIN' : 'OFF AIR'}
              </Badge>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Log {main.currentLog ?? '—'} · Line {main.currentLine ?? '—'}
              </span>
            </div>

            {cart ? (
              <>
                <h2 className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {cart.title}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground sm:text-base">
                  <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {cart.artist}
                  <span className="mx-1 text-border">·</span>
                  <span className="font-mono">#{String(cart.number).padStart(6, '0')}</span>
                </p>

                <div className="mt-3 space-y-1.5">
                  <Progress value={progress} className="h-2 bg-secondary/60 [&>div]:bg-primary" />
                  <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatHms(elapsed)} / {formatHms(length)}
                    </span>
                    <span className="text-primary">{formatHms(remaining)} remaining</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <h2 className="text-2xl font-bold text-muted-foreground">No cart loaded</h2>
                <p className="text-sm text-muted-foreground">
                  Press play on the Main log machine to start the broadcast.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
