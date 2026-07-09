'use client'

import { motion } from 'framer-motion'

interface VuMeterProps {
  values: [number, number] // L, R in 0..1
  height?: number
  width?: number
}

const SEGMENTS = 16

function segmentColor(level: number): string {
  // 0..0.7 green (primary), 0.7..0.9 amber, 0.9..1 red
  if (level >= 0.9) return 'bg-accent'
  if (level >= 0.7) return 'bg-primary'
  return 'bg-primary/60'
}

export function VuMeter({ values, height = 80, width = 12 }: VuMeterProps) {
  const [l, r] = values
  return (
    <div
      className="flex items-end gap-1.5 rounded-md border border-border bg-background/40 p-1.5"
      role="meter"
      aria-label="VU meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.max(l, r) * 100)}
      style={{ height }}
    >
      {[l, r].map((v, idx) => (
        <div
          key={idx}
          className="flex flex-col-reverse gap-0.5"
          style={{ width, height: height - 12 }}
        >
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const segLevel = (i + 1) / SEGMENTS
            const active = v >= segLevel - 1 / SEGMENTS
            return (
              <motion.div
                key={i}
                className={`h-1 rounded-sm ${active ? segmentColor(segLevel) : 'bg-border/60'}`}
                animate={{ opacity: active ? 1 : 0.3 }}
                transition={{ duration: 0.08 }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
