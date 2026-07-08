'use client'

import { useState } from 'react'
import { Terminal, Send, Github } from 'lucide-react'
import { useSendRml } from '@/lib/rivendell/api'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function FooterRml() {
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const sendRml = useSendRml()

  const send = () => {
    const c = cmd.trim()
    if (!c) return
    setHistory((h) => [c, ...h].slice(0, 10))
    setHistIdx(-1)
    sendRml.mutate(c, {
      onSuccess: () => toast.success('RML sent', { description: c }),
      onError: (e: unknown) => toast.error('RML failed', { description: e instanceof Error ? e.message : '' }),
    })
    setCmd('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') send()
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const ni = Math.min(histIdx + 1, history.length - 1)
      if (ni >= 0 && history[ni]) { setHistIdx(ni); setCmd(history[ni]) }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const ni = histIdx - 1
      if (ni < 0) { setHistIdx(-1); setCmd('') }
      else { setHistIdx(ni); setCmd(history[ni]) }
    }
  }

  return (
    <footer className="mt-auto border-t border-border bg-card/60 px-4 py-2.5 backdrop-blur" role="contentinfo">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Terminal className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="hidden font-mono sm:inline">RML</span>
        </div>
        <Input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Enter RML command (e.g. PL 0!) — ↑/↓ for history"
          className="h-8 flex-1 font-mono text-xs"
          aria-label="RML command input"
        />
        <Button
          type="button"
          size="sm"
          onClick={send}
          disabled={!cmd.trim() || sendRml.isPending}
          className="h-8 px-3"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Send</span>
        </Button>
        <a
          href="https://github.com/markec12345678/rivendellradio"
          target="_blank"
          rel="noreferrer noopener"
          className="hidden items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary sm:flex"
        >
          <Github className="h-3.5 w-3.5" aria-hidden="true" />
          GitHub
        </a>
      </div>
    </footer>
  )
}
