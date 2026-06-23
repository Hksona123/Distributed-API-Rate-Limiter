import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useFireRequests } from '../../hooks/useFireRequests'
import { DotTimeline } from './DotTimeline'

const ROUTES = ['/demo', '/api/public/data', '/api/user/profile', '/api/upload', '/api/admin/config']

export function Playground() {
  const [identifier, setIdentifier] = useState('test-user-42')
  const [route,      setRoute]      = useState('/demo')
  const [burst,      setBurst]      = useState(20)
  const [delay,      setDelay]      = useState(50)

  const { fire, results, isFiring, reset } = useFireRequests()

  const total      = results.allowed + results.blocked
  const allowedPct = burst > 0 ? (results.allowed / burst) * 100 : 0

  const handleFire = () => {
    reset()
    fire({ identifier, route, burstCount: burst, delayMs: delay })
  }

  return (
    <div className="bg-white rounded-card shadow-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">🔥</span>
        <h3 className="text-[14px] font-bold text-txt-primary">Playground</h3>
      </div>

      <div className="flex flex-col gap-3">
        {/* Identifier */}
        <div>
          <label className="block text-[11px] font-semibold text-txt-secondary uppercase
                            tracking-wider mb-1.5">
            Identifier
          </label>
          <input
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            disabled={isFiring}
            placeholder="test-user-42"
            className="w-full border border-border-col rounded-lg px-3 py-2 text-[13px]
                       text-txt-primary placeholder-txt-secondary/60 font-medium
                       focus:outline-none focus:border-berry focus:ring-2 focus:ring-berry/10
                       disabled:opacity-40 transition-all"
          />
        </div>

        {/* Route */}
        <div>
          <label className="block text-[11px] font-semibold text-txt-secondary uppercase
                            tracking-wider mb-1.5">
            Route
          </label>
          <select
            value={route}
            onChange={e => setRoute(e.target.value)}
            disabled={isFiring}
            className="w-full border border-border-col rounded-lg px-3 py-2 text-[13px]
                       text-txt-primary font-medium bg-white cursor-pointer
                       focus:outline-none focus:border-berry focus:ring-2 focus:ring-berry/10
                       disabled:opacity-40 transition-all"
          >
            {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Burst slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
              Burst Count
            </label>
            <span className="text-[13px] font-bold text-berry">{burst}</span>
          </div>
          <input
            type="range" min={1} max={100} value={burst}
            onChange={e => setBurst(Number(e.target.value))}
            disabled={isFiring}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40"
            style={{ accentColor: '#7352C7' }}
          />
        </div>

        {/* Delay slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider">
              Delay
            </label>
            <span className="text-[13px] font-bold text-berry">{delay}ms</span>
          </div>
          <input
            type="range" min={0} max={500} value={delay}
            onChange={e => setDelay(Number(e.target.value))}
            disabled={isFiring}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-40"
            style={{ accentColor: '#7352C7' }}
          />
        </div>

        {/* Fire button */}
        <button
          onClick={handleFire}
          disabled={isFiring || !identifier.trim()}
          className="w-full h-11 rounded-lg text-white text-[14px] font-semibold flex items-center
                     justify-center gap-2 mt-1 transition-all duration-150
                     disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)',
            boxShadow: '0 4px 12px rgba(115,82,199,0.35)',
          }}
        >
          {isFiring ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Firing... ({total}/{burst})
            </>
          ) : (
            <>
              <Zap size={16} />
              Fire Requests
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {total > 0 && (
        <div className="mt-4 pt-4 border-t border-border-col">
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-berry-green transition-all duration-300"
              style={{ width: `${allowedPct}%` }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-[13px] font-semibold mb-3">
            <span className="text-berry-green">✓ Allowed &nbsp;{results.allowed}</span>
            <span className="text-berry-red">✕ Blocked &nbsp;{results.blocked}</span>
          </div>

          {/* Retry countdown */}
          {results.retryAfter > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200
                            text-amber-700 text-[12px] font-semibold px-3 py-1.5 rounded-badge mb-3">
              ⏱ Retry in {results.retryAfter}s
            </div>
          )}

          {/* Dot timeline */}
          <DotTimeline dots={results.dots} />
        </div>
      )}
    </div>
  )
}
