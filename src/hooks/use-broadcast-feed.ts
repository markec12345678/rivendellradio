'use client'

import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useLiveStore } from '@/lib/stores/live'

export function useBroadcastFeed() {
  const setFeedConnected = useLiveStore((s) => s.setFeedConnected)
  const applyVu = useLiveStore((s) => s.applyVu)
  const applyNowPlaying = useLiveStore((s) => s.applyNowPlaying)
  const applyListeners = useLiveStore((s) => s.applyListeners)
  const applyDaemonLoad = useLiveStore((s) => s.applyDaemonLoad)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 8000,
    })

    socket.on('connect', () => setFeedConnected(true))
    socket.on('disconnect', () => setFeedConnected(false))
    socket.on('connect_error', () => setFeedConnected(false))
    socket.on('vu', (f: { left: number; right: number; ts: number }) => applyVu(f))
    socket.on('now-playing', (f: { trackId: string; title: string; artist: string; album: string; length: number; elapsed: number; remaining: number; listeners: number; ts: number }) => applyNowPlaying(f))
    socket.on('listeners', (f: { stationId: string; listeners: number; ts: number }) => applyListeners(f))
    socket.on('daemon-load', (f: { name: string; cpuPercent: number; memoryMb: number; ts: number }) => applyDaemonLoad(f))

    return () => { socket.disconnect() }
  }, [setFeedConnected, applyVu, applyNowPlaying, applyListeners, applyDaemonLoad])
}
