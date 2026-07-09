'use client'

import { useState } from 'react'
import { Command } from 'cmdk'
import {
  LayoutDashboard, Library, Calendar, Radio, BarChart3, Cpu, Settings,
  Search, Play, Music, CornerDownLeft, ArrowUp, ArrowDown,
} from 'lucide-react'
import { rockTracks } from '@/lib/rivendell/mock-data'
import { formatHms } from '@/lib/rivendell/format'
import { useSendRml } from '@/lib/rivendell/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchTab: (id: string) => void
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Now playing, waveform, soundpanel' },
  { id: 'library', label: 'Library', icon: Library, desc: 'Browse rock tracks' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, desc: "Today's shows + weekly timetable" },
  { id: 'streams', label: 'Streams', icon: Radio, desc: 'Multi-station listener stats' },
  { id: 'reports', label: 'Reports', icon: BarChart3, desc: 'Listener analytics & charts' },
  { id: 'system', label: 'System', icon: Cpu, desc: 'Daemons, studio clock, feed status' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'RDXport config, themes' },
]

export function CommandPalette({ open, onOpenChange, onSwitchTab }: CommandPaletteProps) {
  const [search, setSearch] = useState('')
  const sendRml = useSendRml()

  // Search is auto-reset via key remount in parent (page.tsx)

  // Filter tracks by search
  const filteredTracks = search.trim()
    ? rockTracks
        .filter((t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.artist.toLowerCase().includes(search.toLowerCase()) ||
          t.album.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 6)
    : []

  const handleTabSelect = (id: string) => {
    onSwitchTab(id)
    onOpenChange(false)
  }

  const handleTrackSelect = (trackId: string, title: string) => {
    sendRml.mutate(`PL 0!`, {
      onSuccess: () => toast.success('Track queued', { description: title }),
    })
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh] backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <Command
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        label="Command Palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search tracks or navigate…"
            className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[50vh] overflow-y-auto scrollbar-broadcast p-1">
          <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
            No results found.
          </Command.Empty>

          {/* Navigation */}
          <Command.Group heading="Navigate" className="text-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Command.Item
                  key={tab.id}
                  value={`go ${tab.label} ${tab.desc}`}
                  onSelect={() => handleTabSelect(tab.id)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 aria-selected:bg-primary/10 aria-selected:text-primary"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{tab.label}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{tab.desc}</div>
                  </div>
                  <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Command.Item>
              )
            })}
          </Command.Group>

          {/* Track search results */}
          {filteredTracks.length > 0 && (
            <Command.Group heading="Tracks" className="text-xs">
              {filteredTracks.map((track) => (
                <Command.Item
                  key={track.id}
                  value={`${track.title} ${track.artist} ${track.album}`}
                  onSelect={() => handleTrackSelect(track.id, track.title)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 aria-selected:bg-primary/10 aria-selected:text-primary"
                >
                  <img
                    src={track.albumArt ?? '/album-art/rock-1.png'}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded object-cover"
                    onError={(e) => { ;(e.target as HTMLImageElement).style.opacity = '0' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{track.title}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{track.artist} · {track.album}</div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatHms(track.length)}</span>
                  <Play className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Quick actions */}
          <Command.Group heading="Actions" className="text-xs">
            <Command.Item
              value="play main pl 0"
              onSelect={() => {
                sendRml.mutate('PL 0!', { onSuccess: () => toast.success('Main: PLAY') })
                onOpenChange(false)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 aria-selected:bg-primary/10 aria-selected:text-primary"
            >
              <Play className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm text-foreground">Play Main log machine</span>
              <kbd className="ml-auto shrink-0 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Space</kbd>
            </Command.Item>
            <Command.Item
              value="stop all emergency st 99"
              onSelect={() => {
                sendRml.mutate('ST 99!', { onSuccess: () => toast.warning('All machines STOPPED') })
                onOpenChange(false)
              }}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 aria-selected:bg-primary/10 aria-selected:text-primary"
            >
              <Play className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <span className="text-sm text-foreground">Emergency stop — all machines</span>
              <kbd className="ml-auto shrink-0 rounded border border-border bg-background/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Esc</kbd>
            </Command.Item>
          </Command.Group>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/60 px-2 py-1.5 text-[9px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border border-border bg-background/40 px-1 py-0.5 font-mono"><ArrowUp className="inline h-2 w-2" /><ArrowDown className="inline h-2 w-2" /></kbd>
              <span>navigate</span>
              <kbd className="rounded border border-border bg-background/40 px-1 py-0.5 font-mono">↵</kbd>
              <span>select</span>
            </div>
            <span>Rock 88.7 Dashboard</span>
          </div>
        </Command.List>
      </Command>
    </div>
  )
}
