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
  provider: 'piper' | 'gtts' | 'zai' | 'pyttsx3'
  providerLabel: string
  language: {
    requested: string
    used: string
    mapped: boolean
    note?: string
  }
  audioProcessing?: string[]
  bedMixed?: boolean
}

export interface TTSOptions {
  voice?: string
  speed?: number
  outputDir?: string
  fileName?: string
  language?: string // ISO 639-1 (en, de, fr, hr, sr, ...)
  provider?: 'piper' | 'gtts' | 'zai' | 'pyttsx3' | 'auto'
  /** Run ffmpeg post-processing (noise reduction, compressor, EQ, loudnorm). Default: true */
  postProcess?: boolean
  /** Path to music bed file for voice-over-music mixing */
  musicBedPath?: string
  /** Music bed volume (0.0-1.0, default 0.15 = quiet background) */
  bedVolume?: number
}

/**
 * Map unsupported languages to their closest supported alternative.
 *
 * gTTS supports 69 languages but NOT Slovenian (sl).
 * Croatian (hr) and Serbian (sr) are linguistically closest to Slovenian
 * and are mutually intelligible for radio purposes.
 */
export const LANGUAGE_FALLBACKS: Record<string, string> = {
  sl: 'hr', // Slovenian → Croatian (closest, mutually intelligible)
}

/**
 * Normalize a language code to a gTTS-supported one.
 * If the language is not supported, fall back to the closest alternative.
 */
export function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase()
  return LANGUAGE_FALLBACKS[lower] || lower
}

/**
 * All Slavic languages supported by gTTS (free, no API key).
 *
 * Slovenian is NOT in this list — use Croatian (hr) as the closest
 * alternative. Croatian and Slovenian share ~80% vocabulary and are
 * mutually intelligible for radio announcements.
 */
