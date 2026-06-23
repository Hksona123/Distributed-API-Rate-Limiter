import { useMetrics } from '../context/MetricsContext'
import { useCountUp } from '../components/cards/StatCard'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Wifi, WifiOff, Loader } from 'lucide-react'



function MetricRow({ label, value, unit, color = '#7352C7' }: {
  label: string; value: number; unit?: string; color?: string
}) {
  const pct = Math.min(value / 100, 1) * 100
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-border-col last:border-0">
      <span className="text-[13px] text-txt-secondary font-medium w-36 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[14px] font-bold text-txt-primary w-24 text-right font-mono">
        {value.toFixed(typeof value === 'number' && value < 10 ? 2 : 0)}{unit ?? ''}
      </span>
    </div>
  )
}

export function LiveMetricsPage() {
  const { current, history, connectionStatus } = useMetrics()

  const animRps    = useCountUp(current.rps)
  const animP99    = useCountUp(current.p99Latency)
  const animReject = useCountUp(current.rejectionRate)
  const animKeys   = useCountUp(current.activeKeys)

  const chartData = history.slice(-30).map((h, i) => ({
    t: i - 29,
    rps: h.rps,
    p99: h.p99Latency,
    rej: h.rejectionRate,
    keys: h.activeKeys,
  }))

  const statusColors = { connected: '#00C897', connecting: '#FFC107', disconnected: '#FF4B4B' }
  const StatusIcon   = connectionStatus === 'connected' ? Wifi : connectionStatus === 'connecting' ? Loader : WifiOff

  return (
    <div className="flex flex-col gap-5">
      {/* SSE Status banner */}
      <div className="bg-white rounded-card shadow-card px-5 py-3 flex items-center gap-3">
        <StatusIcon size={16} style={{ color: statusColors[connectionStatus] }}
                   className={connectionStatus === 'connecting' ? 'animate-spin' : ''} />
        <span className="text-[13px] font-semibold" style={{ color: statusColors[connectionStatus] }}>
          SSE Stream: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </span>
        <span className="text-[12px] text-txt-secondary ml-auto">
          {history.length} data points collected · refreshing every 1s
        </span>
      </div>

      {/* Bar metrics */}
      <div className="bg-white rounded-card shadow-card p-5">
        <h3 className="text-[15px] font-bold text-txt-primary mb-4">Current Values</h3>
        <MetricRow label="Requests / sec"  value={animRps}    color="#7352C7" />
        <MetricRow label="P99 Latency"     value={animP99}    unit="ms" color="#1A97F5" />
        <MetricRow label="Rejection Rate"  value={animReject} unit="%" color="#FF4B4B" />
        <MetricRow label="Active Keys"     value={Math.min(animKeys / 100, 100)} color="#00C897" />
      </div>

      {/* 4 live area charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'rps',  label: 'Requests/sec',  color: '#7352C7', unit: '/s',  val: animRps },
          { key: 'p99',  label: 'P99 Latency',   color: '#1A97F5', unit: 'ms',  val: animP99 },
          { key: 'rej',  label: 'Rejection Rate', color: '#FF4B4B', unit: '%',   val: animReject },
          { key: 'keys', label: 'Active Keys',    color: '#00C897', unit: ' keys', val: animKeys },
        ].map(m => (
          <div key={m.key} className="bg-white rounded-card shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-txt-secondary">{m.label}</p>
              <p className="text-[18px] font-bold text-txt-primary font-mono">
                {m.val.toFixed(m.key === 'rps' || m.key === 'keys' ? 0 : 2)}{m.unit}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={m.color} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="#E8EDF2" vertical={false} />
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fill: '#7C8FAC', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2}
                      fill={`url(#grad-${m.key})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  )
}
