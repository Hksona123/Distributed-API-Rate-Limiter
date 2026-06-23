import { useEffect, useState } from 'react'
import { Activity, Shield } from 'lucide-react'
import { useMetrics } from '../context/MetricsContext'
import { cn } from '../lib/utils'

type Tab = 'dashboard' | 'playground' | 'config'

interface TopBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'playground', label: 'Playground' },
  { id: 'config', label: 'Config' },
]

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
  const { connectionStatus } = useMetrics()
  const [redisOk, setRedisOk] = useState<boolean | null>(null)
  const [uptime, setUptime] = useState<number>(0)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/health')
        const data = await res.json()
        setRedisOk(data?.redis?.connected === true || data?.status === 'healthy')
        setUptime(Math.floor(data?.uptime ?? 0))
      } catch {
        setRedisOk(false)
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])

  const formatUptime = (s: number) => {
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  return (
    <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-5 md:px-8
                       bg-s0/80 backdrop-blur-xl border-b border-s4">
      {/* Left — wordmark */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-signal to-signal-dim flex items-center justify-center flex-shrink-0">
          <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-sm font-semibold text-ink tracking-tight">RateLimiter</span>
          <span className="hidden md:inline text-2xs text-ink-faint ml-2 font-mono">
            v2.0
          </span>
        </div>
      </div>

      {/* Center — tab navigation */}
      <nav className="flex items-center gap-1 bg-s1 border border-s4
                      rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={activeTab === tab.id ? 'tab-active' : 'tab-inactive'}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Right — status indicators */}
      <div className="flex items-center gap-4 min-w-[160px] justify-end">
        {uptime > 0 && (
          <div className="hidden md:flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-ink-faint" />
            <span className="text-2xs font-mono text-ink-muted">
              {formatUptime(uptime)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span
            className={cn('dot-pulse', redisOk === true ? 'text-go bg-go' : redisOk === false ? 'text-stop bg-stop' : 'text-ink-faint bg-ink-faint')}
          />
          <span className="text-2xs font-medium text-ink-muted hidden sm:inline">
            {redisOk === true ? 'Redis' : redisOk === false ? 'No Redis' : '...'}
          </span>
        </div>

        {connectionStatus !== 'connected' && (
          <div className="flex items-center gap-1.5">
            <span className={cn('dot-pulse', connectionStatus === 'connecting' ? 'text-warn bg-warn' : 'text-stop bg-stop')} />
            <span className="text-2xs text-ink-muted hidden sm:inline">SSE</span>
          </div>
        )}
      </div>
    </header>
  )
}
