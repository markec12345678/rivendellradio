'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LayoutDashboard, Library, Calendar, Radio, Settings, BarChart3, Cpu, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
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

interface SidebarProps {
  active: TabId
  onChange: (id: TabId) => void
}

export function Sidebar({ active, onChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSelect = (id: TabId) => {
    onChange(id)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-[4.5rem] z-30 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur hover:text-foreground md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Desktop sidebar (permanent) */}
      <nav
        aria-label="Main navigation"
        className="hidden shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-sidebar/60 p-3 md:flex md:w-52"
      >
        {items.map((item) => (
          <NavItem key={item.id} item={item} active={active} onSelect={handleSelect} />
        ))}
      </nav>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              aria-label="Mobile navigation"
              className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col gap-1 border-r border-border bg-sidebar p-4 pt-16 md:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Navigation
              </div>
              {items.map((item) => (
                <NavItem key={item.id} item={item} active={active} onSelect={handleSelect} />
              ))}
              <div className="mt-auto pt-4">
                <div className="rounded-md border border-border/60 bg-background/40 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rock 88.7</div>
                  <div className="mt-0.5 text-xs text-foreground">Broadcast Control Center</div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function NavItem({ item, active, onSelect }: { item: { id: TabId; label: string; icon: LucideIcon }; active: TabId; onSelect: (id: TabId) => void }) {
  const isActive = item.id === active
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
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
}
