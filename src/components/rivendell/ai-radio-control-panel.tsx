'use client'

import { useState, useEffect } from 'react'
import {
  Brain, Database, FlaskConical, Zap, Activity, TrendingUp,
  CheckCircle2, AlertTriangle, XCircle, Target, Sparkles, MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

/**
 * AIRadioControlPanel — unified interface for the AI brain that runs the radio.
 * Shows: Station Brain state, Knowledge Engine rules, Experiments, Learning Loop.
 * The ONLY question: "Does this increase Average Listening Time?"
 */

export function AIRadioControlPanel() {
  const [tab, setTab] = useState<'brain' | 'knowledge' | 'experiments' | 'learning'>('brain')

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
              AI Radio Control
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              The brain that runs the radio — ALT north star: 18.9min → 25min target
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px]">
            ⚠️ Demo data
          </Badge>
        </div>
        {/* Sub-tabs */}
        <div className="mt-3 flex gap-1 border-b border-border/40 pb-px">
          {([
            { id: 'brain', label: '🧠 Station Brain', icon: Brain },
            { id: 'knowledge', label: '📚 Knowledge', icon: Database },
            { id: 'experiments', label: '🔬 Experiments', icon: FlaskConical },
            { id: 'learning', label: '📈 Learning', icon: Activity },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1 text-xs font-medium transition-colors',
                tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {tab === 'brain' && <BrainTab />}
        {tab === 'knowledge' && <KnowledgeTab />}
        {tab === 'experiments' && <ExperimentsTab />}
        {tab === 'learning' && <LearningTab />}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 1. Station Brain — what the brain perceives, thinks, decides
// ============================================================================
function BrainTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/station-brain').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])

  if (!data) return <div className="py-8 text-center text-xs text-muted-foreground">Loading brain state…</div>

  const state = data.state
  const dec = state?.currentDecision
  const exp = data.explainability
  const alt = data.northStarMetric
  const kpis = data.aiModuleKPIs

  return (
    <div className="space-y-3">
      {/* North Star: ALT */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase text-primary">North Star: Average Listening Time</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">{alt?.currentValue ?? '—'}</span>
              <span className="text-xs text-muted-foreground">/ {alt?.target}min target</span>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">
              {alt?.trend30d}
            </Badge>
            <div className="mt-1 text-[9px] text-muted-foreground">baseline: {alt?.beforeAfterFramework?.baseline}</div>
          </div>
        </div>
      </div>

      {/* Brain Perception */}
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Brain Perception</div>
        <div className="grid grid-cols-4 gap-2 text-[10px]">
          <PerceptionCell label="Listeners" value={state?.perception?.listeners ?? '—'} sub={state?.perception?.listenerTrend} />
          <PerceptionCell label="Daypart" value={state?.perception?.daypart ?? '—'} sub={`${state?.perception?.hour}:00`} />
          <PerceptionCell label="Weather" value={`${state?.perception?.weather?.tempC ?? '—'}°C`} sub={state?.perception?.weather?.condition} />
          <PerceptionCell label="Traffic" value={state?.perception?.trafficLevel ?? '—'} sub={state?.perception?.isWeekend ? 'weekend' : 'weekday'} />
          <PerceptionCell label="Energy 30m" value={state?.perception?.energyLast30min?.toFixed(2) ?? '—'} sub="avg" />
          <PerceptionCell label="Since hit" value={`${state?.perception?.minutesSinceLastHit ?? '—'}m`} sub="threshold 12m" />
          <PerceptionCell label="Since ad" value={`${state?.perception?.minutesSinceLastAd ?? '—'}m`} sub="threshold 20m" />
          <PerceptionCell label="Track left" value={`${state?.perception?.currentTrackRemainingSec ?? '—'}s`} sub={state?.perception?.currentTrackTitle} />
        </div>
      </div>

      {/* Current Decision + Explainability */}
      {dec && (
        <div className="rounded border border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-primary">
            <Zap className="h-3 w-3" /> Current Decision
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {dec.action}: {dec.trackTitle} — {dec.trackArtist}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">{dec.reasoning}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
            <div><div className="font-mono text-sm font-bold text-emerald-400">{Math.round((dec.projectedRetention5min ?? 0) * 100)}%</div><div className="text-[9px] text-muted-foreground">5-min retention</div></div>
            <div><div className="font-mono text-sm font-bold text-foreground">{Math.round((dec.confidence ?? 0) * 100)}%</div><div className="text-[9px] text-muted-foreground">confidence</div></div>
            <div><div className="font-mono text-sm font-bold text-amber-400">{dec.targetEnergy?.toFixed(2) ?? '—'}</div><div className="text-[9px] text-muted-foreground">target energy</div></div>
          </div>
        </div>
      )}

      {/* Explainability: WHY this track */}
      {exp && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Why This Track (Explainability)</div>
          <div className="space-y-0.5">
            {exp.whyThisTrack?.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-1 text-[10px]">
                <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
                <span className="text-foreground">{r}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Why NOT Alternatives</div>
          <div className="space-y-0.5">
            {exp.whyNotAlternatives?.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-1 text-[10px]">
                <XCircle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-destructive" />
                <span className="text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module KPIs */}
      {kpis && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">AI Module KPIs (hypothesis → measure)</div>
          <div className="space-y-1">
            {kpis.map((k: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded border border-border/40 bg-background/30 p-1.5 text-[10px]">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-foreground">{k.module}</div>
                  <div className="text-[9px] text-muted-foreground">{k.hypothesis}</div>
                </div>
                <div className="ml-2 text-right">
                  <div className="font-mono text-xs text-foreground">{k.baseline} → {k.current} → {k.target}</div>
                  <Badge variant="outline" className={cn('text-[9px]', k.status === 'improving' ? 'border-emerald-500/40 text-emerald-400' : 'text-muted-foreground')}>
                    {k.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-center text-[10px] text-amber-400">
        {data.theOnlyQuestion}
      </div>
    </div>
  )
}

// ============================================================================
// 2. Knowledge Engine — verified rules with evidence + boundaries
// ============================================================================
function KnowledgeTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/knowledge-engine').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])

  if (!data) return <div className="py-8 text-center text-xs text-muted-foreground">Loading knowledge base…</div>

  const rules = data.rules ?? []
  const conflicts = data.conflicts ?? []
  const stats = data.stats

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-6 gap-2 text-center text-[10px]">
        <KpiCell label="Rules" value={stats?.totalRules ?? 0} />
        <KpiCell label="Simulated" value={stats?.simulated ?? 0} color="text-amber-400" />
        <KpiCell label="Observed" value={stats?.observed ?? 0} color="text-blue-400" />
        <KpiCell label="Running" value={stats?.experimentRunning ?? 0} color="text-purple-400" />
        <KpiCell label="Proposed" value={stats?.proposed ?? 0} color="text-muted-foreground" />
        <KpiCell label="Deprecated" value={stats?.deprecated ?? 0} color="text-muted-foreground" />
      </div>

      {/* Honesty bar */}
      <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-center text-[10px] text-amber-400">
        {stats?.honestyRate}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Knowledge Conflicts</div>
          <div className="space-y-1">
            {conflicts.map((c: any, i: number) => (
              <div key={i} className={cn('rounded border p-1.5 text-[10px]', c.type === 'resolved' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5')}>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                  <span className="font-medium text-foreground">{c.ruleA} ↔ {c.ruleB}</span>
                  <Badge variant="outline" className={cn('ml-auto text-[9px]', c.type === 'resolved' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400')}>
                    {c.type}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[9px] text-muted-foreground">{c.resolution}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules */}
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Rules (with evidence + boundaries)</div>
        <ScrollArea className="max-h-96">
          <div className="space-y-1.5">
            {rules.map((rule: any) => (
              <div key={rule.id} className="rounded border border-border/40 bg-background/30 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-foreground">{rule.statement}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <RuleStatusBadge status={rule.status} />
                      <span className="font-mono text-[9px] text-muted-foreground">conf: {rule.confidence?.score ?? 0}%</span>
                      <span className="font-mono text-[9px] text-muted-foreground">v{rule.version}</span>
                      {rule.conflictsWith && rule.conflictsWith.length > 0 && (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[9px]">
                          ⚡ {rule.conflictsWith.length} conflicts
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-[9px] text-muted-foreground">
                    {rule.implementedInScheduler && <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[9px]">implemented</Badge>}
                  </div>
                </div>
                {/* Applicability */}
                <div className="mt-1 grid grid-cols-2 gap-2 text-[9px]">
                  <div>
                    <span className="text-emerald-400">✓ Applies:</span>{' '}
                    <span className="text-muted-foreground">{rule.appliesWhen?.join(', ') || '—'}</span>
                  </div>
                  <div>
                    <span className="text-destructive">✗ Not:</span>{' '}
                    <span className="text-muted-foreground">{rule.doesNotApplyWhen?.join(', ') || '—'}</span>
                  </div>
                </div>
                {/* Evidence */}
                {rule.evidence?.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {rule.evidence.map((ev: any, i: number) => (
                      <div key={i} className="flex items-center gap-1 text-[9px]">
                        {ev.isReal ? (
                          <CheckCircle2 className="h-2 w-2 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="h-2 w-2 text-amber-400" />
                        )}
                        <span className="text-muted-foreground">{ev.type}: d={ev.effectSize}, P={ev.pValue ?? 'n/a'}, n={ev.sampleSize}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ============================================================================
// 3. Experiments — A/B tests with statistical rigor
// ============================================================================
function ExperimentsTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/experiments').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])

  if (!data) return <div className="py-8 text-center text-xs text-muted-foreground">Loading experiments…</div>

  const experiments = data.experiments ?? []
  const stats = data.stats

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
        <KpiCell label="Total" value={stats?.totalExperiments ?? 0} />
        <KpiCell label="Running" value={stats?.running ?? 0} color="text-purple-400" />
        <KpiCell label="Shipped" value={stats?.shipped ?? 0} color="text-emerald-400" />
        <KpiCell label="Killed" value={stats?.killed ?? 0} color="text-destructive" />
        <KpiCell label="Success" value={`${stats?.successRate ?? 0}%`} color="text-emerald-400" />
      </div>

      {/* Learning loop */}
      <div className="rounded border border-primary/30 bg-primary/5 p-2 text-[10px] text-foreground">
        <div className="font-semibold text-primary">Learning Loop</div>
        <div className="mt-0.5 text-muted-foreground">{data.learningLoop?.currentStep}</div>
        <div className="text-[9px] text-muted-foreground">Cycle time: {data.learningLoop?.cycleTime}</div>
      </div>

      {/* Experiments list */}
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Experiments (pre-registered, statistically rigorous)</div>
        <ScrollArea className="max-h-80">
          <div className="space-y-1.5">
            {experiments.map((exp: any) => (
              <div key={exp.id} className="rounded border border-border/40 bg-background/30 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-foreground">{exp.name}</div>
                    <div className="text-[9px] text-muted-foreground">{exp.hypothesis}</div>
                  </div>
                  <ExpStatusBadge status={exp.status} />
                </div>
                {/* Results */}
                {exp.results && (
                  <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[9px]">
                    <div><div className="font-mono font-bold text-foreground">{exp.results.treatmentMean}</div><div className="text-muted-foreground">treatment</div></div>
                    <div><div className="font-mono font-bold text-foreground">{exp.results.controlMean}</div><div className="text-muted-foreground">control</div></div>
                    <div><div className="font-mono font-bold text-emerald-400">{exp.results.delta > 0 ? '+' : ''}{exp.results.delta}</div><div className="text-muted-foreground">delta</div></div>
                    <div><div className="font-mono font-bold text-foreground">P={exp.results.pValue}</div><div className="text-muted-foreground">p-value</div></div>
                  </div>
                )}
                {/* Sample progress */}
                {exp.status === 'running' && (
                  <div className="mt-1">
                    <div className="h-1 overflow-hidden rounded-full bg-secondary/60">
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${Math.min(100, (exp.sampleSizeCurrent / exp.sampleSizeTarget) * 100)}%` }} />
                    </div>
                    <div className="mt-0.5 text-[9px] text-muted-foreground">{exp.sampleSizeCurrent}/{exp.sampleSizeTarget} samples</div>
                  </div>
                )}
                {/* Decision */}
                {exp.decision && (
                  <div className={cn('mt-1 rounded p-1 text-[9px]', exp.decision === 'ship' ? 'bg-emerald-500/10 text-emerald-400' : exp.decision === 'kill' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-400')}>
                    {exp.decision.toUpperCase()}: {exp.decisionReason?.slice(0, 100)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-[10px] text-amber-400">
        ⚠️ All experiment results are demonstration data (isReal=false). No real A/B tests have been conducted.
      </div>
    </div>
  )
}

// ============================================================================
// 4. Learning Loop — what the radio learned from its own decisions
// ============================================================================
function LearningTab() {
  const [data, setData] = useState<any>(null)
  useEffect(() => { let c = false; fetch('/api/v1/ai/learning-loop').then(r => r.json()).then(d => { if (!c) setData(d) }).catch(() => {}); return () => { c = true } }, [])

  if (!data) return <div className="py-8 text-center text-xs text-muted-foreground">Loading learning records…</div>

  const records = data.learningRecords ?? []
  const knowledge = data.accumulatedKnowledge ?? []
  const stats = data.stats

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <KpiCell label="Decisions tracked" value={stats?.totalDecisionsTracked ?? 0} />
        <KpiCell label="Findings" value={stats?.findingsDiscovered ?? 0} />
        <KpiCell label="A/B validated" value={stats?.abValidatedFindings ?? 0} color="text-emerald-400" />
        <KpiCell label="Avg confidence" value={`${stats?.avgConfidenceScore ?? 0}%`} />
      </div>

      {/* Self-awareness */}
      {data.theLoop?.selfAwareness && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Radio Self-Awareness</div>
          <div className="space-y-0.5">
            {data.theLoop.selfAwareness.map((s: string, i: number) => (
              <div key={i} className="flex items-start gap-1 text-[10px]">
                <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0 text-primary" />
                <span className="text-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning records */}
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Learning Records (decision → outcome → lesson)</div>
        <ScrollArea className="max-h-72">
          <div className="space-y-1.5">
            {records.map((rec: any) => (
              <div key={rec.id} className="rounded border border-border/40 bg-background/30 p-2">
                <div className="text-[10px] font-medium text-foreground">{rec.decision}</div>
                <div className="text-[9px] text-muted-foreground">{rec.context}</div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[9px]">
                  <div>
                    <span className="text-muted-foreground">Projected:</span>{' '}
                    <span className="font-mono text-foreground">{rec.projectedAltDelta > 0 ? '+' : ''}{rec.projectedAltDelta}min</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual:</span>{' '}
                    <span className={cn('font-mono', rec.actualAltDelta > rec.projectedAltDelta ? 'text-emerald-400' : 'text-amber-400')}>
                      {rec.actualAltDelta > 0 ? '+' : ''}{rec.actualAltDelta}min
                    </span>
                  </div>
                </div>
                {/* Surprise */}
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">Surprise:</span>
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary/60">
                    <div className={cn('h-full rounded-full', rec.surprise > 0.3 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: `${rec.surprise * 100}%` }} />
                  </div>
                  <span className="font-mono text-[9px] text-muted-foreground">{Math.round(rec.surprise * 100)}%</span>
                </div>
                {/* Lesson */}
                <div className="mt-1 rounded bg-primary/5 p-1 text-[9px] text-foreground">
                  💡 {rec.lessonLearned}
                </div>
                {/* Causal confidence */}
                <div className="mt-0.5 flex items-center gap-1 text-[9px]">
                  <span className="text-muted-foreground">Causal confidence:</span>
                  <Badge variant="outline" className={cn('text-[9px]', rec.causalConfidence === 'high' ? 'border-emerald-500/40 text-emerald-400' : rec.causalConfidence === 'medium' ? 'border-amber-500/40 text-amber-400' : 'border-destructive/40 text-destructive')}>
                    {rec.causalConfidence}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Principle */}
      <div className="rounded border border-primary/30 bg-primary/5 p-2 text-[10px] italic text-foreground">
        {data.principle}
      </div>
    </div>
  )
}

// ============================================================================
// Shared components
// ============================================================================
function PerceptionCell({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-1.5">
      <div className="font-mono text-sm font-bold text-foreground">{value}</div>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      {sub && <div className="text-[8px] text-muted-foreground truncate">{sub}</div>}
    </div>
  )
}

function KpiCell({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="rounded border border-border/40 bg-background/30 p-1.5">
      <div className={cn('font-mono text-sm font-bold', color ?? 'text-foreground')}>{value}</div>
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
    </div>
  )
}

function RuleStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'externally-validated': 'border-emerald-500/40 text-emerald-400',
    'simulated': 'border-amber-500/40 text-amber-400',
    'observed': 'border-blue-500/40 text-blue-400',
    'experiment-running': 'border-purple-500/40 text-purple-400',
    'proposed': 'border-border text-muted-foreground',
    'deprecated': 'border-muted-foreground/30 text-muted-foreground',
    'refuted': 'border-destructive/40 text-destructive',
  }
  return <Badge variant="outline" className={cn('text-[9px]', map[status] ?? 'text-muted-foreground')}>{status}</Badge>
}

function ExpStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'running': 'border-purple-500/40 text-purple-400',
    'completed': 'border-emerald-500/40 text-emerald-400',
    'killed': 'border-destructive/40 text-destructive',
    'planning': 'border-amber-500/40 text-amber-400',
    'analyzing': 'border-blue-500/40 text-blue-400',
  }
  return <Badge variant="outline" className={cn('text-[9px]', map[status] ?? 'text-muted-foreground')}>{status}</Badge>
}
