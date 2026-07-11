'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io as ioClient, Socket } from 'socket.io-client'

/**
 * useCollab — lightweight Yjs-style CRDT collaboration hook.
 *
 * Connects to the broadcast-feed mini-service (port 3003 via Caddy gateway)
 * and provides real-time presence, cursor sync, and document updates.
 *
 * Usage:
 *   const { peers, sendCursor, sendUpdate, isConnected } = useCollab({
 *     roomId: 'show-003',
 *     userId: 'alex@rock887.fm',
 *     userName: 'Alex Morgan',
 *     role: 'presenter',
 *     color: '#ef4444',
 *   })
 */

export interface CollabPeer {
  userId: string
  userName: string
  role: string
  color: string
  cursor?: { position: number; selection?: [number, number]; ts: number }
}

interface UseCollabOptions {
  roomId: string | null
  userId: string
  userName: string
  role: string
  color: string
}

interface UseCollabResult {
  isConnected: boolean
  peers: CollabPeer[]
  sendCursor: (position: number, selection?: [number, number]) => void
  sendUpdate: (update: number[], origin?: string) => void
  sendComment: (comment: any) => void
  onPeerUpdate: (cb: (peer: CollabPeer) => void) => void
  onPeerLeft: (cb: (userId: string) => void) => void
  onDocumentUpdate: (cb: (update: number[], userId: string) => void) => void
  onComment: (cb: (comment: any) => void) => void
}

export function useCollab(opts: UseCollabOptions): UseCollabResult {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState<CollabPeer[]>([])
  const callbacksRef = useRef<{
    onPeerUpdate?: (peer: CollabPeer) => void
    onPeerLeft?: (userId: string) => void
    onDocumentUpdate?: (update: number[], userId: string) => void
    onComment?: (comment: any) => void
  }>({})

  // Extract primitives so the effect only re-runs when actual string values change
  const roomId = roomId
  const userId = userId
  const userName = userName
  const role = role
  const color = color

  useEffect(() => {
    if (!roomId) return

    const socket = ioClient('/?XTransformPort=3003', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('collab:join', {
        roomId: roomId,
        userId: userId,
        userName: userName,
        role: role,
        color: color,
      })
    })

    socket.on('disconnect', () => setIsConnected(false))

    socket.on('collab:presence', (data: { roomId: string; peers: CollabPeer[] }) => {
      setPeers(data.peers.filter((p) => p.userId !== userId))
    })

    socket.on('collab:user-joined', (peer: CollabPeer) => {
      if (peer.userId === userId) return
      setPeers((prev) => {
        if (prev.some((p) => p.userId === peer.userId)) return prev
        return [...prev, peer]
      })
      callbacksRef.current.onPeerUpdate?.(peer)
    })

    socket.on('collab:user-left', (data: { userId: string }) => {
      setPeers((prev) => prev.filter((p) => p.userId !== data.userId))
      callbacksRef.current.onPeerLeft?.(data.userId)
    })

    socket.on('collab:cursor', (data: { userId: string; position: number; selection?: [number, number]; ts: number }) => {
      setPeers((prev) =>
        prev.map((p) =>
          p.userId === data.userId
            ? { ...p, cursor: { position: data.position, selection: data.selection, ts: data.ts } }
            : p,
        ),
      )
    })

    socket.on('collab:update', (data: { userId: string; update: number[]; origin: string; ts: number }) => {
      if (data.userId === userId) return
      callbacksRef.current.onDocumentUpdate?.(data.update, data.userId)
    })

    socket.on('collab:comment', (comment: any) => {
      callbacksRef.current.onComment?.(comment)
    })

    return () => {
      if (roomId) {
        socket.emit('collab:leave', { roomId: roomId })
      }
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setPeers([])
    }
  }, [roomId, userId, userName, role, color])

  const sendCursor = useCallback((position: number, selection?: [number, number]) => {
    if (!socketRef.current?.connected || !roomId) return
    socketRef.current.emit('collab:cursor', { roomId: roomId, position, selection })
  }, [roomId])

  const sendUpdate = useCallback((update: number[], origin = 'local') => {
    if (!socketRef.current?.connected || !roomId) return
    socketRef.current.emit('collab:update', { roomId: roomId, update, origin })
  }, [roomId])

  const sendComment = useCallback((comment: any) => {
    if (!socketRef.current?.connected || !roomId) return
    socketRef.current.emit('collab:comment', { roomId: roomId, comment })
  }, [roomId])

  const onPeerUpdate = useCallback((cb: (peer: CollabPeer) => void) => {
    callbacksRef.current.onPeerUpdate = cb
  }, [])
  const onPeerLeft = useCallback((cb: (userId: string) => void) => {
    callbacksRef.current.onPeerLeft = cb
  }, [])
  const onDocumentUpdate = useCallback((cb: (update: number[], userId: string) => void) => {
    callbacksRef.current.onDocumentUpdate = cb
  }, [])
  const onComment = useCallback((cb: (comment: any) => void) => {
    callbacksRef.current.onComment = cb
  }, [])

  return {
    isConnected,
    peers,
    sendCursor,
    sendUpdate,
    sendComment,
    onPeerUpdate,
    onPeerLeft,
    onDocumentUpdate,
    onComment,
  }
}
