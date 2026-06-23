import type { ReactNode } from 'react'

interface MiniStatCardProps {
  gradient?: string
  bg?: string
  icon: ReactNode
  iconBg?: string
  value: string
  label: string
  accent?: string
  decorative?: boolean
}

export function MiniStatCard({
  gradient, bg = '#fff', icon, iconBg = '#EEF2FF', value, label, decorative = false,
}: MiniStatCardProps) {
  return (
    <div
      className="relative rounded-stat overflow-hidden flex items-center gap-3 px-4"
      style={{ background: gradient || bg, height: 64 }}
    >
      {/* Decorative triangle for white variant */}
      {decorative && (
        <div
          className="absolute right-0 top-0 bottom-0 w-16 opacity-10"
          style={{
            background: 'linear-gradient(225deg, #FFC107 0%, transparent 100%)',
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          }}
        />
      )}

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: gradient ? 'rgba(255,255,255,0.2)' : iconBg }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-[20px] font-bold leading-none"
          style={{ color: gradient ? '#fff' : '#2A3547' }}
        >
          {value}
        </p>
        <p
          className="text-[12px] mt-0.5 truncate"
          style={{ color: gradient ? 'rgba(255,255,255,0.8)' : '#7C8FAC' }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
