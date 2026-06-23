import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useMetrics } from '../context/MetricsContext'

export function ThroughputChart() {
  const { history } = useMetrics()

  const data = history.map((h, i) => ({
    t:       i - history.length + 1,
    allowed: Math.max(0, Math.round(h.rps * (1 - h.rejectionRate / 100))),
    blocked: Math.max(0, Math.round(h.rps * (h.rejectionRate / 100))),
    total:   Math.round(h.rps),
  }))

  const maxVal = Math.max(...data.map(d => d.total), 1)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const t = label as number
    const timeLabel = t === 0 ? 'now' : `${Math.abs(t)}s ago`
    return (
      <div className="bg-s2 border border-s4 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-ink-muted mb-2 font-mono">{timeLabel}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-ink-muted capitalize">{p.dataKey}</span>
            <span className="ml-auto font-mono font-medium text-ink">{p.value} r/s</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-ink">Throughput</h2>
          <p className="text-2xs text-ink-muted mt-0.5">Requests per second — last 60s window</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-go opacity-80" />
            <span className="text-2xs text-ink-muted">Allowed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-stop opacity-80" />
            <span className="text-2xs text-ink-muted">Blocked</span>
          </div>
          <div className="panel-sm px-2.5 py-1">
            <span className="text-2xs font-mono text-ink-muted">
              peak <span className="text-ink font-semibold">{maxVal}</span>/s
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="fillAllowed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillBlocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#e11d48" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="2 6"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="t"
            tickFormatter={v => (v === 0 ? 'now' : v % 15 === 0 ? `${Math.abs(v)}s` : '')}
            tick={{ fill: '#3d3d5c', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#3d3d5c', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }} />

          <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />

          <Area
            type="monotone"
            dataKey="allowed"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#fillAllowed)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="blocked"
            stroke="#e11d48"
            strokeWidth={1.5}
            fill="url(#fillBlocked)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
