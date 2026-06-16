import * as React from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/card'
import { renderIcon } from './icon'
import type { ChartSeries, ChartType, IconRef } from './types'

/** Theme-driven palette (HSL triplet CSS vars defined in styles.css). */
const PALETTE = [
  'hsl(var(--info))',
  'hsl(var(--magic))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
]
const AXIS = 'hsl(var(--muted-foreground))'
const GRID = 'hsl(var(--border))'

export interface ChartWidgetProps {
  type: ChartType
  /** Rows of data; each key referenced by a series.dataKey. */
  data: Array<Record<string, string | number>>
  series: ChartSeries[]
  /** Key for the category axis (x-axis / pie label). */
  categoryKey?: string
  title?: string
  icon?: IconRef
  /** Right-aligned header content (e.g. a range selector). */
  headerAction?: React.ReactNode
  height?: number
  className?: string
}

/** recharts-backed chart in a Card. Replaces the hand-rolled CSS bar charts. */
export function ChartWidget({
  type, data, series, categoryKey = 'name', title, icon, headerAction, height = 240, className,
}: ChartWidgetProps) {
  const color = (i: number, explicit?: string) => explicit ?? PALETTE[i % PALETTE.length]

  return (
    <Card className={className}>
      {(title || headerAction) && (
        <CardHeader className="flex-row items-center justify-between space-y-0">
          {title ? (
            <CardTitle className="flex items-center gap-2">
              {renderIcon(icon)}
              {title}
            </CardTitle>
          ) : <span />}
          {headerAction}
        </CardHeader>
      )}
      <CardContent className="p-4 pt-2">
        <ResponsiveContainer width="100%" height={height}>
          {type === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie data={data} dataKey={series[0]?.dataKey ?? 'value'} nameKey={categoryKey} innerRadius={50} outerRadius={80} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={color(i, series[0]?.color)} />)}
              </Pie>
              <Legend />
            </PieChart>
          ) : type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} width={36} />
              <Tooltip cursor={{ fill: GRID, opacity: 0.3 }} />
              {series.length > 1 && <Legend />}
              {series.map((s, i) => (
                <Bar key={s.dataKey} dataKey={s.dataKey} name={s.label ?? s.dataKey} fill={color(i, s.color)} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} width={36} />
              <Tooltip />
              {series.length > 1 && <Legend />}
              {series.map((s, i) => (
                <Area key={s.dataKey} dataKey={s.dataKey} name={s.label ?? s.dataKey} stroke={color(i, s.color)} fill={color(i, s.color)} fillOpacity={0.15} />
              ))}
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey={categoryKey} stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={AXIS} fontSize={12} tickLine={false} axisLine={false} width={36} />
              <Tooltip />
              {series.length > 1 && <Legend />}
              {series.map((s, i) => (
                <Line key={s.dataKey} dataKey={s.dataKey} name={s.label ?? s.dataKey} stroke={color(i, s.color)} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
