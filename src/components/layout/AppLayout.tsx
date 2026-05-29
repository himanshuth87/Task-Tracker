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
  const isTasksRoute = location.pathname === '/tasks'

  const context: AppContext = { session, viewMode, setViewMode, setUnreadCount }

  return (
    <div className="app-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>TaskTracker</h1>
          <div className="live-badge">
            <Zap size={12} fill="#10b981" />
            <span>LIVE</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* User info + sign out */}
          <button
            onClick={() => navigate('/settings')}
            style={{ textAlign: 'left', background: 'transparent', padding: '4px 8px', borderRadius: '8px' }}
            className="hover-bg-glass"
          >
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600 }}>{fullName}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {userEmail} • <span style={{ color: 'var(--primary)' }}>{user.user_metadata.team_name || 'General'}</span>
            </p>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="glass-card action-btn"
            style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, padding: '8px 14px' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
          <span style={{ color: 'var(--glass-border)', fontSize: '1.2rem' }}>|</span>
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="glass-card action-btn hamburger-btn"
            aria-label="Toggle menu"
          >
            {showSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowTrash(false); setShowNotifications(v => !v) }}
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

          {/* Trash bin */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleTrashToggle}
              className="glass-card action-btn"
              title="Trash bin"
              style={{ color: showTrash ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              <Trash2 size={20} />
            </button>
            <AnimatePresence>
              {showTrash && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="glass-card notification-dropdown"
                  style={{ minWidth: '360px' }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trash2 size={15} color="var(--text-muted)" />
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Trash Bin</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>30-day retention</span>
                  </div>
                  <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
                    {trashLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                        <Loader2 size={20} color="var(--primary)" className="animate-spin" />
                      </div>
                    ) : deletedTasks.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Trash is empty</p>
                    ) : (
                      deletedTasks.map(task => (
                        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '10px', borderBottom: '1px solid var(--glass-border)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Deleted {new Date(task.deleted_at!).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestore(task)}
                            title="Restore"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '5px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', flexShrink: 0 }}
                          >
                            <RotateCcw size={12} /> Restore
                          </button>
                          <button
                            onClick={() => handleHardDelete(task)}
                            title="Delete forever"
                            style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '5px 8px', borderRadius: '8px', flexShrink: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
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
                  className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
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
