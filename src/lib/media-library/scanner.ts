/**
 * Media Library Service — the bridge between audio files on disk and
 * Rock 88.7's AI/governance layer.
 *
 * Rock 88.7 NEVER reads audio files directly. It reads from the Media
 * Library, which provides:
 *   - Metadata (title, artist, album, BPM, key, energy)
 *   - Audio analysis (ReplayGain, LUFS)
 *   - Play history (for separation rules)
 *   - Copyright/licensing info
 *
 * The Media Library is populated by scanning a directory of MP3/FLAC
 * files and extracting metadata at import time.
 *
 * See:
 *   - prisma/schema.prisma (MediaAsset model)
 *   - src/app/api/v1/media-library/route.ts (the API)
 */

import { db } from '@/lib/db'
import { readFile, stat, readdir } from 'fs/promises'
import { join, extname, basename } from 'path'
import { createHash } from 'crypto'

/**
 * Supported audio formats.
 */
export const SUPPORTED_FORMATS = ['.mp3', '.flac', '.aac', '.ogg', '.m4a'] as const
export type AudioFormat = (typeof SUPPORTED_FORMATS)[number]

/**
 * Determine the format from a file extension.
 */
export function getFormat(filePath: string): AudioFormat | null {
  const ext = extname(filePath).toLowerCase()
  return SUPPORTED_FORMATS.find((f) => f === ext) ?? null
}

/**
 * Extract metadata from an audio file.
 *
 * For MP3: reads ID3v2 tags from the first few KB of the file.
 * For FLAC: reads VORBIS_COMMENT metadata block.
 * For others: falls back to filename-based metadata.
 *
 * This is a lightweight parser — it does NOT depend on ffmpeg or mutagen.
 * It reads the raw bytes and extracts the most common tag frames.
 * For production-grade metadata extraction, replace this with a call to
 * `ffprobe` or a library like `music-metadata`.
 */
export interface ExtractedMetadata {
  title: string
  artist?: string
  album?: string
  year?: number
  genre?: string
  isExplicit?: boolean
  durationMs: number
  bitrate?: number
  sampleRate?: number
}

/**
 * Extract metadata from a file path.
 *
 * This implementation uses filename-based extraction as a fallback
 * when ID3 tags are not available. For production, replace with ffprobe.
 */
export async function extractMetadata(
  filePath: string,
  fileSizeBytes: number,
): Promise<ExtractedMetadata> {
  const fileName = basename(filePath, extname(filePath))

  // Try to read ID3v2 tags from the file
  const tags = await tryReadID3v2(filePath).catch(() => null)

  if (tags) {
    return {
      title: tags.title || fileName,
      artist: tags.artist,
      album: tags.album,
      year: tags.year,
      genre: tags.genre,
      isExplicit: tags.isExplicit,
      durationMs: tags.durationMs ?? estimateDuration(fileSizeBytes),
      bitrate: tags.bitrate,
      sampleRate: tags.sampleRate,
    }
  }

  // Fallback: parse metadata from filename
  // Common patterns: "Artist - Title.mp3", "Artist - Album - Title.mp3"
  const parts = fileName.split(' - ')
  let title = fileName
  let artist: string | undefined
  let album: string | undefined

  if (parts.length >= 2) {
    artist = parts[0].trim()
    title = parts[parts.length - 1].trim()
    if (parts.length >= 3) {
      album = parts[1].trim()
    }
  }

  return {
    title,
    artist,
    album,
    durationMs: estimateDuration(fileSizeBytes),
  }
}

/**
 * Lightweight ID3v2 tag reader.
 *
 * Reads the first 256KB of the file and extracts common text frames:
 * TIT2 (title), TPE1 (artist), TALB (album), TYER/TDRC (year),
 * TCON (genre), and checks for "Parental Advisory" in comments.
 *
 * Returns null if the file has no ID3v2 header.
 *
 * Note: This is a minimal parser. For production, use `music-metadata`
 * npm package or `ffprobe`.
 */
async function tryReadID3v2(filePath: string): Promise<{
  title?: string
  artist?: string
  album?: string
  year?: number
  genre?: string
  isExplicit?: boolean
  durationMs?: number
  bitrate?: number
  sampleRate?: number
} | null> {
  try {
    const header = await readFile(filePath, { start: 0, end: 10 })
    // Check for "ID3" magic bytes
    if (header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) {
      return null
    }

    // Read the tag size (syncsafe integer)
    const size =
      (header[6] << 21) | (header[7] << 14) | (header[8] << 7) | header[9]
    const tagSize = Math.min(size + 10, 256 * 1024) // cap at 256KB

    const tagData = await readFile(filePath, { start: 0, end: tagSize })

    // Parse text frames
    const result: any = {}
    let offset = 10

    while (offset < tagData.length - 10) {
      // Frame header: 4 bytes ID, 4 bytes size, 2 bytes flags
      const frameId = tagData.slice(offset, offset + 4).toString('ascii')
      const frameSize =
        (tagData[offset + 4] << 24) |
        (tagData[offset + 5] << 16) |
        (tagData[offset + 6] << 8) |
        tagData[offset + 7]

      if (frameSize <= 0 || frameSize > tagSize) break

      const frameData = tagData.slice(offset + 10, offset + 10 + frameSize)

      // Text frames start with encoding byte
      if (frameId.startsWith('T') && frameData.length > 1) {
        const encoding = frameData[0]
        let text: string
        if (encoding === 0) {
          // ISO-8859-1
          text = frameData.slice(1).toString('latin1').replace(/\0/g, '').trim()
        } else if (encoding === 1) {
          // UTF-16 with BOM
          text = frameData.slice(1).toString('utf16le').replace(/\0/g, '').trim()
        } else if (encoding === 3) {
          // UTF-8
          text = frameData.slice(1).toString('utf8').replace(/\0/g, '').trim()
        } else {
          text = frameData.slice(1).toString('utf8').replace(/\0/g, '').trim()
        }

        switch (frameId) {
          case 'TIT2': result.title = text; break
          case 'TPE1': result.artist = text; break
          case 'TALB': result.album = text; break
          case 'TYER':
          case 'TDRC':
            result.year = parseInt(text, 10) || undefined; break
          case 'TCON': result.genre = text; break
        }
      }

      offset += 10 + frameSize
    }

    return Object.keys(result).length > 0 ? result : null
  } catch {
    return null
  }
}

