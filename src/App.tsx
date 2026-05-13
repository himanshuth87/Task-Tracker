import { useState, useEffect } from 'react'
import { Plus, BarChart3, LogOut, Bell, Download, Users, Briefcase, Zap, UserCheck, Factory } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { supabase } from './supabase'
import { Auth } from './Auth'
import type { Session } from '@supabase/supabase-js'

// Components
import { TaskForm } from './components/tasks/TaskForm'
import { TaskItem } from './components/tasks/TaskItem'
import { StatItem } from './components/ui/StatItem'
import { FilterBtn } from './components/ui/FilterBtn'
import { PipelineView } from './components/pipeline/PipelineView'

// Hooks & Utils
import { useTasks } from './hooks/useTasks'
import { getDaysRemaining } from './utils/dateUtils'
import { downloadExcel, addToOutlook } from './utils/exportUtils'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'assigned_to_me'>('all')
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [appSection, setAppSection] = useState<'tasks' | 'pipeline'>('tasks')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const { tasks, loading, isLive, unreadCount, setUnreadCount, fetchTasks } = useTasks(session, viewMode, filter)

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all' || filter === 'assigned_to_me') return true
    return task.status === filter
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length
  }

  const tasksDueSoon = tasks.filter(t => {
    if (t.status === 'completed') return false
    const days = getDaysRemaining(t.deadline)
    return days !== null && days >= 0 && days <= 2
  })

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>TaskTracker</h1>
            {isLive && (
              <div className="live-badge">
                <Zap size={12} fill="#10b981" />
                <span>LIVE</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <p style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>{session.user.user_metadata.full_name || 'User'}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{session.user.email} • <span style={{ color: 'var(--primary)' }}>{session.user.user_metadata.team_name || 'General'}</span></p>
            </div>
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
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => {setShowNotifications(!showNotifications); setUnreadCount(0)}}
              className={`glass-card action-btn ${unreadCount > 0 ? 'pulse' : ''}`}
              title="Notifications"
            >
              <Bell size={20} color={unreadCount > 0 ? 'var(--primary)' : 'white'} />
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
                  <h4>Recent Activity</h4>
                  <div className="notification-list">
                    {unreadCount > 0 ? (
                      <div className="notification-item unread">
                        <UserCheck size={14} />
                        <div>
                          <p>New Task Assigned to you!</p>
                          <span>Check "Assigned to Me" filter</span>
                        </div>
                      </div>
                    ) : (
                      <p className="empty-notif">No new notifications</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={() => downloadExcel(tasks)}
            className="glass-card action-btn"
            title="Export to Excel"
          >
            <Download size={20} />
            <span>Export</span>
          </button>
          {appSection === 'tasks' && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="primary-gradient action-btn main-action"
            >
              <Plus size={20} />
              {showForm ? 'Close' : 'New Task'}
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {tasksDueSoon.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card"
            style={{ 
              marginBottom: '32px', 
              padding: '16px 24px', 
              border: '1px solid rgba(245, 158, 11, 0.3)',
              background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '12px', color: '#f59e0b' }}>
              <Bell size={20} className="animate-bounce" />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: '#f59e0b', fontWeight: 600 }}>Reminder: You have {tasksDueSoon.length} tasks due soon!</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tasks expiring in less than 2 days are highlighted in your list.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="task-grid">
        <aside>
          {appSection === 'tasks' && (
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" />
                Analytics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <StatItem label="Total Tasks" value={stats.total} color="var(--primary)" />
                <StatItem label="Completed" value={stats.completed} color="#10b981" />
                <StatItem label="Pending" value={stats.pending} color="#f59e0b" />
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Section
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FilterBtn active={appSection === 'tasks'} onClick={() => setAppSection('tasks')} label="Task Tracker" icon={<Briefcase size={16} />} />
              <FilterBtn active={appSection === 'pipeline'} onClick={() => setAppSection('pipeline')} label="Mfg Pipeline" icon={<Factory size={16} />} />
            </div>
          </div>

          {appSection === 'tasks' && (
            <>
              <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--primary)" />
                  View Mode
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FilterBtn active={viewMode === 'personal' && filter !== 'assigned_to_me'} onClick={() => {setViewMode('personal'); setFilter('all')}} label="My Tasks" icon={<Briefcase size={16} />} />
                  <FilterBtn active={filter === 'assigned_to_me'} onClick={() => {setViewMode('personal'); setFilter('assigned_to_me')}} label="Assigned to Me" icon={<UserCheck size={16} />} />
                  <FilterBtn active={viewMode === 'team'} onClick={() => setViewMode('team')} label="Team View" icon={<Users size={16} />} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--primary)" />
                  Filters
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All Status" />
                  <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="Active Only" />
                  <FilterBtn active={filter === 'completed'} onClick={() => setFilter('completed')} label="Completed Only" />
                </div>
              </div>
            </>
          )}
        </aside>

        <main>
          {appSection === 'pipeline' && (
            <PipelineView session={session} />
          )}

          <AnimatePresence mode="wait">
            {appSection === 'tasks' && showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ marginBottom: '32px' }}
              >
                <TaskForm 
                  onTaskAdded={fetchTasks} 
                  userId={session.user.id} 
                  userEmail={session.user.email} 
                  fullName={session.user.user_metadata.full_name}
                  teamName={session.user.user_metadata.team_name} 
                />
              </motion.div>
            )}
          </AnimatePresence>

          {appSection === 'tasks' && <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div className="loader"></div>
                <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Syncing team tasks...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={fetchTasks} 
                  onAddToCalendar={() => addToOutlook(task)} 
                  currentUserId={session.user.id} 
                />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No tasks found in this category.</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>Create a new task to get started!</p>
              </div>
            )}
          </div>}
        </main>
      </div>
    </div>
  )
}

export default App
