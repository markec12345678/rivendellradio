'use client'

import { useState, useMemo } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GripVertical, Trash2, Plus, Search, Music2, ChevronUp, ChevronDown,
  Save, Eye, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatHms } from '@/lib/rivendell/format'
import { rockTracks } from '@/lib/rivendell/mock-data'
import type { ScheduleShow, LogLine, Transition } from '@/lib/rivendell/types'
import { cn } from '@/lib/utils'

interface LogEditorDialogProps {
  show: ScheduleShow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const transitionOptions: Transition[] = ['play', 'segue', 'stop', 'fade']
const transitionColor: Record<Transition, string> = {
  play: 'border-primary/40 text-primary',
  segue: 'border-emerald-500/40 text-emerald-400',
  stop: 'border-accent/40 text-accent',
  fade: 'border-amber-500/40 text-amber-400',
}

export function LogEditorDialog({ show, open, onOpenChange }: LogEditorDialogProps) {
  const [lines, setLines] = useState<LogLine[]>([])
  const [mode, setMode] = useState<'view' | 'edit'>('edit')
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize lines when show changes (keyed remount pattern)
  if (show && !initialized) {
    setLines(show.logLines.map((l) => ({ ...l })))
    setInitialized(true)
  }
  if (!show && initialized) {
    setInitialized(false)
    setDirty(false)
    setLines([])
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return rockTracks.slice(0, 20)
    return rockTracks
      .filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        String(t.id).includes(q),
      )
      .slice(0, 20)
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
      return reordered.map((l, i) => ({ ...l, line: i + 1 }))
    })
    setDirty(true)
  }

  const addTrack = (track: typeof rockTracks[0]) => {
    const newLine: LogLine = {
      line: lines.length + 1,
      type: track.type === 'jingle' ? 'jingle' : track.type === 'ad' ? 'ad' : track.type === 'promo' ? 'promo' : 'music',
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      length: track.length,
      transition: 'segue',
      status: 'scheduled',
    }
    setLines((prev) => [...prev, newLine])
    setDirty(true)
    toast.success('Added to log', { description: `${track.title} — ${track.artist}` })
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line: i + 1 })))
    setDirty(true)
  }

  const moveLine = (index: number, dir: -1 | 1) => {
    setLines((prev) => {
      const newIndex = index + dir
      if (newIndex < 0 || newIndex >= prev.length) return prev
      return arrayMove(prev, index, newIndex).map((l, i) => ({ ...l, line: i + 1 }))
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
      description: `${show?.name}: ${lines.length} lines · ${formatHms(totalLength)}`,
    })
    setDirty(false)
    onOpenChange(false)
  }

  if (!show) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-border bg-card text-card-foreground max-h-[88vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-primary">{show.name}</span>
            <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
              {show.startTime} — {show.endTime}
            </Badge>
            <Badge variant="outline" className="border-border/70 text-[10px] text-muted-foreground">
              {show.host}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Drag log lines to reorder. Click transition to cycle.' : 'Read-only view of scheduled log.'}
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-background/40 p-0.5">
            <Button type="button" variant={mode === 'view' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('view')} className="h-8">
              <Eye className="mr-1.5 h-3.5 w-3.5" />View
            </Button>
            <Button type="button" variant={mode === 'edit' ? 'default' : 'ghost'} size="sm" onClick={() => setMode('edit')} className="h-8">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />Edit
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{lines.length} lines · {formatHms(totalLength)}</span>
            {dirty && <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-400">unsaved</Badge>}
            <Button type="button" size="sm" onClick={save} disabled={!dirty} className="h-8">
              <Save className="mr-1.5 h-3.5 w-3.5" />Save
            </Button>
          </div>
        </div>

        {mode === 'view' ? (
          <ReadOnlyView lines={lines} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-5">
            {/* Track palette */}
            <div className="lg:col-span-2">
              <Card className="border-border bg-card/80">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Plus className="h-4 w-4 text-primary" />Add Track
                  </div>
                </div>
                <div className="border-b border-border/60 p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tracks…" className="h-8 pl-8 text-xs" />
                  </div>
                </div>
                <ScrollArea className="max-h-[45vh]">
                  <div className="divide-y divide-border/40">
                    {filteredTracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => addTrack(track)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-primary/10"
                      >
                        <Plus className="h-3 w-3 shrink-0 text-primary" />
                        <span className="w-12 shrink-0 font-mono text-[10px] text-primary">{track.id}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{track.title}</span>
                        <span className="hidden w-24 shrink-0 truncate text-[10px] text-muted-foreground sm:block">{track.artist}</span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatHms(track.length)}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>

            {/* Sortable log lines */}
            <div className="lg:col-span-3">
              <Card className="border-border bg-card/80">
                <div className="border-b border-border/60 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />Log Lines — drag to reorder
                  </div>
                </div>
                <ScrollArea className="max-h-[45vh]">
                  <div className="p-2">
                    {lines.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Log is empty. Add tracks from the palette.</div>
                    ) : (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={lines.map((_, i) => `line-${i}`)} strategy={verticalListSortingStrategy}>
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
      </DialogContent>
    </Dialog>
  )
}

function SortableLogLine({
  id, line, index, total, onRemove, onMove, onCycleTransition,
}: {
  id: string; line: LogLine; index: number; total: number;
  onRemove: () => void; onMove: (dir: -1 | 1) => void; onCycleTransition: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1 }

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
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing" aria-label="Drag to reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{line.line}</span>
      <Music2 className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="w-12 shrink-0 font-mono text-[10px] text-primary">{line.trackId ?? '—'}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{line.title ?? '—'}</span>
      {line.artist && <span className="hidden w-24 shrink-0 truncate text-[10px] text-muted-foreground sm:block">{line.artist}</span>}
      <button type="button" onClick={onCycleTransition} className="shrink-0" title="Click to cycle transition">
        <Badge variant="outline" className={cn('font-mono text-[9px]', transitionColor[line.transition])}>{line.transition.toUpperCase()}</Badge>
      </button>
      <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">{line.length > 0 ? formatHms(line.length) : '—'}</span>
      <Separator orientation="vertical" className="h-5 bg-border/60" />
      <div className="flex shrink-0 flex-col">
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move up">
          <ChevronUp className="h-3 w-3" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30" aria-label="Move down">
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
      <button type="button" onClick={onRemove} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove line">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  )
}

function ReadOnlyView({ lines }: { lines: LogLine[] }) {
  return (
    <div className="max-h-[50vh] overflow-y-auto scrollbar-broadcast rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            <th className="w-12 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Line</th>
            <th className="w-16 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="w-16 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">ID</th>
            <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Title</th>
            <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">Transition</th>
            <th className="px-2 py-2 text-right text-[10px] uppercase tracking-wider text-muted-foreground">Length</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.line} className="border-b border-border/40">
              <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{line.line}</td>
              <td className="px-2 py-1.5"><Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">{line.type.toUpperCase()}</Badge></td>
              <td className="px-2 py-1.5 font-mono text-[10px] text-primary">{line.trackId ?? '—'}</td>
              <td className="px-2 py-1.5 text-foreground">{line.title ?? '—'}</td>
              <td className="px-2 py-1.5"><Badge variant="outline" className={cn('font-mono text-[9px]', transitionColor[line.transition])}>{line.transition.toUpperCase()}</Badge></td>
              <td className="px-2 py-1.5 text-right font-mono text-[10px] text-muted-foreground">{line.length > 0 ? formatHms(line.length) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
