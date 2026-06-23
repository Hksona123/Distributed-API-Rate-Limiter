import { useEffect, useState } from 'react'
import { Key, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import type { RouteMetric } from '../types'

interface KeyStat {
  identifier: string
  route: string
  requests: number
  blocked: number
  lastSeen: string
}

function relTime(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export function ApiKeysPage() {
  const [keys,    setKeys]    = useState<KeyStat[]>([])
  const [routes,  setRoutes]  = useState<RouteMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('')

  const poll = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [logRes, routesRes] = await Promise.all([
        fetch('/metrics/log?limit=200'),
        fetch('/metrics/routes'),
      ])
      const logData    = await logRes.json()    as { ts: string; ip: string; route: string; status: number; latency: number }[]
      const routesData = await routesRes.json() as RouteMetric[]
      setRoutes(routesData)

      const map = new Map<string, KeyStat>()
      logData.forEach(entry => {
        const existing = map.get(entry.ip) ?? {
          identifier: entry.ip,
          route:      entry.route,
          requests:   0,
          blocked:    0,
          lastSeen:   entry.ts,
        }
        existing.requests++
        if (entry.status === 429) existing.blocked++
        if (new Date(entry.ts) > new Date(existing.lastSeen)) {
          existing.lastSeen = entry.ts
          existing.route    = entry.route
        }
        map.set(entry.ip, existing)
      })
      setKeys(Array.from(map.values()).sort((a, b) => b.requests - a.requests))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { poll(); const id = setInterval(() => poll(true), 3000); return () => clearInterval(id) }, [])

  const filtered = keys.filter(k =>
    !filter || k.identifier.toLowerCase().includes(filter.toLowerCase()) || k.route.includes(filter)
  )

  const totalKeys    = keys.length
  const totalReqs    = keys.reduce((s, k) => s + k.requests, 0)
  const totalBlocked = keys.reduce((s, k) => s + k.blocked, 0)

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Unique Identifiers', value: totalKeys,    color: '#7352C7' },
          { label: 'Total Requests',     value: totalReqs,    color: '#1A97F5' },
          { label: 'Total Blocked',      value: totalBlocked, color: '#FF4B4B' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4">
            <p className="text-[28px] font-bold" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
            <p className="text-[13px] text-txt-secondary font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active identifiers table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-col gap-3">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-berry" />
            <h3 className="text-[14px] font-bold text-txt-primary">Active Rate-Limited Identifiers</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search identifier or route..."
              className="border border-border-col rounded-lg px-3 py-1.5 text-[12px] w-56
                         focus:outline-none focus:border-berry focus:ring-2 focus:ring-berry/10
                         text-txt-primary placeholder-txt-secondary/60"
            />
            <button onClick={() => poll()}
              className="p-1.5 text-txt-secondary hover:text-berry hover:bg-sidebar-act rounded-lg transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Key size={28} className="text-txt-secondary/40" />
            <p className="text-[13px] text-txt-secondary font-medium">
              {keys.length === 0 ? 'No requests recorded yet — fire some from Playground' : 'No identifiers match the filter'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider bg-page-bg border-b border-border-col">
                  <th className="px-5 py-2.5 text-left">Identifier / IP</th>
                  <th className="px-5 py-2.5 text-left">Last Route</th>
                  <th className="px-5 py-2.5 text-right">Requests</th>
                  <th className="px-5 py-2.5 text-right">Blocked</th>
                  <th className="px-5 py-2.5 text-right">Block %</th>
                  <th className="px-5 py-2.5 text-left">Utilization</th>
                  <th className="px-5 py-2.5 text-right">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(k => {
                  const blockPct = k.requests > 0 ? (k.blocked / k.requests) * 100 : 0
                  const isHot    = blockPct > 30
                  return (
                    <tr key={k.identifier} className="border-b border-border-col last:border-0 hover:bg-purple-50/20 transition-colors text-[13px]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                            k.identifier.startsWith('pg-') ? 'bg-purple-100 text-berry' : 'bg-blue-50 text-berry-blue'
                          }`}>
                            {k.identifier.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-mono text-txt-primary font-medium text-[12px]">{k.identifier}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-txt-secondary text-[12px]">{k.route}</td>
                      <td className="px-5 py-3 text-right font-bold text-txt-primary">{k.requests}</td>
                      <td className="px-5 py-3 text-right font-bold text-berry-red">{k.blocked}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isHot
                            ? <TrendingDown size={12} className="text-berry-red" />
                            : <TrendingUp   size={12} className="text-berry-green" />
                          }
                          <span className={`font-bold text-[12px] ${isHot ? 'text-berry-red' : blockPct > 5 ? 'text-berry-amber' : 'text-berry-green'}`}>
                            {blockPct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 w-32">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(blockPct * 2, 100)}%`, backgroundColor: isHot ? '#FF4B4B' : '#7352C7' }} />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-[11px] text-txt-secondary">{relTime(k.lastSeen)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Route activity heatmap */}
      {routes.length > 0 && (
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="text-[14px] font-bold text-txt-primary mb-4">Route Activity</h3>
          <div className="flex flex-col gap-2">
            {routes.sort((a, b) => b.hits - a.hits).map(r => {
              const max      = routes[0]?.hits ?? 1
              const barPct   = (r.hits / max) * 100
              const blockPct = r.hits > 0 ? (r.blocked / r.hits) * 100 : 0
              return (
                <div key={r.route} className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-txt-primary w-44 flex-shrink-0 truncate">{r.route}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-berry transition-all duration-500" style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-[12px] font-bold text-txt-primary w-14 text-right">{r.hits}</span>
                  <span className={`text-[11px] font-semibold w-12 text-right ${blockPct > 20 ? 'text-berry-red' : 'text-berry-green'}`}>
                    {blockPct.toFixed(0)}% ✕
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
