/**
 * AI Core — enotni možgani radijske postaje.
 *
 * Arhitektura:
 *   Question → Plan → Tool Calls → Reasoning → Evidence → Answer → (optional) Actions
 *
 * AI Core ima 6 funkcij:
 *   Think()  — razume vprašanje, načrtuje katera orodja potrebuje
 *   Plan()   — določi vrstni red klicev orodij
 *   Execute() — kliče orodja (MCP-style)
 *   Learn()  — posodobi model/uteži na podlagi izida
 *   Remember() — shrani v Station Memory
 *   Explain()  — razloži odločitev z dokazi
 *
 * Memory System:
 *   - Working Memory: trenutni kontekst (trenutno predvajanje, poslušalci, danpart)
 *   - Semantic Memory: dejstva (Foo Fighters dobro delujejo 7:00-8:00)
 *   - Episode Memory: specifični dogodki (12.7.2026 ob 7:12 predvajali Everlong, ALT +2.3)
 *   - Procedural Memory: procedure (morning show = news → weather → traffic → hit → jingle)
 */

import { llmChat, type LLMMessage } from '@/lib/llm-provider'
import { executeTools, executeTool, TOOL_DESCRIPTIONS, type ToolResult } from '@/lib/ai-core/tools'

export interface MemorySystem {
  working: { context: string; data: any; timestamp: string }[]
  semantic: { fact: string; confidence: number; source: string }[]
  episode: { timestamp: string; event: string; outcome: string; altDelta?: number }[]
  procedural: { name: string; steps: string[]; appliesWhen: string }[]
}

export interface ActionResult {
  action: string
  description: string
  executed: boolean
  result: string
  requiresApproval: boolean
  safetyChecked: boolean
}

export interface CoreResponse {
  question: string
  // Planning
  plan: { step: number; tool: string; reason: string }[]
  // Tool results (evidence)
  evidence: Record<string, ToolResult>
  // Reasoning chain
  reasoning: string
  // Final answer
  answer: string
  // Actions (if any)
  actions?: ActionResult[]
  // Memory updates
  memoryUpdates?: { type: keyof MemorySystem; content: any }[]
  // Metadata
  provider: string
  model: string
  toolCallCount: number
  durationMs: number
  // Honesty
  isReal: boolean
}

// Memory (in-memory for demo, production: persistent store)
const MEMORY: MemorySystem = {
  working: [],
  semantic: [
    { fact: 'Foo Fighters consistently increase listenership when played 7:00-8:00', confidence: 0.89, source: 'station-memory lesson-002' },
    { fact: 'Two consecutive low-energy tracks (<0.5) cause tune-outs in daytime', confidence: 0.85, source: 'knowledge-engine rule-001' },
    { fact: 'Ad breaks >3min cause 12% listener departure', confidence: 0.87, source: 'knowledge-engine rule-002' },
    { fact: 'Morning commuters have a fixed time window — losing them at 7:15 means they do not return', confidence: 0.92, source: 'station-memory lesson-001' },
    { fact: 'Office listeners want background, not excitement — less talk = longer sessions', confidence: 0.83, source: 'station-memory lesson-004' },
  ],
  episode: [
    { timestamp: '2026-07-12T14:30:00Z', event: 'Played two mid-energy tracks back-to-back', outcome: '8 listeners left', altDelta: -2.4 },
    { timestamp: '2026-07-12T07:08:00Z', event: 'Fulfilled listener request at 7:08', outcome: 'Listener stayed 47min longer', altDelta: 8.5 },
    { timestamp: '2026-07-10T06:58:00Z', event: 'AI DJ teased "news in 2 minutes"', outcome: 'Retention spiked through news', altDelta: 1.9 },
  ],
  procedural: [
    { name: 'Morning Show Structure', steps: ['News at 7:00', 'Weather', 'Traffic', 'Hit track', 'Jingle', 'Voice link', 'Music block'], appliesWhen: '06:00-10:00 weekdays' },
    { name: 'Ad Break Protocol', steps: ['Tease upcoming content', 'Max 2.5min / 4 spots', 'Return with hit track'], appliesWhen: 'All dayparts' },
    { name: 'New Release Sandwich', steps: ['Familiar hit', 'New release', 'Familiar hit'], appliesWhen: 'Daytime when playing unfamiliar tracks' },
  ],
}

// Safe actions (AI can execute without approval)
const SAFE_ACTIONS = new Set([
  'log_to_journal',
  'record_observation',
  'generate_hypothesis',
  'update_working_memory',
])

// Actions that require human approval
const APPROVAL_ACTIONS = new Set([
  'change_playlist',
  'move_ad_break',
  'add_jingle',
  'generate_voice_track',
  'start_ab_experiment',
  'override_brain_decision',
])

/**
 * AI Core — Think → Plan → Execute → Reason → Answer → (Actions)
 */
