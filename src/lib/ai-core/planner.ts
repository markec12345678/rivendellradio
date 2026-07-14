/**
 * Planner 2.0 — večstopenjsko načrtovanje z oceno stroška, zaupanja in potrebnih orodij.
 *
 * Flow: Question → Intent → Goals → Plan → Priority → Tools → Answer → Reflection
 *
 * + Tool Registry: AI sam izbira orodja glede na opis/latenco/zanesljivost
 * + Self-Reflection: po odgovoru preveri ali bi moral uporabiti več orodij
 * + Confidence scoring: vsak odgovor ima score + evidence + contradictions + missing data
 */

import { executeTools, TOOLS, type ToolResult } from '@/lib/ai-core/tools'
import { checkGoalAlignment, getGoalProgress, GOALS, type Goal } from '@/lib/ai-core/goals'
import { findMatchingSkills, getAllSkills, type Skill } from '@/lib/ai-core/skills'
import { llmChat } from '@/lib/llm-provider'
import { MEMORY } from '@/lib/ai-core/index'

// ============================================================================
// Tool Registry — AI sam izbira orodja
// ============================================================================
export interface ToolMeta {
  name: string
  description: string
  cost: 'low' | 'medium' | 'high'  // API calls / compute
  latency: 'fast' | 'medium' | 'slow' // <100ms, <1s, >1s
  reliability: number // 0-1, based on historical success rate
  dataFreshness: 'real-time' | 'cached' | 'static'
}

export const TOOL_REGISTRY: Record<string, ToolMeta> = {
  get_now_playing: { name: 'get_now_playing', description: 'Current track + listeners', cost: 'low', latency: 'fast', reliability: 0.99, dataFreshness: 'real-time' },
  get_station_brain: { name: 'get_station_brain', description: 'AI brain state + ALT', cost: 'low', latency: 'fast', reliability: 0.95, dataFreshness: 'real-time' },
  get_listener_insights: { name: 'get_listener_insights', description: 'Retention drivers + segments', cost: 'low', latency: 'fast', reliability: 0.92, dataFreshness: 'cached' },
  get_knowledge: { name: 'get_knowledge', description: 'Verified rules + evidence', cost: 'low', latency: 'fast', reliability: 0.98, dataFreshness: 'static' },
  get_station_memory: { name: 'get_station_memory', description: 'Institutional lessons + decisions', cost: 'low', latency: 'fast', reliability: 0.97, dataFreshness: 'cached' },
  check_retry: { name: 'check_retry', description: 'Prevent repeating past mistakes', cost: 'low', latency: 'fast', reliability: 0.99, dataFreshness: 'real-time' },
  get_schedule: { name: 'get_schedule', description: 'Current music schedule', cost: 'medium', latency: 'medium', reliability: 0.94, dataFreshness: 'real-time' },
  get_reliability: { name: 'get_reliability', description: 'ALT + MTTR + uptime', cost: 'low', latency: 'fast', reliability: 0.96, dataFreshness: 'cached' },
  get_experiments: { name: 'get_experiments', description: 'A/B test results', cost: 'low', latency: 'fast', reliability: 0.97, dataFreshness: 'cached' },
}

// ============================================================================
// Intent Analysis
// ============================================================================
export interface Intent {
  type: 'question' | 'action_request' | 'analysis' | 'planning' | 'emergency' | 'creative'
  confidence: number
  detectedKeywords: string[]
  urgency: 'low' | 'medium' | 'high' | 'critical'
  estimatedToolsNeeded: number
}

export function analyzeIntent(question: string): Intent {
  const q = question.toLowerCase()
  const keywords: string[] = []
  let type: Intent['type'] = 'question'
  let urgency: Intent['urgency'] = 'low'
  let estimatedTools = 2

  // Detect type
  if (q.includes('zakaj') || q.includes('why') || q.includes('vzrok') || q.includes('analiz')) {
    type = 'analysis'
    estimatedTools = 5
    keywords.push('analysis')
  }
  if (q.includes('naredi') || q.includes('do') || q.includes('spremeni') || q.includes('change') || q.includes('add')) {
    type = 'action_request'
    estimatedTools = 3
    keywords.push('action')
  }
  if (q.includes('načrt') || q.includes('plan') || q.includes('pripravi') || q.includes('prepare')) {
    type = 'planning'
    estimatedTools = 4
    keywords.push('planning')
  }
  if (q.includes('emergency') || q.includes('eas') || q.includes('alert') || q.includes('nujno')) {
    type = 'emergency'
    urgency = 'critical'
    estimatedTools = 2
    keywords.push('emergency')
  }
  if (q.includes('ustvari') || q.includes('create') || q.includes('generiraj') || q.includes('write')) {
    type = 'creative'
    estimatedTools = 3
    keywords.push('creative')
  }

  // Detect urgency
  if (q.includes('zdaj') || q.includes('now') || q.includes('takoj') || q.includes('immediately')) urgency = 'high'
  if (q.includes('hitro') || q.includes('quick') || q.includes('urgent')) urgency = 'high'

  return { type, confidence: 0.85, detectedKeywords: keywords, urgency, estimatedToolsNeeded: estimatedTools }
}

