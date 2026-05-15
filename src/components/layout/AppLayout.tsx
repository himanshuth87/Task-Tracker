import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Bell, LogOut, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Zap, LayoutDashboard, ListTodo, BarChart2, Factory, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { NotificationInbox } from '../ui/NotificationInbox'

export interface AppContext {
  session: Session
  viewMode: 'personal' | 'team'
  setViewMode: (m: 'personal' | 'team') => void
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/tasks', label: 'Tasks', icon: <ListTodo size={16} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
  { to: '/pipeline', label: 'Pipeline', icon: <Factory size={16} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={16} /> },
]

export function AppLayout({ session }: { session: Session }) {
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('tasktracker_theme') === 'light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.setAttribute('data-theme', 'light')
      localStorage.setItem('tasktracker_theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem('tasktracker_theme', 'dark')
    }
  }, [isLightMode])

  useEffect(() => { setShowSidebar(false) }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase()
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select'
      if (e.key === 'Escape') setShowNotifications(false)
      if (isInput) return
      if (e.key === 'n' || e.key === 'N') navigate('/tasks', { state: { openForm: true } })
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''
  const isTasksRoute = location.pathname === '/tasks'

  const context: AppContext = { session, viewMode, setViewMode, setUnreadCount }

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>TaskTracker</h1>
            <div className="live-badge">
              <Zap size={12} fill="#10b981" />
              <span>LIVE</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/settings')}
              style={{ textAlign: 'left', background: 'transparent', padding: '4px 8px', borderRadius: '8px' }}
              className="hover-bg-glass"
            >
              <p style={{ color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600 }}>{fullName}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {userEmail} • <span style={{ color: 'var(--primary)' }}>{user.user_metadata.team_name || 'General'}</span>
              </p>
            </button>
            <span style={{ color: 'var(--glass-border)' }}>|</span>
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ background: 'transparent', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="glass-card action-btn hamburger-btn"
            aria-label="Toggle menu"
          >
            {showSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(v => !v)}
              className="glass-card action-btn"
              title="Notifications"
            >
              <Bell size={20} color={unreadCount > 0 ? 'var(--primary)' : 'var(--text-muted)'} />
              {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="glass-card notification-dropdown"
                >
                  <NotificationInbox userEmail={userEmail} onUnreadChange={setUnreadCount} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsLightMode(v => !v)}
            className="glass-card action-btn"
            title={isLightMode ? 'Dark mode' : 'Light mode'}
            style={{ padding: '10px 14px', gap: '6px' }}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
            <span style={{ fontSize: '0.85rem' }}>{isLightMode ? 'Dark' : 'Light'}</span>
          </button>

          {isTasksRoute && (
            <button
              onClick={() => navigate('/tasks', { state: { openForm: true } })}
              className="primary-gradient action-btn main-action"
            >
              + New Task
            </button>
          )}
        </div>
      </header>

      <div
        className={`sidebar-overlay${showSidebar ? ' open' : ''}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      <div className={`task-grid${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        <aside className={`sidebar${showSidebar ? ' sidebar-open' : ''}`}>
          <div className="glass-card" style={{ padding: '8px', marginBottom: '12px' }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  })}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    if (!el.getAttribute('aria-current')) el.style.background = 'var(--glass-bg)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    if (!el.getAttribute('aria-current')) el.style.background = 'transparent'
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  {!sidebarCollapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </nav>
          </div>

          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="collapse-btn"
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', borderRadius: '10px', padding: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', border: '1px solid var(--glass-border)' }}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
          </button>
        </aside>

        <main>
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
