import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Clock, Hash, TrendingUp, RefreshCw, Copy } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { BACKEND_HREF } from './lib/api'

import { MetricsProvider, useMetrics } from './context/MetricsContext'
import { ToastProvider }               from './context/ToastContext'
import { Sidebar }                     from './components/layout/Sidebar'
import { Topbar }                      from './components/layout/Topbar'
import { RightPanel }                  from './components/layout/RightPanel'
import { StatCard, useCountUp }        from './components/cards/StatCard'
import { MiniStatCard }                from './components/cards/MiniStatCard'
import { ThroughputChart }             from './components/charts/ThroughputChart'
import { RouteBreakdown }              from './components/charts/RouteBreakdown'
import { LiveMetricsPage }             from './pages/LiveMetricsPage'
import { RequestLogPage }              from './pages/RequestLogPage'
import { PlaygroundPage }              from './pages/PlaygroundPage'
import { AlertsPage }                  from './pages/AlertsPage'
import { LoadTestPage }                from './pages/LoadTestPage'
import { RateRulesPage }               from './pages/RateRulesPage'
import { RedisConfigPage }             from './pages/RedisConfigPage'
import { ApiKeysPage }                 from './pages/ApiKeysPage'
import { DocsPage }                    from './pages/DocsPage'
import { SettingsPage }                from './pages/SettingsPage'
import type { ActivePage }             from './types'

// ── Dot-menu dropdown on the RPS card ───────────────────────────────────────────────
// Clicking '⋯' copies current RPS to clipboard and shows a quick label
function RpsCardMenu({ rps }: { rps: number }) {
  const [open,    setOpen]   = useState(false)
  const [copied,  setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const copyRps = () => {
    navigator.clipboard.writeText(String(Math.round(rps)))
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 1400)
  }

  const openMetrics = () => {
    window.open(`${BACKEND_HREF}/metrics`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20
                   hover:bg-white/30 text-white transition-colors text-[18px] leading-none"
        title="Options"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-44 bg-white rounded-xl shadow-xl border border-border-col
                        z-50 overflow-hidden animate-fade-up">
          <button
            onClick={copyRps}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium
                       text-txt-primary hover:bg-sidebar-act transition-colors"
          >
            <Copy size={13} className="text-berry flex-shrink-0" />
            {copied ? 'Copied!' : 'Copy current RPS'}
          </button>
          <button
            onClick={openMetrics}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-medium
                       text-txt-primary hover:bg-sidebar-act transition-colors border-t border-border-col"
          >
            <RefreshCw size={13} className="text-berry flex-shrink-0" />
            Open /metrics endpoint
          </button>
        </div>
      )}
    </div>
  )
}

