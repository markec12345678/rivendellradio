'use client'

import { useEffect, useRef } from 'react'
import { useLiveStore } from '@/lib/stores/live'
import { Activity } from 'lucide-react'

interface WaveformDisplayProps {
  height?: number
}

const BUFFER_SIZE = 240
const PEAK_DECAY = 0.985

/**
 * Real-time scrolling stereo waveform display.
 * Reads VU values (L, R) from the broadcast-feed WebSocket via the Zustand
 * store and renders a scrolling canvas waveform with peak-hold markers and
 * a dBFS scale.
 */
export function WaveformDisplay({ height = 120 }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftBuf = useRef<Float32Array>(new Float32Array(BUFFER_SIZE))
  const rightBuf = useRef<Float32Array>(new Float32Array(BUFFER_SIZE))
  const writeIdx = useRef(0)
  const filled = useRef(0)
  const leftPeak = useRef(0)
  const rightPeak = useRef(0)
  const lastVu = useRef<[number, number]>([0, 0])

  const vu = useLiveStore((s) => s.vu)
  const feedConnected = useLiveStore((s) => s.feedConnected)

  // Push new VU sample into ring buffer when it changes
  useEffect(() => {
    if (vu[0] === lastVu.current[0] && vu[1] === lastVu.current[1]) return
    lastVu.current = vu
    const i = writeIdx.current
    leftBuf.current[i] = vu[0]
    rightBuf.current[i] = vu[1]
    writeIdx.current = (i + 1) % BUFFER_SIZE
    if (filled.current < BUFFER_SIZE) filled.current++
    if (vu[0] > leftPeak.current) leftPeak.current = vu[0]
    if (vu[1] > rightPeak.current) rightPeak.current = vu[1]
  }, [vu])

  // Render loop — 30 FPS
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let lastDraw = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      canvas.width = w * dpr
      canvas.height = height * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw)
      if (ts - lastDraw < 33) return
      lastDraw = ts

      leftPeak.current *= PEAK_DECAY
      rightPeak.current *= PEAK_DECAY

      const w = container.clientWidth
      const h = height
      ctx.clearRect(0, 0, w, h)

      // Background
      ctx.fillStyle = 'oklch(0.13 0.005 60 / 0.6)'
      ctx.fillRect(0, 0, w, h)

      const midY = h / 2

      // Center line
      ctx.strokeStyle = 'oklch(0.25 0.008 60)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(w, midY)
      ctx.stroke()

      // dBFS grid
      ctx.strokeStyle = 'oklch(0.22 0.006 60 / 0.7)'
      ctx.fillStyle = 'oklch(0.5 0.01 60)'
      ctx.font = '9px monospace'
      ctx.lineWidth = 0.5
      const dbMarks = [-6, -12, -18, -24, -36]
      for (const db of dbMarks) {
        const amp = Math.pow(10, db / 20)
        const yOff = amp * (h / 2 - 4)
        ctx.beginPath()
        ctx.setLineDash([2, 4])
        ctx.moveTo(0, midY - yOff)
        ctx.lineTo(w, midY - yOff)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, midY + yOff)
        ctx.lineTo(w, midY + yOff)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillText(`${db}`, 2, midY - yOff - 2)
      }

      const count = filled.current
      if (count === 0) {
        ctx.fillStyle = 'oklch(0.5 0.01 60)'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(feedConnected ? 'awaiting signal…' : 'feed offline', w / 2, midY)
        ctx.textAlign = 'left'
        return
      }

      const stepX = w / BUFFER_SIZE
      const startIdx = (writeIdx.current - count + BUFFER_SIZE) % BUFFER_SIZE

      const drawChannel = (buf: Float32Array, sign: 1 | -1, peak: number) => {
        // Filled waveform
        ctx.beginPath()
        ctx.moveTo(0, midY)
        for (let i = 0; i < count; i++) {
          const bufIdx = (startIdx + i) % BUFFER_SIZE
          const v = buf[bufIdx]
          const x = i * stepX
          const y = midY - sign * v * (h / 2 - 4)
          ctx.lineTo(x, y)
        }
        ctx.lineTo((count - 1) * stepX, midY)
        ctx.closePath()

        const grad = ctx.createLinearGradient(0, midY - h / 2, 0, midY + h / 2)
        if (sign === 1) {
          grad.addColorStop(0, 'oklch(0.65 0.22 25 / 0.5)')
          grad.addColorStop(0.3, 'oklch(0.72 0.18 60 / 0.4)')
          grad.addColorStop(1, 'oklch(0.646 0.222 41.116 / 0.15)')
        } else {
          grad.addColorStop(0, 'oklch(0.646 0.222 41.116 / 0.15)')
          grad.addColorStop(0.7, 'oklch(0.72 0.18 60 / 0.4)')
          grad.addColorStop(1, 'oklch(0.65 0.22 25 / 0.5)')
        }
        ctx.fillStyle = grad
        ctx.fill()

        // Stroke line
        ctx.beginPath()
        for (let i = 0; i < count; i++) {
          const bufIdx = (startIdx + i) % BUFFER_SIZE
          const v = buf[bufIdx]
          const x = i * stepX
          const y = midY - sign * v * (h / 2 - 4)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = sign === 1 ? 'oklch(0.72 0.18 60 / 0.9)' : 'oklch(0.646 0.222 41.116 / 0.9)'
        ctx.lineWidth = 1.2
        ctx.stroke()

        // Peak hold marker
        const peakY = midY - sign * peak * (h / 2 - 4)
        ctx.beginPath()
        ctx.moveTo(0, peakY)
        ctx.lineTo(w, peakY)
        ctx.strokeStyle = peak >= 0.9
          ? 'oklch(0.65 0.22 25 / 0.8)'
          : peak >= 0.7
            ? 'oklch(0.72 0.18 60 / 0.8)'
            : 'oklch(0.646 0.222 41.116 / 0.5)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.setLineDash([])
      }

      drawChannel(leftBuf.current, 1, leftPeak.current)
      drawChannel(rightBuf.current, -1, rightPeak.current)

      // Playhead
      const headX = (count - 1) * stepX
      ctx.beginPath()
      ctx.moveTo(headX, 0)
      ctx.lineTo(headX, h)
      ctx.strokeStyle = 'oklch(0.72 0.18 60 / 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Channel labels
      ctx.fillStyle = 'oklch(0.55 0.01 60)'
      ctx.font = '9px monospace'
      ctx.fillText('L', w - 12, 12)
      ctx.fillText('R', w - 12, h - 4)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [height, feedConnected])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-md border border-border bg-background/40"
      role="img"
      aria-label="Real-time stereo waveform"
    >
      <canvas ref={canvasRef} className="block w-full" style={{ height }} />
      <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Activity className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
        Waveform · 24s
      </div>
    </div>
  )
}
