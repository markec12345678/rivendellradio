// Rivendell Web Dashboard — domain types
// Clean-room implementation, inspired by AzuraCast (MIT) and LibreTime (AGPL) concepts

export type TrackType = 'music' | 'jingle' | 'ad' | 'promo' | 'news' | 'voice-track' | 'marker'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  genre: string
  length: number // ms
  type: TrackType
  bpm?: number
  year?: number
  isrc?: string
  group: string
  origin: 'cd' | 'rip' | 'ftp' | 'en'
  schedCodes: string[]
  filePath?: string
  lastPlayed?: string | null
  playCount: number
  albumArt?: string // path to album art image
}

export interface Station {
  id: string
  name: string
  frequency: string
  format: string
  onAir: boolean
  listeners: number
  streamUrl: string
  sampleRate: number
}

export interface LogLine {
  line: number
  type: TrackType
  trackId?: string
  title?: string
  artist?: string
  length: number
  transition: 'play' | 'segue' | 'stop' | 'fade'
  scheduledTime?: string
  status?: 'scheduled' | 'playing' | 'played' | 'skipped'
}

export interface ScheduleShow {
  id: string
  name: string
  host: string
  startTime: string // HH:mm
  endTime: string
  dayOfWeek: number // 0=Sun..6=Sat
  recurring: boolean
  logLines: LogLine[]
  status: 'scheduled' | 'live' | 'completed' | 'empty'
}

export interface RivendellConfig {
  id: number
  url: string
  username: string | null
  password: string | null
  connected: boolean
  updatedAt: string
}

export type ThemeMode = 'dark' | 'metal' | 'light'

export interface ThemePreference {
  mode: ThemeMode
  accentHue: number
}

export interface SystemStatus {
  online: boolean
  version: string
  schemaVersion: number
  uptime: number
  activeStation: string
  tracks: number
  stations: number
  daemonsRunning: number
  daemonsTotal: number
}

export interface Daemon {
  name: string
  status: 'running' | 'stopped' | 'faulted'
  cpuPercent: number
  memoryMb: number
  pid: number
  uptime: number
}

export interface NowPlaying {
  trackId: string
  title: string
  artist: string
  album: string
  length: number
  elapsed: number
  remaining: number
  station: string
  listeners: number
}

export interface RmlResponse {
  ok: boolean
  command: string
  received: string
  message: string
}

// WebSocket broadcast-feed frames
export interface NowPlayingFrame {
  trackId: string
  title: string
  artist: string
  album: string
  length: number
  elapsed: number
  remaining: number
  listeners: number
  ts: number
}

export interface VuFrame {
  left: number
  right: number
  ts: number
}

export interface ListenersFrame {
  stationId: string
  listeners: number
  ts: number
}

export interface DaemonLoadFrame {
  name: string
  cpuPercent: number
  memoryMb: number
  ts: number
}
