import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldAlert, Clock, Users, Key } from 'lucide-react'
import type { RouteMetric } from '../types'

interface Rule {
  route: string
  window: string
  max: number
  keyType: 'ip' | 'user' | 'apikey'
  algorithm: string
  hits: number
  blocked: number
}

const STATIC_RULES: Rule[] = [
  { route: '/demo',            window: '1 min',  max: 10,   keyType: 'ip',     algorithm: 'Sliding Window', hits: 0, blocked: 0 },
  { route: '/api/public/data', window: '1 min',  max: 30,   keyType: 'ip',     algorithm: 'Sliding Window', hits: 0, blocked: 0 },
  { route: '/api/user/profile',window: '1 min',  max: 100,  keyType: 'user',   algorithm: 'Sliding Window', hits: 0, blocked: 0 },
  { route: '/api/admin/config',window: '1 min',  max: 1000, keyType: 'apikey', algorithm: 'Sliding Window', hits: 0, blocked: 0 },
  { route: '/api/upload',      window: '1 min',  max: 5,    keyType: 'ip',     algorithm: 'Sliding Window', hits: 0, blocked: 0 },
]

const KEY_ICON = { ip: <Users size={14} />, user: <Key size={14} />, apikey: <ShieldCheck size={14} /> }
const KEY_COLOR = { ip: 'text-berry-blue bg-blue-50', user: 'text-berry bg-purple-50', apikey: 'text-berry-green bg-green-50' }

export function RateRulesPage() {
  const [rules, setRules] = useState<Rule[]>(STATIC_RULES)

  useEffect(() => {
    const merge = async () => {
      try {
        const res  = await fetch('/metrics/routes')
        const live = await res.json() as RouteMetric[]
        setRules(STATIC_RULES.map(r => {
          const match = live.find(l =>
            l.route === r.route ||
            l.route === r.route.replace('/api/', '/') ||
            ('/' + l.route.split('/').pop()) === r.route.split('/').pop()
          )
          return match ? { ...r, hits: match.hits, blocked: match.blocked } : r
        }))
      } catch { /* ignore — show static config */ }
    }
    merge()
    const id = setInterval(merge, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Rules',    value: rules.length,                           color: '#7352C7' },
          { label: 'Requests Seen', value: rules.reduce((s, r) => s + r.hits, 0),  color: '#1A97F5' },
          { label: 'Total Blocked', value: rules.reduce((s, r) => s + r.blocked, 0), color: '#FF4B4B' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4">
            <p className="text-[28px] font-bold" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
            <p className="text-[13px] text-txt-secondary font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rules table */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border-col flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-txt-primary">Configured Rate Rules</h3>
          <span className="text-[12px] text-txt-secondary">Powered by Sliding Window Lua · Redis-atomic</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider bg-page-bg border-b border-border-col">
                <th className="px-5 py-2.5 text-left">Route</th>
                <th className="px-5 py-2.5 text-left">Algorithm</th>
                <th className="px-5 py-2.5 text-left">Window</th>
                <th className="px-5 py-2.5 text-center">Max Req</th>
                <th className="px-5 py-2.5 text-left">Key Type</th>
                <th className="px-5 py-2.5 text-right">Hits</th>
                <th className="px-5 py-2.5 text-right">Blocked</th>
                <th className="px-5 py-2.5 text-right">Block %</th>
                <th className="px-5 py-2.5 text-left">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const blockPct   = r.hits > 0 ? (r.blocked / r.hits) * 100 : 0
                const utilizPct  = r.hits > 0 ? Math.min((r.hits / r.max) * 100, 100) : 0
                const isHot      = blockPct > 20
                return (
                  <tr key={r.route} className="border-b border-border-col last:border-0 hover:bg-purple-50/20
                                               transition-colors text-[13px]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {isHot && <ShieldAlert size={14} className="text-berry-red flex-shrink-0" />}
                        <span className="font-semibold text-txt-primary font-mono">{r.route}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-txt-secondary">{r.algorithm}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-txt-secondary">
                        <Clock size={13} />
                        {r.window}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-bold text-txt-primary">{r.max.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-[11px] font-semibold ${KEY_COLOR[r.keyType]}`}>
                        {KEY_ICON[r.keyType]} {r.keyType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-txt-primary">
                      {r.hits.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-berry-red">
                      {r.blocked.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-bold text-[13px] ${blockPct > 20 ? 'text-berry-red' : blockPct > 5 ? 'text-berry-amber' : 'text-berry-green'}`}>
                        {blockPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 w-32">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                             style={{ width: `${utilizPct}%`, backgroundColor: isHot ? '#FF4B4B' : '#7352C7' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-sidebar-act border border-berry/20 rounded-card p-4 flex gap-3">
        <ShieldCheck size={18} className="text-berry flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-berry mb-0.5">Redis Lua Atomicity</p>
          <p className="text-[12px] text-txt-secondary leading-relaxed">
            All rules run via atomic Lua scripts — a single round-trip to Redis that reads, increments,
            and sets expiry atomically. No race conditions. EVALSHA caching used after first load to skip
            re-transmission overhead.
          </p>
        </div>
      </div>
    </div>
  )
}
