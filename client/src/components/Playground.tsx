import { useState } from 'react'
import { Zap, ChevronDown } from 'lucide-react'
import { useFireRequests } from '../hooks/useFireRequests'
import { cn } from '../lib/utils'

const ROUTES = [
  '/demo',
  '/api/public/data',
  '/api/user/profile',
  '/api/upload',
]

export function Playground() {
  const [identifier, setIdentifier] = useState('test-user-42')
  const [route,      setRoute]      = useState('/demo')
  const [burst,      setBurst]      = useState(20)
  const [delay,      setDelay]      = useState(50)

  const { fire, results, isFiring, reset } = useFireRequests()

  const total      = results.allowed + results.blocked
  const completed  = total
  const willHit    = burst > 10

  const handleFire = () => {
    reset()
    fire({ identifier, route, burstCount: burst, delayMs: delay })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Request Playground</h1>
        <p className="text-xs text-ink-muted mt-1">
          Fire bursts of requests to observe rate limiting in real time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Controls panel ──────────────────────────────────────── */}
        <div className="panel p-5 flex flex-col gap-5">
          <h2 className="label">Configuration</h2>

          {/* Identifier */}
          <div className="flex flex-col gap-2">
            <label className="text-2xs font-medium text-ink-muted uppercase tracking-wider">
              Identifier
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="test-user-42"
              disabled={isFiring}
              className="input font-mono"
            />
          </div>

          {/* Route */}
          <div className="flex flex-col gap-2">
            <label className="text-2xs font-medium text-ink-muted uppercase tracking-wider">
              Route
            </label>
            <div className="relative">
              <select
                value={route}
                onChange={e => setRoute(e.target.value)}
                disabled={isFiring}
                className="select-input pr-8 font-mono"
              >
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                                      text-ink-faint pointer-events-none" />
            </div>
          </div>

          {/* Burst count */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-medium text-ink-muted uppercase tracking-wider">
                Burst Count
              </label>
              <span className="text-sm font-mono font-semibold text-ink">{burst}</span>
            </div>
            <input
              type="range" min={1} max={200} value={burst}
              onChange={e => setBurst(Number(e.target.value))}
              disabled={isFiring}
              className="w-full h-1 rounded-full appearance-none cursor-pointer
                         bg-s4 accent-signal"
            />
            <div className="flex justify-between text-2xs text-ink-faint font-mono">
              <span>1</span><span>200</span>
            </div>
          </div>

          {/* Delay */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-2xs font-medium text-ink-muted uppercase tracking-wider">
                Delay Between Requests
              </label>
              <span className="text-sm font-mono font-semibold text-ink">{delay}ms</span>
            </div>
            <input
              type="range" min={0} max={500} value={delay}
              onChange={e => setDelay(Number(e.target.value))}
              disabled={isFiring}
              className="w-full h-1 rounded-full appearance-none cursor-pointer
                         bg-s4 accent-signal"
            />
          </div>

          {/* Warning */}
          {willHit && (
            <div className="flex items-start gap-2.5 bg-warn/5 border border-warn/15
                            rounded-xl px-4 py-3">
              <span className="text-warn text-sm mt-px">⚠</span>
              <p className="text-2xs text-warn/80 leading-relaxed">
                {burst} requests will exceed the 10 req/min limit.
                You'll see 429s after the first 10.
              </p>
            </div>
          )}

          {/* Fire button */}
          <button
            onClick={handleFire}
            disabled={isFiring || !identifier.trim()}
            className="btn-fire w-full mt-auto"
          >
            {isFiring ? (
              <>
                <span className="animate-firing inline-block">◈</span>
                Firing {completed}/{burst}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Fire {burst} Requests
              </>
            )}
          </button>
        </div>

        {/* ── Results panel ───────────────────────────────────────── */}
        <div className="panel p-5 flex flex-col gap-5">
          <h2 className="label">Live Results</h2>

          {total === 0 && !isFiring ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full bg-s3 flex items-center justify-center">
                <Zap className="w-5 h-5 text-ink-faint" />
              </div>
              <p className="text-xs text-ink-faint text-center">
                Fire requests to see<br />real-time results here
              </p>
            </div>
          ) : (
            <>
              {/* Summary numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="panel-sm p-4 text-center">
                  <p className="text-3xl font-mono font-bold text-go">{results.allowed}</p>
                  <p className="label mt-1">Allowed</p>
                </div>
                <div className="panel-sm p-4 text-center">
                  <p className="text-3xl font-mono font-bold text-stop">{results.blocked}</p>
                  <p className="label mt-1">Blocked</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-2xs text-ink-faint font-mono mb-2">
                  <span>{completed}/{burst} fired</span>
                  <span>{burst - completed} pending</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-s3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(completed / burst) * 100}%`,
                      background: results.blocked > 0
                        ? 'linear-gradient(90deg, #10b981, #e11d48)'
                        : '#10b981',
                    }}
                  />
                </div>
              </div>

              {/* Retry-After */}
              {results.retryAfter > 0 && (
                <div className="flex items-center gap-3 bg-stop/5 border border-stop/15
                                rounded-xl px-4 py-3">
                  <span className="text-stop text-lg">⏱</span>
                  <div>
                    <p className="text-2xs text-ink-muted">Retry after</p>
                    <p className="text-xl font-mono font-bold text-stop">
                      {results.retryAfter}s
                    </p>
                  </div>
                </div>
              )}

              {/* Dot timeline */}
              <div>
                <p className="label mb-2.5">Request Timeline</p>
                <div className="flex flex-wrap gap-1.5">
                  {results.dots.map((dot, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-all duration-200',
                        dot === 'allowed' && 'bg-go shadow-[0_0_6px_rgba(16,185,129,0.7)]',
                        dot === 'blocked' && 'bg-stop shadow-[0_0_6px_rgba(225,29,72,0.7)]',
                        dot === 'pending' && 'bg-s4 animate-pulse',
                      )}
                      title={dot}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
