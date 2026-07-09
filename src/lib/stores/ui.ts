'use client'

import { create } from 'zustand'

// Zetta-style 3-layer color system:
// 1. Theme (dark/metal/light) — handled by ThemeProvider
// 2. Appearance rules — per-attribute cell coloring
// 3. Row highlighting — highlight entire row when attribute matches

export interface AppearanceRule {
  field: string
  value: string
  foreground: string | null
  background: string | null
  bold: boolean
  enabled: boolean
}

export interface RowHighlight {
  field: string
  value: string
  foreground: string | null
  background: string | null
  enabled: boolean
}

interface UiState {
  appearanceRules: AppearanceRule[]
  rowHighlights: RowHighlight[]
  setAppearanceRules: (rules: AppearanceRule[]) => void
  setRowHighlights: (highlights: RowHighlight[]) => void
}

// Default appearance rules (Zetta-style per-attribute coloring)
const defaultAppearanceRules: AppearanceRule[] = [
  { field: 'group', value: 'MUSIC', foreground: 'oklch(0.72 0.18 60)', background: 'oklch(0.72 0.18 60 / 0.12)', bold: false, enabled: true },
  { field: 'group', value: 'JINGLES', foreground: 'oklch(0.7 0.15 180)', background: 'oklch(0.7 0.15 180 / 0.12)', bold: false, enabled: true },
  { field: 'group', value: 'ADS', foreground: 'oklch(0.65 0.22 25)', background: 'oklch(0.65 0.22 25 / 0.12)', bold: true, enabled: true },
  { field: 'group', value: 'PROMOS', foreground: 'oklch(0.7 0.18 300)', background: 'oklch(0.7 0.18 300 / 0.12)', bold: false, enabled: true },
  { field: 'origin', value: 'cd', foreground: 'oklch(0.6 0.12 145)', background: null, bold: false, enabled: true },
  { field: 'origin', value: 'ftp', foreground: 'oklch(0.65 0.15 25)', background: null, bold: false, enabled: true },
]

// Default row highlights (Zetta-style full-row highlighting)
const defaultRowHighlights: RowHighlight[] = [
  { field: 'group', value: 'ADS', foreground: 'oklch(0.95 0 0)', background: 'oklch(0.65 0.22 25 / 0.25)', enabled: true },
  { field: 'group', value: 'JINGLES', foreground: 'oklch(0.95 0 0)', background: 'oklch(0.7 0.15 180 / 0.2)', enabled: true },
  { field: 'group', value: 'PROMOS', foreground: 'oklch(0.95 0 0)', background: 'oklch(0.7 0.18 300 / 0.2)', enabled: true },
]

export const useUiStore = create<UiState>((set) => ({
  appearanceRules: defaultAppearanceRules,
  rowHighlights: defaultRowHighlights,
  setAppearanceRules: (rules) => set({ appearanceRules: rules }),
  setRowHighlights: (highlights) => set({ rowHighlights: highlights }),
}))

/**
 * Returns the effective cell style for a given field/value pair.
 * Layer 2: Appearance rules — per-attribute coloring.
 */
export function useAppearanceStyle() {
  const rules = useUiStore((s) => s.appearanceRules)
  return (field: string, value: string | undefined | null): React.CSSProperties => {
    if (!value) return {}
    const rule = rules.find(
      (r) => r.enabled && r.field === field && r.value.toLowerCase() === String(value).toLowerCase(),
    )
    if (!rule) return {}
    const style: React.CSSProperties = {}
    if (rule.foreground) style.color = rule.foreground
    if (rule.background) style.backgroundColor = rule.background
    if (rule.bold) style.fontWeight = 700
    return style
  }
}

/**
 * Returns the effective row style based on matching attributes.
 * Layer 3: Row highlighting — highlights the entire row.
 */
export function useRowHighlightStyle() {
  const highlights = useUiStore((s) => s.rowHighlights)
  return (attrs: Record<string, string | undefined | null>): React.CSSProperties => {
    for (const h of highlights) {
      if (!h.enabled) continue
      const v = attrs[h.field]
      if (v && String(v).toLowerCase() === h.value.toLowerCase()) {
        const style: React.CSSProperties = {}
        if (h.foreground) style.color = h.foreground
        if (h.background) style.backgroundColor = h.background
        return style
      }
    }
    return {}
  }
}