// ============================================================================
// Multi-stage Plan
// ============================================================================
export interface PlanStage {
  stage: number
  name: string
  description: string
  tools: string[]
  priority: number
  estimatedCost: 'low' | 'medium' | 'high'
  confidenceNeeded: 'low' | 'medium' | 'high'
}

export function createMultiStagePlan(question: string, intent: Intent): PlanStage[] {
  const q = question.toLowerCase()
  const stages: PlanStage[] = []
  let stageNum = 1

  // Stage 1: Always establish context
  stages.push({
    stage: stageNum++,
    name: 'Context',
    description: 'Establish current station state',
    tools: ['get_now_playing', 'get_station_brain'],
    priority: 1,
    estimatedCost: 'low',
    confidenceNeeded: 'high',
  })

  // Stage 2: Intent-specific
  if (intent.type === 'analysis' || q.includes('zakaj') || q.includes('why') || q.includes('pad')) {
    stages.push({
      stage: stageNum++,
      name: 'Root Cause Analysis',
      description: 'Gather listener behavior + reliability + memory data',
      tools: ['get_listener_insights', 'get_reliability', 'get_station_memory'],
      priority: 2,
      estimatedCost: 'medium',
      confidenceNeeded: 'high',
    })
  }

  if (q.includes('predvaj') || q.includes('play') || q.includes('skladb') || q.includes('track') || q.includes('music') || q.includes('glasb')) {
    stages.push({
      stage: stageNum++,
      name: 'Music Analysis',
      description: 'Check schedule + knowledge rules',
      tools: ['get_schedule', 'get_knowledge'],
      priority: 2,
      estimatedCost: 'medium',
      confidenceNeeded: 'medium',
    })
  }

  if (q.includes('poskuš') || q.includes('try') || q.includes('attempt') || q.includes('nov') || intent.type === 'action_request') {
    stages.push({
      stage: stageNum++,
      name: 'Safety Check',
      description: 'Check if similar decision was tried before + goal alignment',
      tools: ['check_retry'],
      priority: 3,
      estimatedCost: 'low',
      confidenceNeeded: 'high',
    })
  }

  if (q.includes('eksperiment') || q.includes('experiment') || q.includes('test') || q.includes('a/b')) {
    stages.push({
      stage: stageNum++,
      name: 'Experiment Check',
      description: 'Check running + completed experiments',
      tools: ['get_experiments'],
      priority: 3,
      estimatedCost: 'low',
      confidenceNeeded: 'medium',
    })
  }

  return stages
}

// ============================================================================
// Confidence Scoring
// ============================================================================
export interface ConfidenceScore {
  score: number // 0-1
  evidenceCount: number
  contradictions: string[]
  missingData: string[]
  freshness: string
  toolReliability: number
  reasoningQuality: 'high' | 'medium' | 'low'
}

export function calculateConfidence(
  evidence: Record<string, ToolResult>,
  answer: string,
  plan: PlanStage[],
): ConfidenceScore {
  const toolResults = Object.values(evidence)
  const successCount = toolResults.filter(r => r.success).length
  const failCount = toolResults.filter(r => !r.success).length

  // Base score from tool success rate
  const toolScore = toolResults.length > 0 ? successCount / toolResults.length : 0

  // Tool reliability (from registry)
  let avgReliability = 0
  for (const name of Object.keys(evidence)) {
    avgReliability += TOOL_REGISTRY[name]?.reliability ?? 0.5
  }
  avgReliability = Object.keys(evidence).length > 0 ? avgReliability / Object.keys(evidence).length : 0

  // Missing data detection
  const missingData: string[] = []
  if (failCount > 0) {
    for (const [name, result] of Object.entries(evidence)) {
      if (!result.success) {
        missingData.push(`${name} failed: ${result.error}`)
      }
    }
  }

  // Contradiction detection (simplified — would use LLM in production)
  const contradictions: string[] = []
  // Check if answer mentions conflicting evidence
  if (answer.toLowerCase().includes('vendar') || answer.toLowerCase().includes('but') || answer.toLowerCase().includes('conflict')) {
    contradictions.push('Answer contains hedging language — possible conflicting evidence')
  }

  // Freshness
  const hasRealTime = Object.keys(evidence).some(name => TOOL_REGISTRY[name]?.dataFreshness === 'real-time')
  const freshness = hasRealTime ? 'real-time (within seconds)' : 'cached (may be minutes old)'

  // Reasoning quality
  const answerLength = answer.length
  const reasoningQuality = answerLength > 500 ? 'high' : answerLength > 200 ? 'medium' : 'low'

  // Final score
  const score = Math.round(
    (toolScore * 0.3 + avgReliability * 0.3 + (1 - contradictions.length * 0.2) * 0.2 + (1 - missingData.length * 0.15) * 0.2) * 100
  ) / 100

  return {
    score: Math.max(0, Math.min(1, score)),
    evidenceCount: successCount,
    contradictions,
    missingData,
    freshness,
    toolReliability: Math.round(avgReliability * 100) / 100,
    reasoningQuality,
  }
}

