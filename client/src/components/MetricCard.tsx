import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '../lib/utils'

interface MetricCardProps {
  label: string
  value: number
  unit?: string
  sub?: string
  highlight?: 'go' | 'stop' | 'warn' | false
  sparkline?: number[]
  formatValue?: (v: number) => string
  icon?: React.ReactNode
}

export function MetricCard({
  label,
  value,
  unit,
  sub,
  highlight,
  sparkline = [],
  formatValue,
  icon,
}: MetricCardProps) {
  const display = formatValue ? formatValue(value) : value.toLocaleString()
  const sparkData = sparkline.map(v => ({ v }))

  const accentColor =
    highlight === 'go'   ? '#10b981' :
    highlight === 'stop' ? '#e11d48' :
    highlight === 'warn' ? '#f59e0b' : '#7c3aed'

  return (
    <div
      className={cn(
        'panel p-5 flex flex-col gap-4 relative overflow-hidden group',
        'transition-all duration-300 hover:border-signal/20',
        highlight === 'stop' && 'border-stop/20 hover:border-stop/30',
        highlight === 'warn' && 'border-warn/20 hover:border-warn/30',
        highlight === 'go'   && 'border-go/20 hover:border-go/30',
      )}
    >
      {/* Ambient glow blob */}
      <div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06] blur-2xl
                   transition-opacity duration-300 group-hover:opacity-[0.10]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>

      {/* Value + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={cn(
              'metric-value leading-none',
              highlight === 'stop' && 'text-stop',
              highlight === 'warn' && 'text-warn',
              highlight === 'go'   && 'text-go',
            )}
          >
            {display}
          </span>
          {unit && (
            <span className="text-xs font-mono text-ink-faint">{unit}</span>
          )}
        </div>

        {/* Sparkline */}
        {sparkData.length > 2 && (
          <div className="w-16 h-8 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke={accentColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sub text */}
      {sub && <p className="sublabel text-2xs">{sub}</p>}

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] opacity-0
                   group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
    </div>
  )
}