// ── Mini sparkline inside P99 card ──────────────────────────────────────────
function P99Sparkline({ history }: { history: { p99Latency: number }[] }) {
  const data = history.slice(-10).map(h => ({ v: h.p99Latency }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke="rgba(255,255,255,0.7)"
              strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Dashboard page ────────────────────────────────────────────────────────────
function DashboardPage() {
  const { current, history } = useMetrics()
  const [p99Mode, setP99Mode] = useState<'live' | 'avg'>('live')

  const animRps    = useCountUp(current.rps,          500)
  const animP99    = useCountUp(current.p99Latency,   500)
  const animReject = useCountUp(current.rejectionRate, 500)
  const animKeys   = useCountUp(current.activeKeys,    500)

  const avgP99 = history.length > 0
    ? history.reduce((s, h) => s + h.p99Latency, 0) / history.length
    : 0

  const displayP99 = p99Mode === 'live' ? animP99 : avgP99

  return (
    <div className="flex flex-col gap-5">
      {/* ── Top stat cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_280px] gap-4">
        {/* Card 1 — Requests/sec */}
        <StatCard
          gradient="linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)"
          icon={<TrendingUp size={18} />}
          value={Math.round(animRps).toLocaleString()}
          label="Requests / sec"
          topRight={<RpsCardMenu rps={animRps} />}
        />

        {/* Card 2 — P99 Latency with toggle + sparkline */}
        <StatCard
          gradient="linear-gradient(135deg, #1A97F5 0%, #0D7DD9 100%)"
          icon={<Clock size={18} />}
          value={`${displayP99.toFixed(2)}ms`}
          label="P99 Latency"
          topRight={
            <div className="flex items-center bg-white/20 rounded-full p-0.5 text-[11px] font-semibold">
              {(['live', 'avg'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setP99Mode(m)}
                  className={`px-2.5 py-0.5 rounded-full capitalize transition-colors ${
                    p99Mode === m ? 'bg-white text-berry-blue' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {m === 'live' ? 'Live' : 'Avg'}
                </button>
              ))}
            </div>
          }
          sparkline={<P99Sparkline history={history} />}
        />

        {/* Card 3 — Two stacked mini cards */}
        <div className="flex flex-col gap-3 sm:col-span-2 xl:col-span-1">
          <MiniStatCard
            gradient="linear-gradient(135deg, #39B0F5 0%, #1A97F5 100%)"
            icon={<TrendingUp size={18} className="text-white" />}
            value={`${animReject.toFixed(1)}%`}
            label="Rejection Rate"
          />
          <MiniStatCard
            bg="#FFFFFF"
            icon={<Hash size={18} className="text-berry-amber" />}
            iconBg="#FFF8E1"
            value={Math.round(animKeys).toLocaleString()}
            label="Active Redis Keys"
            decorative
          />
        </div>
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-col lg:flex-row">
        <ThroughputChart />
        <RouteBreakdown />
      </div>
    </div>
  )
}

// ── Subtitle map ──────────────────────────────────────────────────────────────
const PAGE_SUBTITLE: Partial<Record<ActivePage, string>> = {
  'dashboard':    'Real-time API rate limiter observability',
  'live-metrics': 'Streaming SSE metrics updated every second',
  'request-log':  'Last 100 requests with status, latency and route',
  'playground':   'Fire burst requests and observe rate limiting live',
  'alerts':       'Active and historical rate limit breach events',
  'load-test':    'Configurable load test runner with live results chart',
  'rate-rules':   'All configured rate limit rules with live utilization',
  'redis-config': 'Redis connection health, memory, and Lua script details',
  'api-keys':     'Active client identifiers and per-key request analysis',
  'docs':         'Full API reference with cURL examples and response schemas',
  'settings':     'Dashboard preferences and system information',
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  // mobileOpen: only used on < lg breakpoint for the slide-in drawer
  const [mobileOpen, setMobileOpen] = useState(false)
  // On desktop the sidebar is always visible (240px wide).
  // On mobile it slides in as an overlay when mobileOpen=true.

  const pageTitle: Record<ActivePage, string> = {
    'dashboard':    'Dashboard',
    'live-metrics': 'Live Metrics',
    'request-log':  'Request Log',
    'alerts':       'Alerts',
    'playground':   'Playground',
    'load-test':    'Load Test',
    'rate-rules':   'Rate Rules',
    'redis-config': 'Redis Config',
    'api-keys':     'API Keys',
    'docs':         'Documentation',
    'settings':     'Settings',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page-bg">
      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <Sidebar
        active={activePage}
        onNav={(page) => { setActivePage(page); setMobileOpen(false) }}
        collapsed={!mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main area — always offset 240px on desktop */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 lg:ml-60"
      >
        <Topbar onMenuClick={() => setMobileOpen(v => !v)} onNav={setActivePage} />

        {/* Content + right panel */}
        <div className="flex flex-1 overflow-hidden gap-4 p-5">
          {/* Scrollable main content */}
          <main className="flex-1 overflow-y-auto min-w-0">
            {/* Page heading */}
            <div className="mb-5">
              <h1 className="text-[20px] font-bold text-txt-primary">{pageTitle[activePage]}</h1>
              {PAGE_SUBTITLE[activePage] && (
                <p className="text-[13px] text-txt-secondary mt-0.5">{PAGE_SUBTITLE[activePage]}</p>
              )}
            </div>

            {activePage === 'dashboard'    && <DashboardPage />}
            {activePage === 'live-metrics' && <LiveMetricsPage />}
            {activePage === 'request-log'  && <RequestLogPage />}
            {activePage === 'playground'   && <PlaygroundPage />}
            {activePage === 'alerts'       && <AlertsPage />}
            {activePage === 'load-test'    && <LoadTestPage />}
            {activePage === 'rate-rules'   && <RateRulesPage />}
            {activePage === 'redis-config' && <RedisConfigPage />}
            {activePage === 'api-keys'     && <ApiKeysPage />}
            {activePage === 'docs'         && <DocsPage />}
            {activePage === 'settings'     && <SettingsPage />}
          </main>

          {/* Fixed right panel */}
          <RightPanel />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <MetricsProvider>
        <AppShell />
      </MetricsProvider>
    </ToastProvider>
  )
}
