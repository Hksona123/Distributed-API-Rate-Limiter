import {
  LayoutDashboard, BarChart2, List, Bell, Zap, Gauge,
  SlidersHorizontal, Database, Key, BookOpen, Settings,
  Shield, ChevronRight, X,
} from 'lucide-react'
import type { ActivePage } from '../../types'

interface SidebarProps {
  active: ActivePage
  onNav: (page: ActivePage) => void
  collapsed: boolean
  onClose: () => void
}

interface NavItem { id: ActivePage; label: string; icon: React.ReactNode }
interface NavSection { title: string; items: NavItem[] }

const NAV: NavSection[] = [
  {
    title: 'DASHBOARD',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }],
  },
  {
    title: 'MONITORING',
    items: [
      { id: 'live-metrics',  label: 'Live Metrics',  icon: <BarChart2 size={18} /> },
      { id: 'request-log',   label: 'Request Log',   icon: <List size={18} /> },
      { id: 'alerts',        label: 'Alerts',         icon: <Bell size={18} /> },
    ],
  },
  {
    title: 'TESTING',
    items: [
      { id: 'playground', label: 'Playground', icon: <Zap size={18} /> },
      { id: 'load-test',  label: 'Load Test',  icon: <Gauge size={18} /> },
    ],
  },
  {
    title: 'CONFIGURATION',
    items: [
      { id: 'rate-rules',   label: 'Rate Rules',   icon: <SlidersHorizontal size={18} /> },
      { id: 'redis-config', label: 'Redis Config',  icon: <Database size={18} /> },
      { id: 'api-keys',     label: 'API Keys',      icon: <Key size={18} /> },
    ],
  },
  {
    title: 'UTILITIES',
    items: [
      { id: 'docs',     label: 'Documentation', icon: <BookOpen size={18} /> },
      { id: 'settings', label: 'Settings',       icon: <Settings size={18} /> },
    ],
  },
]

export function Sidebar({ active, onNav, collapsed, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay — only when mobile drawer is open */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full z-40 bg-white flex flex-col',
          'transition-transform duration-300 ease-in-out shadow-sidebar',
          // Mobile: slide in/out based on collapsed. Desktop: always visible, always w-60
          collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0',
          'lg:translate-x-0 lg:w-60',
        ].join(' ')}
        style={{ width: '240px' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-col flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #7352C7 0%, #5E35B1 100%)' }}>
              <Shield size={16} className="text-white" />
            </div>
            {/* Always show label on desktop */}
            <span className={`text-[18px] font-bold text-txt-primary tracking-tight ${collapsed ? 'hidden lg:block' : 'block'}`}>
              RateLimiter
            </span>
          </div>
          <button onClick={onClose} className="text-txt-secondary hover:text-berry lg:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV.map(section => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-txt-secondary
                               px-3 mb-1.5">
                  {section.title}
                </p>
              )}
              {section.items.map(item => {
                const isActive = item.id === active
                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5',
                      'text-[14px] font-medium transition-all duration-150 text-left',
                      isActive
                        ? 'bg-sidebar-act text-berry border-l-[3px] border-berry'
                        : 'text-txt-primary hover:bg-gray-50 border-l-[3px] border-transparent',
                    ].join(' ')}
                  >
                    <span className={isActive ? 'text-berry' : 'text-txt-secondary'}>
                      {item.icon}
                    </span>
                    {/* Always show label on desktop */}
                    <span className={collapsed ? 'hidden lg:block' : 'block'}>{item.label}</span>
                    {isActive && (
                      <ChevronRight size={14} className={`ml-auto text-berry ${collapsed ? 'hidden lg:block' : 'block'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>


      </aside>
    </>
  )
}
