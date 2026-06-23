import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useMetrics } from '../context/MetricsContext'

interface Alert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  ts: Date
  route?: string
  resolved: boolean
}

function sev(a: Alert) {
  if (a.severity === 'critical') return { color: 'text-berry-red', bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle size={16} className="text-berry-red" /> }
  if (a.severity === 'warning') return { color: 'text-berry-amber', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle size={16} className="text-berry-amber" /> }
  return { color: 'text-berry', bg: 'bg-purple-50', border: 'border-purple-200', icon: <CheckCircle size={16} className="text-berry" /> }
}

export function AlertsPage() {
  const { current } = useMetrics()
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Synthesise alerts from live metrics
  useEffect(() => {
    setAlerts(prev => {
      const next = [...prev]
      const now = new Date()

      if (current.rejectionRate > 30) {
        next.unshift({
          id: Math.random().toString(36).slice(2),
          severity: 'critical',
          title: 'High rejection rate',
          detail: `Rejection rate hit ${current.rejectionRate.toFixed(1)}% — potential DDoS or misconfigured client`,
          ts: now, resolved: false,
        })
      } else if (current.rejectionRate > 10) {
        next.unshift({
          id: Math.random().toString(36).slice(2),
          severity: 'warning',
          title: 'Elevated rejection rate',
          detail: `Rejection rate at ${current.rejectionRate.toFixed(1)}% — monitor closely`,
          ts: now, resolved: false,
        })
      }

      if (current.p99Latency > 5) {
        next.unshift({
          id: Math.random().toString(36).slice(2),
          severity: 'critical',
          title: 'P99 latency spike',
          detail: `P99 latency is ${current.p99Latency.toFixed(2)}ms — above 5ms threshold`,
          ts: now, resolved: false,
        })
      }

      // Deduplicate by title+severity within 30s
      const seen = new Set<string>()
      return next.filter(a => {
        const key = `${a.title}-${a.severity}`
        const age = (now.getTime() - a.ts.getTime()) / 1000
        if (seen.has(key) || age > 300) return false
        seen.add(key)
        return true
      }).slice(0, 50)
    })
  }, [current.rejectionRate, current.p99Latency])

  const resolve = (id: string) =>
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a))

  const clearAll = () => setAlerts([])

  const active = alerts.filter(a => !a.resolved)
  const resolved = alerts.filter(a => a.resolved)

  const rules = [
    { metric: 'Rejection Rate', threshold: '> 30%', severity: 'Critical', action: 'Trigger DDoS mitigation' },
    { metric: 'Rejection Rate', threshold: '> 10%', severity: 'Warning', action: 'Notify on-call team' },
    { metric: 'P99 Latency', threshold: '> 5ms', severity: 'Critical', action: 'Scale Redis replicas' },
    { metric: 'Active Redis Keys', threshold: '> 10,000', severity: 'Warning', action: 'Eviction policy review' },
    { metric: 'RPS', threshold: '> 5,000', severity: 'Info', action: 'Log to audit trail' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Alerts', count: active.length, color: '#FF4B4B', bg: 'bg-red-50' },
          { label: 'Resolved Today', count: resolved.length, color: '#00C897', bg: 'bg-green-50' },
          { label: 'Alert Rules', count: rules.length, color: '#7352C7', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4">
            <p className="text-[28px] font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[13px] text-txt-secondary font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active alerts */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-col">
            <h3 className="text-[14px] font-bold text-txt-primary">Active Alerts</h3>
            {alerts.length > 0 && (
              <button onClick={clearAll}
                className="text-[12px] text-txt-secondary hover:text-berry-red transition-colors font-medium">
                Clear all
              </button>
            )}
          </div>
          <div className="divide-y divide-border-col max-h-80 overflow-y-auto">
            {active.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <CheckCircle size={28} className="text-berry-green" />
                <p className="text-[13px] text-txt-secondary font-medium">All clear — no active alerts</p>
              </div>
            )}
            {active.map(a => {
              const s = sev(a)
              return (
                <div key={a.id} className={`p-4 ${s.bg} animate-fade-up`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {s.icon}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold ${s.color}`}>{a.title}</p>
                        <p className="text-[12px] text-txt-secondary mt-0.5">{a.detail}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock size={10} className="text-txt-secondary" />
                          <span className="text-[10px] text-txt-secondary">
                            {a.ts.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => resolve(a.id)}
                      className="text-[11px] font-semibold text-txt-secondary hover:text-berry
                                 bg-white border border-border-col rounded-lg px-2 py-1 flex-shrink-0
                                 transition-colors">
                      Resolve
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Alert rules */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border-col">
            <h3 className="text-[14px] font-bold text-txt-primary">Alert Rules</h3>
          </div>
          <div className="divide-y divide-border-col">
            {rules.map((r, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-txt-primary">{r.metric}</p>
                  <p className="text-[11px] text-txt-secondary mt-0.5">Action: {r.action}</p>
                </div>
                <span className="font-mono text-[12px] font-bold text-txt-secondary whitespace-nowrap">
                  {r.threshold}
                </span>
                <span className={`px-2 py-0.5 rounded-badge text-[11px] font-bold flex-shrink-0 ${r.severity === 'Critical' ? 'bg-red-100 text-berry-red' :
                    r.severity === 'Warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-purple-100 text-berry'
                  }`}>
                  {r.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
