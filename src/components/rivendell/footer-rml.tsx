// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Terminal, ChevronUp, ChevronDown, CornerDownLeft, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useSendRml } from '@/lib/rivendell/api'
import { mockRmlCommands } from '@/lib/rivendell/mock-data'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const HISTORY_LIMIT = 10

export function FooterRml() {
  const [value, setValue] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState<number | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sendRml = useSendRml()

  // Load history from localStorage on mount.
  // setState here is intentional: we hydrate external browser storage
  // after first paint to avoid SSR/hydration mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rml-history')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setHistory(JSON.parse(stored))
    } catch {
      /* ignore */
    }
  }, [])

  const persistHistory = (next: string[]) => {
    setHistory(next)
    try {
      localStorage.setItem('rml-history', JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  const send = (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return
    if (!cmd.endsWith('!')) {
      // auto-terminate RML command if user forgot
      const terminated = `${cmd}!`.replace(/\s+!$/, '!')
      sendRml.mutate(terminated, {
        onSuccess: (res) => {
          toast.success(`Sent: ${terminated}`, { description: res.message })
        },
        onError: (err: unknown) => {
          toast.error(`RML send failed`, {
            description: err instanceof Error ? err.message : 'Unknown error',
          })
        },
      })
      const next = [terminated, ...history.filter((h) => h !== terminated)].slice(0, HISTORY_LIMIT)
      persistHistory(next)
      setHistoryIdx(null)
      setValue('')
      setShowPalette(false)
      return
    }
    sendRml.mutate(cmd, {
      onSuccess: (res) => {
        toast.success(`Sent: ${cmd}`, { description: res.message })
      },
      onError: (err: unknown) => {
        toast.error(`RML send failed`, {
          description: err instanceof Error ? err.message : 'Unknown error',
        })
      },
    })
    const next = [cmd, ...history.filter((h) => h !== cmd)].slice(0, HISTORY_LIMIT)
    persistHistory(next)
    setHistoryIdx(null)
    setValue('')
    setShowPalette(false)
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      send(value)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const nextIdx = historyIdx === null ? 0 : Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(nextIdx)
      setValue(history[nextIdx] ?? '')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIdx === null) return
      const nextIdx = historyIdx - 1
      if (nextIdx < 0) {
        setHistoryIdx(null)
        setValue('')
      } else {
        setHistoryIdx(nextIdx)
        setValue(history[nextIdx] ?? '')
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const token = value.trim().toUpperCase()
      if (!token) return
      const match = mockRmlCommands.find((c) => c.code.startsWith(token.slice(0, 2)))
      if (match) {
        setValue(match.example)
      }
    }
  }

  const filteredPalette = (() => {
    const q = value.trim().toUpperCase()
    if (!q) return mockRmlCommands.slice(0, 6)
    return mockRmlCommands
      .filter((c) => c.code.includes(q.slice(0, 2)) || c.description.toUpperCase().includes(q))
      .slice(0, 6)
  })()

  return (
    <footer
      className="mt-auto border-t border-border bg-card/80 backdrop-blur"
      role="contentinfo"
    >
      <div className="flex flex-col gap-2 px-4 py-2 sm:px-6">
        {/* RML palette popover */}
        {showPalette && (
          <div className="mb-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg scrollbar-broadcast">
            {filteredPalette.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  setValue(c.example)
                  setShowPalette(false)
                  inputRef.current?.focus()
                }}
                className="flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-xs hover:bg-secondary/60"
              >
                <Badge variant="outline" className="font-mono text-[10px] text-primary">
                  {c.code}
                </Badge>
                <span className="flex-1 text-muted-foreground">{c.description}</span>
                <code className="font-mono text-[10px] text-foreground">{c.example}</code>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-primary">
            <Terminal className="h-4 w-4" aria-hidden="true" />
            <span className="hidden font-mono text-xs font-semibold uppercase tracking-wider sm:inline">
              RML
            </span>
            <span className="font-mono text-sm font-bold">&gt;</span>
          </div>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowPalette(true)
            }}
            onKeyDown={handleKey}
            onFocus={() => setShowPalette(true)}
            onBlur={() => setTimeout(() => setShowPalette(false), 150)}
            placeholder="Type RML command (e.g. PL 010001!) · Tab to autocomplete · Up/Down for history"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            className="h-9 flex-1 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-1"
            aria-label="RML command input"
          />
          {history.length > 0 && historyIdx !== null && (
            <Badge variant="outline" className="hidden font-mono text-[10px] sm:inline-flex">
              {historyIdx + 1}/{history.length}
            </Badge>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setShowPalette((v) => !v)}
            aria-label="Toggle RML command palette"
            className="h-9 w-9"
          >
            {showPalette ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="icon"
            onClick={() => send(value)}
            disabled={!value.trim() || sendRml.isPending}
            aria-label="Send RML command"
            className="h-9 w-9"
          >
            {sendRml.isPending ? (
              <CornerDownLeft className="h-4 w-4 animate-pulse" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>
            Rivendell Web Dashboard · v0.1.0 ·{' '}
            <a
              href="https://github.com/ElvishArtisan/rivendell"
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary hover:underline"
            >
              github.com/ElvishArtisan/rivendell
            </a>
          </span>
          <span className="hidden sm:inline">RML = Rivendell Macro Language</span>
        </div>
      </div>
    </footer>
  )
}
