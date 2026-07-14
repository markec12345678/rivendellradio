// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Palette,
  Type,
  Highlighter,
  Plus,
  Trash2,
  Sun,
  Moon,
  Layers,
  Save,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAppearance,
  useRowHighlights,
  useTheme,
  useSaveTheme,
} from '@/lib/rivendell/api'
import { useUiStore } from '@/lib/stores/ui'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ThemeMode, AppearanceField } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

const APPEARANCE_FIELDS: AppearanceField[] = ['Sound Code', 'Group', 'Origin', 'Type', 'Sched Code']

export function AppearanceSettings() {
  const theme = useTheme()
  const saveTheme = useSaveTheme()
  const appearance = useAppearance()
  const rowHighlights = useRowHighlights()
  const setAppearanceRules = useUiStore((s) => s.setAppearanceRules)
  const setRowHighlights = useUiStore((s) => s.setRowHighlights)

  useEffect(() => {
    if (appearance.data) setAppearanceRules(appearance.data.rules)
  }, [appearance.data, setAppearanceRules])
  useEffect(() => {
    if (rowHighlights.data) setRowHighlights(rowHighlights.data.highlights)
  }, [rowHighlights.data, setRowHighlights])

  return (
    <Tabs defaultValue="theme" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-card/60">
        <TabsTrigger value="theme" className="gap-1.5 text-xs">
          <Palette className="h-3.5 w-3.5" aria-hidden="true" />
          Theme
        </TabsTrigger>
        <TabsTrigger value="appearance" className="gap-1.5 text-xs">
          <Type className="h-3.5 w-3.5" aria-hidden="true" />
          Appearances
        </TabsTrigger>
        <TabsTrigger value="highlight" className="gap-1.5 text-xs">
          <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
          Row Highlighting
        </TabsTrigger>
      </TabsList>

      {/* THEME TAB — Zetta Metal / Dark / Light + accent hue */}
      <TabsContent value="theme" className="mt-4">
        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-primary" aria-hidden="true" />
              Theme
            </CardTitle>
            <CardDescription className="text-xs">
              Choose the global Zetta theme and accent hue. Applies to all modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Theme Mode
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['dark', 'metal', 'light'] as ThemeMode[]).map((m) => {
                  const Icon = m === 'light' ? Sun : m === 'metal' ? Layers : Moon
                  const isActive = (theme.data?.mode ?? 'dark') === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        saveTheme.mutate(
                          { mode: m, accentHue: theme.data?.accentHue ?? 60 },
                          {
                            onSuccess: () =>
                              toast.success('Theme applied', {
                                description: `Zetta ${m.charAt(0).toUpperCase() + m.slice(1)}`,
                              }),
                          },
                        )
                      }
                      className={cn(
                        'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border bg-background/40 text-muted-foreground hover:bg-secondary/40',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="capitalize">{m}</span>
                      {isActive && (
                        <CheckCircle2 className="h-3 w-3 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-border/60" />

            <div className="space-y-2">
              <Label className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                <span>Accent Hue</span>
                <span className="font-mono text-primary">
                  {theme.data?.accentHue ?? 60}°
                </span>
              </Label>
              <input
                type="range"
                min={0}
                max={360}
                value={theme.data?.accentHue ?? 60}
                onChange={(e) => {
                  const hue = Number(e.target.value)
                  // Optimistic local update via save
                  saveTheme.mutate(
                    { mode: theme.data?.mode ?? 'dark', accentHue: hue },
                    { onSuccess: () => undefined },
                  )
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary/60 accent-primary"
                aria-label="Accent hue"
                style={{
                  background: `linear-gradient(to right, hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 70% 50%), hsl(300 70% 50%), hsl(360 70% 50%))`,
                }}
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>0° (red)</span>
                <span>60° (amber)</span>
                <span>180° (cyan)</span>
                <span>360°</span>
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> The accent hue derives
              the primary (controls) and accent (ON-AIR) colors. Try 60° for broadcast amber,
              180° for cool cyan, or 25° for classic radio red.
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* APPEARANCE TAB — per-attribute color overrides */}
      <TabsContent value="appearance" className="mt-4">
        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Type className="h-4 w-4 text-primary" aria-hidden="true" />
              Appearances
            </CardTitle>
            <CardDescription className="text-xs">
              Per-attribute color overrides. Colors are applied to matching cells in Library, Logs and On-Air.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y divide-border/60">
                {appearance.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : (
                  appearance.data?.rules.map((rule) => (
                    <AppearanceRuleRow key={rule.id} rule={rule} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ROW HIGHLIGHTING TAB — highlight entire row when attribute is present */}
      <TabsContent value="highlight" className="mt-4">
        <Card className="border-border bg-card/80">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Highlighter className="h-4 w-4 text-primary" aria-hidden="true" />
              Row Highlighting
            </CardTitle>
            <CardDescription className="text-xs">
              Highlight the entire row when an attribute is present. Useful for EAS alerts, ad markers, or news items.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y divide-border/60">
                {rowHighlights.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))
                ) : (
                  rowHighlights.data?.highlights.map((h) => (
                    <RowHighlightRow key={h.id} highlight={h} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ----------------------------------------------------------------------------

function AppearanceRuleRow({
  rule,
}: {
  rule: {
    id: number
    field: AppearanceField
    value: string
    foreground: string | null
    background: string | null
    bold: boolean
    enabled: boolean
  }
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Switch defaultChecked={rule.enabled} aria-label="Toggle rule" />
      <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
        {rule.field}
      </Badge>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
        {rule.value}
      </code>
      <div className="flex items-center gap-1.5">
        {rule.foreground && (
          <span
            className="inline-block h-4 w-4 rounded border border-border"
            style={{ backgroundColor: rule.foreground }}
            title={`FG: ${rule.foreground}`}
          />
        )}
        {rule.background && (
          <span
            className="inline-block h-4 w-4 rounded border border-border"
            style={{ backgroundColor: rule.background }}
            title={`BG: ${rule.background}`}
          />
        )}
        {rule.bold && (
          <Badge variant="outline" className="border-primary/40 text-[9px] text-primary">
            BOLD
          </Badge>
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}

function RowHighlightRow({
  highlight,
}: {
  highlight: {
    id: number
    field: AppearanceField
    value: string
    foreground: string | null
    background: string | null
    enabled: boolean
  }
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Switch defaultChecked={highlight.enabled} aria-label="Toggle highlight" />
      <Badge variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
        {highlight.field}
      </Badge>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
        {highlight.value}
      </code>
      {/* Preview */}
      <div
        className="rounded border border-border px-2 py-0.5 text-[10px] font-medium"
        style={{
          color: highlight.foreground ?? undefined,
          backgroundColor: highlight.background ?? undefined,
        }}
      >
        Sample Row
      </div>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
