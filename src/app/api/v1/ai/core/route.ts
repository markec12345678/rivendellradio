import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * AI Core API — enotni možgani radijske postaje.
 *
 * Arhitektura: Question → Plan → Tool Calls → Reasoning → Evidence → Answer → Actions
 *
 * Memory System:
 *   - Working Memory: trenutni kontekst
 *   - Semantic Memory: dejstva ("Foo Fighters dobro delujejo 7:00-8:00")
 *   - Episode Memory: dogodki ("12.7.2026 ob 7:12 predvajali Everlong, ALT +2.3")
 *   - Procedural Memory: procedure ("morning show = news → weather → traffic → hit → jingle")
 *
 * Tool Calling (MCP-style):
 *   AI ne ugiba. Vpraša orodje. Orodje vrne dejanske podatke.
 *
 * Action Engine:
 *   AI ne le svetuje. Lahko varno izvede dovoljene akcije.
 *   Safe actions: log, record, generate hypothesis
 *   Approval actions: change playlist, move ads, add jingle, start experiment
 *
 * GET /api/v1/ai/core — AI Core status + memory + available tools
 * POST /api/v1/ai/core — Ask AI Core a question (with tool calling)
 */

export async function GET() {
  const { MEMORY, TOOL_DESCRIPTIONS } = await import('@/lib/ai-core')

  return NextResponse.json({
    _disclaimer: '✅ REAL LLM + REAL TOOLS — AI Core uses Puter GLM-5.1 (or z-ai-sdk fallback) with real station data from tool calls. Memory is in-memory demonstration. Tool evidence is real (fetched from live APIs).',
    architecture: {
      flow: 'Question → Plan → Tool Calls → Reasoning → Evidence → Answer → Actions',
      functions: ['Think()', 'Plan()', 'Execute()', 'Learn()', 'Remember()', 'Explain()'],
      llm: 'Puter GLM-5.1 (primary) → z-ai-sdk GLM-4-plus (fallback) → keyword (last resort)',
    },
    memory: {
      working: MEMORY.working.slice(0, 5),
      semantic: MEMORY.semantic,
      episode: MEMORY.episode,
      procedural: MEMORY.procedural,
    },
    availableTools: TOOL_DESCRIPTIONS,
    actionEngine: {
      safeActions: ['log_to_journal', 'record_observation', 'generate_hypothesis', 'update_working_memory'],
      approvalActions: ['change_playlist', 'move_ad_break', 'add_jingle', 'generate_voice_track', 'start_ab_experiment', 'override_brain_decision'],
      principle: 'AI can execute safe actions immediately. Destructive actions require human approval.',
    },
    usage: {
      ask: 'POST /api/v1/ai/core { "question": "Zakaj je ALT padel?" }',
      response: 'Returns: plan, evidence (tool results), reasoning, answer, actions, memory updates',
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const question = body.question

  if (!question) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const { coreThink } = await import('@/lib/ai-core')
  const response = await coreThink(question)

  return NextResponse.json({
    ok: true,
    ...response,
    message: response.isReal
      ? `🧠 AI Core answered via ${response.provider} (${response.model}) using ${response.toolCallCount} tools`
      : '⚠️ AI Core answered with fallback (LLM unavailable) — tool evidence still real',
  })
}
