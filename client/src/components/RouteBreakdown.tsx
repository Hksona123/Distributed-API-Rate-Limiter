import { useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import type { RouteMetric } from '../types'
import { useToast } from '../context/ToastContext'

export function RouteBreakdown() {
  const [routes, setRoutes] = useState<RouteMetric[]>([])
  const { addToast } = useToast()

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/metrics/routes')
        setRoutes(await res.json() as RouteMetric[])
      } catch {
        addToast('Route metrics unavailable', 'error')
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [addToast])

  const sorted  = [...routes].sort((a, b) => b.hits - a.hits)
  const maxHits = Math.max(...sorted.map(r => r.hits), 1)

  return (
    <div className="panel p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Route Breakdown</h2>
          <p className="text-2xs text-ink-muted mt-0.5">Hit distribution by endpoint</p>
        </div>
        <TrendingUp className="w-4 h-4 text-ink-faint" />
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <p className="text-xs text-ink-faint text-center">
            No traffic yet.<br />Make some requests to see data.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((r, idx) => {
            const allowed    = r.hits - r.blocked
            const allowedPct = (allowed / maxHits) * 100
            const blockedPct = (r.blocked / maxHits) * 100
            const isHot      = idx === 0 && r.blocked > 0

            return (
              <div key={r.route} className="group">
                {/* Route label row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {isHot && (
                      <span className="badge-stop text-2xs">hot</span>
                    )}
                    <span className="text-xs font-mono text-ink-muted group-hover:text-ink
                                     transition-colors truncate max-w-[180px]">
                      {r.route}
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-ink-faint">
                    {r.hits.toLocaleString()}
                  </span>
                </div>

                {/* Bar track */}
                <div className="relative h-1 w-full rounded-full bg-s3 overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-go transition-all duration-500"
                    style={{ width: `${allowedPct}%` }}
                  />
                  <div
                    className="absolute top-0 h-full rounded-full bg-stop transition-all duration-500"
                    style={{ left: `${allowedPct}%`, width: `${blockedPct}%` }}
                  />
                </div>

                {/* Stat pills */}
                <div className="flex gap-2 mt-1.5">
                  <span className="text-2xs font-mono text-go/70">{allowed} ok</span>
                  {r.blocked > 0 && (
                    <span className="text-2xs font-mono text-stop/70">{r.blocked} blocked</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
