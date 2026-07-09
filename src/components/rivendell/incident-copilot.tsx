'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2, Zap, Bot, Clock,
  ChevronRight, Shield, Sparkles, Send,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/rivendell/format'
import { cn } from '@/lib/utils'

// ============================================================================
// Incident Timeline
// ============================================================================

interface IncidentEvent {
  id: string
  timestamp: string
  type: 'alert' | 'warning' | 'info' | 'recovery' | 'ai_action' | 'human_action'
  category: string
  source: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  acknowledged: boolean
  resolvedAt: string | null
  correlationId?: string
  aiAnalysis?: string
}

const typeIcons = {
  alert: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  recovery: CheckCircle2,
  ai_action: Bot,
  human_action: Shield,
}

const typeColors = {
  alert: 'text-destructive',
  warning: 'text-amber-400',
  info: 'text-blue-400',
  recovery: 'text-emerald-400',
  ai_action: 'text-purple-400',
  human_action: 'text-primary',
}

const severityColors = {
  critical: 'border-destructive/40 bg-destructive/10 text-destructive',
  high: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  medium: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  low: 'border-border bg-secondary/40 text-muted-foreground',
}

export function IncidentTimeline({ incidents, isLoading }: {
  incidents?: IncidentEvent[]
  isLoading: boolean
}) {
  if (isLoading) {
    return <Card className="border-border bg-card/80"><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
  }

  if (!incidents || incidents.length === 0) return null

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
          Incident Timeline
          <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
            {incidents.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[60vh]">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border/60" />

            {incidents.map((incident, idx) => {
              const Icon = typeIcons[incident.type] ?? Info
              const color = typeColors[incident.type] ?? 'text-muted-foreground'
              const sev = severityColors[incident.severity] ?? severityColors.low
              return (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="relative flex gap-3 px-4 py-2.5"
                >
                  {/* Icon on timeline */}
                  <div className={cn('relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-card bg-card', color)}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{incident.title}</span>
                      <Badge variant="outline" className={cn('text-[8px]', sev)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      {incident.resolvedAt && (
                        <Badge variant="outline" className="border-emerald-500/40 text-[8px] text-emerald-400">
                          RESOLVED
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{incident.description}</div>

                    {/* AI Analysis */}
                    {incident.aiAnalysis && (
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/5 px-2 py-1.5">
                        <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" aria-hidden="true" />
                        <div>
                          <span className="text-[8px] uppercase tracking-wider text-purple-400">AI Root Cause</span>
                          <p className="text-[10px] text-foreground">{incident.aiAnalysis}</p>
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="h-2 w-2" />{formatRelative(incident.timestamp)}</span>
                      <span>·</span>
                      <span>{incident.source}</span>
                      {incident.correlationId && (
                        <>
                          <span>·</span>
                          <span className="font-mono">corr={incident.correlationId.slice(5, 13)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// AI Copilot Chat
// ============================================================================

interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{ type: string; detail: string }>
  confidence?: 'high' | 'medium' | 'low'
  followUpQuestions?: string[]
}

export function CopilotChat() {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m the Rock 88.7 AI Copilot. I can answer questions about stream status, CPU usage, RDS, listeners, and incidents. Try: "Why is CPU high?" or "Did the stream fall?"',
      confidence: 'high',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendQuery = async (query?: string) => {
    const q = (query ?? input).trim()
    if (!q || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/v1/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        confidence: data.confidence,
        followUpQuestions: data.followUpQuestions,
      }])
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I couldn\'t process your request. Please try again.',
        confidence: 'low',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          AI Copilot
          <Badge variant="outline" className="border-primary/40 text-[9px] text-primary">
            Powered by Event Bus + System Data
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3 p-4">
            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2',
                    msg.role === 'user' ? 'bg-primary/15 text-foreground' : 'bg-card border border-border/60',
                  )}>
                    {msg.role === 'assistant' && (
                      <div className="mb-1 flex items-center gap-1.5">
                        <Bot className="h-3 w-3 text-primary" aria-hidden="true" />
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">AI Copilot</span>
                        {msg.confidence && (
                          <Badge variant="outline" className={cn(
                            'text-[7px]',
                            msg.confidence === 'high' ? 'border-emerald-500/40 text-emerald-400' :
                            msg.confidence === 'medium' ? 'border-amber-500/40 text-amber-400' :
                            'border-border text-muted-foreground',
                          )}>
                            {msg.confidence.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs leading-relaxed text-foreground">{msg.content}</p>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-border/40 pt-1.5">
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Sources</div>
                        {msg.sources.map((src, i) => (
                          <div key={i} className="flex items-start gap-1 text-[9px] text-muted-foreground">
                            <Zap className="mt-0.5 h-2 w-2 shrink-0 text-primary" />
                            <span><span className="font-mono text-primary">{src.type}</span>: {src.detail}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Follow-up questions */}
                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => sendQuery(q)}
                            className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[9px] text-primary hover:bg-primary/10"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-lg bg-card border border-border/60 px-3 py-2">
                  <Bot className="h-3 w-3 animate-pulse text-primary" />
                  <span className="text-xs text-muted-foreground">Analyzing system data…</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border/60 p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendQuery()}
            placeholder="Ask about stream, CPU, RDS, listeners…"
            className="h-9 text-xs"
            disabled={loading}
          />
          <Button type="button" size="sm" onClick={() => sendQuery()} disabled={loading || !input.trim()} className="h-9 w-9 p-0">
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
