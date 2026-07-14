/**
 * Unified LLM Provider — tries Puter first, falls back to z-ai-web-dev-sdk, then keyword.
 *
 * Puter: Free OpenAI-compatible API (z-ai/glm-5.1) — requires auth token
 * z-ai-web-dev-sdk: Built-in SDK (glm-4-plus) — no auth needed
 * Fallback: Keyword-based simulation
 *
 * Usage:
 *   import { llmChat } from '@/lib/llm-provider'
 *   const response = await llmChat({
 *     systemPrompt: 'You are a radio assistant',
 *     messages: [{ role: 'user', content: 'Hello' }],
 *   })
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMChatOptions {
  systemPrompt?: string
  messages: LLMMessage[]
  model?: string
  maxTokens?: number
}

export interface LLMChatResult {
  content: string
  provider: 'puter' | 'z-ai-sdk' | 'fallback'
  model: string
  success: boolean
  error?: string
}

const PUTER_ENDPOINT = 'https://api.puter.com/puterai/openai/v1/chat/completions'
const PUTER_MODEL = 'z-ai/glm-5.1'
const ZAI_MODEL = 'glm-4-plus'

/**
 * Try Puter API first (free, OpenAI-compatible, GLM-5.1)
 */
async function tryPuter(opts: LLMChatOptions): Promise<LLMChatResult> {
  const token = process.env.PUTER_AUTH_TOKEN
  if (!token) {
    return { content: '', provider: 'puter', model: PUTER_MODEL, success: false, error: 'No PUTER_AUTH_TOKEN' }
  }

  const messages: LLMMessage[] = []
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt })
  }
  messages.push(...opts.messages)

  const res = await fetch(PUTER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: opts.model ?? PUTER_MODEL,
      messages,
      ...(opts.maxTokens && { max_tokens: opts.maxTokens }),
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error')
    return { content: '', provider: 'puter', model: PUTER_MODEL, success: false, error: `Puter ${res.status}: ${text.slice(0, 200)}` }
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''

  return {
    content,
    provider: 'puter',
    model: data.model ?? PUTER_MODEL,
    success: true,
  }
}

/**
 * Fallback to z-ai-web-dev-sdk (built-in, GLM-4-plus)
 */
async function tryZAISdk(opts: LLMChatOptions): Promise<LLMChatResult> {
  try {
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = ZAIModule.default
    const zai = await ZAI.create()

    const messages: any[] = []
    if (opts.systemPrompt) {
      messages.push({ role: 'assistant', content: opts.systemPrompt })
    }
    for (const msg of opts.messages) {
      messages.push({ role: msg.role === 'system' ? 'assistant' : msg.role, content: msg.content })
    }

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })

    return {
      content: completion.choices[0]?.message?.content ?? '',
      provider: 'z-ai-sdk',
      model: ZAI_MODEL,
      success: true,
    }
  } catch (err: any) {
    return { content: '', provider: 'z-ai-sdk', model: ZAI_MODEL, success: false, error: err?.message ?? 'z-ai-sdk failed' }
  }
}

/**
 * Unified LLM chat — tries Puter → z-ai-sdk → returns error if both fail
 */
export async function llmChat(opts: LLMChatOptions): Promise<LLMChatResult> {
  // 1. Try Puter (free, GLM-5.1)
  const puterResult = await tryPuter(opts).catch((e) => ({
    content: '', provider: 'puter' as const, model: PUTER_MODEL, success: false, error: e?.message,
  }))
  if (puterResult.success && puterResult.content) {
    return puterResult
  }

  // 2. Fallback to z-ai-web-dev-sdk (GLM-4-plus)
  const zaiResult = await tryZAISdk(opts)
  if (zaiResult.success && zaiResult.content) {
    return zaiResult
  }

  // 3. Both failed
  return {
    content: '',
    provider: 'fallback',
    model: 'none',
    success: false,
    error: `Puter: ${puterResult.error} | z-ai-sdk: ${zaiResult.error}`,
  }
}
