'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Scale,
  CheckCircle2, XCircle, AlertCircle, Brain, Clock, Database,
  Lock, Unlock, ChevronRight, Radio,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Governance Dashboard — the AI Trust Center.
 *
 * This is NOT a feature. It is the answer to "Why should a human trust this AI?"
 * displayed as a single panel. Every number here is computed from real data
 * in the Decision Ledger and the epistemic-state endpoint. With zero real data,
 * every field is 0 / null / 'insufficient-data', and that is shown honestly.
 *
 * See: /api/v1/governance, docs/EPISTEMOLOGICAL-INVARIANTS.md
 */

interface GovernanceData {
  trustSummary: {
    trustScore: number
    components: { name: string; score: number; weight: number; contribution: number }[]
    summary: string
  }
  listenerPipeline: { realSessions: number; status: string }
  ledger: {
    total: number
    withOutcome: number
    approved: number
    overridden: number
    notConsulted: number
    acceptanceRate: number | null
    meanAbsPredictionError: number | null
    meanSignedPredictionError: number | null
    byDomain: Record<string, { total: number; acceptanceRate: number | null; meanAbsError: number | null }>
    bySourceType: Record<string, number>
  }
  calibration: {
    buckets: { lo: number; hi: number; n: number; successRate: number | null; calibrationGap: number | null }[]
    totalMeasured: number
    meanAbsCalibrationGap: number | null
    overallBias: number | null
    verdict: 'insufficient-data' | 'uncalibrated' | 'roughly-calibrated' | 'well-calibrated'
    explanation: string
  }
  overrideAnalytics: {
    acceptanceRate: number | null
    rejectionCount: number
    rejectionReasons: Record<string, number>
    byDomain: Record<string, { total: number; acceptanceRate: number | null; verdict: string }>
  }
  autonomy: {
    currentLevel: number
    nextLevel: number | null
    nextLevelRequirements: { name: string; required: string; actual: string; passed: boolean }[]
    readyForPromotion: boolean
    earnedLevel: number
    summary: string
    ladder: { level: number; earned: boolean; requirements: { name: string; required: string; actual: string; passed: boolean }[] }[]
    levelDescriptions: Record<string, { label: string; description: string }>
  }
  epistemicState: {
    systemState: { realPercent: number; simulatedPercent: number; phase: string; summary: string }
    auditBaseline: { status: string }
    violationCount: number
  } | null
  memoryMaturity: {
    realDataPoints: number
    ledgerEntries: number
    ledgerWithOutcome: number
    yearsOfOperation: number
    phase: string
  }
  stability: {
    total: number
    byTier: Record<string, number>
    averageMultiplier: number
    dominantTier: string
    summary: string
  }
}

