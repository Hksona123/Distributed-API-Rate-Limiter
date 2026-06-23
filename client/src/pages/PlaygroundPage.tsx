import { useState } from 'react'
import { Zap, ChevronDown } from 'lucide-react'
import { useFireRequests } from '../hooks/useFireRequests'
import { DotTimeline }     from '../components/playground/DotTimeline'
import { RouteSparkline }  from '../components/charts/RouteSparkline'
import { SliderField }     from '../components/ui/SliderField'

const ROUTES = [
  '/demo',
  '/api/public/data',
  '/api/user/profile',
  '/api/upload',
  '/api/admin/config',
]

const PRESETS = [
  { label: 'Light test',    burst: 5,   delay: 200, desc: 'Well under limit' },
  { label: 'Boundary test', burst: 12,  delay: 100, desc: 'Just over 10/min limit' },
  { label: 'Burst storm',   burst: 50,  delay: 20,  desc: 'Heavy burst — many 429s' },
  { label: 'DDoS sim',      burst: 100, delay: 0,   desc: 'Flood — all blocked fast' },
]

export function PlaygroundPage() {
  const [identifier,   setIdentifier]   = useState('test-user-42')
  const [route,        setRoute]        = useState('/demo')
  const [burst,        setBurst]        = useState(20)
  const [delay,        setDelay]        = useState(50)
  const [activePreset, setActivePreset] = useState<number | null>(null)

  const { fire, results, isFiring, reset } = useFireRequests()

  const total      = results.allowed + results.blocked
  const allowedPct = burst > 0 ? (results.allowed / burst) * 100 : 0

  const applyPreset = (i: number) => {
    const p = PRESETS[i]
    setBurst(p.burst)
    setDelay(p.delay)
    setActivePreset(i)
  }

  const handleFire = () => {
    reset()
    fire({ identifier, route, burstCount: burst, delayMs: delay })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Preset buttons ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => applyPreset(i)}
            disabled={isFiring}
            className={`p-4 rounded-card text-left border-2 transition-all disabled:opacity-40 ${
              activePreset === i
                ? 'border-berry bg-sidebar-act'
                : 'border-border-col bg-white hover:border-berry/40'
            }`}
          >
            <p className={`text-[13px] font-bold mb-1 ${activePreset === i ? 'text-berry' : 'text-txt-primary'}`}>
              {p.label}
            </p>
            <p className="text-[11px] text-txt-secondary leading-snug">{p.desc}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-[10px] font-semibold bg-berry/10 text-berry px-2 py-0.5 rounded-full">
                {p.burst} req
              </span>
              <span className="text-[10px] font-semibold bg-gray-100 text-txt-secondary px-2 py-0.5 rounded-full">
                {p.delay}ms
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Config panel */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Configuration</h3>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Identifier */}
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">
                Client Identifier
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                disabled={isFiring}
                placeholder="e.g. user-42, ip-10.0.0.1"
                className="w-full border border-border-col rounded-lg px-3 py-2.5 text-[13px]
                           text-txt-primary placeholder-txt-secondary/60 font-medium
                           focus:outline-none focus:border-berry focus:ring-2 focus:ring-berry/10
                           disabled:opacity-40 transition-all"
              />
            </div>

            {/* Route */}
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">
                Target Route
              </label>
              <div className="relative">
                <select
                  value={route}
                  onChange={e => setRoute(e.target.value)}
                  disabled={isFiring}
                  className="w-full border border-border-col rounded-lg px-3 py-2.5 text-[13px]
                             text-txt-primary font-medium bg-white appearance-none cursor-pointer
                             focus:outline-none focus:border-berry focus:ring-2 focus:ring-berry/10
                             disabled:opacity-40 transition-all"
                >
                  {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-secondary pointer-events-none" />
              </div>
            </div>

            <SliderField
              label="Burst Count"
              value={burst}
              unit="req"
              min={1} max={200}
              disabled={isFiring}
              minLabel="1"
              warnLabel="⚠ >10 triggers 429s"
              maxLabel="200"
              onChange={v => { setBurst(v); setActivePreset(null) }}
            />

            <SliderField
              label="Delay Between Requests"
              value={delay}
              unit="ms"
              min={0} max={500}
              disabled={isFiring}
              minLabel="0ms (instant)"
              maxLabel="500ms"
              onChange={v => { setDelay(v); setActivePreset(null) }}
            />

            {/* 429 warning */}
            {burst > 10 && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-amber-500 text-[15px] flex-shrink-0 mt-0.5">⚠</span>
                <p className="text-[12px] text-amber-700 leading-relaxed">
                  <strong>{burst}</strong> requests exceeds the 10 req/min limit for{' '}
                  <code className="font-mono text-[11px] bg-amber-100 px-1 rounded">/demo</code>.
                  Expect <strong>429 Too Many Requests</strong> after the first 10.
                </p>
              </div>
            )}

            {/* Fire button */}
            <button
              onClick={handleFire}
              disabled={isFiring || !identifier.trim()}
              className="w-full h-12 rounded-lg text-white text-[14px] font-bold flex items-center
                         justify-center gap-2 transition-all duration-150
                         disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)',
                boxShadow: '0 4px 14px rgba(115,82,199,0.35)',
              }}
            >
              {isFiring ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Firing… ({total}/{burst})
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Fire {burst} Requests
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results panel */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Live Results</h3>
          </div>

          <div className="px-6 py-5">
            {total === 0 && !isFiring ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-14 h-14 bg-sidebar-act rounded-full flex items-center justify-center">
                  <Zap size={24} className="text-berry" />
                </div>
                <p className="text-[14px] font-semibold text-txt-primary">Ready to fire</p>
                <p className="text-[13px] text-txt-secondary">
                  Configure a test and click "Fire Requests"
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Allowed / Blocked counters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <p className="text-[32px] font-bold text-berry-green leading-none">{results.allowed}</p>
                    <p className="text-[12px] font-semibold text-berry-green/70 mt-1">✓ Allowed</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                    <p className="text-[32px] font-bold text-berry-red leading-none">{results.blocked}</p>
                    <p className="text-[12px] font-semibold text-berry-red/70 mt-1">✕ Blocked</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[12px] text-txt-secondary font-medium mb-1.5">
                    <span>{total} / {burst} fired</span>
                    <span>{allowedPct.toFixed(0)}% success</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${allowedPct}%`,
                        background:
                          allowedPct === 100
                            ? '#00C897'
                            : allowedPct > 50
                            ? 'linear-gradient(90deg, #00C897, #FFC107)'
                            : 'linear-gradient(90deg, #00C897, #FF4B4B)',
                      }}
                    />
                  </div>
                </div>

                {/* Retry-After badge */}
                {results.retryAfter > 0 && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200
                                  text-amber-700 text-[13px] font-semibold px-4 py-2 rounded-badge w-fit">
                    ⏱ Retry-After: {results.retryAfter}s
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <p className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">
                    Request Timeline
                  </p>
                  <DotTimeline dots={results.dots} />
                </div>

                {/* RPS sparkline */}
                <div>
                  <p className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">
                    RPS Sparkline
                  </p>
                  <RouteSparkline color="#7352C7" height={72} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
