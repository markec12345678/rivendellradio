// Event Bus — centralni event sistem za modularno arhitekturo
//
// Namesto da vsak modul kliče drugega, vsi moduli publishajo event-e
// na Event Bus, subscribri pa jih poslušajo.
//
// track.started → Event Bus → RDS, DAB+, WebSocket, Logger, AI, Now Playing, Analytics
//

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'

// ============================================================================
// Event tipi (v1 — z version + correlationId)
// ============================================================================

export interface BaseEvent {
  eventId: string // UUID za deduplikacijo
  version: number // event schema version (trenutno 1)
  type: string
  timestamp: number
  source: string // kateri modul je sprožil event
  correlationId: string // za sledenje kaskadnim dogodkom
  data: Record<string, unknown>
}

export interface TrackStartedEvent extends BaseEvent {
  type: 'track.started'
  data: {
    trackId: string
    title: string
    artist: string
    album: string
    albumArt?: string
    length: number
    station: string
    listeners: number
  }
}

export interface TrackFinishedEvent extends BaseEvent {
  type: 'track.finished'
  data: {
    trackId: string
    title: string
    artist: string
    playedDuration: number
    station: string
  }
}

export interface PlaylistUpdatedEvent extends BaseEvent {
  type: 'playlist.updated'
  data: {
    showId: string
    showName: string
    lineCount: number
    action: 'reorder' | 'add' | 'delete' | 'transition'
  }
}

export interface RequestCreatedEvent extends BaseEvent {
  type: 'request.created'
  data: {
    requestId: string
    trackId: string
    title: string
    artist: string
    listenerName: string
  }
}

export interface RequestApprovedEvent extends BaseEvent {
  type: 'request.approved'
  data: {
    requestId: string
    trackId: string
    title: string
  }
}

export interface RdsUpdatedEvent extends BaseEvent {
  type: 'rds.updated'
  data: {
    pi: string
    ps: string
    pty: number
    rt: string
    dls: string
  }
}

export interface VuUpdatedEvent extends BaseEvent {
  type: 'vu.updated'
  data: {
    left: number
    right: number
    peak: number
  }
}

export interface MicEvent extends BaseEvent {
  type: 'mic.open' | 'mic.closed'
  data: {
    micId: number
    studio: string
  }
}

export interface StudioEvent extends BaseEvent {
  type: 'studio.online' | 'studio.offline'
  data: {
    studioId: string
    studioName: string
  }
}

export interface StreamListenersChangedEvent extends BaseEvent {
  type: 'stream.listeners.changed'
  data: {
    stationId: string
    listeners: number
    delta: number
  }
}

export interface AlertCreatedEvent extends BaseEvent {
  type: 'alert.created'
  data: {
    alertId: string
    severity: 'info' | 'warning' | 'error' | 'critical'
    message: string
    source: string
  }
}

export type BroadcastEvent =
  | TrackStartedEvent
  | TrackFinishedEvent
  | PlaylistUpdatedEvent
  | RequestCreatedEvent
  | RequestApprovedEvent
  | RdsUpdatedEvent
  | VuUpdatedEvent
  | MicEvent
  | StudioEvent
  | StreamListenersChangedEvent
  | AlertCreatedEvent

export type EventHandler = (event: BroadcastEvent) => void

// ============================================================================
// Event Bus implementacija
// ============================================================================

class EventBus {
  private emitter = new EventEmitter()
  private history: BroadcastEvent[] = []
  private maxHistory = 100

  constructor() {
    this.emitter.setMaxListeners(50) // veliko subscriberjev
  }

