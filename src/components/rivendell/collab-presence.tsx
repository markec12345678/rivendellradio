'use client'

import { useState } from 'react'
import { useCollab } from '@/lib/collab/use-collab'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wifi, WifiOff, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * CollabPresenceIndicator — demonstrates live Yjs-style CRDT collaboration.
 *
 * Shows real-time presence of users in a shared "system-dashboard" room.
 * Multiple browser tabs opening this page will see each other's cursors.
 */

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  'technical-engineer': '#3b82f6',
  'program-director': '#8b5cf6',
  producer: '#10b981',
  presenter: '#f59e0b',
  'read-only': '#6b7280',
}

export function CollabPresenceIndicator() {
  // Stable identity for this browser tab (generated once)
  const [identity] = useState(() => ({
    userId: `viewer-${Math.random().toString(36).slice(2, 8)}`,
    userName: 'Dashboard Viewer',
    role: 'read-only',
    color: ROLE_COLORS['read-only'],
  }))

  // Demo: join a shared room to show presence across browser tabs
  const { isConnected, peers } = useCollab({
    roomId: 'system-dashboard',
    userId: identity.userId,
    userName: identity.userName,
    role: identity.role,
    color: identity.color,
  })

  return (
    <Card className="border-primary/30 bg-card/80">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              Live Collaboration
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Yjs CRDT sync · presence · cursor tracking (open multiple tabs to test)
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn('text-[9px]', isConnected ? 'border-emerald-500/40 text-emerald-400' : 'border-muted-foreground/40 text-muted-foreground')}>
            {isConnected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
            {isConnected ? 'connected' : 'offline'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {/* Self */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
              style={{ backgroundColor: ROLE_COLORS['read-only'] }}
              title="You"
            >
              ME
            </div>
            {/* Peers */}
            {peers.map((peer) => (
              <div
                key={peer.userId}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white"
                style={{ backgroundColor: peer.color }}
                title={`${peer.userName} (${peer.role})`}
              >
                {peer.userName.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-foreground">
              {peers.length === 0 ? 'Only you viewing' : `${peers.length + 1} viewers active`}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {peers.length > 0
                ? peers.map((p) => p.userName).join(', ')
                : 'Open this page in another tab to see live presence'}
            </div>
          </div>
        </div>
        {peers.length > 0 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse" />
            Real-time sync active — CRDT updates broadcast instantly
          </div>
        )}
      </CardContent>
    </Card>
  )
}
