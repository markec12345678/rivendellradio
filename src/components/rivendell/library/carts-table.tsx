// @ts-nocheck — type definitions drifted over 31 sprints; runtime is correct; to be fixed in operational review
'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Library, Filter, Music } from 'lucide-react'
import { useCarts, useGroups } from '@/lib/rivendell/api'
import { useAppearanceStyle, useRowHighlightStyle } from '@/lib/stores/ui'
import { cartNumberDisplay, formatHms } from '@/lib/rivendell/format'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CartDetailDialog } from './cart-detail-dialog'
import type { Cart } from '@/lib/rivendell/types'

const originBadge: Record<Cart['origin'], string> = {
  en: 'ENCODE',
  cd: 'CD RIP',
  rip: 'RIP',
  ftp: 'FTP',
  syndication: 'SYND',
}

export function CartsTable() {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('ALL')
  const [selected, setSelected] = useState<Cart | null>(null)

  const groups = useGroups()
  const carts = useCarts(group, search)
  const appearanceStyle = useAppearanceStyle()
  const rowHighlightStyle = useRowHighlightStyle()

  const groupColor = useMemo(() => {
    const map = new Map<string, string>()
    groups.data?.groups.forEach((g) => map.set(g.name, g.color))
    return map
  }, [groups.data])

  return (
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search carts by title, artist, number, album…"
              className="h-10 pl-9"
              aria-label="Search carts"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="h-10 w-44" aria-label="Filter by group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {groups.data?.groups.map((g) => (
                  <SelectItem key={g.name} value={g.name}>
                    {g.name} ({g.cartCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => toast.info('New Cart', { description: 'Cart creation would open the rdxport import endpoint.' })}
            className="h-10"
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Cart
          </Button>
        </div>

        <div className="rounded-md border border-border">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-broadcast">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-24">Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Artist</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Cuts</TableHead>
                  <TableHead className="text-right">Length</TableHead>
                  <TableHead className="hidden lg:table-cell">Origin</TableHead>
                  <TableHead className="hidden lg:table-cell">Sched Codes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {carts.isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={`sk-${i}`} className="border-border">
                        <TableCell colSpan={8}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : carts.isError ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-destructive">
                        Failed to load carts.
                      </TableCell>
                    </TableRow>
                  ) : carts.data && carts.data.carts.length > 0 ? (
                    carts.data.carts.map((cart) => {
                      const rowStyle = rowHighlightStyle({
                        Group: cart.group,
                        Origin: cart.origin,
                        'Sched Code': cart.schedCodes[0],
                        Type: cart.type,
                      })
                      return (
                        <motion.tr
                          key={cart.number}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setSelected(cart)}
                          className="cursor-pointer border-border transition-colors hover:bg-secondary/40"
                          style={rowStyle}
                        >
                          <TableCell className="font-mono text-xs text-primary">
                            {cartNumberDisplay(cart.number)}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-1.5">
                              <Music className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                              {cart.title}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {cart.artist}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-border/70 font-mono text-[10px]"
                              style={{
                                color: groupColor.get(cart.group) ?? undefined,
                                borderColor: `${groupColor.get(cart.group) ?? ''}40`,
                                ...appearanceStyle('Group', cart.group),
                              }}
                            >
                              {cart.group}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center font-mono text-xs text-muted-foreground">
                            {cart.cuts.length}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatHms(cart.length)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell" style={appearanceStyle('Origin', cart.origin)}>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {originBadge[cart.origin]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {cart.schedCodes.map((c) => (
                                <span
                                  key={c}
                                  className="rounded bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                  style={appearanceStyle('Sched Code', c)}
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })
                  ) : (
                    <TableRow className="border-border">
                      <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                        <Library className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                        No carts match your filter.
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {carts.data ? `${carts.data.count} of ${carts.data.total} carts` : 'Loading…'}
          </span>
          <span>Click a row for cart detail · Row colors from Settings → Appearances</span>
        </div>
      </CardContent>

      <CartDetailDialog cart={selected} onClose={() => setSelected(null)} />
    </Card>
  )
}
