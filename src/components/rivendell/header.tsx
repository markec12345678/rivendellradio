'use client'

import { motion } from 'framer-motion'
import {
  Radio, Activity, ChevronDown, Sun, Moon, Layers, Wifi, WifiOff, ShieldCheck,
} from 'lucide-react'
import { useLiveStore } from '@/lib/stores/live'
import { useClock } from '@/hooks/use-clock'
import { useSystemStatus, useStations, useSetActiveStation, useTheme, useSaveTheme, useConfig } from '@/lib/rivendell/api'
import { formatClock } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ThemeMode } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

export function Header() {
  useClock()
  const now = useLiveStore((s) => s.now)
  const feedConnected = useLiveStore((s) => s.feedConnected)
  const nowPlaying = useLiveStore((s) => s.nowPlaying)
  const onAir = !!nowPlaying

  const config = useConfig()
  const status = useSystemStatus()
  const stations = useStations()
  const setActiveStation = useSetActiveStation()
  const theme = useTheme()
  const saveTheme = useSaveTheme()

  const activeStation = stations.data?.stations.find((s) => s.id === stations.data.activeId)

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:px-6"
      role="banner"
    >
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ rotate: -8, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30"
        >
          <Radio className="h-5 w-5" aria-hidden="true" />
        </motion.div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold leading-tight text-foreground">Rock 88.7 Dashboard</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {activeStation ? `${activeStation.frequency} — ${activeStation.format}` : 'Broadcast Control'}
          </div>
        </div>
      </div>

      <div className="ml-2 hidden h-8 w-px bg-border md:block" />

      <div className="hidden items-center gap-2 md:flex" aria-label="Station clock">
        <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="font-mono text-base font-semibold tabular-nums text-foreground" suppressHydrationWarning>
          {formatClock(now)}
        </span>
      </div>

      {/* Station switcher */}
      <div className="ml-1">
        {stations.isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border bg-background/40 px-2.5 text-xs" aria-label="Switch station">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="hidden max-w-[80px] truncate sm:inline">{activeStation?.name ?? 'Select'}</span>
                <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 border-border bg-popover text-popover-foreground">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Stations</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/60" />
              {stations.data?.stations.map((st) => (
                <DropdownMenuItem
                  key={st.id}
                  onSelect={() => {
                    setActiveStation.mutate(st.id, {
                      onSuccess: () => toast.success('Station switched', { description: st.name }),
                    })
                  }}
                  className={cn('gap-2 py-2', st.id === activeStation?.id && 'bg-primary/10')}
                >
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', st.onAir ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{st.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{st.frequency}</span>
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">{st.format} · {st.listeners} listeners</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {status.data && (
          <Badge variant="outline" className="hidden border-border/70 bg-secondary/40 font-mono text-xs text-muted-foreground sm:inline-flex">
            v{status.data.version} · schema {status.data.schemaVersion}
          </Badge>
        )}

        <Badge
          variant="outline"
          className={cn(
            config.data?.connected
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-secondary/40 text-muted-foreground',
          )}
        >
          {config.data?.connected ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{config.data?.connected ? 'RDXport' : 'Offline'}</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            feedConnected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-border bg-secondary/40 text-muted-foreground',
          )}
        >
          <Activity className={cn('mr-1 h-3.5 w-3.5', feedConnected && 'animate-pulse')} />
          <span className="hidden md:inline">{feedConnected ? 'Live' : 'Feed off'}</span>
        </Badge>

        <Badge variant="outline" className="hidden border-primary/40 bg-primary/10 text-primary sm:inline-flex" title="Detached Playout — closing this dashboard will NOT interrupt on-air audio">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          <span className="hidden lg:inline">Detached</span>
        </Badge>

        {/* Theme switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 border-border bg-background/40 px-0" aria-label="Switch theme">
              {theme.data?.mode === 'light' ? <Sun className="h-3.5 w-3.5 text-primary" /> : theme.data?.mode === 'metal' ? <Layers className="h-3.5 w-3.5 text-primary" /> : <Moon className="h-3.5 w-3.5 text-primary" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-border bg-popover text-popover-foreground">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Theme</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            {(['dark', 'metal', 'light'] as ThemeMode[]).map((m) => (
              <DropdownMenuItem
                key={m}
                onSelect={() => saveTheme.mutate({ mode: m, accentHue: theme.data?.accentHue ?? 60 }, {
                  onSuccess: () => toast.success('Theme applied', { description: m.charAt(0).toUpperCase() + m.slice(1) }),
                })}
                className={cn('gap-2', theme.data?.mode === m && 'bg-primary/10')}
              >
                {m === 'light' ? <Sun className="h-3.5 w-3.5" /> : m === 'metal' ? <Layers className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span className="capitalize">{m}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ON-AIR badge */}
        <Badge
          variant="outline"
          className={cn(
            onAir
              ? 'on-air-pulse border-accent/60 bg-accent/15 text-accent'
              : 'border-border bg-secondary/30 text-muted-foreground',
          )}
          aria-label={onAir ? 'On air' : 'Off air'}
        >
          <span className={cn('mr-1.5 inline-block h-2 w-2 rounded-full', onAir ? 'bg-accent' : 'bg-muted-foreground/60')} />
          {onAir ? 'ON AIR' : 'OFF AIR'}
        </Badge>
      </div>
    </header>
  )
}
