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
          {/* User info */}
          <button
            onClick={() => navigate('/settings')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', background: 'transparent', padding: '6px 12px', borderRadius: '12px' }}
            className="hover-bg-glass"
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              {initials}
            </div>
            <div>
              <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.2 }}>{fullName}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '3px' }}>
                {userEmail} <span style={{ opacity: 0.5 }}>•</span> <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{user.user_metadata.team_name || 'General'}</span>
              </p>
            </div>
          </button>

          <div style={{ width: '1px', height: '32px', background: 'var(--glass-border)', margin: '0 4px' }} />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

            <button
              onClick={() => setIsLightMode(v => !v)}
              className="glass-card action-btn"
              title={isLightMode ? 'Dark mode' : 'Light mode'}
              style={{ padding: '10px 14px', gap: '6px' }}
            >
              {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
              <span style={{ fontSize: '0.85rem' }}>{isLightMode ? 'Dark' : 'Light'}</span>
            </button>

            <button
              onClick={() => supabase.auth.signOut()}
              className="glass-card action-btn"
              style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, padding: '10px 14px', marginLeft: '4px' }}
            >
              <LogOut size={16} /> <span style={{ fontSize: '0.85rem' }}>Sign Out</span>
            </button>
            
            <button
              onClick={() => setShowSidebar(v => !v)}
              className="glass-card action-btn hamburger-btn"
              aria-label="Toggle menu"
              style={{ marginLeft: '4px' }}
            >
              {showSidebar ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
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
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
              <button
                onClick={handleTrashToggle}
                className={`sidebar-nav-link ${showTrash ? 'active' : ''}`}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <span style={{ flexShrink: 0 }}><Trash2 size={16} /></span>
                {!sidebarCollapsed && <span>Trash</span>}
              </button>
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
