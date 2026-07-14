/**
 * TTS Provider — multi-provider voice synthesis for radio.
 *
 * FREE TTS — no API key cost, no ElevenLabs, no OpenAI.
 *
 * Provider priority (best quality first):
 *   1. gTTS (Google Translate TTS) — most natural, free, no API key
 *      - Requires internet (calls Google Translate endpoint)
 *      - Supports many languages (en, de, fr, es, it, ...)
 *      - MP3 output, converted to WAV via ffmpeg
 *      - Quality: high (Google neural voice)
 *
 *   2. z-ai TTS (tongtong) — fallback, always available
 *      - No internet dependency (uses SDK)
 *      - Single voice ("tongtong")
 *      - WAV output, 24kHz
 *      - Quality: medium (clear but robotic)
 *
 *   3. pyttsx3 (offline) — last resort, no internet needed
 *      - Uses system espeak engine
 *      - Quality: low (robotic)
 *      - Always works, even offline
 *
 * The system automatically tries gTTS first, falls back to z-ai, then pyttsx3.
 * Each provider's results are tagged in the response so the operator knows
 * which voice was used.
 *
 * See: skills/TTS/SKILL.md
 */

import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface TTSResult {
  audioPath: string
  audioUrl: string
  durationMs: number
  format: 'wav'
  voice: string
  charCount: number
  provider: 'gtts' | 'zai' | 'pyttsx3'
  providerLabel: string
}

export interface TTSOptions {
  voice?: string
  speed?: number
  outputDir?: string
  fileName?: string
  language?: string // ISO 639-1 (en, de, fr, ...)
  provider?: 'gtts' | 'zai' | 'pyttsx3' | 'auto'
}

/**
 * Split text into chunks under 1024 characters, respecting sentence boundaries.
 */
export function splitText(text: string, maxLength = 1000): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  let currentChunk = ''
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())

  return chunks
}

/**
 * Provider 1: gTTS (Google Translate TTS)
 *
 * Most natural free TTS. Calls Google Translate's TTS endpoint.
 * No API key required. Returns MP3, converted to WAV via ffmpeg.
 */
async function synthesizeWithGTTS(
  text: string,
  outputPath: string,
  language: string = 'en',
): Promise<void> {
  // Write a Python script that uses gTTS
  const script = `
from gtts import gTTS
import sys
text = sys.argv[1]
output = sys.argv[2]
lang = sys.argv[3] or 'en'
tts = gTTS(text=text, lang=lang, slow=False)
tts.save(output)
`

  const scriptPath = '/tmp/gtts-script.py'
  await writeFile(scriptPath, script)

  // gTTS saves as MP3, we need to convert to WAV
  const mp3Path = outputPath.replace('.wav', '.mp3')

  try {
    await execAsync(`python3 ${scriptPath} "${text.replace(/"/g, '\\"')}" "${mp3Path}" "${language}"`)

    // Convert MP3 to WAV using ffmpeg
    await execAsync(
      `ffmpeg -y -i "${mp3Path}" -ar 44100 -ac 1 -acodec pcm_s16le "${outputPath}" 2>/dev/null`,
    )
  } finally {
    // Clean up MP3
    try {
      await execAsync(`rm -f "${mp3Path}"`)
    } catch {}
  }
}

/**
 * Provider 2: z-ai TTS (tongtong voice)
 *
 * Uses the z-ai-web-dev-sdk that is already in the project.
 * No internet dependency beyond the SDK's own API.
 */
async function synthesizeWithZAI(
  text: string,
  outputPath: string,
  voice: string = 'tongtong',
  speed: number = 1.0,
): Promise<void> {
  const ZAIModule = await import('z-ai-web-dev-sdk')
  const ZAI = (ZAIModule as any).default || ZAIModule
  const zai = await ZAI.create()

  const response = await zai.audio.tts.create({
    input: text,
    voice,
    speed,
    response_format: 'wav' as any,
    stream: false,
  })

  const audioBuffer = await (response as any).arrayBuffer()
  await writeFile(outputPath, Buffer.from(audioBuffer))
}

/**
 * Provider 3: pyttsx3 (offline, system voice)
 *
 * Uses the system's TTS engine (espeak on Linux). Always works, even offline.
 * Quality is lower (robotic) but reliable.
 */
async function synthesizeWithPyttsx3(
  text: string,
  outputPath: string,
): Promise<void> {
  const script = `
import pyttsx3
engine = pyttsx3.init()
engine.save_to_file("""${text.replace(/"/g, '\\"').replace(/\n/g, ' ')}""", "${outputPath}")
engine.runAndWait()
`
  const scriptPath = '/tmp/pyttsx3-script.py'
  await writeFile(scriptPath, script)
  await execAsync(`python3 ${scriptPath}`)
}

