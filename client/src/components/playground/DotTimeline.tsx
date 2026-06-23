import type { DotStatus } from '../../types'

interface DotTimelineProps {
  dots: DotStatus[]
}

export function DotTimeline({ dots }: DotTimelineProps) {
  if (dots.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {dots.map((dot, i) => (
        <div
          key={i}
          title={dot}
          className={[
            'w-2 h-2 rounded-full transition-all duration-300 flex-shrink-0',
            dot === 'allowed' ? 'bg-berry-green shadow-[0_0_4px_rgba(0,200,151,0.6)]' : '',
            dot === 'blocked' ? 'bg-berry-red  shadow-[0_0_4px_rgba(255,75,75,0.6)]' : '',
            dot === 'pending' ? 'bg-gray-200 animate-pulse' : '',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
