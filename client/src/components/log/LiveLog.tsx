import { useEffect, useRef, useState } from 'react'
import type { LogEntry } from '../../types'
import { useToast } from '../../context/ToastContext'

function relTime(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export function LiveLog() {
  const [logs, setLogs]   = useState<LogEntry[]>([])
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const bottomRef         = useRef<HTMLDivElement>(null)
  const { addToast }      = useToast()

  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch('/metrics/log?limit=20')
        const data = await res.json() as LogEntry[]
        setLogs(prev => {
          const prevKeys = new Set(prev.map(l => l.ts + l.ip))
          const newKeys  = new Set<string>()
          data.forEach(l => { if (!prevKeys.has(l.ts + l.ip)) newKeys.add(l.ts + l.ip) })
          if (newKeys.size > 0) {
            setFresh(newKeys)
            setTimeout(() => setFresh(new Set()), 600)
          }
          return data
        })
      } catch { addToast('Log fetch failed', 'error') }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [addToast])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="bg-white rounded-card shadow-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-txt-primary">Live Log</h3>
          <span className="w-2 h-2 rounded-full bg-berry-green animate-pulse-dot" />
        </div>
        <span className="text-[11px] font-medium text-txt-secondary">{logs.length} entries</span>
      </div>

      <div className="overflow-y-auto max-h-[260px] -mr-1 pr-1">
        {logs.length === 0 ? (
          <p className="text-[12px] text-txt-secondary text-center py-8">Waiting for requests...</p>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log, i) => {
              const key   = log.ts + log.ip
              const isNew = fresh.has(key)
              const isOk  = log.status !== 429
              return (
                <div
                  key={`${key}-${i}`}
                  className={`rounded-lg px-3 py-2 transition-all duration-200 text-[12px]
                    ${isNew ? 'animate-fade-up bg-purple-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0
                      ${isOk ? 'bg-green-100 text-berry-green' : 'bg-red-100 text-berry-red'}`}>
                      {log.status}
                    </span>
                    <span className="font-mono text-txt-secondary truncate flex-1">{log.ip}</span>
                    <span className="font-mono text-txt-secondary flex-shrink-0">{log.latency}ms</span>
                    <span className="text-txt-secondary/60 flex-shrink-0 text-[10px]">{relTime(log.ts)}</span>
                  </div>
                  <p className="text-txt-primary font-medium mt-0.5 truncate">{log.route}</p>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
