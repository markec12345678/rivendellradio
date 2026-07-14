import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

/**
 * Voice Play API — serves generated audio files.
 *
 * GET /api/v1/voice/play?file=vl-123.wav
 *
 * Returns the audio file with correct Content-Type for browser playback.
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const file = url.searchParams.get('file')

  if (!file) {
    return NextResponse.json(
      { ok: false, error: 'Required: ?file=filename.wav' },
      { status: 400 },
    )
  }

  // Prevent path traversal
  if (file.includes('..') || file.includes('/')) {
    return NextResponse.json(
      { ok: false, error: 'Invalid filename' },
      { status: 400 },
    )
  }

  const filePath = join(process.cwd(), 'public', 'voice-links', file)

  try {
    const audioBuffer = await readFile(filePath)

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: `File not found: ${file}` },
      { status: 404 },
    )
  }
}
