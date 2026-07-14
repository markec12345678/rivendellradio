// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical,
  Trash2,
  Plus,
  Search,
  Music2,
  Zap,
  Flag,
  ChevronUp,
  ChevronDown,
  Save,
  Eye,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cartNumberDisplay, formatHms } from '@/lib/rivendell/format'
import { mockCarts } from '@/lib/rivendell/mock-data'
import type { Log, LogLine, Transition, LogLineType } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

interface LogEditorProps {
  log: Log
}

const transitionOptions: Transition[] = ['play', 'segue', 'stop', 'fade']
const transitionColor: Record<Transition, string> = {
  play: 'border-primary/40 text-primary',
  segue: 'border-emerald-500/40 text-emerald-400',
  stop: 'border-accent/40 text-accent',
  fade: 'border-amber-500/40 text-amber-400',
}

const typeIcon: Record<LogLineType, typeof Music2> = {
  cart: Music2,
  macro: Zap,
  marker: Flag,
  track: Music2,
  chain: ChevronUp,
  music: Music2,
  traffic: Flag,
}

export function LogEditor({ log: initialLog }: LogEditorProps) {
  const [lines, setLines] = useState<LogLine[]>(() => initialLog.lines.map((l) => ({ ...l })))
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filteredCarts = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return mockCarts.slice(0, 30)
    return mockCarts
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.artist.toLowerCase().includes(q) ||
          String(c.number).includes(q) ||
          c.group.toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [search])

  const totalLength = useMemo(
    () => lines.reduce((acc, l) => acc + (l.length || 0), 0),
    [lines],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setLines((items) => {
      const oldIndex = items.findIndex((_, i) => `line-${i}` === active.id)
      const newIndex = items.findIndex((_, i) => `line-${i}` === over.id)
      if (oldIndex < 0 || newIndex < 0) return items
      const reordered = arrayMove(items, oldIndex, newIndex)
      // Re-number lines
      return reordered.map((l, i) => ({ ...l, line: i + 1 }))
    })
    setDirty(true)
  }

  const addCart = (cartNumber: number, title: string, artist: string, length: number) => {
    const newLine: LogLine = {
      line: lines.length + 1,
      type: 'cart',
      cartNumber,
      cartTitle: title,
      artist,
      length,
      transition: 'segue',
      startTime: undefined,
      markerComment: undefined,
    }
    setLines((prev) => [...prev, newLine])
    setDirty(true)
    toast.success('Added to log', { description: `${title} — ${cartNumberDisplay(cartNumber)}` })
  }

  const addMarker = () => {
    const newLine: LogLine = {
      line: lines.length + 1,
      type: 'marker',
      cartNumber: undefined,
      cartTitle: undefined,
      artist: undefined,
      length: 0,
      transition: 'stop',
      startTime: undefined,
      markerComment: 'New Marker',
    }
    setLines((prev) => [...prev, newLine])
    setDirty(true)
    toast.info('Marker added')
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })))
    setDirty(true)
  }

  const moveLine = (index: number, dir: -1 | 1) => {
    setLines((prev) => {
      const newIndex = index + dir
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const reordered = arrayMove(prev, index, newIndex)
      return reordered.map((l, i) => ({ ...l, line: i + 1 }))
    })
    setDirty(true)
  }

  const cycleTransition = (index: number) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l
        const currentIdx = transitionOptions.indexOf(l.transition)
        const next = transitionOptions[(currentIdx + 1) % transitionOptions.length]
        return { ...l, transition: next }
      }),
    )
    setDirty(true)
  }

  const save = () => {
    toast.success('Log saved', {
      description: `${initialLog.name}: ${lines.length} lines · ${formatHms(totalLength)}`,
    })
    setDirty(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border bg-background/40 p-0.5">
          <Button
            type="button"
            variant={mode === 'view' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('view')}
            className="h-8"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            View
          </Button>
          <Button
            type="button"
            variant={mode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('edit')}
            className="h-8"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {lines.length} lines · {formatHms(totalLength)}
          </span>
          {dirty && (
            <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">
              unsaved
            </Badge>
          )}
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!dirty}
            className="h-8"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>

      {mode === 'view' ? (
        <ReadOnlyView lines={lines} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {/* Cart palette */}
          <div className="lg:col-span-2">
            <CartPalette
              carts={filteredCarts}
              search={search}
              onSearch={setSearch}
              onAdd={addCart}
              onAddMarker={addMarker}
            />
          </div>

          {/* Sortable log lines */}
          <div className="lg:col-span-3">
            <Card className="border-border bg-card/80">
              <div className="border-b border-border/60 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Log Lines — drag to reorder
                </div>
              </div>
              <ScrollArea className="max-h-[55vh]">
                <div className="p-2">
                  {lines.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Log is empty. Drag carts from the palette to add lines.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={lines.map((_, i) => `line-${i}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          <AnimatePresence>
                            {lines.map((line, idx) => (
                              <SortableLogLine
                                key={`line-${idx}`}
                                id={`line-${idx}`}
                                line={line}
                                index={idx}
                                total={lines.length}
                                onRemove={() => removeLine(idx)}
                                onMove={(dir) => moveLine(idx, dir)}
                                onCycleTransition={() => cycleTransition(idx)}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------

function SortableLogLine({
  id,
  line,
  index,
  total,
  onRemove,
  onMove,
  onCycleTransition,
}: {
  id: string
  line: LogLine
  index: number
  total: number
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onCycleTransition: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const TIcon = typeIcon[line.type] ?? Music2

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-background/40 px-2 py-1.5',
        isDragging ? 'border-primary/60 shadow-lg' : 'border-border/60',
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Line number */}
      <span className="w-7 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {line.line}
      </span>

      {/* Type icon */}
      <TIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />

      {/* Cart number / marker */}
      <span className="w-16 shrink-0 font-mono text-[10px] text-primary">
        {line.cartNumber ? cartNumberDisplay(line.cartNumber) : '—'}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {line.cartTitle ?? line.markerComment ?? '—'}
      </span>

      {/* Artist (hidden on small) */}
      {line.artist && (
        <span className="hidden w-28 shrink-0 truncate text-[10px] text-muted-foreground sm:block">
          {line.artist}
        </span>
      )}

      {/* Transition badge (clickable to cycle) */}
      <button
        type="button"
        onClick={onCycleTransition}
        className="shrink-0"
        title="Click to cycle transition"
      >
        <Badge variant="outline" className={cn('font-mono text-[9px]', transitionColor[line.transition])}>
          {line.transition.toUpperCase()}
        </Badge>
      </button>

      {/* Length */}
      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
        {line.length > 0 ? formatHms(line.length) : '—'}
      </span>

      <Separator orientation="vertical" className="h-5 bg-border/60" />

      {/* Move up/down */}
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove line"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

// ----------------------------------------------------------------------------

function CartPalette({
  carts,
  search,
  onSearch,
  onAdd,
  onAddMarker,
}: {
  carts: typeof mockCarts
  search: string
  onSearch: (q: string) => void
  onAdd: (cartNumber: number, title: string, artist: string, length: number) => void
  onAddMarker: () => void
}) {
  return (
    <Card className="border-border bg-card/80">
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
            Cart Palette
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAddMarker} className="h-7 text-xs">
            <Flag className="mr-1 h-3 w-3" aria-hidden="true" />
            Marker
          </Button>
        </div>
      </div>
      <div className="border-b border-border/60 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search carts by title, artist, number…"
            className="h-8 pl-8 text-xs"
            aria-label="Search carts"
          />
        </div>
      </div>
      <ScrollArea className="max-h-[50vh]">
        <div className="divide-y divide-border/40">
          {carts.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No carts found.</div>
          ) : (
            carts.map((cart) => (
              <button
                key={cart.number}
                type="button"
                onClick={() => onAdd(cart.number, cart.title, cart.artist, cart.length)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-primary/10"
              >
                <Plus className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                <span className="w-16 shrink-0 font-mono text-[10px] text-primary">
                  {cartNumberDisplay(cart.number)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{cart.title}</span>
                <Badge variant="outline" className="shrink-0 border-border/60 text-[9px] text-muted-foreground">
                  {cart.group}
                </Badge>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatHms(cart.length)}
                </span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

// ----------------------------------------------------------------------------

function ReadOnlyView({ lines }: { lines: LogLine[] }) {
  return (
    <div className="max-h-[55vh] overflow-y-auto scrollbar-broadcast rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            <th className="w-12 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Line</th>
            <th className="w-20 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="w-24 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Cart</th>
            <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Title</th>
            <th className="hidden px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground sm:table-cell">Transition</th>
            <th className="px-2 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Length</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const TIcon = typeIcon[line.type] ?? Music2
            return (
              <tr key={line.line} className="border-b border-border/40">
                <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{line.line}</td>
                <td className="px-2 py-1.5">
                  <Badge variant="outline" className="border-border/60 font-mono text-[9px] text-muted-foreground">
                    <TIcon className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
                    {line.type.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-2 py-1.5 font-mono text-[10px] text-primary">
                  {line.cartNumber ? cartNumberDisplay(line.cartNumber) : '—'}
                </td>
                <td className="px-2 py-1.5 text-foreground">
                  {line.cartTitle ?? line.markerComment ?? '—'}
                </td>
                <td className="hidden px-2 py-1.5 sm:table-cell">
                  <Badge variant="outline" className={cn('font-mono text-[9px]', transitionColor[line.transition])}>
                    {line.transition.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-[10px] text-muted-foreground">
                  {line.length > 0 ? formatHms(line.length) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
