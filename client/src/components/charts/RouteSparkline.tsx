import { useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface RouteSparklineProps {
  color?: string
  height?: number
}

export function RouteSparkline({ color = '#7352C7', height = 60 }: RouteSparklineProps) {
  const [data, setData] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({ v: Math.sin(i * 0.6) * 30 + 50 + Math.random() * 20 }))
  )

  useEffect(() => {
    const id = setInterval(() => {
      setData(prev => {
        const next = [...prev.slice(1), { v: prev[prev.length - 1].v + (Math.random() - 0.48) * 15 }]
        return next
      })
    }, 1500)
    return () => clearInterval(id)
  }, [])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#sparkGrad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
