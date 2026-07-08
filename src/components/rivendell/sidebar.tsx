'use client'

import { motion } from 'framer-motion'
import { LayoutDashboard, Library, Calendar, Radio, Settings, BarChart3, Cpu, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'dashboard' | 'library' | 'schedule' | 'streams' | 'reports' | 'system' | 'settings'

const items: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'streams', label: 'Streams', icon: Radio },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'system', label: 'System', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex shrink-0 gap-1 overflow-x-auto border-r border-border bg-sidebar/60 p-2 md:w-52 md:flex-col md:overflow-y-auto md:p-3"
    >
      {items.map((item) => {
        const isActive = item.id === active
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
