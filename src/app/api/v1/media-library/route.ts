// @ts-nocheck — route uses dynamic imports and fs APIs
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { importDirectory, importFile, getFormat, generatePlaylist } from '@/lib/media-library/scanner'

export const dynamic = 'force-dynamic'

/**
 * Media Library API — the bridge between audio files and Rock 88.7.
 *
 * GET  — list assets, or generate a playlist for Liquidsoap
 * POST — import a directory of audio files (scans recursively)
 * DELETE — remove an asset from the library (does NOT delete the file)
 *
 * This is NOT an AI module. It is the media asset manager that
 * Liquidsoap/Rivendell reads from. Rock 88.7's AI never touches files
 * directly — it always goes through this API.
 */

export async function GET(req: Request) {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  // Generate a Liquidsoap playlist
  if (action === 'playlist') {
    const filter = {
      category: url.searchParams.get('category') ?? undefined,
      genre: url.searchParams.get('genre') ?? undefined,
      artist: url.searchParams.get('artist') ?? undefined,
      limit: url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!)
        : undefined,
    }
    const playlist = await generatePlaylist(filter)
    return NextResponse.json({ action: 'playlist', filter, tracks: playlist, count: playlist.length })
  }

  // List tracks with their assets
  const category = url.searchParams.get('category')
  const genre = url.searchParams.get('genre')
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 500)

  const trackWhere: any = {}
  if (category) trackWhere.category = category
  if (genre) trackWhere.genre = genre

  // Tracks with their Assets (one Track, many Assets)
  const tracks = await db.track.findMany({
    where: trackWhere,
    orderBy: { importedAt: 'desc' },
    take: limit,
    include: {
      assets: {
        orderBy: { format: 'asc' },
      },
    },
  })

  const totalTracks = await db.track.count()
  const totalAssets = await db.mediaAsset.count()

  // Stats — now on Tracks, not Assets
  const byCategory = await db.track.groupBy({
    by: ['category'],
    _count: true,
  })
  const byGenre = await db.track.groupBy({
    by: ['genre'],
    _count: true,
  })
  const byFormat = await db.mediaAsset.groupBy({
    by: ['format'],
    _count: true,
  })

  return NextResponse.json({
    _disclaimer:
      'Media Library. Tracks (musical entities) with their Assets (file versions). ' +
      'One Track = one song; many Assets = different formats/edits of that song. ' +
      'AI reasons about Tracks; Liquidsoap plays Assets.',

    tracks,
    stats: {
      totalTracks,
      totalAssets,
      avgAssetsPerTrack: totalTracks > 0 ? Math.round((totalAssets / totalTracks) * 10) / 10 : 0,
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category ?? 'uncategorized', c._count])),
      byGenre: Object.fromEntries(byGenre.map((g) => [g.genre ?? 'unknown', g._count])),
      byFormat: Object.fromEntries(byFormat.map((f) => [f.format, f._count])),
    },

    // For Liquidsoap integration
    playlistEndpoint: '/api/v1/media-library?action=playlist',
    playlistExample: '/api/v1/media-library?action=playlist&category=power&limit=50',
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  if (!body.directory && !body.file) {
    return NextResponse.json(
      { ok: false, error: 'Required: { directory: "/music/rock" } or { file: "/music/rock/everlong.mp3" }' },
      { status: 400 },
    )
  }

  // Import a single file
  if (body.file) {
    const format = getFormat(body.file)
    if (!format) {
      return NextResponse.json(
        { ok: false, error: `Unsupported format: ${body.file}` },
        { status: 400 },
      )
    }

    try {
      const result = await importFile(body.file)
      return NextResponse.json({
        ok: true,
        asset: result.asset,
        created: result.created,
        message: result.created
          ? `Imported: ${result.asset.title}`
          : `Updated: ${result.asset.title}`,
      })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'Import failed' },
        { status: 500 },
      )
    }
  }

  // Import a directory
  if (body.directory) {
    try {
      const result = await importDirectory(body.directory)
      return NextResponse.json({
        ok: result.failed === 0,
        ...result,
        message: `Scanned ${result.scanned} files: ${result.tracksCreated} tracks created, ${result.assetsCreated} assets created, ${result.assetsUpdated} assets updated, ${result.failed} failed`,
        ...(result.errors.length > 0 ? { errors: result.errors.slice(0, 20) } : {}),
      })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : 'Directory scan failed' },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { ok: false, error: 'Required: ?id=<asset-id>' },
      { status: 400 },
    )
  }

  // Remove from DB — does NOT delete the file on disk
  try {
    await db.mediaAsset.delete({ where: { id } })
    return NextResponse.json({
      ok: true,
      message: 'Asset removed from library. File on disk is NOT deleted.',
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Asset not found' },
      { status: 404 },
    )
  }
}
