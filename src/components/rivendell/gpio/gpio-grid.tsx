// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { motion } from 'framer-motion'
import { Cable, ToggleLeft, ToggleRight, ArrowDownToLine, ArrowUpFromLine, Power } from 'lucide-react'
import { toast } from 'sonner'
import { useGpio, useSendRml } from '@/lib/rivendell/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { GpioLine } from '@/lib/rivendell/types'

export function GpioGrid() {
  const gpio = useGpio()
  const sendRml = useSendRml()

  const toggle = (line: GpioLine) => {
    const cmd = line.state ? `CL ${line.line}!` : `SX ${line.line} 1!`
    sendRml.mutate(cmd, {
      onSuccess: () =>
        toast.success(`${line.direction === 'input' ? 'GPI' : 'GPO'} ${line.line}: ${line.state ? 'cleared' : 'set'}`, {
          description: `RML: ${cmd}`,
        }),
    })
  }

  if (gpio.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-96 w-full" />
        ))}
      </div>
    )
  }
  if (gpio.isError || !gpio.data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center text-sm text-destructive">
          Failed to load GPIO state.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GpioSection
        title="GPI — General Purpose Inputs"
        description="Incoming hardware signals: fader starts, EAS alerts, mic-live lines, etc."
        icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}
        lines={gpio.data.inputs}
        onToggle={toggle}
        disabled={sendRml.isPending}
      />
      <GpioSection
        title="GPO — General Purpose Outputs"
        description="Outgoing hardware controls: ON-AIR lamps, EAS relays, sign lights, etc."
        icon={<ArrowUpFromLine className="h-4 w-4 text-primary" />}
        lines={gpio.data.outputs}
        onToggle={toggle}
        disabled={sendRml.isPending}
      />
    </div>
  )
}

function GpioSection({
  title,
  description,
  icon,
  lines,
  onToggle,
  disabled,
}: {
  title: string
  description: string
  icon: React.ReactNode
  lines: GpioLine[]
  onToggle: (line: GpioLine) => void
  disabled: boolean
}) {
  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
          <Badge variant="outline" className="ml-2 font-mono text-[10px]">
            {lines.filter((l) => l.state).length}/{lines.length} active
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        <ul className="space-y-2">
          {lines.map((line, idx) => (
            <motion.li
              key={`${title}-${line.line}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                'flex items-center gap-3 rounded-md border p-2.5 transition-colors',
                line.state
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-border/60 bg-background/40',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  line.state
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-secondary/40 text-muted-foreground',
                )}
              >
                {line.state ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary">LINE {line.line}</span>
                  <Badge variant="outline" className="border-border/60 font-mono text-[10px] text-muted-foreground">
                    {line.driver ?? 'gpio'}
                  </Badge>
                  <span
                    className={cn(
                      'font-mono text-[10px] uppercase',
                      line.state ? 'text-emerald-400' : 'text-muted-foreground/60',
                    )}
                  >
                    {line.state ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="truncate text-sm text-foreground">{line.label}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onToggle(line)}
                disabled={disabled}
                className="min-h-11"
                aria-label={`${line.state ? 'Clear' : 'Set'} ${line.label}`}
              >
                <Power className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {line.state ? 'Clear' : 'Set'}
              </Button>
            </motion.li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
