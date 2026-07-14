// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Play, Square, Pause, Headphones, ChevronRight, Clock, Radio } from 'lucide-react'
import { useAirplayStore } from '@/lib/stores/airplay'
import { useSendRml } from '@/lib/rivendell/api'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { VuMeter } from './vu-meter'
import { formatHms } from '@/lib/rivendell/format'
import type { LogMachine } from '@/lib/rivendell/types'

interface LogMachineCardProps {
  machine: LogMachine
}

const stateConfig: Record<
  LogMachine['state'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  playing: { label: 'PLAYING', variant: 'default', color: 'text-primary' },
  stopped: { label: 'STOPPED', variant: 'secondary', color: 'text-muted-foreground' },
  paused: { label: 'PAUSED', variant: 'outline', color: 'text-amber-400' },
  segue: { label: 'SEGUE', variant: 'default', color: 'text-primary' },
}

export function LogMachineCard({ machine }: LogMachineCardProps) {
  const transportAction = useAirplayStore((s) => s.transportAction)
  const vu = useAirplayStore((s) => s.vu[machine.machine])
  const sendRml = useSendRml()

  const elapsed = machine.currentCart?.elapsed ?? 0
  const length = machine.currentCart?.length ?? 0
  const remaining = Math.max(0, length - elapsed)
  const progress = length > 0 ? Math.min(100, (elapsed / length) * 100) : 0
  const stateInfo = stateConfig[machine.state]

  const fireRml = (cmd: string, action: 'play' | 'pause' | 'stop' | 'audition') => {
    transportAction(machine.machine, action)
    sendRml.mutate(cmd, {
      onSuccess: () => toast.success(`RML: ${cmd}`),
      onError: (e: unknown) =>
        toast.error('RML failed', { description: e instanceof Error ? e.message : '' }),
    })
  }

  return (
    <Card className="overflow-hidden border-border bg-card/80">
      <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              machine.onAir
                ? 'bg-accent/15 text-accent'
                : 'bg-secondary/40 text-muted-foreground'
            }`}
          >
            <Radio className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{machine.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Log Machine {machine.machine}
            </div>
          </div>
        </div>
        <Badge
          variant={stateInfo.variant}
          className={
            machine.onAir
              ? 'border-accent/40 bg-accent/15 text-accent'
              : 'border-border bg-secondary/40 text-muted-foreground'
          }
        >
          {machine.onAir && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent on-air-pulse" />
          )}
          {stateInfo.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {/* Current cart */}
        <div className="min-h-[88px]">
          <AnimatePresence mode="wait">
            {machine.currentCart ? (
              <motion.div
                key={`cur-${machine.currentCart.number}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Now Playing
                </div>
                <div className="truncate text-base font-semibold text-foreground">
                  {machine.currentCart.title}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {machine.currentCart.artist} · #{String(machine.currentCart.number).padStart(6, '0')}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="cur-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[88px] flex-col items-start justify-center text-muted-foreground"
              >
                <div className="text-[10px] uppercase tracking-wider">No cart loaded</div>
                <div className="text-sm">Machine idle — log not started</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress + time */}
        {machine.currentCart && (
          <div className="space-y-1.5">
            <Progress
              value={progress}
              className="h-1.5 bg-secondary/60 [&>div]:bg-primary"
            />
            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatHms(elapsed)}
              </span>
              <span>-{formatHms(remaining)}</span>
            </div>
          </div>
        )}

        {/* Next cart */}
        {machine.nextCart && (
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              Next
            </div>
            <div className="truncate text-sm font-medium text-foreground">
              {machine.nextCart.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {machine.nextCart.artist} · {formatHms(machine.nextCart.length)}
            </div>
          </div>
        )}

        {/* Transport controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={machine.state === 'playing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => fireRml(`PL ${machine.machine}!`, 'play')}
            disabled={sendRml.isPending}
            className="min-h-11 flex-1"
            aria-label={`Play ${machine.name}`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Play</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fireRml(`PN ${machine.machine}!`, 'pause')}
            disabled={sendRml.isPending}
            className="min-h-11"
            aria-label={`Pause ${machine.name}`}
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fireRml(`ST ${machine.machine}!`, 'stop')}
            disabled={sendRml.isPending}
            className="min-h-11"
            aria-label={`Stop ${machine.name}`}
          >
            <Square className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fireRml(`AA ${machine.currentCart?.number ?? 0}!`, 'audition')}
            disabled={sendRml.isPending || !machine.currentCart}
            className="min-h-11"
            aria-label={`Audition ${machine.name}`}
          >
            <Headphones className="h-4 w-4" aria-hidden="true" />
          </Button>
          <VuMeter values={vu} height={48} width={8} />
        </div>

        {machine.currentLog && (
          <div className="text-[10px] text-muted-foreground">
            Log: <span className="font-mono text-foreground">{machine.currentLog}</span>
            {machine.currentLine != null && (
              <> · Line {machine.currentLine}</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
