'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

type Point = { date: string; count: number }

export function AnalyticsCharts({ type, data }: { type: 'signups' | 'activity'; data: Point[] }) {
  const color = type === 'signups' ? '#2563eb' : '#10b981'
  const gradientId = `area-${type}`

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) =>
            new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }
          tick={{ fontSize: 11 }}
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
