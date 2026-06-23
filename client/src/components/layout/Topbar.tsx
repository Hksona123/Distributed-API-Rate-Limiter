import { Search, Bell, Settings, Menu, SlidersHorizontal } from 'lucide-react'
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
  const prevReject  = useRef(0)
  const prevP99     = useRef(0)

  // Count active alert conditions from REAL live metrics (no fake counter)
  useEffect(() => {
    let count = 0
    if (current.rejectionRate > 30) count++
    else if (current.rejectionRate > 10) count++
    if (current.p99Latency > 5) count++
    // Only update when conditions change to avoid re-render spam
    if (current.rejectionRate !== prevReject.current || current.p99Latency !== prevP99.current) {
      setAlertCount(count)
      prevReject.current = current.rejectionRate
      prevP99.current    = current.p99Latency
    }
  }, [current.rejectionRate, current.p99Latency])

  return (
    <header
      className="sticky top-0 z-30 bg-white border-b border-border-col flex items-center
                 justify-between h-16 px-4 shadow-topbar flex-shrink-0"
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-txt-secondary hover:text-berry transition-colors p-1.5 rounded-lg hover:bg-sidebar-act"
        >
          <Menu size={20} />
        </button>

        {/* Search */}
        <div className="hidden sm:flex items-center gap-2 bg-page-bg rounded-full px-4 py-2 w-80">
          <Search size={15} className="text-txt-secondary flex-shrink-0" />
          <input
            type="text"
            placeholder="Search metrics, routes, keys..."
            className="bg-transparent text-[13px] text-txt-primary placeholder-txt-secondary
                       outline-none flex-1 font-medium"
          />
          <SlidersHorizontal size={14} className="text-txt-secondary flex-shrink-0" />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Bell — navigates to Alerts page, shows REAL count */}
        <button
          onClick={() => onNav('alerts')}
          className="relative p-2.5 text-txt-secondary hover:text-berry
                     hover:bg-sidebar-act rounded-lg transition-colors"
          title={alertCount > 0 ? `${alertCount} active alert${alertCount > 1 ? 's' : ''}` : 'No active alerts'}
        >
          <Bell size={19} />
          {alertCount > 0 && (
            <span
              className="absolute flex items-center justify-center
                         bg-berry-red text-white font-bold rounded-full
                         leading-none pointer-events-none"
              style={{
                fontSize: '9px',
                minWidth: '16px',
                height:   '16px',
                top:      '6px',
                right:    '6px',
                padding:  '0 3px',
              }}
            >
              {alertCount}
            </span>
          )}
        </button>

        {/* Settings icon — navigates to Settings page */}
        <button
          onClick={() => onNav('settings')}
          className="p-2.5 text-txt-secondary hover:text-berry hover:bg-sidebar-act
                     rounded-lg transition-colors"
          title="Settings"
        >
          <Settings size={19} />
        </button>

        {/* Avatar */}
        <button
          className="ml-1 w-9 h-9 rounded-full flex items-center justify-center
                     text-white text-[13px] font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)' }}
          title="Profile"
        >
          HK
        </button>
      </div>
    </header>
  )
}