/**
 * Synthesize speech using the best available provider.
 *
 * Tries providers in order: gTTS → z-ai → pyttsx3
 * Returns the first successful result.
 */
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {},
): Promise<TTSResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('TTS requires non-empty text')
  }

  const language = options.language || 'en'
  const speed = options.speed ?? 1.0
  const outputDir = options.outputDir || join(process.cwd(), 'public', 'voice-links')
  const fileName = options.fileName || `vl-${Date.now()}.wav`
  const audioPath = join(outputDir, fileName)
  const requestedProvider = options.provider || 'auto'

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  const charCount = text.length
  const errors: string[] = []

  // Provider chain
  const providers: Array<{
    id: 'gtts' | 'zai' | 'pyttsx3'
    label: string
    run: () => Promise<void>
    skip?: boolean
  }> = [
    {
      id: 'gtts',
      label: 'Google Translate TTS (most natural, free)',
      run: () => synthesizeWithGTTS(text, audioPath, language),
      skip: requestedProvider !== 'auto' && requestedProvider !== 'gtts',
    },
    {
      id: 'zai',
      label: 'z-ai TTS — tongtong voice (clear, free)',
      run: () => synthesizeWithZAI(text, audioPath, 'tongtong', speed),
      skip: requestedProvider !== 'auto' && requestedProvider !== 'zai',
    },
    {
      id: 'pyttsx3',
      label: 'pyttsx3 (offline, system voice, robotic)',
      run: () => synthesizeWithPyttsx3(text, audioPath),
      skip: requestedProvider !== 'auto' && requestedProvider !== 'pyttsx3',
    },
  ]

  let usedProvider: TTSResult['provider'] | null = null
  let usedLabel = ''

  for (const provider of providers) {
    if (provider.skip) continue
    try {
      await provider.run()
      // Verify file was created and is non-empty
      const { stat } = await import('fs/promises')
      const stats = await stat(audioPath)
      if (stats.size > 0) {
        usedProvider = provider.id
        usedLabel = provider.label
        break
      }
    } catch (err) {
      errors.push(`${provider.id}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }

  if (!usedProvider) {
    throw new Error(`All TTS providers failed: ${errors.join('; ')}`)
  }

  // Get duration from the audio file
  let durationMs = Math.round((charCount / 15) * 1000 * (1 / speed))
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
    )
    const dur = parseFloat(stdout.trim())
    if (!isNaN(dur) && dur > 0) {
      durationMs = Math.round(dur * 1000)
    }
  } catch {}

  return {
    audioPath,
    audioUrl: `/voice-links/${fileName}`,
    durationMs,
    format: 'wav',
    voice: usedProvider === 'gtts' ? `google-${language}` : usedProvider === 'zai' ? 'tongtong' : 'system',
    charCount,
    provider: usedProvider,
    providerLabel: usedLabel,
  }
}

/**
 * Generate a radio voice link script from outgoing and incoming track metadata.
 */
export function generateVoiceLinkScript(args: {
  outgoingTitle?: string
  outgoingArtist?: string
  incomingTitle?: string
  incomingArtist?: string
  stationName?: string
  includeTimeCheck?: boolean
  currentTime?: string
}): string {
  const station = args.stationName || 'Rock 88.7 FM'
  const parts: string[] = []

  if (args.outgoingTitle && args.outgoingArtist) {
    parts.push(`That was ${args.outgoingTitle} by ${args.outgoingArtist} on ${station}.`)
  } else if (args.outgoingTitle) {
    parts.push(`That was ${args.outgoingTitle} on ${station}.`)
  }

  if (args.includeTimeCheck && args.currentTime) {
    parts.push(`It's ${args.currentTime}.`)
  }

  if (args.incomingTitle && args.incomingArtist) {
    parts.push(`Up next, ${args.incomingArtist} with ${args.incomingTitle}.`)
  } else if (args.incomingTitle) {
    parts.push(`Up next, ${args.incomingTitle}.`)
  }

  parts.push(`You're listening to ${station}.`)

  return parts.join(' ')
}

export function generateStationIdScript(stationName = 'Rock 88.7 FM'): string {
  return `You're listening to ${stationName}. Rock at its finest.`
}

export function generateTimeCheckScript(time: string, stationName = 'Rock 88.7 FM'): string {
  return `It's ${time} on ${stationName}.`
}