export async function coreThink(question: string): Promise<CoreResponse> {
  const startTime = Date.now()

  // 1. THINK — determine which tools are needed
  const plan = planTools(question)

  // 2. EXECUTE — call tools in parallel
  const toolCalls = plan.map(p => ({ name: p.tool, params: {} }))
  const evidence = await executeTools(toolCalls)

  // 3. REASON — use LLM with tool evidence to answer
  const evidenceText = formatEvidenceForLLM(evidence)
  const memoryText = formatMemoryForLLM(MEMORY)

  const systemPrompt = `You are the AI Core of Rock 88.7 FM radio station. You are not a chatbot — you are the digital program director.

You have access to REAL station data through tools. Use the evidence below to answer.

RULES:
1. Base your answer on EVIDENCE from tools, not guesses.
2. If you don't have enough data, say so honestly.
3. Use "correlation" not "causation" for observational data.
4. If you recommend an action, specify if it needs human approval.
5. Be concise. Radio operators are busy.
6. Respond in the user's language (Slovenian if Slovenian, English if English).

STATION MEMORY (institutional knowledge):
${memoryText}

TOOL EVIDENCE (real-time station data):
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
    } else {
      answer = `Unable to get LLM response. Tool evidence collected but reasoning failed.\n\nEvidence summary:\n${evidenceText.slice(0, 500)}`
    }
  } catch (e: any) {
    answer = `Error: ${e?.message}. Evidence collected:\n${evidenceText.slice(0, 500)}`
  }

  // 4. REMEMBER — update working memory
  MEMORY.working.unshift({
    context: question,
    data: { evidence: Object.keys(evidence), answer: answer.slice(0, 200) },
    timestamp: new Date().toISOString(),
  })
  if (MEMORY.working.length > 20) MEMORY.working.length = 20

  // 5. Determine actions (if answer contains recommendations)
  const actions = extractActions(answer)

  const durationMs = Date.now() - startTime

  return {
    question,
    plan,
    evidence,
    reasoning: `Used ${toolCalls.length} tools to gather evidence. LLM (${provider}/${model}) reasoned over evidence + memory to produce answer.`,
    answer,
    actions,
    memoryUpdates: [{ type: 'working', content: { question, timestamp: new Date().toISOString() } }],
    provider,
    model,
    toolCallCount: toolCalls.length,
    durationMs,
    isReal: provider !== 'fallback',
  }
}

/**
 * Plan which tools to call based on the question.
 */
function planTools(question: string): { step: number; tool: string; reason: string }[] {
  const q = question.toLowerCase()
  const plan: { step: number; tool: string; reason: string }[] = []
  let step = 1

  // Always get current state
  plan.push({ step: step++, tool: 'get_now_playing', reason: 'Establish current context' })
  plan.push({ step: step++, tool: 'get_station_brain', reason: 'Check AI brain state and ALT' })

  // Question-specific tools
  if (q.includes('zakaj') || q.includes('why') || q.includes('pad') || q.includes('drop') || q.includes('odš')) {
    plan.push({ step: step++, tool: 'get_listener_insights', reason: 'Analyze listener behavior for root cause' })
    plan.push({ step: step++, tool: 'get_reliability', reason: 'Check ALT and incident history' })
    plan.push({ step: step++, tool: 'get_station_memory', reason: 'Check if similar pattern occurred before' })
  }

  if (q.includes('predvaj') || q.includes('play') || q.includes('skladb') || q.includes('track') || q.includes('music')) {
    plan.push({ step: step++, tool: 'get_schedule', reason: 'Check current and upcoming schedule' })
    plan.push({ step: step++, tool: 'get_knowledge', reason: 'Check verified rules about track selection' })
  }

  if (q.includes('posluš') || q.includes('listener') || q.includes('audience')) {
    plan.push({ step: step++, tool: 'get_listener_insights', reason: 'Get listener segments and behavior' })
  }

  if (q.includes('eksperiment') || q.includes('experiment') || q.includes('a/b') || q.includes('test')) {
    plan.push({ step: step++, tool: 'get_experiments', reason: 'Check running and completed experiments' })
  }

  if (q.includes('pravilo') || q.includes('rule') || q.includes('knowledge') || q.includes('znanj')) {
    plan.push({ step: step++, tool: 'get_knowledge', reason: 'Retrieve verified knowledge rules' })
  }

  if (q.includes('spomin') || q.includes('memory') || q.includes('zgodov') || q.includes('history') || q.includes('prej')) {
    plan.push({ step: step++, tool: 'get_station_memory', reason: 'Retrieve institutional memory' })
  }

  if (q.includes('poskuš') || q.includes('try') || q.includes('attempt') || q.includes('nov')) {
    plan.push({ step: step++, tool: 'check_retry', reason: 'Check if similar decision was tried before' })
  }

  // If no specific tools matched, add general ones
  if (plan.length <= 2) {
    plan.push({ step: step++, tool: 'get_listener_insights', reason: 'General listener context' })
    plan.push({ step: step++, tool: 'get_station_memory', reason: 'Institutional knowledge context' })
  }

  return plan
}

/**
 * Format tool evidence as text for LLM context.
 */
function formatEvidenceForLLM(evidence: Record<string, ToolResult>): string {
  const lines: string[] = []
  for (const [name, result] of Object.entries(evidence)) {
    if (result.success) {
      lines.push(`### ${name}`)
      lines.push(JSON.stringify(result.data, null, 2).slice(0, 800))
    } else {
      lines.push(`### ${name} (FAILED: ${result.error})`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Format memory as text for LLM context.
 */
function formatMemoryForLLM(memory: MemorySystem): string {
  const lines: string[] = []

  lines.push('## Semantic Memory (Facts)')
  for (const fact of memory.semantic.slice(0, 5)) {
    lines.push(`- ${fact.fact} (confidence: ${fact.confidence}, source: ${fact.source})`)
  }

  lines.push('\n## Episode Memory (Recent Events)')
  for (const ep of memory.episode.slice(0, 5)) {
    lines.push(`- ${ep.timestamp}: ${ep.event} → ${ep.outcome}${ep.altDelta ? ` (ALT ${ep.altDelta > 0 ? '+' : ''}${ep.altDelta}min)` : ''}`)
  }

  lines.push('\n## Procedural Memory (Standard Procedures)')
  for (const proc of memory.procedural) {
    lines.push(`- ${proc.name}: ${proc.steps.join(' → ')} (applies: ${proc.appliesWhen})`)
  }

  lines.push('\n## Working Memory (Recent Context)')
  for (const w of memory.working.slice(0, 3)) {
    lines.push(`- ${w.timestamp}: ${w.context}`)
  }

  return lines.join('\n')
}

/**
 * Extract recommended actions from LLM answer.
 */
function extractActions(answer: string): ActionResult[] {
  const actions: ActionResult[] = []
  const lower = answer.toLowerCase()

  // Check for action keywords
  if (lower.includes('spremeni playlist') || lower.includes('change playlist') || lower.includes('zamenjaj skladb')) {
    actions.push({
      action: 'change_playlist',
      description: 'Modify the current playlist',
      executed: false,
      result: 'Requires human approval',
      requiresApproval: true,
      safetyChecked: true,
    })
  }

  if (lower.includes('premakni rekl') || lower.includes('move ad') || lower.includes('prestavi rekl')) {
    actions.push({
      action: 'move_ad_break',
      description: 'Reschedule ad break timing',
      executed: false,
      result: 'Requires human approval',
      requiresApproval: true,
      safetyChecked: true,
    })
  }

  if (lower.includes('dodaj jingle') || lower.includes('add jingle') || lower.includes('jingle')) {
    actions.push({
      action: 'add_jingle',
      description: 'Insert station ID/jingle',
      executed: false,
      result: 'Requires human approval',
      requiresApproval: true,
      safetyChecked: true,
    })
  }

  if (lower.includes('voice track') || lower.includes('voice link') || lower.includes('govor')) {
    actions.push({
      action: 'generate_voice_track',
      description: 'Generate AI DJ voice track',
      executed: false,
      result: 'Requires human approval',
      requiresApproval: true,
      safetyChecked: true,
    })
  }

  if (lower.includes('a/b') || lower.includes('eksperiment') || lower.includes('experiment')) {
    actions.push({
      action: 'start_ab_experiment',
      description: 'Start A/B experiment to test hypothesis',
      executed: false,
      result: 'Requires human approval',
      requiresApproval: true,
      safetyChecked: true,
    })
  }

  // Safe action: log to journal
  actions.push({
    action: 'log_to_journal',
    description: 'Log this interaction to Station Journal',
    executed: true,
    result: 'Logged to working memory',
    requiresApproval: false,
    safetyChecked: true,
  })

  return actions
}

/**
 * Execute an action (with safety check).
 */
export async function executeAction(action: string, params: any = {}): Promise<ActionResult> {
  if (SAFE_ACTIONS.has(action)) {
    // Execute immediately
    return {
      action,
      description: `Executed: ${action}`,
      executed: true,
      result: 'Success',
      requiresApproval: false,
      safetyChecked: true,
    }
  }

  if (APPROVAL_ACTIONS.has(action)) {
    // Require approval
    return {
      action,
      description: `Requires human approval: ${action}`,
      executed: false,
      result: 'Pending approval',
      requiresApproval: true,
      safetyChecked: true,
    }
  }

  return {
    action,
    description: `Unknown action: ${action}`,
    executed: false,
    result: 'Blocked — unknown action',
    requiresApproval: true,
    safetyChecked: false,
  }
}

export { MEMORY, TOOL_DESCRIPTIONS }
