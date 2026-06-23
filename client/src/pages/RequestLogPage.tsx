import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { LogEntry } from '../types'
import { useToast } from '../context/ToastContext'

const PAGE_SIZE = 25

function relTime(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export function RequestLogPage() {
  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [filter,  setFilter]  = useState<'all' | '200' | '429'>('all')
  const [loading, setLoading] = useState(false)
  const [page,    setPage]    = useState(1)
  const { addToast } = useToast()

  const poll = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/metrics/log?limit=100')
      const data = await res.json() as LogEntry[]
      setLogs(data)
    } catch { addToast('Failed to load logs', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { poll(); const id = setInterval(() => poll(true), 2000); return () => clearInterval(id) }, [])

  const filtered = logs.filter(l => {
    if (filter === '200') return l.status !== 429
    if (filter === '429') return l.status === 429
    return true
  })

  const pages    = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const allowed  = logs.filter(l => l.status !== 429).length
  const blocked  = logs.filter(l => l.status === 429).length
  const avgLat   = logs.length > 0 ? logs.reduce((s, l) => s + l.latency, 0) / logs.length : 0

  return (
    <div className="flex flex-col gap-5">
      {/* Summary pills */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Requests',  value: logs.length.toLocaleString(), color: '#7352C7' },
          { label: 'Allowed (2xx)',   value: allowed.toLocaleString(),     color: '#00C897' },
          { label: 'Blocked (429)',   value: blocked.toLocaleString(),     color: '#FF4B4B' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4 flex items-center gap-3">
            <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <div>
              <p className="text-[22px] font-bold text-txt-primary">{s.value}</p>
              <p className="text-[12px] text-txt-secondary font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-card shadow-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-col">
          <div className="flex items-center gap-2">
            {(['all', '200', '429'] as const).map(f => (
              <button key={f}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1 rounded-badge text-[12px] font-semibold transition-colors ${
                  filter === f
                    ? 'bg-berry text-white'
                    : 'bg-page-bg text-txt-secondary hover:bg-sidebar-act hover:text-berry'
                }`}
              >
                {f === 'all' ? 'All' : f === '200' ? '✓ Allowed' : '✕ Blocked'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-txt-secondary">Avg latency: <strong>{avgLat.toFixed(0)}ms</strong></span>
            <button onClick={() => poll()} className="p-1.5 text-txt-secondary hover:text-berry transition-colors rounded-lg hover:bg-sidebar-act">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[11px] font-semibold text-txt-secondary uppercase tracking-wider
                             bg-page-bg border-b border-border-col">
                <th className="px-5 py-2.5 text-left">Status</th>
                <th className="px-5 py-2.5 text-left">Time</th>
                <th className="px-5 py-2.5 text-left">IP / Identifier</th>
                <th className="px-5 py-2.5 text-left">Route</th>
                <th className="px-5 py-2.5 text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((log, i) => {
                const isOk = log.status !== 429
                return (
                  <tr key={`${log.ts}-${i}`}
                      className="border-b border-border-col last:border-0 hover:bg-purple-50/30
                                 transition-colors text-[13px]">
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-badge text-[11px] font-bold ${
                        isOk ? 'bg-green-100 text-berry-green' : 'bg-red-100 text-berry-red'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-txt-secondary text-[12px]">{relTime(log.ts)}</td>
                    <td className="px-5 py-3 font-mono text-txt-secondary text-[12px]">{log.ip}</td>
                    <td className="px-5 py-3 font-semibold text-txt-primary">{log.route}</td>
                    <td className="px-5 py-3 text-right font-mono text-txt-secondary">
                      <span className={log.latency > 100 ? 'text-berry-red' : 'text-txt-secondary'}>
                        {log.latency}ms
                      </span>
                    </td>
                  </tr>
                )
              })}
              {paginated.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-txt-secondary text-[13px]">
                  No requests yet — try firing some from the Playground
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-col">
            <span className="text-[12px] text-txt-secondary">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-[12px] font-semibold transition-colors ${
                    page === p ? 'bg-berry text-white' : 'text-txt-secondary hover:bg-sidebar-act hover:text-berry'
                  }`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
