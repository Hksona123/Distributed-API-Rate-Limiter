import { useEffect, useState } from 'react'
import { MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react'
import type { RouteMetric } from '../../types'
import { useToast } from '../../context/ToastContext'
import { RouteSparkline } from './RouteSparkline'

const MOCK_ROUTES: RouteMetric[] = [
  { route: '/api/auth',   hits: 4821, blocked: 480  },
  { route: '/api/pay',    hits: 2340, blocked: 46   },
  { route: '/api/user',   hits: 1901, blocked: 19   },
  { route: '/api/health', hits: 980,  blocked: 9    },
]

export function RouteBreakdown() {
  const [routes, setRoutes] = useState<RouteMetric[]>(MOCK_ROUTES)
  const { addToast } = useToast()

  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch('/metrics/routes')
        const data = await res.json() as RouteMetric[]
        if (data.length > 0) setRoutes(data)
      } catch { addToast('Route metrics unavailable', 'error') }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [addToast])

  const sorted = [...routes].sort((a, b) => b.hits - a.hits)
  const top    = sorted[0]
  const rest   = sorted.slice(1)

  return (
    <div className="bg-white rounded-card shadow-card p-5 w-72 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-txt-primary">Top Routes</h3>
        <button className="text-txt-secondary hover:text-berry p-1 rounded-lg hover:bg-sidebar-act
                           transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Highlighted top route */}
      {top && (
        <div className="bg-sidebar-act rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[14px] font-bold text-berry truncate">{top.route}</span>
            <span className="text-[14px] font-bold text-txt-primary ml-2 flex-shrink-0">
              {top.hits.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-txt-secondary mb-2">
            {((top.blocked / top.hits) * 100).toFixed(1)}% blocked
          </p>
          <RouteSparkline color="#7352C7" />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border-col mb-3" />

      {/* Route list */}
      <div className="flex flex-col gap-0">
        {rest.map((r, i) => {
          const blockedPct = (r.blocked / r.hits) * 100
          const isGood     = blockedPct < 5
          return (
            <div key={r.route}>
              <div className="flex items-center justify-between py-3">
                <div className="min-w-0 mr-3">
                  <p className="text-[14px] font-semibold text-txt-primary truncate">{r.route}</p>
                  <p className={`text-[12px] font-medium mt-0.5 ${isGood ? 'text-berry-green' : 'text-berry-red'}`}>
                    {blockedPct.toFixed(0)}% blocked
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[14px] font-bold text-txt-primary">
                    {r.hits.toLocaleString()}
                  </span>
                  {isGood
                    ? <TrendingUp size={14} className="text-berry-green" />
                    : <TrendingDown size={14} className="text-berry-red" />
                  }
                </div>
              </div>
              {i < rest.length - 1 && <div className="border-t border-border-col" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
