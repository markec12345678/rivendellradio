'use client'

import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { BarChart3, TrendingUp, Users, Clock, Radio } from 'lucide-react'
import { useReports } from '@/lib/rivendell/api'
import { formatNumber } from '@/lib/rivendell/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

const CHART_COLORS = [
  'oklch(0.72 0.18 60)',   // amber — primary
  'oklch(0.646 0.222 41)', // green
  'oklch(0.65 0.22 25)',   // red
  'oklch(0.6 0.15 250)',   // blue
  'oklch(0.7 0.18 300)',   // purple
]

export function ReportsTab() {
  const reports = useReports()

  if (reports.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!reports.data) {
    return (
      <div className="p-6">
        <Card className="border-destructive/40">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Failed to load reports.
          </CardContent>
        </Card>
      </div>
    )
  }

  const d = reports.data
  const currentHour = new Date().getHours()

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-foreground">Reports &amp; Analytics</h1>
        <Badge variant="outline" className="border-border/70 text-muted-foreground">24h listener history</Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Current Listeners" value={formatNumber(d.current)} />
        <StatCard icon={TrendingUp} label="Peak Today" value={formatNumber(d.peak)} />
        <StatCard icon={BarChart3} label="Average" value={formatNumber(d.avg)} />
        <StatCard icon={Radio} label="Active Streams" value={String(d.stations.length)} />
      </div>

      {/* Total listener chart */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            Total Listeners — 24h
          </CardTitle>
          <CardDescription className="text-xs">Combined listeners across all streams, hourly breakdown</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.total}>
              <defs>
                <linearGradient id="colorListeners" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 60)" />
              <XAxis dataKey="hour" stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} interval={2} />
              <YAxis stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.17 0.006 60)',
                  border: '1px solid oklch(0.25 0.008 60)',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'oklch(0.96 0.005 0)' }}
                itemStyle={{ color: 'oklch(0.72 0.18 60)' }}
              />
              <Area
                type="monotone"
                dataKey="listeners"
                stroke="oklch(0.72 0.18 60)"
                strokeWidth={2}
                fill="url(#colorListeners)"
                name="Listeners"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-station breakdown */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Radio className="h-4 w-4 text-primary" aria-hidden="true" />
            Per-Station Breakdown
          </CardTitle>
          <CardDescription className="text-xs">Listener trends for each stream</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={d.total}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 60)" />
              <XAxis dataKey="hour" stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} interval={2} />
              <YAxis stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.17 0.006 60)',
                  border: '1px solid oklch(0.25 0.008 60)',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'oklch(0.96 0.005 0)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {d.stations.map((st, i) => (
                <Line
                  key={st.id}
                  type="monotone"
                  dataKey="listeners"
                  data={st.history}
                  name={st.name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Station comparison bar chart */}
      <Card className="border-border bg-card/80">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
            Station Comparison — Current Hour
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={d.stations.map((s) => ({
                name: s.name,
                listeners: s.history[currentHour]?.listeners ?? 0,
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 60)" horizontal={false} />
              <XAxis type="number" stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.55 0.01 60)" fontSize={10} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.17 0.006 60)',
                  border: '1px solid oklch(0.25 0.008 60)',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'oklch(0.96 0.005 0)' }}
                itemStyle={{ color: 'oklch(0.72 0.18 60)' }}
              />
              <Bar dataKey="listeners" fill="oklch(0.72 0.18 60)" radius={[0, 4, 4, 0]} name="Listeners" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="truncate font-mono text-sm font-semibold text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
