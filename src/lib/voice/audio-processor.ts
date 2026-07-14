/**
 * Audio Processor — ffmpeg-based post-processing for TTS audio.
 *
 * Makes TTS voice tracks sound professional:
 *   1. Noise reduction (high-pass filter removes low rumble)
 *   2. Compressor (evens out volume, professional radio sound)
 *   3. EQ (enhances voice clarity, cuts muddy frequencies)
 *   4. Loudness normalization (EBU R128 -23 LUFS, broadcast standard)
 *   5. Music bed mixing (overlays voice on a music bed for professional sound)
 *
 * All processing uses ffmpeg — free, no API key, no external service.
 *
 * This closes the "audio production quality" and "music bed" gaps from
 * the weakness analysis — for free.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export interface ProcessedAudio {
  outputPath: string
  outputUrl: string
  durationMs: number
  processing: string[]
  bedMixed: boolean
}

export interface ProcessingOptions {
  /** Apply noise reduction (high-pass filter at 80Hz) */
  noiseReduction?: boolean
  /** Apply compressor (radio-style compression) */
  compressor?: boolean
  /** Apply EQ (voice enhancement) */
  eq?: boolean
  /** Apply loudness normalization (EBU R128 -23 LUFS) */
  loudnessNormalize?: boolean
  /** Path to music bed file (if mixing voice over music) */
  musicBedPath?: string
  /** Music bed volume (0.0-1.0, default 0.15 = quiet background) */
  bedVolume?: number
  /** Output directory */
  outputDir?: string
  /** Output filename */
  fileName?: string
}

/**
 * Process a raw TTS audio file through the professional audio pipeline.
 *
 * Pipeline (all steps use ffmpeg, all free):
 *   1. High-pass filter (removes low-frequency rumble below 80Hz)
 *   2. Compressor (evens out dynamics, -20dB threshold, 3:1 ratio)
 *   3. EQ (boost 2-4kHz for voice clarity, cut 200-400Hz for warmth)
 *   4. Loudness normalization (EBU R128 -23 LUFS, broadcast standard)
 *
 * If a music bed is provided:
 *   5. Mix voice track over the music bed at specified volume
 *   6. Apply fade in/out on the music bed
 *
 * Returns the path to the processed audio file.
 */