// ============================================================================
// Self-Reflection
// ============================================================================
export interface Reflection {
  didIUseEnoughTools: boolean
  didIMissAnything: boolean
  alternativeExplanations: string[]
  additionalToolsNeeded: string[]
  confidenceAssessment: string
  shouldRePlan: boolean
}

export async function reflect(
  question: string,
  plan: PlanStage[],
  evidence: Record<string, ToolResult>,
  answer: string,
): Promise<Reflection> {
  const plannedTools = plan.flatMap(s => s.tools)
  const executedTools = Object.keys(evidence)
  const failedTools = executedTools.filter(name => !evidence[name].success)

  // Did we use enough tools?
  const didIUseEnoughTools = plannedTools.length >= 3 && failedTools.length === 0

  // Did we miss anything?
  const didIMissAnything = failedTools.length > 0

  // Additional tools needed?
  const additionalToolsNeeded: string[] = []
  if (!executedTools.includes('get_station_memory') && (question.includes('zakaj') || question.includes('why'))) {
    additionalToolsNeeded.push('get_station_memory — should check institutional memory for similar past patterns')
  }
  if (!executedTools.includes('get_knowledge') && (question.includes('pravilo') || question.includes('rule'))) {
    additionalToolsNeeded.push('get_knowledge — should check verified rules')
  }

  // Alternative explanations
  const alternativeExplanations: string[] = []
  if (question.includes('zakaj') || question.includes('why')) {
    alternativeExplanations.push('Weather or external events may be a confounding factor')
    alternativeExplanations.push('Technical issues (stream buffering, CDN) could explain listener drop')
  }

  const shouldRePlan = additionalToolsNeeded.length > 0 && failedTools.length === 0

  return {
    didIUseEnoughTools,
    didIMissAnything,
    alternativeExplanations,
    additionalToolsNeeded,
    confidenceAssessment: shouldRePlan
      ? 'Medium — some relevant tools were not called. Consider re-planning.'
      : failedTools.length > 0
        ? 'Low — some tools failed. Evidence incomplete.'
        : 'High — all planned tools succeeded.',
    shouldRePlan,
  }
}

// ============================================================================
// Enhanced Core Think (Planner 2.0)
// ============================================================================
export interface EnhancedCoreResponse {
  // Input
  question: string
  // Intent analysis
  intent: Intent
  // Multi-stage plan
  plan: PlanStage[]
  // Goal alignment
  goals: { current: Goal[]; alignment: ReturnType<typeof checkGoalAlignment> | null }
  // Matching skills
  matchingSkills: Skill[]
  // Tool evidence
  evidence: Record<string, ToolResult>
  // Reasoning
  reasoning: string
  // Answer
  answer: string
  // Confidence
  confidence: ConfidenceScore
  // Self-reflection
  reflection: Reflection
  // Actions
  actions?: any[]
  // Metadata
  provider: string
  model: string
  durationMs: number
  isReal: boolean
}

