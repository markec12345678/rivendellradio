'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  Track,
  Station,
  ScheduleShow,
  Daemon,
  SystemStatus,
  RivendellConfig,
  ThemePreference,
  ThemeMode,
  NowPlaying,
  RmlResponse,
} from './types'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const keys = {
  status: ['rv', 'status'] as const,
  tracks: (q: string, g: string) => ['rv', 'tracks', q, g] as const,
  stations: ['rv', 'stations'] as const,
  schedule: ['rv', 'schedule'] as const,
  daemons: ['rv', 'daemons'] as const,
  config: ['rv', 'config'] as const,
  theme: ['rv', 'theme'] as const,
  airplay: ['rv', 'airplay'] as const,
}

export function useSystemStatus() {
  return useQuery<SystemStatus>({ queryKey: keys.status, queryFn: () => fetchJson<SystemStatus>('/api/rivendell/status') })
}

export interface TracksResponse { count: number; total: number; tracks: Track[] }
export function useTracks(q: string, group: string) {
  return useQuery<TracksResponse>({
    queryKey: keys.tracks(q, group),
    queryFn: () => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (group && group !== 'ALL') params.set('group', group)
      const qs = params.toString()
      return fetchJson<TracksResponse>(`/api/rivendell/tracks${qs ? `?${qs}` : ''}`)
    },
  })
}

export interface StationsResponse { count: number; stations: Station[]; activeId: string }
export function useStations() {
  return useQuery<StationsResponse>({ queryKey: keys.stations, queryFn: () => fetchJson<StationsResponse>('/api/rivendell/stations') })
}
export function useSetActiveStation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (stationId: string) => {
      const res = await fetch('/api/rivendell/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stationId }) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.stations }) },
  })
}

export interface ScheduleResponse { count: number; shows: ScheduleShow[] }
export function useSchedule() {
  return useQuery<ScheduleResponse>({ queryKey: keys.schedule, queryFn: () => fetchJson<ScheduleResponse>('/api/rivendell/schedule') })
}

export interface DaemonsResponse { count: number; running: number; daemons: Daemon[] }
export function useDaemons() {
  return useQuery<DaemonsResponse>({ queryKey: keys.daemons, queryFn: () => fetchJson<DaemonsResponse>('/api/rivendell/daemons') })
}

export function useConfig() {
  return useQuery<RivendellConfig>({ queryKey: keys.config, queryFn: () => fetchJson<RivendellConfig>('/api/rivendell/config') })
}
export function useSaveConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { url: string; username?: string | null; password?: string | null; connected?: boolean }) => {
      const res = await fetch('/api/rivendell/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Save failed')
      return res.json()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.config }) },
  })
}

export function useTheme() {
  return useQuery<ThemePreference>({ queryKey: keys.theme, queryFn: () => fetchJson<ThemePreference>('/api/rivendell/theme') })
}
export function useSaveTheme() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { mode: ThemeMode; accentHue: number }) => {
      const res = await fetch('/api/rivendell/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.theme }) },
  })
}

export function useAirplay() {
  return useQuery<NowPlaying>({ queryKey: keys.airplay, queryFn: () => fetchJson<NowPlaying>('/api/rivendell/airplay'), refetchInterval: 10000 })
}

export function useSendRml() {
  return useMutation({
    mutationFn: async (command: string) => {
      const res = await fetch('/api/rivendell/rml', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) })
      if (!res.ok) throw new Error('RML failed')
      return res.json() as Promise<RmlResponse>
    },
  })
}

export interface ListenerHistoryPoint { hour: string; listeners: number }
export interface StationListenerHistory { id: string; name: string; baseListeners: number; history: ListenerHistoryPoint[] }
export interface ReportsResponse {
  stations: StationListenerHistory[]
  total: ListenerHistoryPoint[]
  peak: number
  avg: number
  current: number
}
export function useReports() {
  return useQuery<ReportsResponse>({
    queryKey: ['rv', 'reports'] as const,
    queryFn: () => fetchJson<ReportsResponse>('/api/rivendell/reports'),
  })
}

export interface WeeklyShowSlot {
  day: number
  startTime: string
  endTime: string
  name: string
  host: string
  color: string
}
export interface WeeklyScheduleResponse {
  count: number
  schedule: WeeklyShowSlot[]
}
export function useWeeklySchedule() {
  return useQuery<WeeklyScheduleResponse>({
    queryKey: ['rv', 'weekly-schedule'] as const,
    queryFn: () => fetchJson<WeeklyScheduleResponse>('/api/rivendell/weekly-schedule'),
  })
}

export interface RecentTrack {
  trackId: string
  title: string
  artist: string
  album: string
  albumArt?: string
  playedAt: string
  show: string
}
export interface TopTrack {
  trackId: string
  title: string
  artist: string
  album: string
  albumArt?: string
  playCount: number
  length: number
}
export interface RecentResponse {
  recent: RecentTrack[]
  top: TopTrack[]
}
export function useRecent() {
  return useQuery<RecentResponse>({
    queryKey: ['rv', 'recent'] as const,
    queryFn: () => fetchJson<RecentResponse>('/api/rivendell/recent'),
  })
}

export interface ListenerRequest {
  id: string
  trackId: string
  title: string
  artist: string
  albumArt?: string
  listenerName: string
  listenerMessage?: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'played'
}
export interface RequestsResponse {
  count: number
  pending: number
  requests: ListenerRequest[]
}
export function useRequests() {
  return useQuery<RequestsResponse>({
    queryKey: ['rv', 'requests'] as const,
    queryFn: () => fetchJson<RequestsResponse>('/api/rivendell/requests'),
    refetchInterval: 30_000,
  })
}
export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { requestId: string; action: 'approved' | 'rejected' | 'played' }) => {
      const res = await fetch('/api/rivendell/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rv', 'requests'] as const }) },
  })
}
export function useSubmitRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { trackId: string; listenerName?: string; listenerMessage?: string }) => {
      const res = await fetch('/api/rivendell/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', ...payload }),
      })
      if (!res.ok) throw new Error('Submit failed')
      return res.json()
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rv', 'requests'] as const }) },
  })
}

export interface RdsMetadata {
  pi: string
  ps: string
  pty: number
  ptyLabel: string
  rt: string
  rtPlus: { tag1: { type: string; start: number; length: number }; tag2: { type: string; start: number; length: number } }
  dls: string
  hdTitle: string
  hdArtist: string
  hdAlbum: string
  streamTitle: string
  streamUrl: string
  uecpCommand: { address: number; dataset: number; elements: Array<{ type: string; value: string }> }
  encoderConnected: boolean
  lastUpdate: string
  trackId: string
}
export interface RdsTarget {
  id: string
  name: string
  protocol: string
  address: string
  status: 'connected' | 'disconnected'
  lastSent: string | null
}
export interface RdsResponse {
  rds: RdsMetadata
  targets: RdsTarget[]
}
export function useRds() {
  return useQuery<RdsResponse>({
    queryKey: ['rv', 'rds'] as const,
    queryFn: () => fetchJson<RdsResponse>('/api/rivendell/rds'),
    refetchInterval: 10_000,
  })
}
