import { useState, useRef } from 'react'
import { Play, Square, Zap } from 'lucide-react'
import { SliderField } from '../components/ui/SliderField'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

interface LoadPoint {
  t: number
  rps: number
  p99: number
  errors: number
}

interface LoadConfig {
  route: string
  concurrency: number
  duration: number
  rampUp: number
}

const ROUTES = ['/demo', '/api/public/data', '/api/user/profile', '/api/admin/config', '/api/upload']


export function LoadTestPage() {
  const [cfg, setCfg]         = useState<LoadConfig>({ route: '/demo', concurrency: 5, duration: 30, rampUp: 3 })
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<LoadPoint[]>([])
  const [summary, setSummary] = useState<{ total: number; allowed: number; blocked: number; avgRps: number } | null>(null)
  const stopRef  = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalAllowed = useRef(0)
  const totalBlocked = useRef(0)
  const elapsed      = useRef(0)

  const stop = () => {
    stopRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    setRunning(false)
  }

  const start = async () => {
    stopRef.current  = false
    totalAllowed.current = 0
    totalBlocked.current = 0
    elapsed.current  = 0
    setResults([])
    setSummary(null)
    setRunning(true)

    const tick = async () => {
      if (stopRef.current || elapsed.current >= cfg.duration) {
        stop()
        setSummary({
          total:   totalAllowed.current + totalBlocked.current,
          allowed: totalAllowed.current,
          blocked: totalBlocked.current,
          avgRps:  Math.round((totalAllowed.current + totalBlocked.current) / Math.max(elapsed.current, 1)),
        })
        return
      }

      const rampFactor = Math.min(elapsed.current / Math.max(cfg.rampUp, 1), 1)
      const active     = Math.max(1, Math.round(cfg.concurrency * rampFactor))
      const t0 = performance.now()

      const batch = Array.from({ length: active }, () =>
        fetch('/test/fire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: `loadtest-${Math.random().toString(36).slice(2, 6)}`,
            route: cfg.route,
          }),
        })
          .then(r => r.json() as Promise<{ allowed: boolean }>)
          .catch(() => ({ allowed: false }))
      )

      const batchResults = await Promise.all(batch)
      const batchAllowed = batchResults.filter(r => r.allowed).length
      const batchBlocked = batchResults.length - batchAllowed
      const batchMs      = performance.now() - t0

      totalAllowed.current += batchAllowed
      totalBlocked.current += batchBlocked
      elapsed.current      += 1

      setResults(prev => [
        ...prev,
        {
          t:      elapsed.current,
          rps:    active,
          p99:    Math.round(batchMs / active),
          errors: batchBlocked,
        },
      ])
    }

    timerRef.current = setInterval(tick, 1000)
    tick()
  }

  const pct = running ? Math.round((elapsed.current / cfg.duration) * 100) : summary ? 100 : 0

  return (
    <div className="flex flex-col gap-5">
      {/* ── Config + Live Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Config card */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Test Configuration</h3>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Route dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-txt-secondary uppercase tracking-wider mb-2">
                Target Route
              </label>
              <select
                value={cfg.route}
                onChange={e => setCfg(p => ({ ...p, route: e.target.value }))}
                disabled={running}
                className="w-full border border-border-col rounded-lg px-3 py-2.5 text-[13px] font-medium
                           text-txt-primary bg-white focus:outline-none focus:border-berry
                           focus:ring-2 focus:ring-berry/10 disabled:opacity-40 cursor-pointer"
              >
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <SliderField
              label="Concurrent Users" value={cfg.concurrency} unit="users"
              min={1} max={50} disabled={running}
              minLabel="1" maxLabel="50"
              onChange={v => setCfg(p => ({ ...p, concurrency: v }))}
            />

            <SliderField
              label="Duration" value={cfg.duration} unit="sec"
              min={5} max={120} step={5} disabled={running}
              minLabel="5s" maxLabel="120s"
              onChange={v => setCfg(p => ({ ...p, duration: v }))}
            />

            <SliderField
              label="Ramp-up Period" value={cfg.rampUp} unit="sec"
              min={0} max={20} disabled={running}
              minLabel="Instant" maxLabel="20s"
              onChange={v => setCfg(p => ({ ...p, rampUp: v }))}
            />


            {/* Start / Stop */}
            {!running ? (
              <button
                onClick={start}
                className="w-full h-11 rounded-lg text-white text-[14px] font-bold flex items-center
                           justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)', boxShadow: '0 4px 12px rgba(115,82,199,0.35)' }}
              >
                <Play size={16} /> Start Load Test
              </button>
            ) : (
              <button
                onClick={stop}
                className="w-full h-11 rounded-lg text-white text-[14px] font-bold flex items-center
                           justify-center gap-2 bg-berry-red transition-all active:scale-[0.98]"
              >
                <Square size={16} /> Stop
              </button>
            )}
          </div>
        </div>

        {/* Live stats card */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Live Stats</h3>
          </div>

          <div className="px-6 py-5">
            {results.length === 0 && !running ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-sidebar-act rounded-full flex items-center justify-center">
                  <Zap size={24} className="text-berry" />
                </div>
                <p className="text-[13px] text-txt-secondary font-medium text-center">
                  Configure and start the test
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Progress bar during run */}
                {running && (
                  <div>
                    <div className="flex justify-between text-[12px] text-txt-secondary font-medium mb-1.5">
                      <span>Progress</span>
                      <span>{elapsed.current}s / {cfg.duration}s</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-berry transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Live counters during run */}
                {running && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                      <p className="text-[28px] font-bold text-berry-green leading-none">{totalAllowed.current}</p>
                      <p className="text-[12px] font-semibold text-berry-green/70 mt-1">✓ Allowed</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <p className="text-[28px] font-bold text-berry-red leading-none">{totalBlocked.current}</p>
                      <p className="text-[12px] font-semibold text-berry-red/70 mt-1">✕ Blocked</p>
                    </div>
                  </div>
                )}

                {/* Summary after run */}
                {summary && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Requests', v: summary.total,   color: '#7352C7' },
                      { label: 'Avg RPS',        v: summary.avgRps,  color: '#1A97F5' },
                      { label: 'Allowed',        v: summary.allowed, color: '#00C897' },
                      { label: 'Blocked (429)',  v: summary.blocked, color: '#FF4B4B' },
                    ].map(s => (
                      <div key={s.label} className="bg-page-bg rounded-xl p-3 text-center border border-border-col">
                        <p className="text-[24px] font-bold leading-none" style={{ color: s.color }}>{s.v.toLocaleString()}</p>
                        <p className="text-[11px] text-txt-secondary font-medium mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Results chart ────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Requests Over Time</h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={results} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="#E8EDF2" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: '#7C8FAC', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  label={{ value: 'seconds', position: 'insideBottom', offset: -2, fill: '#7C8FAC', fontSize: 11 }}
                />
                <YAxis tick={{ fill: '#7C8FAC', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
                <Line type="monotone" dataKey="rps"    name="Concurrent" stroke="#7352C7" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="errors" name="Blocked"    stroke="#FF4B4B" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="p99"    name="Latency ms" stroke="#1A97F5" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
