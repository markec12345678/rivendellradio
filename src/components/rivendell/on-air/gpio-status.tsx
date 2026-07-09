'use client'

import { ArrowDownToLine, ArrowUpFromLine, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GpioStatusProps {
  inputs: Array<{ line: number; label: string; state: boolean; driver?: string }>
  outputs: Array<{ line: number; label: string; state: boolean; driver?: string }>
}

export function GpioStatus({ inputs, outputs }: GpioStatusProps) {
  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm">GPIO Status</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2">
        <GpioGroup
          title="GPI — Inputs"
          icon={<ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />}
          lines={inputs}
        />
        <GpioGroup
          title="GPO — Outputs"
          icon={<ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden="true" />}
          lines={outputs}
        />
      </CardContent>
    </Card>
  )
}

function GpioGroup({
  title,
  icon,
  lines,
}: {
  title: string
  icon: React.ReactNode
  lines: Array<{ line: number; label: string; state: boolean; driver?: string }>
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {lines.map((l) => (
          <li
            key={`${title}-${l.line}`}
            className="flex items-center justify-between gap-2 text-xs"
            title={`${l.label} — driver: ${l.driver ?? 'unknown'}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Circle
                className={cn(
                  'h-2.5 w-2.5 shrink-0',
                  l.state ? 'fill-emerald-500 text-emerald-500' : 'fill-muted-foreground/30 text-muted-foreground/30',
                )}
                aria-hidden="true"
              />
              <span className="font-mono text-muted-foreground">{l.line}</span>
              <span className="truncate text-foreground">{l.label}</span>
            </div>
            <span
              className={cn(
                'shrink-0 font-mono text-[10px] uppercase',
                l.state ? 'text-emerald-400' : 'text-muted-foreground/60',
              )}
            >
              {l.state ? 'ON' : 'OFF'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