  /** Publish event na bus — vsi subscriberji prejmejo + persist v DB */
  publish(event: BroadcastEvent): void {
    // Shrani v memory history
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Persist v database (async, ne blokiraj)
    this.persistEvent(event).catch(() => {})

    // Fire webhook subscriptions (async, ne blokiraj)
    this.fireWebhooks(event).catch(() => {})

    // Emit vsem subscriberjem
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event) // wildcard — vsi dogodki
  }

  /** Persist event v EventStore (database) */
  private async persistEvent(event: BroadcastEvent): Promise<void> {
    try {
      await db.eventStore.create({
        data: {
          eventId: event.eventId,
          type: event.type,
          version: event.version,
          source: event.source,
          correlationId: event.correlationId,
          data: JSON.stringify(event.data),
          timestamp: new Date(event.timestamp),
        },
      })
    } catch {
      // Silent fail — ne blokiraj event bus-a
    }
  }

  /** Fire webhook subscriptions za ta event */
  private async fireWebhooks(event: BroadcastEvent): Promise<void> {
    try {
      const webhooks = await db.webhook.findMany({ where: { active: true } })
      for (const wh of webhooks) {
        // Preveri ali je webhook subscribed na ta event type
        const subscribedTypes = wh.events.split(',').map((s) => s.trim())
        if (!subscribedTypes.includes('*') && !subscribedTypes.includes(event.type)) continue

        // Pošlji webhook (ne čakaj na rezultat)
        this.deliverWebhook(wh, event).catch(() => {})
      }
    } catch {
      // Silent fail
    }
  }

  /** Deliver webhook z HMAC signing in fail tracking */
  private async deliverWebhook(wh: { id: number; url: string; secret: string | null }, event: BroadcastEvent): Promise<void> {
    try {
      const body = JSON.stringify(event)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      // HMAC signing če ima secret
      if (wh.secret) {
        const crypto = await import('crypto')
        const signature = crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
        headers['X-Webhook-Signature'] = `sha256=${signature}`
      }

      const res = await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) })

      // Update webhook status
      await db.webhook.update({
        where: { id: wh.id },
        data: {
          lastFired: new Date(),
          lastStatus: res.status,
          failCount: res.ok ? 0 : { increment: 1 },
        },
      })
    } catch {
      // Network error — increment fail count
      await db.webhook.update({
        where: { id: wh.id },
        data: { failCount: { increment: 1 } },
      }).catch(() => {})
    }
  }

  /** Subscribe na specifičen event tip */
  subscribe(eventType: string, handler: EventHandler): () => void {
    this.emitter.on(eventType, handler)
    return () => this.emitter.off(eventType, handler)
  }

  /** Subscribe na vse evente (wildcard) */
  subscribeAll(handler: EventHandler): () => void {
    this.emitter.on('*', handler)
    return () => this.emitter.off('*', handler)
  }

  /** Pridobi zadnje evente (memory history) */
  getHistory(limit = 50): BroadcastEvent[] {
    return this.history.slice(-limit)
  }

  /** Pridobi zadnje evente določenega tipa (memory history) */
  getHistoryByType(type: string, limit = 20): BroadcastEvent[] {
    return this.history.filter((e) => e.type === type).slice(-limit)
  }

  /** Počisti memory history (DB history ostane) */
  clearHistory(): void {
    this.history = []
  }
}

// Singleton — ena instanca za celoten sistem
export const eventBus = new EventBus()

// ============================================================================
// Helper funkcije za publishanje tipičnih eventov (z auto correlationId)
// ============================================================================

function createEvent(type: string, source: string, data: Record<string, unknown>, correlationId?: string): BroadcastEvent {
  return {
    eventId: randomUUID(),
    version: 1,
    type,
    timestamp: Date.now(),
    source,
    correlationId: correlationId ?? randomUUID(),
    data,
  }
}

export function publishTrackStarted(data: TrackStartedEvent['data'], correlationId?: string): void {
  const event = createEvent('track.started', 'playout', data, correlationId)
  eventBus.publish(event)

  // Cascading: track.started → rds.updated (isti correlationId)
  publishRdsUpdated({
    pi: '887F',
    ps: 'ROCK887',
    pty: 11,
    ptyLabel: 'Rock music',
    rt: `${data.artist} - ${data.title}`,
    dls: `Now playing: ${data.title} by ${data.artist}`,
  }, event.correlationId)
}

export function publishTrackFinished(data: TrackFinishedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('track.finished', 'playout', data, correlationId))
}

export function publishRdsUpdated(data: RdsUpdatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('rds.updated', 'rds-engine', data, correlationId))
}

export function publishVuUpdated(data: VuUpdatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('vu.updated', 'audio-engine', data, correlationId))
}

export function publishRequestCreated(data: RequestCreatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('request.created', 'listener-api', data, correlationId))
}

export function publishAlert(data: AlertCreatedEvent['data'], correlationId?: string): void {
  eventBus.publish(createEvent('alert.created', data.source, data, correlationId))
}
