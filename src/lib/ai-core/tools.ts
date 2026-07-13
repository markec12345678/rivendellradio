/**
 * AI Core Tools — orodja ki jih AI lahko kliče (MCP-style).
 *
 * LLM ne ugiba. Vpraša orodje. Orodje vrne dejanske podatke.
 *
 * Vsako orodje je funkcija ki:
 *   1. Vzame parametre
 *   2. Pridobi dejanske podatke iz sistema
 *   3. Vrne strukturiran rezultat
 *
 * AI Core nato uporabi te podatke za reasoning.
 */

export interface ToolResult {
  tool: string
  success: boolean
  data: any
  error?: string
}

export interface Tool {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  execute: (params: any) => Promise<ToolResult>
}

// ============================================================================
// Tool: Now Playing
// ============================================================================
const nowPlayingTool: Tool = {
  name: 'get_now_playing',
  description: 'Get the currently playing track, next track, and listener count',
  parameters: {},
  async execute() {
    try {
      const res = await fetch('http://localhost:3000/api/rivendell/airplay')
      const data = await res.json()
      return {
        tool: 'get_now_playing', success: true,
        data: {
          trackId: data.trackId ?? 'unknown',
          title: data.title ?? 'Unknown',
          artist: data.artist ?? 'Unknown',
          album: data.album ?? 'Unknown',
          durationMs: data.length ?? 0,
          elapsedMs: data.elapsed ?? 0,
          remainingMs: (data.length ?? 0) - (data.elapsed ?? 0),
          listeners: data.listeners ?? 0,
          station: data.station ?? 'Rock 88.7 FM',
        },
      }
    } catch (e: any) {
      return { tool: 'get_now_playing', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Station Brain State
// ============================================================================
const stationBrainTool: Tool = {
  name: 'get_station_brain',
  description: 'Get current AI Station Brain state: perception, thoughts, current decision, ALT projections',
  parameters: {},
  async execute() {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/station-brain')
      const data = await res.json()
      return {
        tool: 'get_station_brain', success: true,
        data: {
          perception: data.state?.perception,
          currentDecision: data.state?.currentDecision,
          northStar: data.northStarMetric,
          thoughts: data.state?.thoughts?.slice(0, 5),
        },
      }
    } catch (e: any) {
      return { tool: 'get_station_brain', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Listener Brain
// ============================================================================
const listenerBrainTool: Tool = {
  name: 'get_listener_insights',
  description: 'Get listener retention drivers, segments, and leave/stay reasons',
  parameters: {},
  async execute() {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/listener-brain')
      const data = await res.json()
      return {
        tool: 'get_listener_insights', success: true,
        data: {
          topRetentionDrivers: data.retentionDrivers?.slice(0, 5).map((d: any) => ({
            factor: d.factor, impact: d.impactMin, type: d.type,
          })),
          segments: data.listenerSegments?.map((s: any) => ({
            segment: s.segment, avgSessionMin: s.avgSessionMin, churnRisk: s.churnRisk,
          })),
          topLeaveReasons: data.leaveReasons?.filter((r: any) => r.preventable).slice(0, 3).map((r: any) => r.reason),
          topStayReasons: data.stayReasons?.slice(0, 3).map((r: any) => r.reason),
          insight: data.insight,
        },
      }
    } catch (e: any) {
      return { tool: 'get_listener_insights', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Knowledge Engine
// ============================================================================
const knowledgeEngineTool: Tool = {
  name: 'get_knowledge',
  description: 'Get verified knowledge rules with evidence and applicability boundaries',
  parameters: {
    domain: { type: 'string', description: 'Filter by domain (track-selection, voice-links, ad-breaks, etc.)', required: false },
  },
  async execute(params) {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/knowledge-engine')
      const data = await res.json()
      const rules = params.domain
        ? data.rules?.filter((r: any) => r.domain === params.domain)
        : data.rules
      return {
        tool: 'get_knowledge', success: true,
        data: {
          rules: rules?.map((r: any) => ({
            id: r.id, statement: r.statement, status: r.status,
            confidence: r.confidence, appliesWhen: r.appliesWhen,
            doesNotApplyWhen: r.doesNotApplyWhen, altImpact: r.altImpact,
          })),
          conflicts: data.conflicts,
        },
      }
    } catch (e: any) {
      return { tool: 'get_knowledge', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Station Memory
// ============================================================================
const stationMemoryTool: Tool = {
  name: 'get_station_memory',
  description: 'Get institutional memory: lessons, past decisions, behavioral segments, taste evolution',
  parameters: {
    type: { type: 'string', description: 'Type of memory: lessons, decisions, segments, journal', required: false },
  },
  async execute(params) {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/station-memory')
      const data = await res.json()
      const type = params.type
      let memoryData: any = {}

      if (!type || type === 'lessons') {
        memoryData.lessons = data.institutionalLessons?.slice(0, 5).map((l: any) => ({
          lesson: l.lesson, confidence: l.confidence, evidence: l.evidence,
        }))
      }
      if (!type || type === 'decisions') {
        memoryData.decisions = data.decisionHistory?.slice(0, 5).map((d: any) => ({
          year: d.year, decision: d.decision, outcome: d.outcome, altDelta: d.altDelta,
          lesson: d.lesson, retryVerdict: d.retryVerdict,
        }))
      }
      if (!type || type === 'segments') {
        memoryData.segments = data.listenerSegments?.map((s: any) => ({
          name: s.name, keyInsight: s.keyInsight, avgSessionMin: s.avgSessionMin,
        }))
      }
      if (!type || type === 'journal') {
        memoryData.latestJournal = data.stationJournal?.[0]
      }

      return { tool: 'get_station_memory', success: true, data: memoryData }
    } catch (e: any) {
      return { tool: 'get_station_memory', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Check Retry (Station Memory)
// ============================================================================
const checkRetryTool: Tool = {
  name: 'check_retry',
  description: 'Check if a similar programming decision was tried before (prevents repeating mistakes)',
  parameters: {
    decisionDescription: { type: 'string', description: 'Description of the decision being considered', required: true },
  },
  async execute(params) {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/station-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-retry', decisionDescription: params.decisionDescription }),
      })
      const data = await res.json()
      return { tool: 'check_retry', success: true, data }
    } catch (e: any) {
      return { tool: 'check_retry', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Scheduler
// ============================================================================
const schedulerTool: Tool = {
  name: 'get_schedule',
  description: 'Get the current music schedule for a specific hour',
  parameters: {
    hour: { type: 'number', description: 'Hour of day (0-23)', required: false },
  },
  async execute(params) {
    try {
      const hour = params.hour ?? new Date().getHours()
      const res = await fetch(`http://localhost:3000/api/v1/scheduler?hour=${hour}`)
      const data = await res.json()
      return {
        tool: 'get_schedule', success: true,
        data: {
          daypart: data.daypart?.name,
          clock: data.clock?.name,
          scheduledTracks: data.scheduled?.map((t: any) => ({
            title: t.title, artist: t.artist, category: t.category, demandScore: t.demandScore,
          })),
          stats: data.stats,
        },
      }
    } catch (e: any) {
      return { tool: 'get_schedule', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Reliability Metrics
// ============================================================================
const reliabilityTool: Tool = {
  name: 'get_reliability',
  description: 'Get current ALT, SLO compliance, uptime, and reliability metrics',
  parameters: {},
  async execute() {
    try {
      const res = await fetch('http://localhost:3000/api/v1/reliability')
      const data = await res.json()
      return {
        tool: 'get_reliability', success: true,
        data: {
          alt: data.sla?.actual30d,
          mttr: data.stats?.avgMttrSec,
          uptime: data.sla?.actual30d,
          incidents30d: data.stats?.totalIncidents30d,
          autoResolutionRate: data.stats?.autoResolutionRate,
          customerReady: data.customerReady?.summary,
        },
      }
    } catch (e: any) {
      return { tool: 'get_reliability', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool: Experiments
// ============================================================================
const experimentsTool: Tool = {
  name: 'get_experiments',
  description: 'Get active and completed A/B experiments with results',
  parameters: {},
  async execute() {
    try {
      const res = await fetch('http://localhost:3000/api/v1/ai/experiments')
      const data = await res.json()
      return {
        tool: 'get_experiments', success: true,
        data: {
          running: data.experiments?.filter((e: any) => e.status === 'running').map((e: any) => ({
            name: e.name, hypothesis: e.hypothesis, sampleProgress: `${e.sampleSizeCurrent}/${e.sampleSizeTarget}`,
          })),
          shipped: data.experiments?.filter((e: any) => e.decision === 'ship').map((e: any) => ({
            name: e.name, delta: e.results?.delta, pValue: e.results?.pValue,
          })),
        },
      }
    } catch (e: any) {
      return { tool: 'get_experiments', success: false, data: null, error: e?.message }
    }
  },
}

// ============================================================================
// Tool Registry
// ============================================================================
export const TOOLS: Record<string, Tool> = {
  get_now_playing: nowPlayingTool,
  get_station_brain: stationBrainTool,
  get_listener_insights: listenerBrainTool,
  get_knowledge: knowledgeEngineTool,
  get_station_memory: stationMemoryTool,
  check_retry: checkRetryTool,
  get_schedule: schedulerTool,
  get_reliability: reliabilityTool,
  get_experiments: experimentsTool,
}

export const TOOL_DESCRIPTIONS = Object.entries(TOOLS).map(([name, tool]) => ({
  name,
  description: tool.description,
  parameters: tool.parameters,
}))

/**
 * Execute a tool by name with parameters.
 */
export async function executeTool(name: string, params: any = {}): Promise<ToolResult> {
  const tool = TOOLS[name]
  if (!tool) {
    return { tool: name, success: false, data: null, error: `Unknown tool: ${name}` }
  }
  return tool.execute(params)
}

/**
 * Execute multiple tools in parallel.
 */
export async function executeTools(toolCalls: { name: string; params?: any }[]): Promise<Record<string, ToolResult>> {
  const results = await Promise.all(
    toolCalls.map(async (call) => {
      const result = await executeTool(call.name, call.params)
      return [call.name, result] as [string, ToolResult]
    }),
  )
  return Object.fromEntries(results)
}
