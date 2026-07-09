'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSendRml } from '@/lib/rivendell/api'

interface SoundpanelBtn { id: string; label: string; rml: string }

const soundpanelButtons: SoundpanelBtn[] = [
  { id: 'sp1', label: 'Station ID', rml: 'PM 0 0!' },
  { id: 'sp2', label: 'Top of Hour', rml: 'PM 0 1!' },
  { id: 'sp3', label: 'Weather Bed', rml: 'PM 0 2!' },
  { id: 'sp4', label: 'News Intro', rml: 'PM 0 3!' },
  { id: 'sp5', label: 'Promo: Friday', rml: 'PM 0 4!' },
  { id: 'sp6', label: 'PSA', rml: 'PM 0 5!' },
  { id: 'sp7', label: 'Ad: Guitar', rml: 'PM 0 6!' },
  { id: 'sp8', label: 'Time Temp', rml: 'PM 0 7!' },
]

interface KeyboardShortcutOptions {
  onSwitchTab?: (id: string) => void
  onShowHelp?: () => void
}

/**
 * Global broadcast keyboard shortcuts.
 * F1-F8  : Fire soundpanel buttons 1-8
 * Space  : Play/Stop Main log machine (toggle)
 * Esc    : Stop all (emergency)
 * L      : Switch to Library tab
 * D      : Switch to Dashboard tab
 * S      : Switch to Schedule tab
 * R      : Focus RML command console (footer)
 * ?      : Show keyboard help
 */
export function useKeyboardShortcuts({ onSwitchTab, onShowHelp }: KeyboardShortcutOptions = {}) {
  const sendRml = useSendRml()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
          return
        }
      }

      // F1-F8: soundpanel
      if (e.key >= 'F1' && e.key <= 'F8') {
        e.preventDefault()
        const idx = parseInt(e.key.slice(1), 10) - 1
        const btn = soundpanelButtons[idx]
        if (btn) {
          sendRml.mutate(btn.rml, {
            onSuccess: () => toast.success(`F${idx + 1}: ${btn.label}`, { description: `RML: ${btn.rml}` }),
            onError: (err: unknown) => toast.error('Fire failed', { description: err instanceof Error ? err.message : '' }),
          })
        }
        return
      }

      switch (e.key) {
        case ' ':
        case 'Spacebar': {
          e.preventDefault()
          const cmd = 'PL 0!'
          sendRml.mutate(cmd, {
            onSuccess: () => toast.info('Main: PLAY', { description: `RML: ${cmd}` }),
          })
          break
        }
        case 'Escape': {
          e.preventDefault()
          sendRml.mutate('ST 99!', {
            onSuccess: () => toast.warning('All machines STOPPED', { description: 'Emergency stop' }),
          })
          break
        }
        case 'l':
        case 'L':
          onSwitchTab?.('library')
          break
        case 'd':
        case 'D':
          onSwitchTab?.('dashboard')
          break
        case 's':
        case 'S':
          onSwitchTab?.('schedule')
          break
        case 'r':
        case 'R': {
          const rmlInput = document.querySelector<HTMLInputElement>('input[aria-label="RML command input"]')
          rmlInput?.focus()
          break
        }
        case '?': {
          e.preventDefault()
          if (onShowHelp) {
            onShowHelp()
          } else {
            toast.info('Keyboard shortcuts', {
              description: 'F1-F8 soundpanel · Space play · Esc stop all · D/L/S tabs · R RML console',
              duration: 6000,
            })
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [sendRml, onSwitchTab, onShowHelp])
}
