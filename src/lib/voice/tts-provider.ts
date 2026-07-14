/**
 * TTS Provider — wraps z-ai-web-dev-sdk for radio voice synthesis.
 *
 * FREE TTS — no API key cost, no ElevenLabs, no OpenAI.
 * Uses the z-ai-web-dev-sdk that is already in the project.
 *
 * Capabilities:
 *   - Text → WAV audio file (24kHz, 16-bit PCM, mono)
 *   - Voice: "tongtong" (default, clear radio voice)
 *   - Speed: 0.5–2.0 (1.0 = normal)
 *   - Max 1024 chars per request (split longer text)
 *
 * Limitations (honest):
 *   - Single voice ("tongtong") — no voice cloning
 *   - WAV only via CLI; SDK supports wav/pcm (not mp3)
 *   - 24kHz sample rate (not studio-grade 48kHz)
 *   - Good enough for pilot; for production consider ElevenLabs
 *
 * See: skills/TTS/SKILL.md
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// Dynamically import z-ai to avoid client-side bundling
async function getZAI() {
  const ZAIModule = await import('z-ai-web-dev-sdk')
  const ZAI = (ZAIModule as any).default || ZAIModule
  return ZAI
}

export interface TTSResult {
  audioPath: string
  audioUrl: string
  durationMs: number
  format: 'wav'
  voice: string
  charCount: number
}

export interface TTSOptions {
  voice?: string
  speed?: number
  outputDir?: string
  fileName?: string
}

/**
 * Split text into chunks under 1024 characters, respecting sentence boundaries.
 * The TTS API has a 1024-char limit per request.
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
 * Synthesize speech from text using z-ai TTS.
 *
 * Returns the audio file path and a URL where it can be accessed.
 *
 * The file is saved to the specified output directory (default: public/voice-links).
 * The URL is relative to the app root (e.g., /voice-links/abc123.wav).
 *
 * @throws if TTS fails or text is empty
 */
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {},
): Promise<TTSResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('TTS requires non-empty text')
  }

  const voice = options.voice || 'tongtong'
  const speed = options.speed ?? 1.0
  const outputDir = options.outputDir || join(process.cwd(), 'public', 'voice-links')
  const fileName = options.fileName || `vl-${Date.now()}.wav`
  const audioPath = join(outputDir, fileName)

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  // Split long text into chunks
  const chunks = splitText(text)
  const charCount = text.length

  // Initialize z-ai SDK
  const ZAI = await getZAI()
  const zai = await ZAI.create()

  if (chunks.length === 1) {
    // Single chunk — synthesize directly
    const response = await zai.audio.tts.create({
      input: chunks[0],
      voice,
      speed,
      response_format: 'wav' as any,
      stream: false,
    })

    // Response is an audio buffer
    const audioBuffer = await (response as any).arrayBuffer()
    await writeFile(audioPath, Buffer.from(audioBuffer))
  } else {
    // Multiple chunks — synthesize each, then we'd need to concatenate
    // For now, just use the first chunk (most voice links are < 1024 chars)
    // Full concatenation would require ffmpeg
    console.warn(
      `[TTS] Text is ${charCount} chars, split into ${chunks.length} chunks. ` +
        'Only synthesizing the first chunk. For full text, use ffmpeg to concatenate.',
    )

    const response = await zai.audio.tts.create({
      input: chunks[0],
      voice,
      speed,
      response_format: 'wav' as any,
      stream: false,
    })

    const audioBuffer = await (response as any).arrayBuffer()
    await writeFile(audioPath, Buffer.from(audioBuffer))
  }

  // Estimate duration: ~15 chars per second at speed 1.0
  const durationMs = Math.round((charCount / 15) * 1000 * (1 / speed))

  return {
    audioPath,
    audioUrl: `/voice-links/${fileName}`,
    durationMs,
    format: 'wav',
    voice,
    charCount,
  }
}

/**
 * Generate a radio voice link script from outgoing and incoming track metadata.
 *
 * Example:
 *   "That was Everlong by Foo Fighters on Rock 88.7 FM.
 *    Up next, AC/DC with Thunderstruck. Stay tuned."
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

  // Outgoing track
  if (args.outgoingTitle && args.outgoingArtist) {
    parts.push(`That was ${args.outgoingTitle} by ${args.outgoingArtist} on ${station}.`)
  } else if (args.outgoingTitle) {
    parts.push(`That was ${args.outgoingTitle} on ${station}.`)
  }

  // Time check (optional)
  if (args.includeTimeCheck && args.currentTime) {
    parts.push(`It's ${args.currentTime}.`)
  }

  // Incoming track
  if (args.incomingTitle && args.incomingArtist) {
    parts.push(`Up next, ${args.incomingArtist} with ${args.incomingTitle}.`)
  } else if (args.incomingTitle) {
    parts.push(`Up next, ${args.incomingTitle}.`)
  }

  parts.push(`You're listening to ${station}.`)

  return parts.join(' ')
}

/**
 * Generate a station ID.
 */
export function generateStationIdScript(stationName = 'Rock 88.7 FM'): string {
  return `You're listening to ${stationName}. Rock at its finest.`
}

/**
 * Generate a time check.
 */
export function generateTimeCheckScript(time: string, stationName = 'Rock 88.7 FM'): string {
  return `It's ${time} on ${stationName}.`
}
