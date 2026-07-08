'use client'

import { useState } from 'react'
import { Header } from '@/components/rivendell/header'
import { Sidebar, type TabId } from '@/components/rivendell/sidebar'
import { FooterRml } from '@/components/rivendell/footer'
import { DashboardTab } from '@/components/rivendell/tabs/dashboard'
import { LibraryTab } from '@/components/rivendell/tabs/library'
import { ScheduleTab } from '@/components/rivendell/tabs/schedule'
import { StreamsTab } from '@/components/rivendell/tabs/streams'
import { SettingsTab } from '@/components/rivendell/tabs/settings'
import { useBroadcastFeed } from '@/hooks/use-broadcast-feed'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export default function HomePage() {
  const [tab, setTab] = useState<TabId>('dashboard')
  useBroadcastFeed()
  useKeyboardShortcuts({ onSwitchTab: (id) => setTab(id as TabId) })

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={tab} onChange={setTab} />
        <main className="flex-1 overflow-y-auto scrollbar-broadcast" role="main">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'library' && <LibraryTab />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'streams' && <StreamsTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
      <FooterRml />
    </div>
  )
}
