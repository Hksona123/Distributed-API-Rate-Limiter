import { Search, Bell, Settings, Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMetrics } from '../../context/MetricsContext'
import type { ActivePage } from '../../types'

interface TopbarProps {
  onMenuClick: () => void
  onNav: (page: ActivePage) => void
}

export function Topbar({ onMenuClick, onNav }: TopbarProps) {
  const { current } = useMetrics()
  const [alertCount, setAlertCount] = useState(0)
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const prevReject = useRef(0)
  const prevP99 = useRef(0)
  const searchRef = useRef<HTMLDivElement>(null)

  // Real alert count from live metrics
  useEffect(() => {
    let count = 0
    if (current.rejectionRate > 30) count++
    else if (current.rejectionRate > 10) count++
    if (current.p99Latency > 5) count++
    if (current.rejectionRate !== prevReject.current || current.p99Latency !== prevP99.current) {
      setAlertCount(count)
      prevReject.current = current.rejectionRate
      prevP99.current = current.p99Latency
    }
  }, [current.rejectionRate, current.p99Latency])

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Navigation shortcuts for search
  const NAV_ITEMS: { label: string; page: ActivePage; keywords: string[] }[] = [
    { label: 'Dashboard',    page: 'dashboard',    keywords: ['dash', 'home', 'overview', 'rps', 'latency'] },
    { label: 'Live Metrics', page: 'live-metrics', keywords: ['live', 'metrics', 'sse', 'stream', 'p99'] },
    { label: 'Request Log',  page: 'request-log',  keywords: ['log', 'request', '429', '200', 'history'] },
    { label: 'Playground',   page: 'playground',   keywords: ['play', 'fire', 'burst', 'test', 'demo'] },
    { label: 'Alerts',       page: 'alerts',       keywords: ['alert', 'warning', 'critical', 'notify'] },
    { label: 'Load Test',    page: 'load-test',    keywords: ['load', 'stress', 'concurrency', 'ramp'] },
    { label: 'Rate Rules',   page: 'rate-rules',   keywords: ['rules', 'limit', 'config', 'window'] },
    { label: 'Redis Config', page: 'redis-config', keywords: ['redis', 'config', 'ping', 'memory', 'lua'] },
    { label: 'API Keys',     page: 'api-keys',     keywords: ['keys', 'api', 'identifier', 'ip', 'client'] },
    { label: 'Documentation',page: 'docs',         keywords: ['docs', 'api', 'curl', 'swagger', 'reference'] },
    { label: 'Settings',     page: 'settings',     keywords: ['settings', 'preferences', 'save', 'config'] },
  ]

  const results = search.trim()
    ? NAV_ITEMS.filter(n =>
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.keywords.some(k => k.includes(search.toLowerCase()))
      )
    : []

  const handleNav = (page: ActivePage) => {
    onNav(page)
    setSearch('')
    setShowResults(false)
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-border-col flex items-center justify-between h-16 px-4 shadow-topbar flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-txt-secondary hover:text-berry transition-colors p-1.5 rounded-lg hover:bg-sidebar-act"
        >
          <Menu size={20} />
        </button>

        {/* Functional search — navigates to pages */}
        <div ref={searchRef} className="relative hidden sm:block">
          <div className="flex items-center gap-2 bg-page-bg rounded-full px-4 py-2 w-72 border border-transparent focus-within:border-berry/30 focus-within:bg-white transition-all">
            <Search size={15} className="text-txt-secondary flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowResults(true) }}
              onFocus={() => setShowResults(true)}
              placeholder="Search pages..."
              className="bg-transparent text-[13px] text-txt-primary placeholder-txt-secondary outline-none flex-1 font-medium"
            />
            {search && (
              <button onClick={() => { setSearch(''); setShowResults(false) }} className="text-txt-secondary hover:text-berry text-[16px] leading-none">×</button>
            )}
          </div>

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute top-11 left-0 w-72 bg-white rounded-xl shadow-xl border border-border-col z-50 overflow-hidden">
              {results.map(r => (
                <button
                  key={r.page}
                  onClick={() => handleNav(r.page)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-txt-primary hover:bg-sidebar-act transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-berry flex-shrink-0" />
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Bell — real count, navigates to Alerts */}
        <button
          onClick={() => onNav('alerts')}
          className="relative p-2.5 text-txt-secondary hover:text-berry hover:bg-sidebar-act rounded-lg transition-colors"
          title={alertCount > 0 ? `${alertCount} active alert${alertCount > 1 ? 's' : ''}` : 'No active alerts'}
        >
          <Bell size={19} />
          {alertCount > 0 && (
            <span
              className="absolute flex items-center justify-center bg-berry-red text-white font-bold rounded-full leading-none pointer-events-none"
              style={{ fontSize: '9px', minWidth: '16px', height: '16px', top: '6px', right: '6px', padding: '0 3px' }}
            >
              {alertCount}
            </span>
          )}
        </button>

        {/* Settings icon — navigates to Settings */}
        <button
          onClick={() => onNav('settings')}
          className="p-2.5 text-txt-secondary hover:text-berry hover:bg-sidebar-act rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={19} />
        </button>

        {/* Avatar */}
        <button
          className="ml-1 w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)' }}
          title="Profile"
        >
          HK
        </button>
      </div>
    </header>
  )
}
