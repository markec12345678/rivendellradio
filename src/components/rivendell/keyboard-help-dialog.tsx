'use client'

import { Keyboard, Play, Square, Pause, AlertCircle, List, Calendar, Radio, BarChart3, Settings, Terminal, HelpCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface KeyboardHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const shortcuts = [
  { category: 'Soundpanel', keys: [
    { key: 'F1 - F8', desc: 'Fire soundpanel buttons 1-8', icon: Play },
  ]},
  { category: 'Transport', keys: [
    { key: 'Space', desc: 'Play Main log machine', icon: Play },
    { key: 'Esc', desc: 'Emergency stop — all machines', icon: AlertCircle },
  ]},
  { category: 'Navigation', keys: [
    { key: 'D', desc: 'Switch to Dashboard', icon: BarChart3 },
    { key: 'L', desc: 'Switch to Library', icon: List },
    { key: 'S', desc: 'Switch to Schedule', icon: Calendar },
  ]},
  { category: 'Command', keys: [
    { key: '⌘K', desc: 'Open command palette', icon: Keyboard },
    { key: 'R', desc: 'Focus RML command console', icon: Terminal },
    { key: '?', desc: 'Show this help', icon: HelpCircle },
  ]},
]

export function KeyboardHelpDialog({ open, onOpenChange }: KeyboardHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card text-card-foreground">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Keyboard className="h-5 w-5 text-primary" aria-hidden="true" />
          Keyboard Shortcuts
        </DialogTitle>
        <div className="space-y-3">
          {shortcuts.map((group, idx) => (
            <div key={idx}>
              {idx > 0 && <Separator className="mb-3 bg-border/60" />}
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{group.category}</div>
              <div className="space-y-1">
                {group.keys.map((s) => {
                  const Icon = s.icon
                  return (
                    <div key={s.key} className="flex items-center gap-3">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <kbd className="rounded border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-foreground min-w-[60px] text-center">{s.key}</kbd>
                      <span className="text-xs text-muted-foreground">{s.desc}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