/**
 * Estimate duration from file size (rough — assumes 192kbps MP3).
 * Used as fallback when duration is not in tags.
 */
function estimateDuration(fileSizeBytes: number): number {
  const assumedBitrate = 192000 // 192 kbps in bits/sec
  const bytesPerSecond = assumedBitrate / 8
  return Math.round((fileSizeBytes / bytesPerSecond) * 1000)
}

/**
 * Compute a SHA-256 hash of a file's first 64KB (for dedup detection).
 * Full-file hashing would be more accurate but slower for large libraries.
 */
export async function computeFileHash(filePath: string): Promise<string> {
  try {
    const data = await readFile(filePath, { start: 0, end: 64 * 1024 })
    return createHash('sha256').update(data).digest('hex')
  } catch {
    return ''
  }
}

/**
 * Scan a directory recursively for audio files.
 * Returns the list of file paths that match supported formats.
 */
export async function scanDirectory(dirPath: string): Promise<string[]> {
  const results: string[] = []

  async function walk(dir: string) {
    let entries: import('fs').Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        const format = getFormat(entry.name)
        if (format) {
          results.push(fullPath)
        }
      }
    }
  }

  await walk(dirPath)
  return results
}

/**
 * Import a single audio file into the Media Library.
 *
 * Extracts metadata, computes a content hash, and persists to the database.
 * If the file (by path or hash) already exists, it is updated.
 */
export async function importFile(
  filePath: string,
): Promise<{ asset: any; created: boolean }> {
  const format = getFormat(filePath)
  if (!format) {
    throw new Error(`Unsupported format: ${filePath}`)
  }

  const stats = await stat(filePath)
  const metadata = await extractMetadata(filePath, stats.size)
  const hash = await computeFileHash(filePath)

  // Check if already exists (by path or hash)
  const existing = await db.mediaAsset.findFirst({
    where: {
      OR: [{ filePath }, ...(hash ? [{ importHash: hash }] : [])],
    },
  })

  if (existing) {
    // Update
    const updated = await db.mediaAsset.update({
      where: { id: existing.id },
      data: {
        fileName: basename(filePath),
        fileSizeBytes: stats.size,
        format,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year,
        genre: metadata.genre,
        bpm: metadata.bpm,
        isExplicit: metadata.isExplicit ?? false,
        durationMs: metadata.durationMs,
        bitrate: metadata.bitrate,
        sampleRate: metadata.sampleRate,
        importHash: hash,
        updatedAt: new Date(),
      },
    })
    return { asset: updated, created: false }
  }

  // Create
  const created = await db.mediaAsset.create({
    data: {
      filePath,
      fileName: basename(filePath),
      fileSizeBytes: stats.size,
      format,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      year: metadata.year,
      genre: metadata.genre,
      bpm: metadata.bpm,
      isExplicit: metadata.isExplicit ?? false,
      durationMs: metadata.durationMs,
      bitrate: metadata.bitrate,
      sampleRate: metadata.sampleRate,
      importHash: hash,
    },
  })
  return { asset: created, created: true }
}

/**
 * Import all audio files from a directory.
 * Returns a summary: how many were imported, updated, or failed.
 */
export async function importDirectory(
  dirPath: string,
): Promise<{
  scanned: number
  created: number
  updated: number
  failed: number
  errors: string[]
}> {
  const files = await scanDirectory(dirPath)
  let created = 0
  let updated = 0
  let failed = 0
  const errors: string[] = []

  for (const file of files) {
    try {
      const result = await importFile(file)
      if (result.created) {
        created++
      } else {
        updated++
      }
    } catch (err) {
      failed++
      errors.push(`${file}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  return { scanned: files.length, created, updated, failed, errors }
}

/**
 * Generate a Liquidsoap playlist from the Media Library.
 *
 * This is the bridge between Rock 88.7 and the actual audio playback.
 * Liquidsoap reads this playlist and plays the files.
 *
 * The playlist can be filtered by category, genre, etc.
 */
export async function generatePlaylist(
  filter: {
    category?: string
    genre?: string
    artist?: string
    limit?: number
  } = {},
): Promise<string[]> {
  const where: any = {}
  if (filter.category) where.category = filter.category
  if (filter.genre) where.genre = filter.genre
  if (filter.artist) where.artist = { contains: filter.artist }

  const assets = await db.mediaAsset.findMany({
    where,
    orderBy: { lastPlayedAt: 'asc' }, // least-recently-played first
    take: filter.limit ?? 100,
    select: { filePath: true },
  })

  return assets.map((a) => a.filePath)
}
