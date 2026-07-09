'use client'

import { motion } from 'framer-motion'
import { ArrowDownToLine, ArrowUpFromLine, Cable, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface GpioLine {
  id: number
  name: string
  type: 'input' | 'output'
  state: boolean
  driver: string
  device: string
  mapping?: string
  description: string
}

export function GpioPanel({ inputs, outputs, isLoading }: {
  inputs?: GpioLine[]
  outputs?: GpioLine[]
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    )
  }

  if (!inputs || !outputs) return null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Inputs */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowDownToLine className="h-4 w-4 text-blue-400" aria-hidden="true" />
            GPI Inputs
            <Badge variant="outline" className="border-blue-500/40 text-[10px] text-blue-400">
              {inputs.filter((g) => g.state).length}/{inputs.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {inputs.map((line, idx) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={cn('flex items-center gap-3 px-4 py-2', line.state && 'bg-blue-500/5')}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                  line.state ? 'bg-blue-500/20 text-blue-400' : 'bg-secondary/40 text-muted-foreground',
                )}>
                  {line.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{line.name}</div>
                  <div className="truncate text-[9px] text-muted-foreground">{line.description}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[8px] text-muted-foreground">{line.driver}</Badge>
                <span className={cn(
                  'shrink-0 h-2.5 w-2.5 rounded-full',
                  line.state ? 'bg-blue-400 shadow-[0_0_6px_oklch(0.6_0.15_250_/_0.6)]' : 'bg-muted-foreground/30',
                )} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outputs */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ArrowUpFromLine className="h-4 w-4 text-amber-400" aria-hidden="true" />
            GPO Outputs
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">
              {outputs.filter((g) => g.state).length}/{outputs.length} active
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {outputs.map((line, idx) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={cn('flex items-center gap-3 px-4 py-2', line.state && 'bg-amber-500/5')}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                  line.state ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary/40 text-muted-foreground',
                )}>
                  {line.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{line.name}</div>
                  <div className="truncate text-[9px] text-muted-foreground">{line.description}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[8px] text-muted-foreground">{line.driver}</Badge>
                <span className={cn(
                  'shrink-0 h-2.5 w-2.5 rounded-full',
                  line.state ? 'bg-amber-400 shadow-[0_0_6px_oklch(0.72_0.18_60_/_0.6)]' : 'bg-muted-foreground/30',
                )} />
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
