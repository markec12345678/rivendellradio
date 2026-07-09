'use client'

import { useEffect, useRef } from 'react'
import { useAirplayStore } from '@/lib/stores/airplay'
import { Activity } from 'lucide-react'

interface WaveformDisplayProps {
  /** Machine index (0 = Main) */
  machine?: number
  /** Height of the canvas in px */
  height?: number
  /** Show dBFS scale labels */
  showScale?: boolean
}

const BUFFER_SIZE = 240 // ~24s of history at 10Hz
const PEAK_DECAY = 0.985 // peak hold decay per frame

/**
 * Real-time scrolling stereo waveform display.
 *
 * Reads VU values (L, R) from the broadcast-feed WebSocket via the Zustand
 * store and renders a scrolling canvas waveform with peak-hold markers and
 * a dBFS scale. Designed to look like a professional broadcast meter.
 */
export function WaveformDisplay({
  machine = 0,
  height = 120,
  showScale = true,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Rolling sample buffers (0..1 amplitude)
  const leftBuf = useRef<Float32Array>(new Float32Array(BUFFER_SIZE))
  const rightBuf = useRef<Float32Array>(new Float32Array(BUFFER_SIZE))
  const writeIdx = useRef(0)
  const filled = useRef(0)
  // Peak hold values
  const leftPeak = useRef(0)
  const rightPeak = useRef(0)
  // Last seen VU to detect new samples
  const lastVu = useRef<[number, number]>([0, 0])

  const vu = useAirplayStore((s) => s.vu[machine])
  const feedConnected = useAirplayStore((s) => s.feedConnected)

  // Push new VU sample into the ring buffer when it changes
  useEffect(() => {
    if (vu[0] === lastVu.current[0] && vu[1] === lastVu.current[1]) return
    lastVu.current = vu
    const i = writeIdx.current
    leftBuf.current[i] = vu[0]
    rightBuf.current[i] = vu[1]
    writeIdx.current = (i + 1) % BUFFER_SIZE
    if (filled.current < BUFFER_SIZE) filled.current++
    // Update peak hold
    if (vu[0] > leftPeak.current) leftPeak.current = vu[0]
    if (vu[1] > rightPeak.current) rightPeak.current = vu[1]
  }, [vu])

  // Render loop — 30 FPS canvas redraw
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
      if (ts - lastDraw < 33) return // ~30 FPS
      lastDraw = ts

      // Decay peaks
      leftPeak.current *= PEAK_DECAY
      rightPeak.current *= PEAK_DECAY

      const w = container.clientWidth
      const h = height
      ctx.clearRect(0, 0, w, h)

      // Background grid
      ctx.fillStyle = 'oklch(0.13 0.005 250 / 0.6)'
      ctx.fillRect(0, 0, w, h)

      // Center line (silence)
      const midY = h / 2
      ctx.strokeStyle = 'oklch(0.25 0.008 250)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, midY)
      ctx.lineTo(w, midY)
      ctx.stroke()

      // dBFS grid lines (-6, -12, -18, -24 dB)
      if (showScale) {
        ctx.strokeStyle = 'oklch(0.22 0.006 250 / 0.7)'
        ctx.fillStyle = 'oklch(0.5 0.01 250)'
        ctx.font = '9px monospace'
        ctx.lineWidth = 0.5
        const dbMarks = [-6, -12, -18, -24, -36]
        for (const db of dbMarks) {
          const amp = Math.pow(10, db / 20) // 0..1
          const yOff = amp * (h / 2 - 4)
          // Top (L channel)
          ctx.beginPath()
          ctx.setLineDash([2, 4])
          ctx.moveTo(0, midY - yOff)
          ctx.lineTo(w, midY - yOff)
          ctx.stroke()
          // Bottom (R channel)
          ctx.beginPath()
          ctx.moveTo(0, midY + yOff)
          ctx.lineTo(w, midY + yOff)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillText(`${db}`, 2, midY - yOff - 2)
        }
      }

      // Waveform — draw filled area from center
      const count = filled.current
      if (count === 0) {
        // No data yet
        ctx.fillStyle = 'oklch(0.5 0.01 250)'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          feedConnected ? 'awaiting signal…' : 'feed offline — fallback VU',
          w / 2,
          midY,
        )
        ctx.textAlign = 'left'
        return
      }

      const stepX = w / BUFFER_SIZE
      const startIdx = (writeIdx.current - count + BUFFER_SIZE) % BUFFER_SIZE

      // Left channel (top half, mirrored up from center)
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

        // Gradient fill: green→amber→red based on amplitude
        const grad = ctx.createLinearGradient(0, midY - h / 2, 0, midY + h / 2)
        if (sign === 1) {
          grad.addColorStop(0, 'oklch(0.65 0.22 25 / 0.5)') // red top
          grad.addColorStop(0.3, 'oklch(0.72 0.18 60 / 0.4)') // amber
          grad.addColorStop(1, 'oklch(0.646 0.222 41.116 / 0.15)') // green
        } else {
          grad.addColorStop(0, 'oklch(0.646 0.222 41.116 / 0.15)') // green
          grad.addColorStop(0.7, 'oklch(0.72 0.18 60 / 0.4)') // amber
          grad.addColorStop(1, 'oklch(0.65 0.22 25 / 0.5)') // red bottom
        }
        ctx.fillStyle = grad
        ctx.fill()

        // Stroke line on top
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

        // Peak hold marker (horizontal line at current peak)
        const peakY = midY - sign * peak * (h / 2 - 4)
        ctx.beginPath()
        ctx.moveTo(0, peakY)
        ctx.lineTo(w, peakY)
        ctx.strokeStyle =
          peak >= 0.9
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

      // Playhead (right edge — most recent sample)
      const headX = (count - 1) * stepX
      ctx.beginPath()
      ctx.moveTo(headX, 0)
      ctx.lineTo(headX, h)
      ctx.strokeStyle = 'oklch(0.72 0.18 60 / 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Channel labels
      ctx.fillStyle = 'oklch(0.55 0.01 250)'
      ctx.font = '9px monospace'
      ctx.fillText('L', w - 12, 12)
      ctx.fillText('R', w - 12, h - 4)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [height, showScale, feedConnected])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-md border border-border bg-background/40"
      role="img"
      aria-label={`Real-time stereo waveform for log machine ${machine}`}
    >
      <canvas ref={canvasRef} className="block w-full" style={{ height }} />
      <div className="pointer-events-none absolute left-2 top-1.5 flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        <Activity className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
        Waveform · 24s
      </div>
    </div>
  )
}
