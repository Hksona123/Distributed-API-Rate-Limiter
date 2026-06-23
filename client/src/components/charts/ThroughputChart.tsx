import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { AlignJustify } from 'lucide-react'
import { useMetrics } from '../../context/MetricsContext'

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const h = (i * 2).toString().padStart(2, '0')
  return `${h}:00`
})

const COLORS = {
  allowed:   '#39B0F5',
  blocked:   '#7352C7',
  throttled: '#1A97F5',
  bypassed:  '#C8E6FF',
}

type PeriodKey = 'Today' | '7 Days' | '30 Days'

export function ThroughputChart() {
  const { history } = useMetrics()
  const [period, setPeriod] = useState<PeriodKey>('Today')
  const [showPeriod, setShowPeriod] = useState(false)

  // Build 12 hourly buckets from history + synthesize 4 series
  const data = HOURS.map((label, i) => {
    const slice = history.slice(i * 5, i * 5 + 5)
    const totalRps = slice.reduce((s, h) => s + h.rps, 0) / Math.max(slice.length, 1)
    const rejRate  = slice.reduce((s, h) => s + h.rejectionRate, 0) / Math.max(slice.length, 1) / 100

    const total     = Math.round(totalRps * 60)
    const blocked   = Math.round(total * rejRate)
    const throttled = Math.round(total * 0.05)
    const bypassed  = Math.round(total * 0.02)
    const allowed   = Math.max(0, total - blocked - throttled - bypassed)

    return { label, allowed, blocked, throttled, bypassed }
  })

  const totalRps = history.length > 0
    ? history[history.length - 1].rps.toFixed(0)
    : '0'

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: { color: string; name: string; value: number }[]
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-border-col rounded-card shadow-card p-3 text-[12px]">
        <p className="font-semibold text-txt-primary mb-2">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-txt-secondary capitalize">{p.name}</span>
            <span className="ml-auto font-semibold text-txt-primary">{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-card shadow-card p-5 flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[13px] text-txt-secondary font-medium mb-0.5">Total Throughput</p>
          <p className="text-[22px] font-bold text-txt-primary">{parseInt(totalRps).toLocaleString()} req/s</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period picker */}
          <div className="relative">
            <button
              onClick={() => setShowPeriod(v => !v)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-berry
                         bg-sidebar-act px-3 py-1.5 rounded-badge hover:bg-purple-100
                         transition-colors"
            >
              {period} ▼
            </button>
            {showPeriod && (
              <div className="absolute right-0 top-8 bg-white rounded-card shadow-card border border-border-col
                              z-10 min-w-[100px] overflow-hidden">
                {(['Today', '7 Days', '30 Days'] as PeriodKey[]).map(p => (
                  <button key={p}
                    onClick={() => { setPeriod(p); setShowPeriod(false) }}
                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-sidebar-act
                               transition-colors ${period === p ? 'text-berry font-semibold' : 'text-txt-primary'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="text-txt-secondary hover:text-berry transition-colors p-1.5 rounded-lg
                             hover:bg-sidebar-act">
            <AlignJustify size={16} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} barSize={18} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 6" stroke="#E8EDF2" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#7C8FAC', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fill: '#7C8FAC', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }}
            axisLine={false} tickLine={false} width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(115,82,199,0.04)' }} />
          <Legend
            wrapperStyle={{ fontSize: '12px', fontFamily: 'Plus Jakarta Sans', paddingTop: '16px' }}
            iconType="circle" iconSize={8}
          />
          <Bar dataKey="allowed"   name="Allowed"   fill={COLORS.allowed}   radius={[4,4,0,0]} stackId="s" />
          <Bar dataKey="throttled" name="Throttled"  fill={COLORS.throttled} radius={[0,0,0,0]} stackId="s" />
          <Bar dataKey="bypassed"  name="Bypassed"   fill={COLORS.bypassed}  radius={[0,0,0,0]} stackId="s" />
          <Bar dataKey="blocked"   name="Blocked"    fill={COLORS.blocked}   radius={[4,4,0,0]} stackId="s" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