export async function enhancedCoreThink(question: string): Promise<EnhancedCoreResponse> {
  const startTime = Date.now()

  // 1. INTENT — what is the user asking?
  const intent = analyzeIntent(question)

  // 2. SKILLS — which skills match?
  const matchingSkills = findMatchingSkills(question)

  // 3. PLAN — multi-stage plan with priority
  const plan = createMultiStagePlan(question, intent)

  // 4. GOALS — check alignment
  const goalProgress = getGoalProgress()
  let goalAlignment: ReturnType<typeof checkGoalAlignment> | null = null
  if (intent.type === 'action_request' || intent.type === 'planning') {
    // Check alignment for common actions
    goalAlignment = checkGoalAlignment('optimize_track_selection')
  }

  // 5. EXECUTE — call all tools from all plan stages
  const allTools = plan.flatMap(s => s.tools)
  const evidence = await executeTools(allTools.map(name => ({ name })))

  // 6. REASON — LLM with evidence + memory + goals + skills
  const evidenceText = formatEvidence(evidence)
  const memoryText = formatMemory(MEMORY)
  const goalsText = formatGoals(GOALS)
  const skillsText = matchingSkills.length > 0 ? formatSkills(matchingSkills) : 'No specific skills matched.'

  const systemPrompt = `You are the AI Core of Rock 88.7 FM — the digital program director.

You have access to REAL station data through tools. Use the evidence below.

ARCHITECTURE: You followed this flow: Intent → Plan → Tools → Reasoning → Answer

RULES:
1. Base answers on EVIDENCE, not guesses.
2. Use "correlation" not "causation" for observational data.
3. If evidence is insufficient, say so.
4. Check goals alignment for any recommended action.
5. Respond in user's language.
6. Be concise.

STATION GOALS (check alignment):
${goalsText}

MATCHING SKILLS (procedural knowledge):
${skillsText}

STATION MEMORY:
${memoryText}

TOOL EVIDENCE (real-time data):
${evidenceText}`

  let answer = ''
  let provider = 'fallback'
  let model = 'none'

  try {
    const result = await llmChat({
      systemPrompt,
      messages: [{ role: 'user', content: question }],
    })
    if (result.success && result.content) {
      answer = result.content
      provider = result.provider
      model = result.model
    }
  } catch (e: any) {
    answer = `Error: ${e?.message}. Evidence:\n${evidenceText.slice(0, 500)}`
  }

  // 7. CONFIDENCE — score the answer
  const confidence = calculateConfidence(evidence, answer, plan)

  // 8. REFLECTION — did I miss anything?
  const reflection = await reflect(question, plan, evidence, answer)

  // 9. REMEMBER — update working memory
  MEMORY.working.unshift({
    context: question,
    data: { intent: intent.type, toolsUsed: Object.keys(evidence), confidence: confidence.score },
    timestamp: new Date().toISOString(),
  })
  if (MEMORY.working.length > 20) MEMORY.working.length = 20

  const durationMs = Date.now() - startTime

  return {
    question,
    intent,
    plan,
    goals: { current: GOALS, alignment: goalAlignment },
    matchingSkills,
    evidence,
    reasoning: `Intent: ${intent.type} (urgency: ${intent.urgency}). Plan: ${plan.length} stages, ${allTools.length} tools. Skills matched: ${matchingSkills.length}. Confidence: ${confidence.score}.`,
    answer,
    confidence,
    reflection,
    provider,
    model,
    durationMs,
    isReal: provider !== 'fallback',
  }
}

// ============================================================================
// Formatting helpers
// ============================================================================
function formatEvidence(evidence: Record<string, ToolResult>): string {
  const lines: string[] = []
  for (const [name, result] of Object.entries(evidence)) {
    if (result.success) {
      lines.push(`### ${name} ✅`)
      lines.push(JSON.stringify(result.data, null, 2).slice(0, 600))
    } else {
      lines.push(`### ${name} ❌ (${result.error})`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function formatMemory(memory: any): string {
  const lines: string[] = []
  lines.push('## Semantic Memory')
  for (const f of memory.semantic.slice(0, 5)) {
    lines.push(`- ${f.fact} (${f.confidence})`)
  }
  lines.push('\n## Episode Memory')
  for (const e of memory.episode.slice(0, 3)) {
    lines.push(`- ${e.timestamp}: ${e.event} → ${e.outcome}`)
  }
  lines.push('\n## Procedural Memory')
  for (const p of memory.procedural) {
    lines.push(`- ${p.name}: ${p.steps.join(' → ')}`)
  }
  return lines.join('\n')
}

function formatGoals(goals: Goal[]): string {
  return goals.map(g => `- ${g.name}: ${g.current}/${g.target} ${g.unit} (${g.status}, weight: ${g.weight})`).join('\n')
}

function formatSkills(skills: Skill[]): string {
  return skills.map(s => {
    const steps = s.steps.map(st => `  ${st.step}. ${st.action}`).join('\n')
    return `### ${s.name}\n${s.description}\nSteps:\n${steps}\nGuardrails: ${s.guardrails.join('; ')}`
  }).join('\n\n')
}
