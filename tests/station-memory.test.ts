import { describe, expect, test } from 'bun:test'

const BASE = 'http://localhost:3000'

async function fetchJson(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`)
  expect(res.status).toBe(200)
  return res.json()
}

describe('Station Intelligence Database API', () => {
  test('returns behavioral listener segments (not individuals)', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    expect(data.listenerSegments).toBeDefined()
    expect(Array.isArray(data.listenerSegments)).toBe(true)
    expect(data.listenerSegments.length).toBe(5) // morning, office, afternoon, evening, weekend

    for (const seg of data.listenerSegments) {
      expect(seg.id).toBeDefined()
      expect(seg.name).toBeDefined()
      expect(seg.typicalHours).toBeDefined()
      expect(seg.devices).toBeDefined()
      expect(Array.isArray(seg.devices)).toBe(true)
      expect(seg.avgSessionMin).toBeGreaterThan(0)
      expect(seg.keyInsight).toBeDefined()
      expect(seg.respondsWellTo).toBeDefined()
      expect(Array.isArray(seg.respondsWellTo)).toBe(true)
      expect(seg.doesNotRespondWellTo).toBeDefined()
      expect(Array.isArray(seg.doesNotRespondWellTo)).toBe(true)
    }
  })

  test('morning commuter segment has car device', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const morning = data.listenerSegments.find((s: any) => s.id === 'seg-morning-commuter')
    expect(morning).toBeDefined()
    expect(morning.devices).toContain('car')
    expect(morning.respondsWellTo).toContain('prometne informacije')
    expect(morning.doesNotRespondWellTo.some((s: string) => s.includes('počasne'))).toBe(true)
  })

  test('office worker segment has longest sessions', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const office = data.listenerSegments.find((s: any) => s.id === 'seg-office-worker')
    expect(office).toBeDefined()
    expect(office.avgSessionMin).toBeGreaterThan(120) // 180min = 3h
    expect(office.devices).toContain('desktop')
  })

  test('music taste evolution spans multiple years', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    expect(data.tasteEvolution).toBeDefined()
    expect(Array.isArray(data.tasteEvolution)).toBe(true)
    expect(data.tasteEvolution.length).toBeGreaterThanOrEqual(4) // 2020, 2022, 2024, 2026

    const years = data.tasteEvolution.map((t: any) => t.year)
    expect(Math.min(...years)).toBeLessThanOrEqual(2020)
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2026)

    for (const period of data.tasteEvolution) {
      expect(period.period).toBeDefined()
      expect(period.topGenres).toBeDefined()
      expect(Array.isArray(period.topGenres)).toBe(true)
      expect(period.altAverage).toBeGreaterThan(0)
      expect(period.keyChange).toBeDefined()
      expect(period.evidence).toBeDefined()
    }
  })

  test('ALT has grown over the years', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const first = data.tasteEvolution[0]
    const last = data.tasteEvolution[data.tasteEvolution.length - 1]
    expect(last.altAverage).toBeGreaterThan(first.altAverage)
    expect(data.stats.altGrowth2019to2026).toBeGreaterThan(0)
  })

  test('programming decision history includes successes AND failures', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    expect(data.decisionHistory).toBeDefined()
    expect(Array.isArray(data.decisionHistory)).toBe(true)
    expect(data.decisionHistory.length).toBeGreaterThan(0)

    const successes = data.decisionHistory.filter((d: any) => d.outcome === 'success')
    const failures = data.decisionHistory.filter((d: any) => d.outcome === 'failure')
    expect(successes.length).toBeGreaterThan(0)
    expect(failures.length).toBeGreaterThan(0) // Must include failures — honesty
  })

  test('failed decisions have lessons and retry verdicts', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const failures = data.decisionHistory.filter((d: any) => d.outcome === 'failure')

    for (const dec of failures) {
      expect(dec.lesson).toBeDefined()
      expect(dec.lesson.length).toBeGreaterThan(10) // meaningful lesson
      expect(dec.retryVerdict).toBeDefined()
      expect(dec.retryVerdict.toLowerCase()).toContain('ne') // "Ne poskušati" — don't retry (case-insensitive)
    }
  })

  test('2019 morning block failure was retried in 2024 with same result', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const morningBlock = data.decisionHistory.filter((d: any) =>
      d.decision.toLowerCase().includes('brez novic')
    )
    expect(morningBlock.length).toBe(2) // tried twice
    expect(morningBlock[0].year).toBe(2019)
    expect(morningBlock[1].year).toBe(2024)
    expect(morningBlock[0].outcome).toBe('failure')
    expect(morningBlock[1].outcome).toBe('failure')
  })

  test('all evidence isReal=false (demonstration)', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    for (const dec of data.decisionHistory) {
      expect(dec.isReal).toBe(false)
    }
    expect(data.stats.realEvidenceCount).toBe(0)
    expect(data.stats.honestyRate).toContain('0%')
  })

  test('institutional lessons are used by AI modules', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    expect(data.institutionalLessons).toBeDefined()
    expect(Array.isArray(data.institutionalLessons)).toBe(true)
    expect(data.institutionalLessons.length).toBeGreaterThan(5)

    for (const lesson of data.institutionalLessons) {
      expect(lesson.lesson).toBeDefined()
      expect(lesson.evidence).toBeDefined()
      expect(lesson.yearLearned).toBeGreaterThan(2018)
      expect(lesson.stillValid).toBeDefined()
      expect(lesson.usedBy).toBeDefined()
      expect(Array.isArray(lesson.usedBy)).toBe(true)
      expect(lesson.usedBy.length).toBeGreaterThan(0) // must be used by at least one module
    }
  })

  test('lessons include counter-evidence where applicable', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const withCounter = data.institutionalLessons.filter((l: any) => l.counterEvidence)
    expect(withCounter.length).toBeGreaterThan(0) // at least some have counter-evidence
  })

  test('integration shows how AI modules use station memory', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    expect(data.integration).toBeDefined()
    expect(data.integration.stationBrain).toBeDefined()
    expect(data.integration.scheduler).toBeDefined()
    expect(data.integration.showPrep).toBeDefined()
    expect(data.integration.knowledgeEngine).toBeDefined()
    expect(data.integration.optimizer).toBeDefined()
  })

  test('vision spans multiple years', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    expect(data.vision).toBeDefined()
    expect(data.vision.year1).toBeDefined()
    expect(data.vision.year3).toBeDefined()
    expect(data.vision.year5).toBeDefined()
    expect(data.vision.year10).toBeDefined()
    expect(data.vision.principle).toBeDefined()
    expect(data.vision.principle).toContain('memory')
  })

  test('check-retry finds similar past decisions', async () => {
    const res = await fetch(`${BASE}/api/v1/ai/station-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check-retry', decisionDescription: 'jutranji blok brez novic' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.warning).toContain('SIMILAR')
    expect(data.previousAttempts).toBeDefined()
    expect(Array.isArray(data.previousAttempts)).toBe(true)
    expect(data.previousAttempts.length).toBeGreaterThan(0)
    expect(data.recommendation).toBeDefined()
  })

  // ========================================================================
  // NEW: Confidence levels on lessons
  // ========================================================================
  test('lessons have confidence with level, timesObserved, yearsObserved', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    for (const lesson of data.institutionalLessons) {
      expect(lesson.confidence).toBeDefined()
      expect(lesson.confidence.level).toBeDefined()
      expect(['very-high', 'high', 'medium', 'low', 'experimental']).toContain(lesson.confidence.level)
      expect(lesson.confidence.timesObserved).toBeGreaterThanOrEqual(1)
      expect(lesson.confidence.yearsObserved).toBeGreaterThanOrEqual(0)
      expect(lesson.confidence.isReal).toBe(false) // all demonstration
    }
  })

  test('very-high confidence lessons have multiple years of observation', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const veryHigh = data.institutionalLessons.filter((l: any) => l.confidence.level === 'very-high')

    for (const lesson of veryHigh) {
      expect(lesson.confidence.yearsObserved).toBeGreaterThanOrEqual(5)
      expect(lesson.confidence.timesObserved).toBeGreaterThanOrEqual(2)
    }
  })

  test('confidence distribution is reported in stats', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    expect(data.stats.veryHighConfidence).toBeDefined()
    expect(data.stats.highConfidence).toBeDefined()
    expect(data.stats.mediumConfidence).toBeDefined()
    expect(data.stats.veryHighConfidence).toBeGreaterThan(0)
  })

  // ========================================================================
  // NEW: Expected vs Actual on programming decisions
  // ========================================================================
  test('decisions have expected vs actual ALT with prediction error', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    for (const dec of data.decisionHistory) {
      expect(dec.expectedAlt).toBeDefined()
      expect(dec.actualAlt).toBeDefined()
      expect(dec.predictionError).toBeDefined()
      // predictionError = actualAlt - expectedAlt
      expect(dec.predictionError).toBeCloseTo(dec.actualAlt - dec.expectedAlt, 1)
    }
  })

  test('failed decisions have whyWrong explanation', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    const failures = data.decisionHistory.filter((d: any) => d.outcome === 'failure')

    for (const dec of failures) {
      expect(dec.whyWrong).toBeDefined()
      expect(dec.whyWrong.length).toBeGreaterThan(10)
    }
  })

  test('prediction accuracy is reported in stats', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    expect(data.stats.avgPredictionError).toBeDefined()
    expect(data.stats.overestimationCount).toBeDefined()
    expect(data.stats.underestimationCount).toBeDefined()
    // We should have both overestimations and underestimations (honest)
    expect(data.stats.overestimationCount).toBeGreaterThan(0)
  })

  // ========================================================================
  // NEW: Station Journal — daily diary
  // ========================================================================
  test('station journal has daily entries with reflection', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    expect(data.stationJournal).toBeDefined()
    expect(Array.isArray(data.stationJournal)).toBe(true)
    expect(data.stationJournal.length).toBeGreaterThan(0)

    for (const entry of data.stationJournal) {
      expect(entry.date).toBeDefined()
      expect(entry.alt).toBeGreaterThan(0)
      expect(entry.biggestSuccess).toBeDefined()
      expect(entry.biggestMistake).toBeDefined()
      expect(entry.biggestSurprise).toBeDefined()
      expect(entry.whatWouldWeDoDifferently).toBeDefined()
      expect(entry.newHypothesis).toBeDefined()
      expect(entry.aiSelfReflection).toBeDefined()
      expect(entry.isReal).toBe(false) // all demonstration
    }
  })

  test('journal entries generate new hypotheses', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')
    expect(data.stats.hypothesesGenerated).toBeGreaterThan(0)

    for (const entry of data.stationJournal) {
      if (entry.newHypothesis) {
        expect(entry.newHypothesis.length).toBeGreaterThan(20) // meaningful hypothesis
      }
    }
  })

  test('journal includes AI self-reflection (where predictions were wrong)', async () => {
    const data = await fetchJson('/api/v1/ai/station-memory')

    const reflections = data.stationJournal.filter((j: any) => j.aiSelfReflection)
    expect(reflections.length).toBeGreaterThan(0)

    // At least one reflection should mention prediction error or model adjustment
    const hasPredictionError = reflections.some((r: any) =>
      r.aiSelfReflection.toLowerCase().includes('predict') ||
      r.aiSelfReflection.toLowerCase().includes('overestimate') ||
      r.aiSelfReflection.toLowerCase().includes('underestimate') ||
      r.aiSelfReflection.toLowerCase().includes('adjust')
    )
    expect(hasPredictionError).toBe(true)
  })

  test('journal entries can be added via POST', async () => {
    const res = await fetch(`${BASE}/api/v1/ai/station-memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add-journal',
        date: '2026-07-13',
        alt: 19.5,
        listeners: 1600,
        biggestSuccess: 'Test entry',
        biggestMistake: 'Test mistake',
        biggestSurprise: 'Test surprise',
        whatWouldWeDoDifferently: 'Test differently',
        newHypothesis: 'Test hypothesis',
        aiSelfReflection: 'Test reflection',
        weather: 'sunny',
        daypart: 'morning',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.entry.date).toBe('2026-07-13')
    expect(data.entry.isReal).toBe(false)
  })
})
