import { useEffect, useState } from 'react'
import { Database, Wifi, WifiOff, RefreshCw, Server, Clock } from 'lucide-react'

interface RedisInfo {
  status: string
  connected: boolean
  pingLatencyMs: number
  usedMemory: string
  uptime: number
  dbSize: number
  timestamp: string
}


export function RedisConfigPage() {
  const [info,       setInfo]       = useState<RedisInfo | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const poll = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res  = await fetch('/health')
      const data = await res.json() as {
        status: string
        redis: { connected: boolean; pingLatencyMs?: number; usedMemory?: string }
        uptime: number
        timestamp: string
      }
      setInfo({
        status:       data.status,
        connected:    data.redis.connected,
        pingLatencyMs: data.redis.pingLatencyMs ?? 0,
        usedMemory:   data.redis.usedMemory ?? 'N/A',
        uptime:       data.uptime,
        timestamp:    data.timestamp,
        dbSize:       0,
      })
      setError(null)
    } catch (e) {
      setError('Cannot reach backend — is the server running?')
    } finally {
      setLoading(false)
    }

    // Infer key count from SSE metrics
    try {
      const sse = await new Promise<number>((resolve) => {
        const es = new EventSource('/metrics/stream')
        es.onmessage = (e) => {
          const d = JSON.parse(e.data as string) as { activeKeys: number }
          es.close()
          resolve(d.activeKeys)
        }
        es.onerror = () => { es.close(); resolve(0) }
        setTimeout(() => { es.close(); resolve(0) }, 2000)
      })
      setInfo(prev => prev ? { ...prev, dbSize: sse } : prev)
    } catch { /* ignore */ }
  }

  useEffect(() => { poll(); const id = setInterval(() => poll(true), 5000); return () => clearInterval(id) }, [])

  const upStr = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Status banner */}
      <div className="bg-white rounded-card shadow-card px-5 py-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
          {info?.connected ? <Wifi size={18} className="text-berry-green" /> : <WifiOff size={18} className="text-berry-red" />}
        </div>
        <div className="flex-1">
          <p className={`text-[15px] font-bold ${info?.connected ? 'text-berry-green' : 'text-berry-red'}`}>
            Redis {info?.connected ? 'Connected' : 'Disconnected'}
          </p>
          <p className="text-[12px] text-txt-secondary">
            localhost:6379 · {info ? `last polled ${new Date(info.timestamp).toLocaleTimeString()}` : 'checking...'}
          </p>
        </div>
        <button onClick={() => poll()}
          className="flex items-center gap-1.5 text-[12px] text-berry font-semibold
                     bg-sidebar-act px-3 py-1.5 rounded-badge hover:bg-purple-100 transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-card px-5 py-3 text-berry-red text-[13px] font-medium">
          ✕ {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ping Latency',   value: info ? `${info.pingLatencyMs}ms`  : '—', icon: <Clock size={18} className="text-berry-blue" />,  bg: 'bg-blue-50' },
          { label: 'Used Memory',    value: info?.usedMemory ?? '—',                  icon: <Server size={18} className="text-berry" />,       bg: 'bg-purple-50' },
          { label: 'Server Uptime',  value: info ? upStr(info.uptime)         : '—', icon: <Database size={18} className="text-berry-green" />, bg: 'bg-green-50' },
          { label: 'Active Keys',    value: info ? info.dbSize.toString()     : '—', icon: <Database size={18} className="text-berry-amber" />, bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-card shadow-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[20px] font-bold text-txt-primary leading-none">{s.value}</p>
              <p className="text-[12px] text-txt-secondary mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Config info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="text-[14px] font-bold text-txt-primary mb-4">Connection Settings</h3>
          {[
            { key: 'Host',            value: 'localhost' },
            { key: 'Port',            value: '6379' },
            { key: 'TLS',             value: 'Disabled (dev) / Enabled (prod via Nginx)' },
            { key: 'Client',          value: 'ioredis 5.x' },
            { key: 'Cluster Mode',    value: 'Disabled (single node)' },
            { key: 'Max Retries',     value: '5 (exponential backoff 200ms×attempt)' },
            { key: 'Fail-open',       value: 'Yes — requests pass on Redis error' },
            { key: 'Key Namespace',   value: 'rl:{type}:{identifier}:{route}' },
            { key: 'Key TTL',         value: 'Equals window duration (auto-expire)' },
          ].map(row => (
            <div key={row.key} className="flex items-start justify-between py-2 border-b border-border-col last:border-0">
              <span className="text-[12px] font-semibold text-txt-secondary w-36 flex-shrink-0">{row.key}</span>
              <span className="text-[12px] text-txt-primary font-medium text-right">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-card shadow-card p-5">
          <h3 className="text-[14px] font-bold text-txt-primary mb-4">Lua Script Info</h3>
          {[
            { key: 'Script',       value: 'sliding_window.lua' },
            { key: 'Caching',      value: 'EVALSHA after first EVAL' },
            { key: 'Atomicity',    value: 'Full — single Redis round-trip' },
            { key: 'NOSCRIPT',     value: 'Auto-reload on cache miss' },
            { key: 'Hash Tags',    value: '{playground:user} — cluster-safe' },
            { key: 'Key Sanitize', value: 'CRLF, null, Unicode, 128 char max' },
            { key: 'Test Suite',   value: '25 injection attack tests passing' },
          ].map(row => (
            <div key={row.key} className="flex items-start justify-between py-2 border-b border-border-col last:border-0">
              <span className="text-[12px] font-semibold text-txt-secondary w-36 flex-shrink-0">{row.key}</span>
              <span className="text-[12px] text-txt-primary font-medium font-mono text-right">{row.value}</span>
            </div>
          ))}

          {/* Latency indicator */}
          {info && (
            <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-2 ${info.pingLatencyMs < 5 ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
              <div className={`w-2 h-2 rounded-full ${info.pingLatencyMs < 5 ? 'bg-berry-green' : 'bg-berry-amber'}`} />
              <span className={`text-[12px] font-semibold ${info.pingLatencyMs < 5 ? 'text-berry-green' : 'text-amber-700'}`}>
                {info.pingLatencyMs < 5 ? 'Excellent latency' : 'Elevated latency'} — {info.pingLatencyMs}ms ping
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
