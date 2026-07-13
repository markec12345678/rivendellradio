import { describe, expect, test } from 'bun:test'

/**
 * Integration tests for AI Brain modules.
 * Verifies API response structure, required fields, and data integrity.
 * These tests ensure the AI brain modules return well-formed, honest data.
 */

const BASE = 'http://localhost:3000'

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`)
  expect(res.status).toBe(200)
  return res.json()
}

describe('AI Station Brain API', () => {
  test('returns brain state with perception, decision, and explainability', async () => {
    const data = await fetchJson('/api/v1/ai/station-brain')

    // State
    expect(data.state).toBeDefined()
    expect(data.state.perception).toBeDefined()
    expect(data.state.perception.listeners).toBeGreaterThan(0)
    expect(data.state.perception.daypart).toBeDefined()
    expect(data.state.perception.hour).toBeGreaterThanOrEqual(0)
    expect(data.state.perception.hour).toBeLessThanOrEqual(23)

    // Decision
    expect(data.state.currentDecision).toBeDefined()
    expect(data.state.currentDecision.action).toBeDefined()
    expect(data.state.currentDecision.reasoning).toBeDefined()
    expect(data.state.currentDecision.confidence).toBeGreaterThan(0)
    expect(data.state.currentDecision.confidence).toBeLessThanOrEqual(1)

    // Explainability
    expect(data.explainability).toBeDefined()
    expect(data.explainability.whyThisTrack).toBeDefined()
    expect(Array.isArray(data.explainability.whyThisTrack)).toBe(true)
    expect(data.explainability.whyThisTrack.length).toBeGreaterThan(0)
    expect(data.explainability.whyNotAlternatives).toBeDefined()
    expect(Array.isArray(data.explainability.whyNotAlternatives)).toBe(true)

    // North Star
    expect(data.northStarMetric).toBeDefined()
    expect(data.northStarMetric.name).toContain('Average Listening Time')
    expect(data.northStarMetric.currentValue).toBeGreaterThan(0)
    expect(data.northStarMetric.target).toBeGreaterThan(data.northStarMetric.currentValue)
    expect(data.northStarMetric.beforeAfterFramework).toBeDefined()
    expect(data.northStarMetric.beforeAfterFramework.baseline).toBeDefined()
    expect(data.northStarMetric.beforeAfterFramework.caveat).toContain('causation')

    // KPIs
    expect(data.aiModuleKPIs).toBeDefined()
    expect(Array.isArray(data.aiModuleKPIs)).toBe(true)
    expect(data.aiModuleKPIs.length).toBeGreaterThan(0)
    for (const kpi of data.aiModuleKPIs) {
      expect(kpi.module).toBeDefined()
      expect(kpi.hypothesis).toBeDefined()
      expect(kpi.kpi).toBeDefined()
      expect(kpi.baseline).toBeDefined()
      expect(kpi.current).toBeDefined()
      expect(kpi.target).toBeDefined()
    }
  })

  test('has 24h autonomous schedule', async () => {
    const data = await fetchJson('/api/v1/ai/station-brain')
    expect(data.autonomous24h).toBeDefined()
    expect(Array.isArray(data.autonomous24h)).toBe(true)
    expect(data.autonomous24h.length).toBe(24) // 24 hours
    for (const slot of data.autonomous24h) {
      expect(slot.hour).toBeGreaterThanOrEqual(0)
      expect(slot.hour).toBeLessThanOrEqual(23)
      expect(slot.daypart).toBeDefined()
      expect(slot.brainInstructions).toBeDefined()
      expect(slot.energyTarget).toBeGreaterThan(0)
      expect(slot.energyTarget).toBeLessThanOrEqual(1)
    }
  })

  test('decision history has outcomes', async () => {
    const data = await fetchJson('/api/v1/ai/station-brain')
    expect(data.decisionHistory).toBeDefined()
    expect(Array.isArray(data.decisionHistory)).toBe(true)
    expect(data.decisionHistory.length).toBeGreaterThan(0)
    for (const dec of data.decisionHistory) {
      expect(dec.outcome).toBeDefined()
      expect(['success', 'partial', 'failed', 'pending']).toContain(dec.outcome)
      if (dec.outcome !== 'pending') {
        expect(dec.actualRetentionDelta).toBeDefined()
      }
    }
  })
})

describe('AI Knowledge Engine API', () => {
  test('returns rules with required fields', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')

    expect(data.rules).toBeDefined()
    expect(Array.isArray(data.rules)).toBe(true)
    expect(data.rules.length).toBeGreaterThan(0)

    for (const rule of data.rules) {
      expect(rule.id).toBeDefined()
      expect(rule.domain).toBeDefined()
      expect(rule.statement).toBeDefined()
      expect(rule.status).toBeDefined()
      expect(rule.confidence).toBeDefined()
      expect(rule.confidence.score).toBeGreaterThanOrEqual(0)
      expect(rule.confidence.score).toBeLessThanOrEqual(100)
      expect(rule.confidence.isReal).toBe(false) // ALL demonstration
      expect(rule.appliesWhen).toBeDefined()
      expect(Array.isArray(rule.appliesWhen)).toBe(true)
      expect(rule.doesNotApplyWhen).toBeDefined()
      expect(Array.isArray(rule.doesNotApplyWhen)).toBe(true)
      expect(rule.version).toBeGreaterThanOrEqual(1)
      expect(rule.versionHistory).toBeDefined()
    }
  })

  test('no rule is "externally-validated" (isReal=false for all)', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    const externallyValidated = data.rules.filter((r: any) => r.status === 'externally-validated')
    expect(externallyValidated.length).toBe(0) // 0% real evidence
  })

  test('evidence all have isReal=false', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    for (const rule of data.rules) {
      for (const ev of rule.evidence ?? []) {
        expect(ev.isReal).toBe(false)
      }
    }
  })

  test('deprecated rules have supersededBy', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    const deprecated = data.rules.filter((r: any) => r.status === 'deprecated')
    for (const rule of deprecated) {
      expect(rule.supersededBy).toBeDefined()
    }
  })

  test('conflicts are detected and have resolutions', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    expect(data.conflicts).toBeDefined()
    expect(Array.isArray(data.conflicts)).toBe(true)
    expect(data.conflicts.length).toBeGreaterThan(0)
    for (const conflict of data.conflicts) {
      expect(conflict.ruleA).toBeDefined()
      expect(conflict.ruleB).toBeDefined()
      expect(conflict.resolution).toBeDefined()
      expect(['resolved', 'unresolved']).toContain(conflict.type)
    }
  })

  test('evidence graph has nodes and edges', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    expect(data.evidenceGraph).toBeDefined()
    expect(data.evidenceGraph.nodes).toBeDefined()
    expect(Array.isArray(data.evidenceGraph.nodes)).toBe(true)
    expect(data.evidenceGraph.edges).toBeDefined()
    expect(Array.isArray(data.evidenceGraph.edges)).toBe(true)
    expect(data.evidenceGraph.nodes.length).toBeGreaterThan(0)
    expect(data.evidenceGraph.edges.length).toBeGreaterThan(0)
  })

  test('pre-registrations are frozen', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    expect(data.preRegistrations).toBeDefined()
    expect(Array.isArray(data.preRegistrations)).toBe(true)
    for (const reg of data.preRegistrations) {
      expect(reg.frozen).toBe(true)
      expect(reg.hypothesis).toBeDefined()
      expect(reg.primaryKpi).toBeDefined()
      expect(reg.successCriteria).toBeDefined()
      expect(reg.guardrailMetrics).toBeDefined()
      expect(reg.analysisPlan).toBeDefined()
    }
  })

  test('honesty rate is 0% real evidence', async () => {
    const data = await fetchJson('/api/v1/ai/knowledge-engine')
    expect(data.stats.honestyRate).toContain('0%')
    expect(data.stats.realEvidenceCount).toBe(0)
  })
})

describe('AI Experiments API', () => {
  test('returns experiments with required fields', async () => {
    const data = await fetchJson('/api/v1/ai/experiments')

    expect(data.experiments).toBeDefined()
    expect(Array.isArray(data.experiments)).toBe(true)
    expect(data.experiments.length).toBeGreaterThan(0)

    for (const exp of data.experiments) {
      expect(exp.id).toBeDefined()
      expect(exp.name).toBeDefined()
      expect(exp.hypothesis).toBeDefined()
      expect(exp.type).toBeDefined()
      expect(exp.primaryKpi).toBeDefined()
      expect(exp.guardrailMetrics).toBeDefined()
      expect(exp.status).toBeDefined()
      expect(exp.sampleSizeTarget).toBeGreaterThan(0)
    }
  })

  test('completed experiments have statistical results', async () => {
    const data = await fetchJson('/api/v1/ai/experiments')
    const completed = data.experiments.filter((e: any) => e.status === 'completed')

    for (const exp of completed) {
      expect(exp.results).toBeDefined()
      expect(exp.results.treatmentMean).toBeDefined()
      expect(exp.results.controlMean).toBeDefined()
      expect(exp.results.delta).toBeDefined()
      expect(exp.results.pValue).toBeDefined()
      expect(exp.results.pValue).toBeLessThanOrEqual(1)
      expect(exp.results.effectSize).toBeDefined()
      expect(exp.results.confidenceInterval).toBeDefined()
      expect(Array.isArray(exp.results.confidenceInterval)).toBe(true)
      expect(exp.results.statisticallySignificant).toBeDefined()
      expect(exp.decision).toBeDefined()
      expect(['ship', 'kill', 'iterate', 'inconclusive']).toContain(exp.decision)
    }
  })

  test('running experiments have sample progress', async () => {
    const data = await fetchJson('/api/v1/ai/experiments')
    const running = data.experiments.filter((e: any) => e.status === 'running')

    for (const exp of running) {
      expect(exp.sampleSizeCurrent).toBeGreaterThanOrEqual(0)
      expect(exp.sampleSizeCurrent).toBeLessThanOrEqual(exp.sampleSizeTarget)
      expect(exp.startedAt).toBeDefined()
      expect(exp.endsAt).toBeDefined()
    }
  })

  test('shipped experiments have policy updates', async () => {
    const data = await fetchJson('/api/v1/ai/experiments')
    const shipped = data.experiments.filter((e: any) => e.decision === 'ship')

    for (const exp of shipped) {
      expect(exp.policyUpdate).toBeDefined()
      expect(exp.learnedAt).toBeDefined()
    }
  })

  test('methodology includes no-peeking principle', async () => {
    const data = await fetchJson('/api/v1/ai/experiments')
    expect(data.methodology).toBeDefined()
    expect(data.methodology.noPpeeking).toBeDefined()
    expect(data.methodology.primaryKpi).toContain('One metric')
    expect(data.methodology.guardrails).toBeDefined()
  })
})

describe('AI Listener Brain API', () => {
  test('returns retention drivers with honest evidence', async () => {
    const data = await fetchJson('/api/v1/ai/listener-brain')

    expect(data.retentionDrivers).toBeDefined()
    expect(Array.isArray(data.retentionDrivers)).toBe(true)
    expect(data.retentionDrivers.length).toBeGreaterThan(0)

    // Check that at least SOME drivers mention correlation (not causation)
    const evidenceTexts = data.retentionDrivers.map((d: any) => (d.evidence ?? '').toLowerCase()).join(' ')
    expect(evidenceTexts).toContain('correlation')

    // Check all drivers have required fields
    for (const driver of data.retentionDrivers) {
      expect(driver.factor).toBeDefined()
      expect(driver.type).toBeDefined()
      expect(['positive', 'negative', 'neutral']).toContain(driver.type)
      expect(driver.impactMin).toBeDefined()
      expect(driver.confidence).toBeGreaterThan(0)
      expect(driver.confidence).toBeLessThanOrEqual(1)
      expect(driver.evidence).toBeDefined()
    }

    // Check that no driver claims "causes" or "proves"
    for (const driver of data.retentionDrivers) {
      const ev = (driver.evidence ?? '').toLowerCase()
      // Should not use causal language like "causes" or "proves"
      // (some may say "cause" in context of "causal attribution requires" which is fine)
      expect(ev).not.toContain('this causes')
      expect(ev).not.toContain('this proves')
    }
  })

  test('insight includes causal caveat', async () => {
    const data = await fetchJson('/api/v1/ai/listener-brain')
    expect(data.insight).toBeDefined()
    expect(data.insight.finding).toBeDefined()
    // Should NOT claim causation
    expect(data.insight.finding.toLowerCase()).toContain('not prove causation')
    expect(data.insight.statisticalNote).toBeDefined()
    expect(data.insight.statisticalNote.toLowerCase()).toContain('observational')
  })

  test('listener segments have churn risk', async () => {
    const data = await fetchJson('/api/v1/ai/listener-brain')
    expect(data.listenerSegments).toBeDefined()
    expect(Array.isArray(data.listenerSegments)).toBe(true)
    expect(data.listenerSegments.length).toBeGreaterThan(0)

    for (const seg of data.listenerSegments) {
      expect(seg.segment).toBeDefined()
      expect(seg.count).toBeGreaterThan(0)
      expect(seg.avgSessionMin).toBeGreaterThan(0)
      expect(seg.churnRisk).toBeGreaterThanOrEqual(0)
      expect(seg.churnRisk).toBeLessThanOrEqual(1)
    }
  })

  test('leave reasons have preventability flags', async () => {
    const data = await fetchJson('/api/v1/ai/listener-brain')
    expect(data.leaveReasons).toBeDefined()
    expect(Array.isArray(data.leaveReasons)).toBe(true)

    for (const reason of data.leaveReasons) {
      expect(reason.reason).toBeDefined()
      expect(reason.category).toBeDefined()
      expect(reason.preventable).toBeDefined()
      if (reason.preventable) {
        expect(reason.prevention).toBeDefined()
      }
    }
  })
})

describe('AI Multi-Objective Optimizer API', () => {
  test('returns 8 objectives with weights summing to 1.0', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')

    expect(data.objectives).toBeDefined()
    expect(Array.isArray(data.objectives)).toBe(true)
    expect(data.objectives.length).toBe(8)

    const totalWeight = data.objectives.reduce((s: number, o: any) => s + o.weight, 0)
    expect(Math.round(totalWeight * 100) / 100).toBe(1.0)
  })

  test('ALT has highest weight (0.25)', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')
    const alt = data.objectives.find((o: any) => o.id === 'alt')
    expect(alt).toBeDefined()
    expect(alt.weight).toBe(0.25)
    expect(alt.direction).toBe('maximize')
  })

  test('compliance has hard constraint at 100%', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')
    const compliance = data.objectives.find((o: any) => o.id === 'compliance')
    expect(compliance).toBeDefined()
    expect(compliance.constraint.type).toBe('hard')
    expect(compliance.constraint.floor).toBe(100)
    expect(compliance.current).toBe(100)
  })

  test('diversity has hard floor', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')
    const diversity = data.objectives.find((o: any) => o.id === 'diversity')
    expect(diversity).toBeDefined()
    expect(diversity.constraint.type).toBe('hard')
    expect(diversity.constraint.floor).toBeGreaterThan(0)
  })

  test('tradeoffs show what you gain and lose', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')
    expect(data.tradeoffs).toBeDefined()
    expect(Array.isArray(data.tradeoffs)).toBe(true)
    expect(data.tradeoffs.length).toBeGreaterThan(0)

    for (const t of data.tradeoffs) {
      expect(t.decision).toBeDefined()
      expect(t.whatYouGain).toBeDefined()
      expect(t.whatYouLose).toBeDefined()
      expect(t.isWorthIt).toBeDefined()
      expect(t.netScore).toBeDefined()
    }
  })

  test('Pareto frontier has points', async () => {
    const data = await fetchJson('/api/v1/ai/optimizer')
    expect(data.pareto).toBeDefined()
    expect(data.pareto.points).toBeDefined()
    expect(Array.isArray(data.pareto.points)).toBe(true)
    expect(data.pareto.points.length).toBeGreaterThan(0)
    expect(data.pareto.current).toBeDefined()
    expect(data.pareto.optimal).toBeDefined()
  })
})

describe('AI Learning Loop API', () => {
  test('returns learning records with projected vs actual', async () => {
    const data = await fetchJson('/api/v1/ai/learning-loop')

    expect(data.learningRecords).toBeDefined()
    expect(Array.isArray(data.learningRecords)).toBe(true)
    expect(data.learningRecords.length).toBeGreaterThan(0)

    for (const rec of data.learningRecords) {
      expect(rec.decision).toBeDefined()
      expect(rec.projectedAltDelta).toBeDefined()
      expect(rec.actualAltDelta).toBeDefined()
      expect(rec.surprise).toBeGreaterThanOrEqual(0)
      expect(rec.surprise).toBeLessThanOrEqual(1)
      expect(rec.lessonLearned).toBeDefined()
      expect(rec.causalConfidence).toBeDefined()
      expect(['high', 'medium', 'low']).toContain(rec.causalConfidence)
      expect(rec.confounders).toBeDefined()
      expect(Array.isArray(rec.confounders)).toBe(true)
    }
  })

  test('accumulated knowledge has A/B validation flags', async () => {
    const data = await fetchJson('/api/v1/ai/learning-loop')
    expect(data.accumulatedKnowledge).toBeDefined()
    expect(Array.isArray(data.accumulatedKnowledge)).toBe(true)

    for (const domain of data.accumulatedKnowledge) {
      expect(domain.domain).toBeDefined()
      expect(domain.findings).toBeDefined()
      expect(Array.isArray(domain.findings)).toBe(true)
      for (const f of domain.findings) {
        expect(f.finding).toBeDefined()
        expect(f.evidence).toBeDefined()
        expect(f.confidence).toBeDefined()
        expect(['high', 'medium', 'low']).toContain(f.confidence)
        expect(f.abValidated).toBeDefined()
      }
    }
  })

  test('self-awareness statements exist', async () => {
    const data = await fetchJson('/api/v1/ai/learning-loop')
    expect(data.theLoop).toBeDefined()
    expect(data.theLoop.selfAwareness).toBeDefined()
    expect(Array.isArray(data.theLoop.selfAwareness)).toBe(true)
    expect(data.theLoop.selfAwareness.length).toBeGreaterThan(0)
  })
})
