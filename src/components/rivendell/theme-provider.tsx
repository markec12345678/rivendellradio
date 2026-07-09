'use client'

import { useEffect } from 'react'
import { useTheme } from '@/lib/rivendell/api'
import type { ThemeMode } from '@/lib/rivendell/types'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const mode: ThemeMode = theme.data?.mode ?? 'dark'
  const hue = theme.data?.accentHue ?? 60

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-metal', 'theme-light')
    root.classList.add(`theme-${mode}`)

    const accentHue = (hue + 335) % 360
    const vars: Record<string, string> = {}

    if (mode === 'dark') {
      vars['--background'] = `oklch(0.13 0.005 ${hue})`
      vars['--foreground'] = 'oklch(0.96 0.005 0)'
      vars['--card'] = `oklch(0.17 0.006 ${hue})`
      vars['--card-foreground'] = 'oklch(0.96 0.005 0)'
      vars['--popover'] = `oklch(0.17 0.006 ${hue})`
      vars['--popover-foreground'] = 'oklch(0.96 0.005 0)'
      vars['--primary'] = `oklch(0.72 0.18 ${hue})`
      vars['--primary-foreground'] = 'oklch(0.13 0.005 0)'
      vars['--secondary'] = `oklch(0.22 0.008 ${hue})`
      vars['--secondary-foreground'] = 'oklch(0.96 0.005 0)'
      vars['--muted'] = `oklch(0.22 0.008 ${hue})`
      vars['--muted-foreground'] = 'oklch(0.65 0.01 0)'
      vars['--accent'] = `oklch(0.65 0.22 ${accentHue})`
      vars['--accent-foreground'] = 'oklch(0.96 0.005 0)'
      vars['--border'] = `oklch(0.25 0.008 ${hue})`
      vars['--input'] = `oklch(0.25 0.008 ${hue})`
      vars['--ring'] = `oklch(0.72 0.18 ${hue})`
      vars['--sidebar'] = `oklch(0.15 0.006 ${hue})`
      vars['--sidebar-foreground'] = 'oklch(0.96 0.005 0)'
      vars['--sidebar-border'] = `oklch(0.25 0.008 ${hue})`
    } else if (mode === 'metal') {
      vars['--background'] = 'oklch(0.28 0.005 250)'
      vars['--foreground'] = 'oklch(0.95 0.005 250)'
      vars['--card'] = 'oklch(0.33 0.006 250)'
      vars['--card-foreground'] = 'oklch(0.95 0.005 250)'
      vars['--popover'] = 'oklch(0.33 0.006 250)'
      vars['--popover-foreground'] = 'oklch(0.95 0.005 250)'
      vars['--primary'] = `oklch(0.75 0.18 ${hue})`
      vars['--primary-foreground'] = 'oklch(0.15 0.005 250)'
      vars['--secondary'] = 'oklch(0.38 0.008 250)'
      vars['--secondary-foreground'] = 'oklch(0.95 0.005 250)'
      vars['--muted'] = 'oklch(0.38 0.008 250)'
      vars['--muted-foreground'] = 'oklch(0.7 0.01 250)'
      vars['--accent'] = `oklch(0.68 0.22 ${accentHue})`
      vars['--accent-foreground'] = 'oklch(0.95 0.005 250)'
      vars['--border'] = 'oklch(0.42 0.008 250)'
      vars['--input'] = 'oklch(0.42 0.008 250)'
      vars['--ring'] = `oklch(0.75 0.18 ${hue})`
      vars['--sidebar'] = 'oklch(0.3 0.006 250)'
      vars['--sidebar-foreground'] = 'oklch(0.95 0.005 250)'
      vars['--sidebar-border'] = 'oklch(0.42 0.008 250)'
    } else {
      vars['--background'] = 'oklch(0.98 0.003 0)'
      vars['--foreground'] = 'oklch(0.15 0.005 0)'
      vars['--card'] = 'oklch(1 0 0)'
      vars['--card-foreground'] = 'oklch(0.15 0.005 0)'
      vars['--popover'] = 'oklch(1 0 0)'
      vars['--popover-foreground'] = 'oklch(0.15 0.005 0)'
      vars['--primary'] = `oklch(0.5 0.18 ${hue})`
      vars['--primary-foreground'] = 'oklch(0.98 0.003 0)'
      vars['--secondary'] = 'oklch(0.95 0.005 0)'
      vars['--secondary-foreground'] = 'oklch(0.15 0.005 0)'
      vars['--muted'] = 'oklch(0.95 0.005 0)'
      vars['--muted-foreground'] = 'oklch(0.5 0.01 0)'
      vars['--accent'] = `oklch(0.55 0.22 ${accentHue})`
      vars['--accent-foreground'] = 'oklch(0.98 0.003 0)'
      vars['--border'] = 'oklch(0.9 0.005 0)'
      vars['--input'] = 'oklch(0.9 0.005 0)'
      vars['--ring'] = `oklch(0.5 0.18 ${hue})`
      vars['--sidebar'] = 'oklch(0.97 0.003 0)'
      vars['--sidebar-foreground'] = 'oklch(0.15 0.005 0)'
      vars['--sidebar-border'] = 'oklch(0.9 0.005 0)'
    }

    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  }, [mode, hue])

  return <>{children}</>
}
