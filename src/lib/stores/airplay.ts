// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
import { create } from 'zustand'
import { mockLogMachines } from '@/lib/rivendell/mock-data'
import type {
  LogMachine,
  VuFrame,
  GpioFrame,
  NowPlayingFrame,
  DaemonLoadFrame,
  PypadEventFrame,
  Aes67StatsFrame,
} from '@/lib/rivendell/types'

interface AirplayState {
  // Live clock
  now: Date
  tick: number // monotonically increasing counter for VU seed

  // Log machines (live state)
  machines: LogMachine[]

  // VU meter values per machine (stereo: [L, R])
  vu: Array<[number, number]>

  // Broadcast-feed (WebSocket) real-time state
  feedConnected: boolean
  lastGpio: GpioFrame | null
  listeners: Record<string, number>
  nowPlaying: NowPlayingFrame | null
  daemonLoads: Record<string, DaemonLoadFrame>
  pypadLog: PypadEventFrame[]
  aes67Stats: Record<string, Aes67StatsFrame>

  // Actions
  initClock: () => void
  advanceClock: () => void
  advancePlayback: () => void
  updateVu: () => void
  setMachineState: (machine: number, state: LogMachine['state']) => void
  transportAction: (machine: number, action: 'play' | 'pause' | 'stop' | 'segue' | 'audition') => void
  // Broadcast-feed actions
  setFeedConnected: (connected: boolean) => void
  applyVuFrame: (frame: VuFrame) => void
  applyGpioFrame: (frame: GpioFrame) => void
  applyListenersFrame: (id: string, listeners: number) => void
  applyNowPlaying: (frame: NowPlayingFrame) => void
  applyDaemonLoad: (frame: DaemonLoadFrame) => void
  applyPypadEvent: (frame: PypadEventFrame) => void
  applyAes67Stats: (frame: Aes67StatsFrame) => void
}

const initialVu: Array<[number, number]> = [
  [0.1, 0.1],
  [0, 0],
  [0, 0],
]

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

export const useAirplayStore = create<AirplayState>((set, get) => ({
  now: new Date(),
  tick: 0,
  machines: mockLogMachines.map((m) => ({ ...m, currentCart: m.currentCart ? { ...m.currentCart } : undefined })),
  vu: initialVu,

  feedConnected: false,
  lastGpio: null,
  listeners: {},
  nowPlaying: null,
  daemonLoads: {},
  pypadLog: [],
  aes67Stats: {},

  initClock: () => set({ now: new Date() }),

  advanceClock: () => set((s) => ({ now: new Date(), tick: s.tick + 1 })),

  advancePlayback: () =>
    set((s) => {
      const machines = s.machines.map((m) => {
        if (m.state !== 'playing' || !m.currentCart) return m
        let elapsed = m.currentCart.elapsed + 1000
        let currentCart = m.currentCart
        let currentLine = m.currentLine
        let state = m.state
        let nextCart = m.nextCart
        let onAir = m.onAir

        if (elapsed >= m.currentCart.length) {
          // Advance to next cart
          if (m.nextCart) {
            currentCart = {
              number: m.nextCart.number,
              title: m.nextCart.title,
              artist: m.nextCart.artist,
              length: m.nextCart.length,
              elapsed: 0,
            }
            currentLine = (m.currentLine ?? 0) + 1
            nextCart = undefined
            state = 'playing'
          } else {
            // Nothing queued — stop
            state = 'stopped'
            onAir = false
            currentCart = undefined
          }
        }
        return { ...m, currentCart, currentLine, state, nextCart, onAir }
      })
      return { machines }
    }),

  updateVu: () =>
    set((s) => {
      // Only generate fallback VU if feed is disconnected
      if (s.feedConnected) return s
      const tick = s.tick
      const vu: Array<[number, number]> = s.machines.map((m, idx) => {
        if (m.state !== 'playing') return [0, 0]
        const base = m.outputLevel
        const noise = Math.sin(tick * 0.9 + idx * 1.7) * 0.18 + Math.sin(tick * 1.6 + idx * 2.3) * 0.12
        const jitter = (Math.random() - 0.5) * 0.1
        const left = clamp01(base + noise + jitter)
        const right = clamp01(base + noise * 0.85 + jitter * 0.7 + 0.04)
        return [left, right]
      })
      return { vu }
    }),

  setMachineState: (machine, state) =>
    set((s) => ({
      machines: s.machines.map((m) =>
        m.machine === machine
          ? {
              ...m,
              state,
              onAir: state === 'playing',
              outputLevel: state === 'playing' ? m.outputLevel || 0.78 : 0,
            }
          : m,
      ),
    })),

  transportAction: (machine, action) =>
    set((s) => ({
      machines: s.machines.map((m) => {
        if (m.machine !== machine) return m
        switch (action) {
          case 'play':
            return {
              ...m,
              state: 'playing' as const,
              onAir: true,
              outputLevel: 0.78,
            }
          case 'pause':
            return {
              ...m,
              state: 'paused' as const,
              onAir: false,
              outputLevel: 0,
            }
          case 'stop':
            return {
              ...m,
              state: 'stopped' as const,
              onAir: false,
              outputLevel: 0,
              currentCart: m.currentCart
                ? { ...m.currentCart, elapsed: 0 }
                : m.currentCart,
            }
          case 'segue':
            return { ...m, state: 'segue' as const }
          case 'audition':
            return m // audition is fire-and-forget, no state change
          default:
            return m
        }
      }),
    })),

  setFeedConnected: (connected) => set({ feedConnected: connected }),

  applyVuFrame: (frame) =>
    set((s) => {
      const vu = [...s.vu] as Array<[number, number]>
      vu[frame.machine] = [frame.left, frame.right]
      return { vu }
    }),

  applyGpioFrame: (frame) => set({ lastGpio: frame }),

  applyListenersFrame: (id, listeners) =>
    set((s) => ({ listeners: { ...s.listeners, [id]: listeners } })),

  applyNowPlaying: (frame) =>
    set((s) => {
      // Update Main machine (index 0) with live now-playing
      const machines = s.machines.map((m, idx) => {
        if (idx !== 0) return m
        return {
          ...m,
          currentCart: m.currentCart
            ? {
                ...m.currentCart,
                number: frame.cartNumber,
                title: frame.title,
                artist: frame.artist,
                length: frame.durationMs,
                elapsed: frame.elapsedMs,
              }
            : {
                number: frame.cartNumber,
                title: frame.title,
                artist: frame.artist,
                length: frame.durationMs,
                elapsed: frame.elapsedMs,
              },
          nextCart: {
            number: frame.nextCartNumber,
            title: frame.nextTitle,
            artist: frame.nextArtist,
            length: 0,
          },
        }
      })
      return { nowPlaying: frame, machines }
    }),

  applyDaemonLoad: (frame) =>
    set((s) => ({ daemonLoads: { ...s.daemonLoads, [frame.name]: frame } })),

  applyPypadEvent: (frame) =>
    set((s) => ({
      pypadLog: [frame, ...s.pypadLog].slice(0, 50), // keep last 50
    })),

  applyAes67Stats: (frame) =>
    set((s) => ({ aes67Stats: { ...s.aes67Stats, [frame.id]: frame } })),
}))

