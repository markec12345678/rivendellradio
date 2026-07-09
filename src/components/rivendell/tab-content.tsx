'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAirplayStore } from '@/lib/stores/airplay'
import { useGpio } from '@/lib/rivendell/api'
import { LogMachineCard } from '@/components/rivendell/on-air/log-machine-card'
import { NowPlayingHero } from '@/components/rivendell/on-air/now-playing-hero'
import { WaveformDisplay } from '@/components/rivendell/on-air/waveform-display'
import { SoundpanelGrid } from '@/components/rivendell/on-air/soundpanel-grid'
import { HotKeysGrid } from '@/components/rivendell/on-air/hotkeys-grid'
import { GpioStatus } from '@/components/rivendell/on-air/gpio-status'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function OnAirTab() {
  const machines = useAirplayStore((s) => s.machines)
  const gpio = useGpio()

  return (
    <div className="space-y-4">
      <NowPlayingHero />

      <WaveformDisplay machine={0} height={140} />

      <div className="grid gap-4 lg:grid-cols-3">
        {machines.map((m) => (
          <LogMachineCard key={m.machine} machine={m} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HotKeysGrid />
        </div>
        <div>
          {gpio.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : gpio.data ? (
            <GpioStatus inputs={gpio.data.inputs} outputs={gpio.data.outputs} />
          ) : (
            <Card className="border-destructive/40">
              <CardContent className="py-8 text-center text-sm text-destructive">
                Failed to load GPIO state.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

interface TabContentProps {
  tab: string
}

export function TabContent({ tab }: TabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
        className="p-4 sm:p-6"
        aria-label={`${tab} tab content`}
      >
        <TabLoader tab={tab} />
      </motion.section>
    </AnimatePresence>
  )
}

import { CartsTable } from '@/components/rivendell/library/carts-table'
import { LogsList } from '@/components/rivendell/logs/logs-list'
import { LogDetailDialog } from '@/components/rivendell/logs/log-detail-dialog'
import { ServiceCard } from '@/components/rivendell/services/service-card'
import { DaemonsGrid } from '@/components/rivendell/system/daemons-grid'
import { SystemSettingsCard } from '@/components/rivendell/system/system-settings-card'
import { GpioGrid } from '@/components/rivendell/gpio/gpio-grid'
import { PodcastsList } from '@/components/rivendell/podcasts/podcasts-list'
import { RdxportConfig } from '@/components/rivendell/settings/rdxport-config'
import { AppearanceSettings } from '@/components/rivendell/settings/appearance-settings'
import { RdxPanel } from '@/components/rivendell/rdx/rdx-panel'
import { PypadPanel } from '@/components/rivendell/pypad/pypad-panel'
import { RecorderPanel } from '@/components/rivendell/recorder/recorder-panel'
import type { TabId } from '@/components/rivendell/sidebar'

function TabLoader({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'on-air':
      return <OnAirTab />
    case 'library':
      return <CartsTable />
    case 'logs':
      return (
        <>
          <LogsList />
          <LogDetailDialog />
        </>
      )
    case 'services':
      return <ServiceCard />
    case 'system':
      return (
        <div className="space-y-4">
          <DaemonsGrid />
          <SystemSettingsCard />
        </div>
      )
    case 'rdx':
      return <RdxPanel />
    case 'pypad':
      return <PypadPanel />
    case 'gpio':
      return <GpioGrid />
    case 'recorder':
      return <RecorderPanel />
    case 'podcasts':
      return <PodcastsList />
    case 'settings':
      return (
        <div className="space-y-4">
          <AppearanceSettings />
          <RdxportConfig />
        </div>
      )
    default:
      return null
  }
}