export const SUPPORTED_SLAVIC_LANGUAGES = [
  { code: 'hr', name: 'Croatian (Hrvatski)', note: 'Closest to Slovenian' },
  { code: 'sr', name: 'Serbian (Српски)', note: 'Close to Slovenian' },
  { code: 'bs', name: 'Bosnian (Bosanski)' },
  { code: 'cs', name: 'Czech (Čeština)' },
  { code: 'sk', name: 'Slovak (Slovenčina)' },
  { code: 'pl', name: 'Polish (Polski)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'uk', name: 'Ukrainian (Українська)' },
  { code: 'bg', name: 'Bulgarian (Български)' },
] as const

/**
 * Piper TTS voice model paths.
 *
 * Piper uses ONNX voice models downloaded from HuggingFace.
 * Models are stored in /data/piper-voices/ (or PIPER_VOICES_DIR env var).
 *
 * Download models:
 *   mkdir -p /data/piper-voices
 *   cd /data/piper-voices
 *   # English (natural, female)
 *   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx
 *   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json
 *   # Serbian (natural, for Slavic text)
 *   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/sr/sr_RS/serbski_institut/medium/sr_RS-serbski_institut-medium.onnx
 *   curl -LO https://huggingface.co/rhasspy/piper-voices/resolve/main/sr/sr_RS/serbski_institut/medium/sr_RS-serbski_institut-medium.onnx.json
 */
const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR || '/data/piper-voices'

/**
 * Map language codes to Piper voice model filenames.
 */
const PIPER_VOICE_MAP: Record<string, string> = {
  en: 'en_US-lessac-medium.onnx',
  hr: 'sr_RS-serbski_institut-medium.onnx', // Croatian → Serbian (closest Piper voice)
  sr: 'sr_RS-serbski_institut-medium.onnx',
  bs: 'sr_RS-serbski_institut-medium.onnx', // Bosnian → Serbian
  sl: 'sr_RS-serbski_institut-medium.onnx', // Slovenian → Serbian (closest)
}

/**
 * Provider 0: Piper TTS — BEST quality, fully offline, free, neural voice
 *
 * Piper is a fast, local neural TTS system. It produces the most natural-
 * sounding speech of all free TTS engines — comparable to commercial
 * systems like ElevenLabs (though not identical).
 *
 * - 100% offline (no internet needed after model download)
 * - Neural voice quality (not robotic)
 * - Fast (runs on CPU, no GPU needed)
 * - Free and open source (Apache 2.0)
 * - Supports 30+ languages including Serbian (for Slavic text)
 *
 * Requires: pip install piper-tts
 * Requires: voice models downloaded to PIPER_VOICES_DIR
 */
async function synthesizeWithPiper(
  text: string,
  outputPath: string,
  language: string = 'en',
): Promise<void> {
  const voiceModel = PIPER_VOICE_MAP[language] || PIPER_VOICE_MAP['en']
  const modelPath = join(PIPER_VOICES_DIR, voiceModel)

  // Check if model exists
  if (!existsSync(modelPath)) {
    throw new Error(
      `Piper voice model not found: ${modelPath}. ` +
        `Download from https://huggingface.co/rhasspy/piper-voices ` +
        `or set PIPER_VOICES_DIR env var.`,
    )
  }

  // Piper reads text from stdin, writes WAV to output file
  await execAsync(`echo "${text.replace(/"/g, '\\"')}" | piper -m "${modelPath}" -f "${outputPath}"`)
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
 *
 * Supports 69 languages including:
 *   Slavic: hr (Croatian), sr (Serbian), bs (Bosnian), cs (Czech),
 *           sk (Slovak), pl (Polish), ru (Russian), uk (Ukrainian), bg (Bulgarian)
 *
 * NOTE: Slovenian (sl) is NOT supported by gTTS.
 * For Slovenian text, use 'hr' (Croatian) or 'sr' (Serbian) — they are
 * linguistically close and mutually intelligible for radio purposes.
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

  const speed = options.speed ?? 1.0
  const outputDir = options.outputDir || join(process.cwd(), 'public', 'voice-links')
  const fileName = options.fileName || `vl-${Date.now()}.wav`
  const audioPath = join(outputDir, fileName)
  const requestedProvider = options.provider || 'auto'

  // Normalize language — Slovenian (sl) falls back to Croatian (hr)
  const rawLanguage = options.language || 'en'
  const language = normalizeLanguage(rawLanguage)
  const languageWasMapped = rawLanguage !== language

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }

  const charCount = text.length
  const errors: string[] = []

  // Provider chain — best quality first
  const providers: Array<{
    id: 'piper' | 'gtts' | 'zai' | 'pyttsx3'
    label: string
    run: () => Promise<void>
    skip?: boolean
  }> = [
    {
      id: 'piper',
      label: 'Piper TTS (BEST — neural, offline, natural human voice)',
      run: () => synthesizeWithPiper(text, audioPath, language),
      skip: requestedProvider !== 'auto' && requestedProvider !== 'piper',
    },
    {
      id: 'gtts',
      label: 'Google Translate TTS (natural, free, online)',
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

  // Post-process the audio with ffmpeg (noise reduction, compressor, EQ, loudnorm)
  // This makes TTS sound professional — closes the "audio production quality" gap for free.
  let processedAudioPath = audioPath
  let processedAudioUrl = `/voice-links/${fileName}`
  const processing: string[] = []
  let bedMixed = false

  if (options.postProcess !== false) {
    try {
      const { processAudio } = await import('./audio-processor')
      const processed = await processAudio(audioPath, {
        noiseReduction: true,
        compressor: true,
        eq: true,
        loudnessNormalize: true,
        musicBedPath: options.musicBedPath,
        bedVolume: options.bedVolume ?? 0.15,
        outputDir,
        fileName: `processed-${fileName}`,
      })
      processedAudioPath = processed.outputPath
      processedAudioUrl = processed.outputUrl
      processing.push(...processed.processing)
      bedMixed = processed.bedMixed
    } catch {
      // If post-processing fails, use the raw TTS output
      processing.push('post-processing skipped (ffmpeg error)')
    }
  }

  return {
    audioPath: processedAudioPath,
    audioUrl: processedAudioUrl,
    durationMs,
    format: 'wav',
    voice:
      usedProvider === 'piper' ? `piper-${language}` :
      usedProvider === 'gtts' ? `google-${language}` :
      usedProvider === 'zai' ? 'tongtong' : 'system',
    charCount,
    provider: usedProvider,
    providerLabel: usedLabel,
    language: {
      requested: rawLanguage,
      used: language,
      mapped: languageWasMapped,
      note: languageWasMapped
        ? `${rawLanguage} not supported by gTTS — used ${language} (closest Slavic language)`
        : undefined,
    },
    audioProcessing: processing,
    bedMixed,
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