export function GovernanceDashboard() {
  const [data, setData] = useState<GovernanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/governance')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <Card className="border-primary/30 bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            AI Trust Center
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/30 bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
            AI Trust Center — Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            Governance endpoint returned an error: {error ?? 'no data'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const ts = data.trustSummary
  const au = data.autonomy
  const cal = data.calibration
  const oa = data.overrideAnalytics
  const mm = data.memoryMaturity
  const es = data.epistemicState

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          AI Trust Center
          <Badge variant="outline" className="ml-auto border-primary/40 text-[10px] text-primary">
            Level {au.currentLevel}: {au.levelDescriptions[String(au.currentLevel)]?.label ?? 'Unknown'}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Why should a human trust this AI? The answer is not a feeling — it is the contents of this panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {/* === TRUST SCORE === */}
        <TrustScoreSection score={ts.trustScore} components={ts.components} summary={ts.summary} />

        {/* === AUTONOMY LADDER === */}
        <AutonomyLadder
          currentLevel={au.currentLevel}
          earnedLevel={au.earnedLevel}
          nextLevel={au.nextLevel}
          readyForPromotion={au.readyForPromotion}
          ladder={au.ladder}
          levelDescriptions={au.levelDescriptions}
          summary={au.summary}
        />

        {/* === CALIBRATION === */}
        <CalibrationSection
          verdict={cal.verdict}
          explanation={cal.explanation}
          buckets={cal.buckets}
          totalMeasured={cal.totalMeasured}
          meanAbsCalibrationGap={cal.meanAbsCalibrationGap}
          overallBias={cal.overallBias}
        />

        {/* === HUMAN OVERRIDE ANALYTICS === */}
        <OverrideAnalyticsSection
          acceptanceRate={oa.acceptanceRate}
          rejectionCount={oa.rejectionCount}
          rejectionReasons={oa.rejectionReasons}
          byDomain={oa.byDomain}
        />

        {/* === MEMORY MATURITY === */}
        <MemoryMaturitySection
          realDataPoints={mm.realDataPoints}
          ledgerEntries={mm.ledgerEntries}
          ledgerWithOutcome={mm.ledgerWithOutcome}
          phase={mm.phase}
          realPercent={es?.systemState.realPercent ?? 0}
          simulatedPercent={es?.systemState.simulatedPercent ?? 100}
        />

        {/* === TEMPORAL STABILITY === */}
        <StabilitySection
          total={data.stability.total}
          byTier={data.stability.byTier}
          averageMultiplier={data.stability.averageMultiplier}
          dominantTier={data.stability.dominantTier}
          summary={data.stability.summary}
        />

        {/* === EPISTEMIC STATE === */}
        {es && (
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Epistemic Integrity
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'ml-auto text-[9px]',
                  es.violationCount === 0
                    ? 'border-emerald-500/40 text-emerald-400'
                    : 'border-amber-500/40 text-amber-400',
                )}
              >
                {es.violationCount} violation{es.violationCount === 1 ? '' : 's'}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {es.systemState.summary}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              <span className="text-foreground">Audit baseline:</span> {es.auditBaseline.status}
            </div>
          </div>
        )}

        {/* === HONEST DISCLAIMER === */}
        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="text-[10px] leading-relaxed text-amber-200/80">
              <strong>Trust is not granted — it is earned.</strong> Every number above is computed from real data in the Decision Ledger and the listener pipeline. With zero real data, every component is at its floor. This is the correct starting state. The system refuses autonomy until evidence accumulates. See <code className="text-amber-300">docs/EPISTEMOLOGICAL-INVARIANTS.md</code>.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrustScoreSection({
  score,
  components,
  summary,
}: {
  score: number
  components: { name: string; score: number; weight: number; contribution: number }[]
  summary: string
}) {
  const color =
    score >= 85 ? 'text-emerald-400' :
    score >= 60 ? 'text-amber-400' :
    score >= 30 ? 'text-orange-400' :
    'text-destructive'

  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Overall Trust Score
        </span>
        <span className={cn('font-mono text-2xl font-bold tabular-nums', color)}>
          {score}<span className="text-sm text-muted-foreground">/100</span>
        </span>
      </div>
      <Progress
        value={score}
        className="mb-3 h-2 bg-secondary/60 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-amber-400"
      />
      <div className="space-y-1">
        {components.map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-[10px]">
            <span className="w-32 shrink-0 text-muted-foreground">{c.name}</span>
            <div className="flex-1">
              <Progress
                value={c.score * 100}
                className="h-1.5 bg-secondary/40 [&>div]:bg-primary/60"
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-foreground">
              {(c.score * 100).toFixed(0)}%
            </span>
            <span className="w-10 shrink-0 text-right font-mono text-muted-foreground">
              ×{c.weight}
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-primary">
              {c.contribution.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        {summary}
      </div>
    </div>
  )
}

function AutonomyLadder({
  currentLevel,
  earnedLevel,
  nextLevel,
  readyForPromotion,
  ladder,
  levelDescriptions,
  summary,
}: {
  currentLevel: number
  earnedLevel: number
  nextLevel: number | null
  readyForPromotion: boolean
  ladder: { level: number; earned: boolean; requirements: { name: string; required: string; actual: string; passed: boolean }[] }[]
  levelDescriptions: Record<string, { label: string; description: string }>
  summary: string
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Autonomy Readiness
        </span>
        {readyForPromotion && (
          <Badge variant="outline" className="ml-auto border-emerald-500/40 text-[9px] text-emerald-400">
            <Unlock className="mr-1 h-2.5 w-2.5" />
            Ready for promotion
          </Badge>
        )}
      </div>

      {/* The ladder */}
      <div className="mb-3 space-y-1.5">
        {ladder.map((rung) => {
          const isCurrent = rung.level === currentLevel
          const isEarned = rung.earned
          const desc = levelDescriptions[String(rung.level)]
          return (
            <div
              key={rung.level}
              className={cn(
                'rounded-md border p-2 transition-colors',
                isCurrent && 'border-primary/50 bg-primary/10',
                !isCurrent && isEarned && 'border-emerald-500/30 bg-emerald-500/5',
                !isCurrent && !isEarned && 'border-border/40 bg-secondary/20 opacity-60',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isCurrent && isEarned && 'bg-emerald-500/20 text-emerald-400',
                    !isCurrent && !isEarned && 'bg-secondary text-muted-foreground',
                  )}
                >
                  {rung.level}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {desc?.label ?? `Level ${rung.level}`}
                </span>
                {isCurrent && (
                  <Badge variant="outline" className="ml-auto border-primary/40 text-[9px] text-primary">
                    Current
                  </Badge>
                )}
                {!isCurrent && isEarned && (
                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                )}
                {!isCurrent && !isEarned && (
                  <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="mt-1 pl-8 text-[10px] text-muted-foreground">
                {desc?.description}
              </div>
              {/* Show requirements only for the next level */}
              {rung.level === nextLevel && (
                <div className="mt-2 space-y-0.5 pl-8">
                  {rung.requirements.map((req) => (
                    <div key={req.name} className="flex items-center gap-2 text-[10px]">
                      {req.passed ? (
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-2.5 w-2.5 text-destructive" aria-hidden="true" />
                      )}
                      <span className="text-muted-foreground">{req.name}:</span>
                      <span className="font-mono text-foreground">{req.actual}</span>
                      <ChevronRight className="h-2 w-2 text-muted-foreground" aria-hidden="true" />
                      <span className="font-mono text-muted-foreground">need {req.required}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-[10px] leading-relaxed text-muted-foreground">
        {summary}
      </div>
    </div>
  )
}

function CalibrationSection({
  verdict,
  explanation,
  buckets,
  totalMeasured,
  meanAbsCalibrationGap,
  overallBias,
}: {
  verdict: string
  explanation: string
  buckets: { lo: number; hi: number; n: number; successRate: number | null; calibrationGap: number | null }[]
  totalMeasured: number
  meanAbsCalibrationGap: number | null
  overallBias: number | null
}) {
  const verdictColor =
    verdict === 'well-calibrated' ? 'border-emerald-500/40 text-emerald-400' :
    verdict === 'roughly-calibrated' ? 'border-amber-500/40 text-amber-400' :
    verdict === 'uncalibrated' ? 'border-destructive/40 text-destructive' :
    'border-border/60 text-muted-foreground'

  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Confidence Calibration
        </span>
        <Badge variant="outline" className={cn('ml-auto text-[9px]', verdictColor)}>
          {verdict}
        </Badge>
      </div>

      {/* Calibration curve — buckets */}
      <div className="mb-2 space-y-0.5">
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <span className="w-16">Confidence</span>
          <span className="flex-1 text-center">Success rate (n)</span>
          <span className="w-16 text-right">Gap</span>
        </div>
        {buckets.map((b) => (
          <div key={`${b.lo}-${b.hi}`} className="flex items-center gap-1 text-[10px]">
            <span className="w-16 font-mono text-muted-foreground">
              {b.lo.toFixed(1)}–{b.hi.toFixed(1)}
            </span>
            <div className="flex-1">
              {b.n === 0 ? (
                <div className="h-3 rounded bg-secondary/30 text-center text-[9px] leading-3 text-muted-foreground">
                  —
                </div>
              ) : (
                <div className="relative h-3 rounded bg-secondary/30">
                  {/* Success rate bar */}
                  <div
                    className="absolute inset-y-0 left-0 rounded bg-primary/50"
                    style={{ width: `${(b.successRate ?? 0) * 100}%` }}
                  />
                  {/* Expected line (midpoint of band) */}
                  <div
                    className="absolute inset-y-0 w-px bg-amber-400/60"
                    style={{ left: `${((b.lo + b.hi) / 2) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] text-foreground">
                    {((b.successRate ?? 0) * 100).toFixed(0)}% (n={b.n})
                  </span>
                </div>
              )}
            </div>
            <span className={cn(
              'w-16 text-right font-mono',
              b.calibrationGap === null ? 'text-muted-foreground' :
              Math.abs(b.calibrationGap) < 0.05 ? 'text-emerald-400' :
              b.calibrationGap < 0 ? 'text-destructive' : 'text-amber-400'
            )}>
              {b.calibrationGap === null ? '—' : `${b.calibrationGap >= 0 ? '+' : ''}${(b.calibrationGap * 100).toFixed(0)}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Total measured: <span className="font-mono text-foreground">{totalMeasured}</span></span>
        {meanAbsCalibrationGap !== null && (
          <span>Mean |gap|: <span className="font-mono text-foreground">{(meanAbsCalibrationGap * 100).toFixed(1)}%</span></span>
        )}
        {overallBias !== null && (
          <span className="flex items-center gap-1">
            Bias:
            {overallBias < 0 ? <TrendingDown className="h-2.5 w-2.5 text-destructive" /> : <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />}
            <span className={cn('font-mono', overallBias < 0 ? 'text-destructive' : 'text-emerald-400')}>
              {overallBias < 0 ? 'overconfident' : 'under-confident'}
            </span>
          </span>
        )}
      </div>

      <div className="text-[10px] leading-relaxed text-muted-foreground">
        {explanation}
      </div>
    </div>
  )
}

function OverrideAnalyticsSection({
  acceptanceRate,
  rejectionCount,
  rejectionReasons,
  byDomain,
}: {
  acceptanceRate: number | null
  rejectionCount: number
  rejectionReasons: Record<string, number>
  byDomain: Record<string, { total: number; acceptanceRate: number | null; verdict: string }>
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Human Override Analytics
        </span>
      </div>

      {/* Acceptance rate */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>AI acceptance rate</span>
          <span className="font-mono text-foreground">
            {acceptanceRate === null ? 'no data' : `${(acceptanceRate * 100).toFixed(1)}%`}
          </span>
        </div>
        <Progress
          value={acceptanceRate === null ? 0 : acceptanceRate * 100}
          className="mt-1 h-1.5 bg-secondary/60 [&>div]:bg-primary"
        />
        {rejectionCount > 0 && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            {rejectionCount} override{rejectionCount === 1 ? '' : 's'} recorded
          </div>
        )}
      </div>

      {/* By domain — where is the AI strong vs weak */}
      <div className="mb-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          By domain
        </div>
        <div className="space-y-0.5">
          {Object.entries(byDomain).map(([domain, info]) => (
            <div key={domain} className="flex items-center gap-2 text-[10px]">
              <span className="w-20 truncate text-muted-foreground">{domain}</span>
              <span className="w-8 font-mono text-foreground">{info.total}</span>
              {info.total === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <div className="flex-1">
                    <Progress
                      value={(info.acceptanceRate ?? 0) * 100}
                      className="h-1.5 bg-secondary/40 [&>div]:bg-primary/60"
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'w-20 justify-center text-[8px]',
                      info.verdict === 'trusted' && 'border-emerald-500/40 text-emerald-400',
                      info.verdict === 'borderline' && 'border-amber-500/40 text-amber-400',
                      info.verdict === 'not-trusted' && 'border-destructive/40 text-destructive',
                      info.verdict === 'no-data' && 'border-border text-muted-foreground',
                    )}
                  >
                    {info.verdict}
                  </Badge>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rejection reasons */}
      {Object.keys(rejectionReasons).length > 0 && (
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Why humans reject the AI
          </div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(rejectionReasons).map(([reason, count]) => (
              <Badge key={reason} variant="outline" className="text-[9px] text-muted-foreground">
                {reason}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {acceptanceRate === null && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          No AI-consulted decisions yet. Acceptance rate will appear once the first decision is recorded.
        </div>
      )}
    </div>
  )
}

function MemoryMaturitySection({
  realDataPoints,
  ledgerEntries,
  ledgerWithOutcome,
  phase,
  realPercent,
  simulatedPercent,
}: {
  realDataPoints: number
  ledgerEntries: number
  ledgerWithOutcome: number
  phase: string
  realPercent: number
  simulatedPercent: number
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Database className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Memory Maturity
        </span>
        <Badge variant="outline" className="ml-auto text-[9px] text-muted-foreground">
          {phase}
        </Badge>
      </div>

      {/* Real vs simulated bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Real vs simulated data</span>
          <span className="font-mono text-foreground">
            {realPercent}% real / {simulatedPercent}% simulated
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded bg-secondary/60">
          <div
            className="bg-emerald-500/60 transition-all"
            style={{ width: `${realPercent}%` }}
          />
          <div
            className="bg-amber-500/40 transition-all"
            style={{ width: `${simulatedPercent}%` }}
          />
        </div>
      </div>

      {/* Data points */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-border/40 bg-background/40 p-2">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <Radio className="h-2.5 w-2.5" aria-hidden="true" />
            Sessions
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {realDataPoints}
          </div>
        </div>
        <div className="rounded border border-border/40 bg-background/40 p-2">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <Clock className="h-2.5 w-2.5" aria-hidden="true" />
            Decisions
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {ledgerEntries}
          </div>
        </div>
        <div className="rounded border border-border/40 bg-background/40 p-2">
          <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
            Measured
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-foreground">
            {ledgerWithOutcome}
          </div>
        </div>
      </div>
    </div>
  )
}

function StabilitySection({
  total,
  byTier,
  averageMultiplier,
  dominantTier,
  summary,
}: {
  total: number
  byTier: Record<string, number>
  averageMultiplier: number
  dominantTier: string
  summary: string
}) {
  const tiers = ['ephemeral', 'recent', 'established', 'entrenched'] as const
  const tierColors: Record<string, string> = {
    ephemeral: 'bg-amber-500/40',
    recent: 'bg-blue-500/40',
    established: 'bg-emerald-500/50',
    entrenched: 'bg-primary',
  }
  const tierText: Record<string, string> = {
    ephemeral: 'text-amber-400',
    recent: 'text-blue-400',
    established: 'text-emerald-400',
    entrenched: 'text-primary',
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Temporal Stability
        </span>
        <Badge variant="outline" className="ml-auto text-[9px] text-muted-foreground">
          {total} finding{total === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* The 4-tier bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Stability distribution</span>
          <span className="font-mono text-foreground">
            avg multiplier: {averageMultiplier.toFixed(2)}
          </span>
        </div>
        {total === 0 ? (
          <div className="h-3 rounded bg-secondary/30 text-center text-[9px] leading-3 text-muted-foreground">
            no findings yet
          </div>
        ) : (
          <div className="flex h-3 overflow-hidden rounded bg-secondary/30">
            {tiers.map((tier) => {
              const count = byTier[tier] ?? 0
              const pct = total > 0 ? (count / total) * 100 : 0
              return pct > 0 ? (
                <div
                  key={tier}
                  className={cn('transition-all', tierColors[tier])}
                  style={{ width: `${pct}%` }}
                  title={`${tier}: ${count} (${pct.toFixed(0)}%)`}
                />
              ) : null
            })}
          </div>
        )}
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          {tiers.map((tier) => (
            <span key={tier} className={cn('font-mono', byTier[tier] ? tierText[tier] : 'text-muted-foreground/50')}>
              {tier}: {byTier[tier] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* Tier explanations — always visible so operators learn the ladder */}
      <div className="mb-2 space-y-0.5 text-[9px] text-muted-foreground">
        <div><span className={tierText.ephemeral}>●</span> ephemeral: &lt;7 days or unconfirmed (×0.5)</div>
        <div><span className={tierText.recent}>●</span> recent: 7–90 days, ≥2 confirmations (×0.7)</div>
        <div><span className={tierText.established}>●</span> established: 90–365 days, ≥5 confirmations (×0.85)</div>
        <div><span className={tierText.entrenched}>●</span> entrenched: &gt;365 days, ≥10 confirmations (×1.0)</div>
      </div>

      <div className="text-[10px] leading-relaxed text-muted-foreground">
        {summary}
      </div>
    </div>
  )
}
