// Event Bus — centralni event sistem za modularno arhitekturo
//
// Namesto da vsak modul kliče drugega, vsi moduli publishajo event-e
// na Event Bus, subscribri pa jih poslušajo.
//
// track.started → Event Bus → RDS, DAB+, WebSocket, Logger, AI, Now Playing, Analytics
//

import { EventEmitter } from 'events'

// ============================================================================
// Event tipi
// ============================================================================

export interface BaseEvent {
  type: string
  timestamp: number
  source: string // kateri modul je sprožil event
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

  /** Publish event na bus — vsi subscriberji prejmejo */
  publish(event: BroadcastEvent): void {
    // Shrani v zgodovino
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Emit vsem subscriberjem
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event) // wildcard — vsi dogodki
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

  /** Pridobi zadnje evente (zgodovina) */
  getHistory(limit = 50): BroadcastEvent[] {
    return this.history.slice(-limit)
  }

  /** Pridobi zadnje evente določenega tipa */
  getHistoryByType(type: string, limit = 20): BroadcastEvent[] {
    return this.history.filter((e) => e.type === type).slice(-limit)
  }

  /** Počisti zgodovino */
  clearHistory(): void {
    this.history = []
  }
}

// Singleton — ena instanca za celoten sistem
export const eventBus = new EventBus()

// ============================================================================
// Helper funkcije za publishanje tipičnih eventov
// ============================================================================

export function publishTrackStarted(data: TrackStartedEvent['data']): void {
  eventBus.publish({
    type: 'track.started',
    timestamp: Date.now(),
    source: 'playout',
    data,
  })
}

export function publishTrackFinished(data: TrackFinishedEvent['data']): void {
  eventBus.publish({
    type: 'track.finished',
    timestamp: Date.now(),
    source: 'playout',
    data,
  })
}

export function publishRdsUpdated(data: RdsUpdatedEvent['data']): void {
  eventBus.publish({
    type: 'rds.updated',
    timestamp: Date.now(),
    source: 'rds-engine',
    data,
  })
}

export function publishVuUpdated(data: VuUpdatedEvent['data']): void {
  eventBus.publish({
    type: 'vu.updated',
    timestamp: Date.now(),
    source: 'audio-engine',
    data,
  })
}

export function publishRequestCreated(data: RequestCreatedEvent['data']): void {
  eventBus.publish({
    type: 'request.created',
    timestamp: Date.now(),
    source: 'listener-api',
    data,
  })
}

export function publishAlert(data: AlertCreatedEvent['data']): void {
  eventBus.publish({
    type: 'alert.created',
    timestamp: Date.now(),
    source: data.source,
    data,
  })
}
