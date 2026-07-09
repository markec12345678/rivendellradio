'use client'

import { create } from 'zustand'
import type { NowPlayingFrame, VuFrame, ListenersFrame, DaemonLoadFrame } from '@/lib/rivendell/types'

interface LiveState {
  now: Date
  tick: number
  vu: [number, number]
  feedConnected: boolean
  nowPlaying: NowPlayingFrame | null
  listeners: Record<string, number>
  daemonLoads: Record<string, DaemonLoadFrame>

  advanceClock: () => void
  setFeedConnected: (v: boolean) => void
  applyVu: (f: VuFrame) => void
  applyNowPlaying: (f: NowPlayingFrame) => void
  applyListeners: (f: ListenersFrame) => void
  applyDaemonLoad: (f: DaemonLoadFrame) => void
}

export const useLiveStore = create<LiveState>((set) => ({
  now: new Date(),
  tick: 0,
  vu: [0.5, 0.5],
  feedConnected: false,
  nowPlaying: null,
  listeners: {},
  daemonLoads: {},

  advanceClock: () => set((s) => ({ now: new Date(), tick: s.tick + 1 })),
  setFeedConnected: (v) => set({ feedConnected: v }),
  applyVu: (f) => set({ vu: [f.left, f.right] }),
  applyNowPlaying: (f) => set({ nowPlaying: f }),
  applyListeners: (f) => set((s) => ({ listeners: { ...s.listeners, [f.stationId]: f.listeners } })),
  applyDaemonLoad: (f) => set((s) => ({ daemonLoads: { ...s.daemonLoads, [f.name]: f } })),
}))
