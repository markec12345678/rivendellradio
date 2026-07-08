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
