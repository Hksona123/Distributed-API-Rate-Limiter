import { useState } from 'react'
import { Save, CheckCircle } from 'lucide-react'

interface Setting { id: string; label: string; desc: string; value: string | number | boolean; type: 'toggle' | 'select' | 'number'; options?: string[] }

const DEFAULT_SETTINGS: Setting[] = [
  {
    id: 'sseInterval', label: 'SSE Refresh Interval', type: 'number',
    desc: 'How often the SSE stream updates the dashboard (seconds). Lower = more CPU.',
    value: 1,
  },
  {
    id: 'logLimit', label: 'Request Log Size', type: 'number',
    desc: 'How many recent log entries to display in the Request Log page.',
    value: 100,
  },
  {
    id: 'alertRejectionCritical', label: 'Rejection Rate — Critical Threshold', type: 'number',
    desc: 'Alert fires when rejection rate exceeds this % (default 30).',
    value: 30,
  },
  {
    id: 'alertRejectionWarn', label: 'Rejection Rate — Warning Threshold', type: 'number',
    desc: 'Alert fires at warning level above this % (default 10).',
    value: 10,
  },
  {
    id: 'alertP99', label: 'P99 Latency — Critical Threshold (ms)', type: 'number',
    desc: 'Alert fires when P99 latency from Redis exceeds this value.',
    value: 5,
  },
  {
    id: 'chartPeriod', label: 'Default Chart Period', type: 'select',
    options: ['Today', 'Last 7 days', 'Last 30 days'],
    desc: 'Default period shown in the throughput bar chart.',
    value: 'Today',
  },
  {
    id: 'compactSidebar', label: 'Start with Compact Sidebar', type: 'toggle',
    desc: 'Collapse the sidebar to icon-only mode on page load.',
    value: false,
  },
  {
    id: 'liveLogLimit', label: 'Live Log Entries (right panel)', type: 'number',
    desc: 'How many entries to show in the scrolling right-panel Live Log.',
    value: 20,
  },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>(DEFAULT_SETTINGS)
  const [saved,    setSaved]    = useState(false)

  const update = (id: string, value: string | number | boolean) =>
    setSettings(prev => prev.map(s => s.id === id ? { ...s, value } : s))

  const save = () => {
    // Persist to localStorage
    const obj: Record<string, string | number | boolean> = {}
    settings.forEach(s => { obj[s.id] = s.value })
    localStorage.setItem('rl-dashboard-settings', JSON.stringify(obj))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const systemInfo = [
    { label: 'Dashboard Version', value: '2.0.0' },
    { label: 'React',             value: '18.x' },
    { label: 'Vite',              value: '8.x' },
    { label: 'Chart Library',     value: 'Recharts 2.x' },
    { label: 'Node.js Backend',   value: 'Express 4.x + TypeScript' },
    { label: 'Rate Limiter',      value: 'Sliding Window Lua / Redis 7' },
    { label: 'SSE Interval',      value: '1s push from server' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Settings card */}
        <div className="bg-white rounded-card shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[15px] font-bold text-txt-primary">Dashboard Settings</h3>
            <button onClick={save}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-bold
                         transition-all active:scale-[0.97]"
              style={{ background: saved ? '#00C897' : 'linear-gradient(135deg, #7352C7, #5E35B1)' }}>
              {saved ? <CheckCircle size={14} /> : <Save size={14} />}
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>

          <div className="flex flex-col divide-y divide-border-col">
            {settings.map(s => (
              <div key={s.id} className="py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-txt-primary">{s.label}</p>
                  <p className="text-[11px] text-txt-secondary mt-0.5 leading-relaxed">{s.desc}</p>
                </div>

                <div className="flex-shrink-0">
                  {s.type === 'toggle' && (
                    <button
                      onClick={() => update(s.id, !s.value)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${s.value ? 'bg-berry' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.value ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  )}
                  {s.type === 'number' && (
                    <input
                      type="number"
                      value={s.value as number}
                      onChange={e => update(s.id, Number(e.target.value))}
                      className="w-20 border border-border-col rounded-lg px-2 py-1.5 text-[13px] font-mono
                                 text-txt-primary text-center focus:outline-none focus:border-berry
                                 focus:ring-2 focus:ring-berry/10"
                    />
                  )}
                  {s.type === 'select' && (
                    <select
                      value={s.value as string}
                      onChange={e => update(s.id, e.target.value)}
                      className="border border-border-col rounded-lg px-2 py-1.5 text-[13px] font-medium
                                 text-txt-primary bg-white focus:outline-none focus:border-berry
                                 focus:ring-2 focus:ring-berry/10"
                    >
                      {s.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-card shadow-card p-5">
            <h3 className="text-[14px] font-bold text-txt-primary mb-4">System Information</h3>
            {systemInfo.map(r => (
              <div key={r.label} className="flex justify-between py-2 border-b border-border-col last:border-0">
                <span className="text-[12px] font-semibold text-txt-secondary">{r.label}</span>
                <span className="text-[12px] text-txt-primary font-mono font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-sidebar-act border border-berry/20 rounded-card p-5">
            <h3 className="text-[14px] font-bold text-berry mb-3">Architecture Overview</h3>
            <div className="space-y-2 text-[12px] text-txt-secondary leading-relaxed">
              <p>→ <strong className="text-txt-primary">Frontend</strong>: React 18 + Vite + Recharts. SSE over <code className="bg-white rounded px-1 text-berry text-[11px]">/metrics/stream</code>.</p>
              <p>→ <strong className="text-txt-primary">Backend</strong>: Express 4 + TypeScript. Rate limiter middleware calls atomic Lua scripts via ioredis.</p>
              <p>→ <strong className="text-txt-primary">Redis</strong>: Single-node (dev) / Cluster mode (prod). Sliding window via <code className="bg-white rounded px-1 text-berry text-[11px]">sliding_window.lua</code>.</p>
              <p>→ <strong className="text-txt-primary">Fail-open</strong>: Redis error → request allowed, Prometheus counter incremented, admin alerted.</p>
              <p>→ <strong className="text-txt-primary">Observability</strong>: Prometheus scrape at <code className="bg-white rounded px-1 text-berry text-[11px]">/metrics</code>, Grafana dashboard provisioned via YAML.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
