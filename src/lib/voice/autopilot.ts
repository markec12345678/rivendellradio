/**
 * Auto-Pilot Rundown Writer — saves AI-generated shows as Liquidsoap playlists.
 *
 * When auto-pilot is enabled:
 *   1. AI generates a show every hour (or configurable interval)
 *   2. The show rundown is saved to /playlists/current.m3u
 *   3. Liquidsoap reads /playlists/current.m3u and plays it
 *   4. When the playlist is exhausted, AI generates the next show
 *
 * The playlist file format is M3U — one file path per line, with optional
 * comments. Liquidsoap's playlist() function reads this directly.
 *
 * See:
 *   - /api/v1/ai/auto-pilot (start/stop/status)
 *   - deploy/liquidsoap/radio-autopilot.liq (Liquidsoap config)
 */

import { writeFile, readFile, mkdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const PLAYLISTS_DIR = join(process.cwd(), 'playlists')
const CURRENT_PLAYLIST = join(PLAYLISTS_DIR, 'current.m3u')
const NEXT_PLAYLIST = join(PLAYLISTS_DIR, 'next.m3u')
const AUTOPILOT_STATE = join(PLAYLISTS_DIR, 'autopilot.json')

export interface AutopilotState {
  enabled: boolean
  startedAt: string | null
  lastGeneratedAt: string | null
  nextGenerationAt: string | null
  showsGenerated: number
  currentShowName: string | null
  generationIntervalMin: number
  errors: string[]
}

/**
 * Get the current autopilot state.
 */
export async function getAutopilotState(): Promise<AutopilotState> {
  if (!existsSync(AUTOPILOT_STATE)) {
    return {
      enabled: false,
      startedAt: null,
      lastGeneratedAt: null,
      nextGenerationAt: null,
      showsGenerated: 0,
      currentShowName: null,
      generationIntervalMin: 60,
      errors: [],
    }
  }

  try {
    const data = await readFile(AUTOPILOT_STATE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {
      enabled: false,
      startedAt: null,
      lastGeneratedAt: null,
      nextGenerationAt: null,
      showsGenerated: 0,
      currentShowName: null,
      generationIntervalMin: 60,
      errors: [],
    }
  }
}

/**
 * Save the autopilot state.
 */
export async function saveAutopilotState(state: AutopilotState): Promise<void> {
  await mkdir(PLAYLISTS_DIR, { recursive: true })
  await writeFile(AUTOPILOT_STATE, JSON.stringify(state, null, 2))
}

/**
 * Write a show rundown as an M3U playlist that Liquidsoap can read.
 *
 * The M3U format is simple:
 *   #EXTM3U
 *   #EXTINF:duration,Artist - Title
 *   /path/to/file.wav
 *   ...
 *
 * For music tracks, we use the file path from the Media Library.
 * For voice segments, we use the generated audio file path.
 */
export async function writeRundownAsM3U(
  segments: Array<{
    type: string
    title: string
    tracks?: { title: string; artist: string; filePath: string; durationMs: number }[]
    audioUrl?: string
    audioDurationMs?: number
  }>,
  showName: string,
): Promise<{ playlistPath: string; trackCount: number }> {
  await mkdir(PLAYLISTS_DIR, { recursive: true })

  const lines: string[] = ['#EXTM3U', `# AI-generated show: ${showName}`]
  let trackCount = 0

  for (const segment of segments) {
    if (segment.type === 'music' && segment.tracks) {
      // Music tracks — use file paths from Media Library
      for (const track of segment.tracks) {
        const durationSec = Math.round(track.durationMs / 1000)
        lines.push(`#EXTINF:${durationSec},${track.artist} - ${track.title}`)
        lines.push(track.filePath)
        trackCount++
      }
    } else if (segment.audioUrl) {
      // Voice segment — use the generated audio file path
      const audioPath = join(process.cwd(), 'public', segment.audioUrl.replace(/^\//, ''))
      const durationSec = segment.audioDurationMs ? Math.round(segment.audioDurationMs / 1000) : 10
      lines.push(`#EXTINF:${durationSec},${segment.title}`)
      lines.push(audioPath)
      trackCount++
    }
  }

  // Write to "next" first, then atomically replace "current"
  await writeFile(NEXT_PLAYLIST, lines.join('\n') + '\n')

  // Atomic-ish rename
  const { rename } = await import('fs/promises')
  await rename(NEXT_PLAYLIST, CURRENT_PLAYLIST)

  return { playlistPath: CURRENT_PLAYLIST, trackCount }
}

/**
 * Get the current playlist file path (for Liquidsoap).
 */
export function getCurrentPlaylistPath(): string {
  return CURRENT_PLAYLIST
}

/**
 * Check if the current playlist is empty or exhausted.
 * Returns true if the playlist has fewer than 2 entries (needs regeneration).
 */
export async function isPlaylistExhausted(): Promise<boolean> {
  if (!existsSync(CURRENT_PLAYLIST)) return true

  try {
    const content = await readFile(CURRENT_PLAYLIST, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'))
    return lines.length < 2
  } catch {
    return true
  }
}
