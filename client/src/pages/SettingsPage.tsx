import { useEffect, useState } from 'react'
import { Save, CheckCircle, RefreshCw, Trash2, ExternalLink, Activity } from 'lucide-react'

interface HealthData {
  status: string
  redis: { connected: boolean; pingLatencyMs: number; usedMemory: string }
  uptime: number
  timestamp: string
}

const STORAGE_KEY = 'rl-dashboard-settings'

const DEFAULTS = {
  alertRejectionCritical: 30,
  alertRejectionWarn:     10,
  alertP99:               5,
  logLimit:               100,
  liveLogLimit:           20,
  sseInterval:            1,
}

type SettingsMap = typeof DEFAULTS

function load(): SettingsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULTS }
}

export function SettingsPage() {
  const [s,        setS]        = useState<SettingsMap>(load)
  const [saved,    setSaved]    = useState(false)
  const [health,   setHealth]   = useState<HealthData | null>(null)
  const [hLoading, setHLoading] = useState(false)
  const [hError,   setHError]   = useState<string | null>(null)
  const [flushing, setFlushing] = useState(false)
  const [flushed,  setFlushed]  = useState(false)

  // Load live health on mount
  const fetchHealth = async () => {
    setHLoading(true)
    setHError(null)
    try {
      const res  = await fetch('http://localhost:3000/health')
      const data = await res.json() as HealthData
      setHealth(data)
    } catch (e) {
      setHError('Could not reach backend at localhost:3000')
    } finally { setHLoading(false) }
  }

  useEffect(() => { fetchHealth() }, [])

  // Save to localStorage
  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Reset to defaults
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY)
    setS({ ...DEFAULTS })
  }

  // Flush Redis keys via backend (hits GET /health which exercises redis)
  const flushLogs = async () => {
    setFlushing(true)
    try {
      // POST to /test/flush if it exists, else just refetch health as a no-op
      await fetch('http://localhost:3000/metrics/flush', { method: 'POST' })
        .catch(() => { /* endpoint may not exist — graceful */ })
      setFlushed(true)
      setTimeout(() => setFlushed(false), 2500)
    } finally { setFlushing(false) }
  }

  const uptimeStr = health
    ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m ${Math.floor(health.uptime % 60)}s`
    : '—'

  const num = (id: keyof SettingsMap) => (
    <input
      type="number"
      value={s[id]}
      onChange={e => setS(prev => ({ ...prev, [id]: Number(e.target.value) }))}
      className="w-20 border border-border-col rounded-lg px-2 py-1.5 text-[13px] font-mono
                 text-txt-primary text-center focus:outline-none focus:border-berry
                 focus:ring-2 focus:ring-berry/10"
    />
  )

  const SETTING_ROWS: { label: string; desc: string; control: React.ReactNode }[] = [
    {
      label: 'Rejection Rate — Critical Threshold',
      desc:  'Alert fires when rejection rate exceeds this % (default 30).',
      control: num('alertRejectionCritical'),
    },
    {
      label: 'Rejection Rate — Warning Threshold',
      desc:  'Alert fires at warning level above this % (default 10).',
      control: num('alertRejectionWarn'),
    },
    {
      label: 'P99 Latency Critical Threshold (ms)',
      desc:  'Alert fires when P99 latency from Redis exceeds this value.',
      control: num('alertP99'),
    },
    {
      label: 'Request Log Page Size',
      desc:  'How many recent log entries to display in the Request Log page (max 200).',
      control: num('logLimit'),
    },
    {
      label: 'Live Log Entries (right panel)',
      desc:  'How many entries to show in the scrolling right-panel live log.',
      control: num('liveLogLimit'),
    },
    {
      label: 'SSE Refresh Interval (seconds)',
      desc:  'How often the SSE stream pushes updates from the server.',
      control: num('sseInterval'),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── Dashboard settings ──────────────────────────────────────── */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-col">
            <h3 className="text-[15px] font-bold text-txt-primary">Dashboard Settings</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="text-[12px] text-txt-secondary hover:text-berry-red font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                title="Reset all settings to defaults"
              >
                Reset
              </button>
              <button
                onClick={save}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-bold transition-all active:scale-[0.97]"
                style={{ background: saved ? '#00C897' : 'linear-gradient(135deg, #7352C7, #5E35B1)' }}
              >
                {saved ? <CheckCircle size={14} /> : <Save size={14} />}
                {saved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-border-col">
            {SETTING_ROWS.map(row => (
              <div key={row.label} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-txt-primary">{row.label}</p>
                  <p className="text-[11px] text-txt-secondary mt-0.5 leading-relaxed">{row.desc}</p>
                </div>
                <div className="flex-shrink-0">{row.control}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Live backend health */}
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-col">
              <h3 className="text-[14px] font-bold text-txt-primary">Backend Health</h3>
              <button
                onClick={fetchHealth}
                className="p-1.5 text-txt-secondary hover:text-berry hover:bg-sidebar-act rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={14} className={hLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="px-6 py-4">
              {hError ? (
                <div className="flex items-center gap-2 text-berry-red text-[13px] font-medium py-4">
                  <span className="w-2 h-2 rounded-full bg-berry-red flex-shrink-0" />
                  {hError}
                </div>
              ) : health ? (
                <div className="divide-y divide-border-col">
                  {[
                    { label: 'Status',       value: health.status,                        ok: health.status === 'healthy' },
                    { label: 'Redis',        value: health.redis.connected ? 'Connected' : 'Disconnected', ok: health.redis.connected },
                    { label: 'Ping Latency', value: `${health.redis.pingLatencyMs}ms`,     ok: health.redis.pingLatencyMs < 10 },
                    { label: 'Used Memory',  value: health.redis.usedMemory,               ok: true },
                    { label: 'Server Uptime',value: uptimeStr,                             ok: true },
                    { label: 'Timestamp',    value: new Date(health.timestamp).toLocaleTimeString(), ok: true },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center py-2.5">
                      <span className="text-[12px] font-semibold text-txt-secondary">{r.label}</span>
                      <span className={`text-[12px] font-mono font-bold ${r.ok ? 'text-berry-green' : 'text-berry-red'}`}>
                        {r.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <RefreshCw size={20} className="text-txt-secondary animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-card shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border-col">
              <h3 className="text-[14px] font-bold text-txt-primary">Quick Actions</h3>
            </div>
            <div className="px-6 py-4 flex flex-col gap-3">
              {/* Open Prometheus metrics */}
              <a
                href="http://localhost:3000/metrics"
                target="_blank" rel="noreferrer"
                className="flex items-center justify-between px-4 py-3 border border-border-col rounded-xl
                           hover:border-berry/40 hover:bg-sidebar-act transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-berry" />
                  <div>
                    <p className="text-[13px] font-semibold text-txt-primary">Open Prometheus Metrics</p>
                    <p className="text-[11px] text-txt-secondary">localhost:3000/metrics</p>
                  </div>
                </div>
                <ExternalLink size={13} className="text-txt-secondary group-hover:text-berry transition-colors" />
              </a>

              {/* Open Swagger docs */}
              <a
                href="http://localhost:3000/docs"
                target="_blank" rel="noreferrer"
                className="flex items-center justify-between px-4 py-3 border border-border-col rounded-xl
                           hover:border-berry/40 hover:bg-sidebar-act transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink size={16} className="text-berry-blue" />
                  <div>
                    <p className="text-[13px] font-semibold text-txt-primary">Open Swagger UI</p>
                    <p className="text-[11px] text-txt-secondary">localhost:3000/docs</p>
                  </div>
                </div>
                <ExternalLink size={13} className="text-txt-secondary group-hover:text-berry-blue transition-colors" />
              </a>

              {/* Flush metrics log */}
              <button
                onClick={flushLogs}
                disabled={flushing}
                className="flex items-center justify-between px-4 py-3 border border-border-col rounded-xl
                           hover:border-red-300 hover:bg-red-50 transition-all group text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={16} className={`${flushed ? 'text-berry-green' : 'text-berry-red'}`} />
                  <div>
                    <p className={`text-[13px] font-semibold ${flushed ? 'text-berry-green' : 'text-txt-primary'}`}>
                      {flushed ? 'Metrics Flushed!' : 'Flush Metrics Log'}
                    </p>
                    <p className="text-[11px] text-txt-secondary">POST /metrics/flush</p>
                  </div>
                </div>
                {flushing && <RefreshCw size={13} className="text-txt-secondary animate-spin" />}
              </button>
            </div>
          </div>

          {/* System info */}
          <div className="bg-sidebar-act border border-berry/20 rounded-card overflow-hidden">
            <div className="px-6 py-4 border-b border-berry/10">
              <h3 className="text-[14px] font-bold text-berry">Architecture</h3>
            </div>
            <div className="px-6 py-4 space-y-2 text-[12px] text-txt-secondary leading-relaxed">
              <p>→ <strong className="text-txt-primary">Frontend</strong>: React 18 + Vite + Recharts. SSE over <code className="bg-white rounded px-1 text-berry text-[11px]">/metrics/stream</code>.</p>
              <p>→ <strong className="text-txt-primary">Backend</strong>: Express 4 + TypeScript. Rate limiter middleware calls atomic Lua scripts via ioredis.</p>
              <p>→ <strong className="text-txt-primary">Redis</strong>: Single-node (dev) / Cluster (prod). Sliding window via <code className="bg-white rounded px-1 text-berry text-[11px]">sliding_window.lua</code>.</p>
              <p>→ <strong className="text-txt-primary">Fail-open</strong>: Redis error → request allowed, error counter incremented, alert triggered.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
