import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface StatCardProps {
  gradient: string
  icon: ReactNode
  value: string
  label: string
  topRight?: ReactNode
  height?: number
  sparkline?: ReactNode
}

export function useCountUp(target: number, duration = 600) {
  const [val, setVal] = useState(target)
  const prevRef = useRef(target)

  useEffect(() => {
    const from = prevRef.current
    const diff = target - from
    if (diff === 0) return
    const start = performance.now()
    let raf: number

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(from + diff * eased)
      if (progress < 1) raf = requestAnimationFrame(step)
      else prevRef.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return val
}

export function StatCard({
  gradient, icon, value, label, topRight, height = 140, sparkline,
}: StatCardProps) {
  return (
    <div
      className="relative rounded-stat overflow-hidden flex-shrink-0"
      style={{ background: gradient, height }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/[0.07]" />
      <div className="absolute -top-2 -right-2 w-16 h-16 rounded-full bg-white/[0.07]" />

      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col h-full">
        {/* Top row — icon left, topRight control right, SAME baseline */}
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white">{icon}</span>
          </div>
          {/* topRight slot — perfectly centred vertically with the icon */}
          {topRight && (
            <div className="flex items-center">
              {topRight}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-auto">
          <p className="text-[28px] font-bold text-white leading-none mb-1">{value}</p>
          <p className="text-[13px] text-white/85 font-medium">{label}</p>
        </div>
      </div>

      {/* Bottom sparkline */}
      {sparkline && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-60">
          {sparkline}
        </div>
      )}
    </div>
  )
}
