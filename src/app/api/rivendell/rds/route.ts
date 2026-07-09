import { NextResponse } from 'next/server'
import { rockTracks } from '@/lib/rivendell/mock-data'

export const dynamic = 'force-dynamic'

// RDS (Radio Data System) metadata types
// PI = Program Identification (hex code)
// PS = Program Service Name (8 chars max)
// PTY = Program Type (0-31)
// RT = RadioText (64 chars max)
// DLS = Dynamic Label Segment (DAB+ equivalent)

const PTY_CODES: Record<string, { code: number; label: string }> = {
  'Classic Rock': { code: 11, label: 'Rock music' },
  'Hard Rock': { code: 11, label: 'Rock music' },
  'Heavy Metal': { code: 11, label: 'Rock music' },
  'Punk Rock': { code: 11, label: 'Rock music' },
  'Grunge': { code: 11, label: 'Rock music' },
  'Alternative Rock': { code: 11, label: 'Rock music' },
  'Nu Metal': { code: 11, label: 'Rock music' },
  'Jingle': { code: 0, label: 'No program type' },
  'Bed': { code: 0, label: 'No program type' },
  'Promo': { code: 2, label: 'Information' },
  'PSA': { code: 2, label: 'Information' },
  'Advertisement': { code: 2, label: 'Information' },
}

function padPS(name: string): string {
  return name.padEnd(8, ' ').slice(0, 8)
}

function truncateRT(text: string, max = 64): string {
  return text.length > max ? text.slice(0, max - 3) + '...' : text
}

export async function GET() {
  await new Promise((r) => setTimeout(r, 100))

  // Find a currently playing track (use first track with recent lastPlayed)
  const track = rockTracks.find((t) => t.type === 'music' && t.lastPlayed) ?? rockTracks[0]
  const pty = PTY_CODES[track.genre] ?? { code: 11, label: 'Rock music' }

  // Build RDS metadata
  const rds = {
    // FM RDS
    pi: '887F', // Program Identification (station frequency based)
    ps: padPS('ROCK887'), // Program Service Name (8 chars)
    pty: pty.code,
    ptyLabel: pty.label,
    rt: truncateRT(`${track.artist} - ${track.title}`), // RadioText (64 chars max)
    rtPlus: {
      tag1: { type: 'artist', start: 0, length: track.artist.length },
      tag2: { type: 'title', start: track.artist.length + 3, length: track.title.length },
    },
    // DAB+ DLS (Dynamic Label Segment)
    dls: truncateRT(`Now playing: ${track.title} by ${track.artist}`, 128),
    // HD Radio
    hdTitle: track.title,
    hdArtist: track.artist,
    hdAlbum: track.album,
    // Streaming metadata
    streamTitle: `${track.artist} - ${track.title}`,
    streamUrl: 'http://stream.rock887.fm:8000/main.mp3',
    // UECP (Universal Encoder Communication Protocol)
    uecpCommand: {
      address: 0x0001,
      dataset: 1,
      elements: [
        { type: 'PS', value: padPS('ROCK887') },
        { type: 'RT', value: truncateRT(`${track.artist} - ${track.title}`) },
        { type: 'PTY', value: pty.code },
      ],
    },
    // Status
    encoderConnected: true,
    lastUpdate: new Date().toISOString(),
    trackId: track.id,
  }

  // List of connected RDS targets
  const targets = [
    { id: 'fm-rds', name: 'FM RDS Encoder (Inovonics 730)', protocol: 'UDP', address: 'udp://192.168.50.10:4001', status: 'connected', lastSent: new Date(Date.now() - 5000).toISOString() },
    { id: 'dab-plus', name: 'DAB+ DLS Server', protocol: 'TCP', address: 'tcp://192.168.50.20:9394', status: 'connected', lastSent: new Date(Date.now() - 3000).toISOString() },
    { id: 'hd-radio', name: 'HD Radio Importer', protocol: 'HTTP', address: 'http://hd-importer.local/api/pad', status: 'connected', lastSent: new Date(Date.now() - 2000).toISOString() },
    { id: 'icecast', name: 'Icecast2 Stream Metadata', protocol: 'HTTP', address: 'http://stream.rock887.fm:8000/admin/metadata', status: 'connected', lastSent: new Date(Date.now() - 1000).toISOString() },
    { id: 'tunein', name: 'TuneIn Air API', protocol: 'HTTPS', address: 'https://api.radiotime.com/listeners.ashx', status: 'connected', lastSent: new Date(Date.now() - 8000).toISOString() },
    { id: 'spotify', name: 'Spotify Now Playing', protocol: 'HTTPS', address: 'https://api.spotify.com/v1/me/player', status: 'disconnected', lastSent: null },
  ]

  return NextResponse.json({ rds, targets })
}
