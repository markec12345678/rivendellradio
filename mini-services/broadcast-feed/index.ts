// broadcast-feed — real-time broadcast telemetry over WebSocket
// Port: 3003 (Caddy forwards via ?XTransformPort=3003)

import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

const PORT = 3003

// Rock playlist for simulation — cycles through real tracks
const playlist = [
  { id: 't003', title: 'Thunderstruck', artist: 'AC/DC', album: 'The Razors Edge', length: 292000 },
  { id: 't021', title: 'Everlong', artist: 'Foo Fighters', album: 'The Colour and the Shape', length: 250000 },
  { id: 't024', title: 'In the End', artist: 'Linkin Park', album: 'Hybrid Theory', length: 216000 },
  { id: 't005', title: 'We Will Rock You', artist: 'Queen', album: 'News of the World', length: 122000 },
  { id: 't015', title: 'Black Hole Sun', artist: 'Soundgarden', album: 'Superunknown', length: 320000 },
  { id: 't030', title: 'It\'s My Life', artist: 'Bon Jovi', album: 'Crush', length: 224000 },
  { id: 't018', title: 'Seven Nation Army', artist: 'The White Stripes', album: 'Elephant', length: 232000 },
  { id: 't029', title: 'Livin\' on a Prayer', artist: 'Bon Jovi', album: 'Slippery When Wet', length: 250000 },
]

let playlistIdx = 0
let elapsed = 0

// VU state
let vuL = 0.5, vuR = 0.5

// Listeners
const listeners: Record<string, number> = {
  'main-fm': 1287,
  'web-hd': 412,
  'mobile': 89,
}

const daemons = [
  { name: 'caed', baseCpu: 8.4, baseMem: 142 },
  { name: 'ripcd', baseCpu: 1.2, baseMem: 38 },
  { name: 'rdcatchd', baseCpu: 0.4, baseMem: 24 },
  { name: 'rdpadengined', baseCpu: 2.1, baseMem: 56 },
  { name: 'rdrssd', baseCpu: 0.1, baseMem: 12 },
]

const connected = new Set<string>()

io.on('connection', (socket) => {
  connected.add(socket.id)
  console.log(`[broadcast-feed] client connected: ${socket.id} (total: ${connected.size})`)
  socket.emit('hello', { server: 'broadcast-feed', version: '1.0.0', ts: Date.now() })
  socket.on('disconnect', () => {
    connected.delete(socket.id)
    console.log(`[broadcast-feed] disconnected: ${socket.id} (${connected.size})`)
  })
})

// VU meter: 10 Hz
setInterval(() => {
  const target = 0.5 + Math.random() * 0.35
  vuL = vuL * 0.6 + target * 0.4 + (Math.random() - 0.5) * 0.08
  vuR = vuR * 0.6 + target * 0.4 + (Math.random() - 0.5) * 0.08
  vuL = Math.max(0, Math.min(1, vuL))
  vuR = Math.max(0, Math.min(1, vuR))
  io.emit('vu', { left: vuL, right: vuR, ts: Date.now() })
}, 100)

// Now playing: 5s tick
setInterval(() => {
  elapsed += 5000
  const current = playlist[playlistIdx]
  if (elapsed >= current.length) {
    elapsed = 0
    playlistIdx = (playlistIdx + 1) % playlist.length
  }
  const now = playlist[playlistIdx]
  io.emit('now-playing', {
    trackId: now.id,
    title: now.title,
    artist: now.artist,
    album: now.album,
    length: now.length,
    elapsed,
    remaining: Math.max(0, now.length - elapsed),
    listeners: listeners['main-fm'] ?? 0,
    ts: Date.now(),
  })
}, 5000)

// Listeners: 1s
setInterval(() => {
  for (const id of Object.keys(listeners)) {
    const delta = Math.floor((Math.random() - 0.45) * 5)
    listeners[id] = Math.max(0, listeners[id] + delta)
    io.emit('listeners', { stationId: id, listeners: listeners[id], ts: Date.now() })
  }
}, 1000)

// Daemon load: 2s
setInterval(() => {
  for (const d of daemons) {
    const cpu = Math.max(0, d.baseCpu + (Math.random() - 0.5) * d.baseCpu * 0.6)
    const mem = Math.round(d.baseMem + (Math.random() - 0.5) * 8)
    io.emit('daemon-load', { name: d.name, cpuPercent: Number(cpu.toFixed(2)), memoryMb: mem, ts: Date.now() })
  }
}, 2000)

httpServer.listen(PORT, '::', () => {
  console.log(`[broadcast-feed] WebSocket server on port ${PORT} (dual-stack)`)
})

process.on('SIGTERM', () => io.close(() => httpServer.close(() => process.exit(0))))
process.on('SIGINT', () => io.close(() => httpServer.close(() => process.exit(0))))
