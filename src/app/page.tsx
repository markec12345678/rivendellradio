'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/rivendell/header'
import { Sidebar, type TabId } from '@/components/rivendell/sidebar'
import { FooterRml } from '@/components/rivendell/footer'
import { DashboardTab } from '@/components/rivendell/tabs/dashboard'
import { LibraryTab } from '@/components/rivendell/tabs/library'
import { ScheduleTab } from '@/components/rivendell/tabs/schedule'
import { StreamsTab } from '@/components/rivendell/tabs/streams'
import { ReportsTab } from '@/components/rivendell/tabs/reports'
import { SystemTab } from '@/components/rivendell/tabs/system'
import { SettingsTab } from '@/components/rivendell/tabs/settings'
import { KeyboardHelpDialog } from '@/components/rivendell/keyboard-help-dialog'
import { CommandPalette } from '@/components/rivendell/command-palette'
import { useBroadcastFeed } from '@/hooks/use-broadcast-feed'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export default function HomePage() {
  const [tab, setTab] = useState<TabId>('dashboard')
  const [helpOpen, setHelpOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  useBroadcastFeed()
  useKeyboardShortcuts({
    onSwitchTab: (id) => setTab(id as TabId),
    onShowHelp: () => setHelpOpen(true),
  })

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={tab} onChange={setTab} />
        <main className="flex-1 overflow-y-auto scrollbar-broadcast pt-12 md:pt-0" role="main">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'library' && <LibraryTab />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'streams' && <StreamsTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'system' && <SystemTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
      <FooterRml />
      <KeyboardHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <CommandPalette key={paletteOpen ? 'open' : 'closed'} open={paletteOpen} onOpenChange={setPaletteOpen} onSwitchTab={(id) => setTab(id as TabId)} />
    </div>
  )
}
