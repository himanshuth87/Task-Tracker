import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, LogOut, Sun, Moon, Menu, X, ChevronLeft, ChevronRight,
  Zap, LayoutDashboard, ListTodo, BarChart2, Settings,
  Trash2, RotateCcw, Loader2, CalendarDays
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import { NotificationInbox } from '../ui/NotificationInbox'
import { taskService } from '../../services/taskService'
import { type Task } from '../../supabase'
import { toast } from 'sonner'

export interface AppContext {
  session: Session
  viewMode: 'personal' | 'team'
  setViewMode: (m: 'personal' | 'team') => void
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/tasks', label: 'Tasks', icon: <ListTodo size={16} /> },
  { to: '/calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
  { to: '/settings', label: 'Settings', icon: <Settings size={16} /> },
]

export function AppLayout({ session }: { session: Session }) {
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('tasktracker_theme') === 'light')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [trashLoading, setTrashLoading] = useState(false)
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
      if (e.key === 'Escape') { setShowNotifications(false); setShowTrash(false) }
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

  const loadTrash = async () => {
    setTrashLoading(true)
    const { data } = await taskService.fetchDeletedTasks(session, viewMode)
    setDeletedTasks((data as Task[]) || [])
    setTrashLoading(false)
  }

  const handleTrashToggle = () => {
    setShowNotifications(false)
    if (!showTrash) loadTrash()
    setShowTrash(v => !v)
  }

  const handleRestore = async (task: Task) => {
    await taskService.restoreTask(task.id)
    toast.success(`"${task.title}" restored`)
    loadTrash()
  }

  const handleHardDelete = async (task: Task) => {
    await taskService.hardDeleteTask(task.id)
    toast.success('Permanently deleted')
    loadTrash()
  }

  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'

  const context: AppContext = { session, viewMode, setViewMode, setUnreadCount }

  return (
    <div className="app-layout">
      {/* ── Fixed Sidebar ──────────────────────── */}
      <aside className={`fixed-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${showSidebar ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>TaskTracker</h1>
              <div className="live-badge" style={{ padding: '2px 6px', fontSize: '0.6rem' }}>
                <Zap size={10} fill="#10b981" />
                <span>LIVE</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>T</h1>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setShowSidebar(false)}
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon-container">{icon}</span>
              {!sidebarCollapsed && <span className="label">{label}</span>}
            </NavLink>
          ))}
          <div style={{ height: '1px', background: 'var(--glass-border)', margin: '16px 0' }} />
          <button
            onClick={handleTrashToggle}
            className={`sidebar-nav-link ${showTrash ? 'active' : ''}`}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <span className="icon-container"><Trash2 size={16} /></span>
            {!sidebarCollapsed && <span className="label">Trash</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="collapse-btn"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span style={{ marginLeft: '8px' }}>Collapse Menu</span></>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${showSidebar ? 'open' : ''}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ── Main Content Area ──────────────────── */}
      <div className={`main-content-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <header className="top-header">
          <div className="mobile-header-left">
            <button
              onClick={() => setShowSidebar(v => !v)}
              className="glass-card action-btn hamburger-btn"
              aria-label="Toggle menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="mobile-logo gradient-text">TaskTracker</h1>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginLeft: 'auto' }}>
          {/* User info */}
          <button
            onClick={() => navigate('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', background: 'var(--glass-bg)', padding: '6px 16px 6px 6px', borderRadius: '40px', border: '1px solid var(--glass-border)' }}
            className="hover-bg-glass"
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, boxShadow: '0 0 10px var(--primary-glow)' }}>
              {initials}
            </div>
            <div className="user-pill-name">
              <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.2 }}>{fullName}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                {user.user_metadata.team_name || 'General Team'}
              </p>
            </div>
          </button>

          <div style={{ width: '1px', height: '32px', background: 'var(--glass-border)', margin: '0 4px' }} />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--glass-bg)', padding: '6px', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
            {/* Notification bell */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowTrash(false); setShowNotifications(v => !v) }}
                className="action-btn icon-only"
                title="Notifications"
                style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none' }}
              >
                <Bell size={18} color={unreadCount > 0 ? 'var(--primary)' : 'var(--text-main)'} />
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

            <div className="hide-on-phone" style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 2px' }} />

            <button
              onClick={() => setIsLightMode(v => !v)}
              className="action-btn icon-only hide-on-phone"
              title={isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none' }}
            >
              {isLightMode ? <Moon size={18} color="var(--text-main)" /> : <Sun size={18} color="var(--text-main)" />}
            </button>

            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 2px' }} />

            <button
              onClick={() => supabase.auth.signOut()}
              className="action-btn icon-only"
              style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none' }}
              title="Sign Out"
            >
              <LogOut size={18} color="var(--accent)" />
            </button>
          </div>
          </div>
        </header>

        <main className="main-content-inner">
          <Outlet context={context} />
        </main>
      </div>



      {/* ── Mobile Bottom Nav ──────────────────── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.filter(n => ['/dashboard', '/tasks', '/calendar', '/settings'].includes(n.to)).map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span>{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Trash Modal */}
      <AnimatePresence>
        {showTrash && (
          <div className="modal-overlay" onClick={() => setShowTrash(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: '540px', padding: 0, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: 'rgba(244,63,94,0.1)', padding: '8px', borderRadius: '10px' }}>
                    <Trash2 size={20} color="#f43f5e" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1.2rem', margin: 0, color: 'var(--text-main)' }}>Trash Bin</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Tasks are retained for 30 days</p>
                  </div>
                </div>
                <button onClick={() => setShowTrash(false)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
                {trashLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                    <Loader2 size={24} color="var(--primary)" className="animate-spin" />
                  </div>
                ) : deletedTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Trash2 size={40} color="var(--glass-border)" style={{ marginBottom: '12px', opacity: 0.5 }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Your trash is empty.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deletedTasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{task.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Deleted on {new Date(task.deleted_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(task)}
                          className="hover-bg-glass"
                          title="Restore"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button
                          onClick={() => handleHardDelete(task)}
                          className="hover-bg-glass"
                          title="Delete forever"
                          style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '6px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