export async function processAudio(
  inputPath: string,
  options: ProcessingOptions = {},
): Promise<ProcessedAudio> {
  if (!existsSync(inputPath)) {
    throw new Error(`Input audio not found: ${inputPath}`)
  }

  const {
    noiseReduction = true,
    compressor = true,
    eq = true,
    loudnessNormalize = true,
    musicBedPath,
    bedVolume = 0.15,
    outputDir,
    fileName,
  } = options

  const dir = outputDir || join(process.cwd(), 'public', 'voice-links')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  const baseName = fileName || `processed-${Date.now()}.wav`
  const outputPath = join(dir, baseName)
  const outputUrl = `/voice-links/${baseName}`

  const processing: string[] = []
  const tempFiles: string[] = []
  let currentFile = inputPath

  // Step 1: Noise reduction (high-pass filter)
  if (noiseReduction) {
    const tempPath = join(dir, `temp-hp-${Date.now()}.wav`)
    const filter = 'highpass=f=80' // Remove below 80Hz (rumble, hum)
    await execAsync(`ffmpeg -y -i "${currentFile}" -af "${filter}" -ar 44100 -ac 1 "${tempPath}" 2>/dev/null`)
    tempFiles.push(tempPath)
    currentFile = tempPath
    processing.push('high-pass filter (80Hz)')
  }

  // Step 2: Compressor (radio-style)
  if (compressor) {
    const tempPath = join(dir, `temp-comp-${Date.now()}.wav`)
    // acompressor: threshold=-20dB, ratio=3:1, attack=5ms, release=50ms
    const filter = 'acompressor=threshold=-20dB:ratio=3:attack=5:release=50:makeup=2'
    await execAsync(`ffmpeg -y -i "${currentFile}" -af "${filter}" "${tempPath}" 2>/dev/null`)
    tempFiles.push(tempPath)
    currentFile = tempPath
    processing.push('compressor (-20dB, 3:1)')
  }

  // Step 3: EQ (voice enhancement)
  if (eq) {
    const tempPath = join(dir, `temp-eq-${Date.now()}.wav`)
    // Boost 3kHz (voice clarity), cut 300Hz (reduce muddiness)
    const filter = 'equalizer=f=3000:t=q:w=1:g=3,equalizer=f=300:t=q:w=1:g=-2'
    await execAsync(`ffmpeg -y -i "${currentFile}" -af "${filter}" "${tempPath}" 2>/dev/null`)
    tempFiles.push(tempPath)
    currentFile = tempPath
    processing.push('EQ (+3kHz clarity, -300Hz mud)')
  }

  // Step 4: Loudness normalization (EBU R128)
  if (loudnessNormalize) {
    const tempPath = join(dir, `temp-loud-${Date.now()}.wav`)
    // loudnorm: EBU R128 compliant, target -23 LUFS
    const filter = 'loudnorm=I=-23:TP=-1.5:LRA=11'
    await execAsync(`ffmpeg -y -i "${currentFile}" -af "${filter}" "${tempPath}" 2>/dev/null`)
    tempFiles.push(tempPath)
    currentFile = tempPath
    processing.push('loudness normalize (-23 LUFS, EBU R128)')
  }

  // Step 5: Music bed mixing (if bed provided)
  let bedMixed = false
  if (musicBedPath && existsSync(musicBedPath)) {
    // Get duration of voice track
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${currentFile}"`,
    )
    const voiceDuration = parseFloat(stdout.trim())

    // Mix voice over music bed:
    //   - Music bed at bedVolume (default 0.15 = -16dB, quiet background)
    //   - Voice at full volume (1.0)
    //   - Bed fades in at start, fades out at end
    //   - Bed is trimmed to match voice duration
    const bedFilter = `[1:a]atrim=0:${voiceDuration},afade=t=in:st=0:d=1,afade=t=out:st=${voiceDuration - 1}:d=1,volume=${bedVolume}[bed]`
    const voiceFilter = `[0:a]volume=1.0[voice]`
    const mixFilter = `[voice][bed]amix=inputs=2:duration=first:dropout_transition=0`

    await execAsync(
      `ffmpeg -y -i "${currentFile}" -i "${musicBedPath}" ` +
        `-filter_complex "${bedFilter};${voiceFilter};${mixFilter}" ` +
        `-ar 44100 -ac 2 "${outputPath}" 2>/dev/null`,
    )
    bedMixed = true
    processing.push(`music bed mixed (volume=${bedVolume})`)
  } else {
    // No bed — just copy the processed file
    await execAsync(`ffmpeg -y -i "${currentFile}" -ar 44100 -ac 2 "${outputPath}" 2>/dev/null`)
  }

  // Clean up temp files
  for (const temp of tempFiles) {
    try {
      await execAsync(`rm -f "${temp}"`)
    } catch {}
  }

  // Get duration of output
  let durationMs = 0
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`,
    )
    durationMs = Math.round(parseFloat(stdout.trim()) * 1000)
  } catch {}

  return {
    outputPath,
    outputUrl,
    durationMs,
    processing,
    bedMixed,
  }
}

/**
 * Generate a simple music bed using ffmpeg (if no bed file is available).
 *
 * Creates a 10-second ambient bed from a sine wave + filtered noise.
 * This is a fallback — a real station should use a proper music bed file.
 */
export async function generateMusicBed(
  outputPath: string,
  durationSec = 10,
): Promise<string> {
  // Generate a low-energy ambient bed:
  //   - Low sine wave (root note, 110Hz = A2)
  //   - Filtered noise (subtle texture)
  //   - Fade in/out
  const filter = `sine=frequency=110:duration=${durationSec}[tone];anoisesrc=duration=${durationSec}:color=brown:amplitude=0.3[noise];[tone][noise]amix=inputs=2:duration=first,volume=0.3,afade=t=in:st=0:d=1,afade=t=out:st=${durationSec - 1}:d=1`

  await execAsync(
    `ffmpeg -y -f lavfi -i "" -filter_complex "${filter}" "${outputPath}" 2>/dev/null`,
  )

  return outputPath
}

/**
 * Check if ffmpeg is available on the system.
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version')
    return true
  } catch {
    return false
  }
}
