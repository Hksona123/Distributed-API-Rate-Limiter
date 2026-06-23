import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'lucide-react'
import type { LogEntry } from '../types'
import { useToast } from '../context/ToastContext'
import { cn } from '../lib/utils'

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
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
          const prevSet = new Set(prev.map(l => l.ts + l.ip))
          const newKeys = new Set<string>()
          data.forEach(l => { if (!prevSet.has(l.ts + l.ip)) newKeys.add(l.ts + l.ip) })
          if (newKeys.size > 0) {
            setFresh(newKeys)
            setTimeout(() => setFresh(new Set()), 700)
          }
          return data
        })
      } catch {
        addToast('Log fetch failed', 'error')
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [addToast])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Live Log</h2>
          <p className="text-2xs text-ink-muted mt-0.5">Last 20 requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-ink-faint" />
          <span className="label">{logs.length}</span>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[260px] -mx-1 px-1">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-ink-faint">Waiting for requests...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {logs.map((log, i) => {
              const key   = log.ts + log.ip
              const isNew = fresh.has(key)
              const isOk  = log.status !== 429
              return (
                <div
                  key={`${key}-${i}`}
                  className={cn(
                    'grid grid-cols-[36px_100px_1fr_44px_52px] gap-3 items-center',
                    'px-3 py-2 rounded-lg text-xs transition-all duration-200',
                    isNew ? 'animate-fade-up bg-s3' : 'hover:bg-s2',
                  )}
                >
                  <span className="font-mono text-ink-faint text-2xs">{timeAgo(log.ts)}</span>
                  <span className="font-mono text-ink-muted truncate text-2xs">{log.ip}</span>
                  <span className="font-mono text-ink truncate">{log.route}</span>
                  <span className={cn(
                    'badge text-center justify-center',
                    isOk ? 'badge-go' : 'badge-stop',
                  )}>
                    {log.status}
                  </span>
                  <span className="font-mono text-ink-faint text-right text-2xs">
                    {log.latency}ms
                  </span>
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
