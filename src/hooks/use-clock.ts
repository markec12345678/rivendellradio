'use client'

import { useEffect } from 'react'
import { useLiveStore } from '@/lib/stores/live'

export function useClock() {
  const advanceClock = useLiveStore((s) => s.advanceClock)
  useEffect(() => {
    advanceClock() // Set initial time on client only
    const id = setInterval(advanceClock, 1000)
    return () => clearInterval(id)
  }, [advanceClock])
}
