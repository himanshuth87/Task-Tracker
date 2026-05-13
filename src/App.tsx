import { useState, useEffect } from 'react'
import { Plus, BarChart3, LogOut, Bell, Download, Users, Briefcase, Zap, UserCheck, Factory, Search, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { supabase } from './supabase'
import { Auth } from './Auth'
import type { Session } from '@supabase/supabase-js'

import { TaskForm } from './components/tasks/TaskForm'
import { TaskItem } from './components/tasks/TaskItem'
import { StatItem } from './components/ui/StatItem'
import { FilterBtn } from './components/ui/FilterBtn'
import { PipelineView } from './components/pipeline/PipelineView'

import { useTasks } from './hooks/useTasks'
import { getDaysRemaining } from './utils/dateUtils'
import { downloadExcel, addToOutlook } from './utils/exportUtils'

type FilterValue = 'all' | 'pending' | 'in_progress' | 'blocked' | 'completed' | 'assigned_to_me'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [appSection, setAppSection] = useState<'tasks' | 'pipeline'>('tasks')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const { tasks, loading, isLive, unreadCount, setUnreadCount, fetchTasks } = useTasks(session, viewMode, filter)

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filter === 'all' || filter === 'assigned_to_me' || task.status === filter
    const matchesSearch = !searchTerm ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.remarks?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.task_giver?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.assigned_to_email?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => {
      if (t.status === 'completed') return false
      const d = getDaysRemaining(t.deadline)
      return d !== null && d < 0
    }).length,
    dueToday: tasks.filter(t => {
      if (t.status === 'completed') return false
      return getDaysRemaining(t.deadline) === 0
    }).length,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const tasksDueSoon = tasks.filter(t => {
    if (t.status === 'completed') return false
    const days = getDaysRemaining(t.deadline)
    return days !== null && days >= 0 && days <= 2
  })

  if (!session) return <Auth />

  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''

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
              <p style={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>{fullName}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {userEmail} • <span style={{ color: 'var(--primary)' }}>{user.user_metadata.team_name || 'General'}</span>
              </p>
            </div>
            <span style={{ color: 'var(--glass-border)' }}>|</span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0) }}
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

          <button onClick={() => downloadExcel(tasks)} className="glass-card action-btn" title="Export to Excel">
            <Download size={20} />
            <span>Export</span>
          </button>

          {appSection === 'tasks' && (
            <button onClick={() => setShowForm(!showForm)} className="primary-gradient action-btn main-action">
              <Plus size={20} />
              {showForm ? 'Close' : 'New Task'}
            </button>
          )}
        </div>
      </header>

      {/* Due soon banner */}
      <AnimatePresence>
        {tasksDueSoon.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card"
            style={{
              marginBottom: '24px', padding: '14px 24px',
              border: '1px solid rgba(245,158,11,0.3)',
              background: 'linear-gradient(90deg, rgba(245,158,11,0.05) 0%, transparent 100%)',
              display: 'flex', alignItems: 'center', gap: '14px'
            }}
          >
            <div style={{ background: 'rgba(245,158,11,0.15)', padding: '8px', borderRadius: '10px', color: '#f59e0b' }}>
              <Bell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.95rem' }}>
                {tasksDueSoon.length} task{tasksDueSoon.length > 1 ? 's' : ''} due within 48 hours
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>These are highlighted in your list below.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="task-grid">
        <aside>
          {/* Analytics */}
          {appSection === 'tasks' && (
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={18} color="var(--primary)" /> Analytics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StatItem label="Total Tasks" value={stats.total} color="var(--primary)" />
                <StatItem label="Completed" value={stats.completed} color="#10b981" />
                <StatItem label="In Progress" value={stats.inProgress} color="#3b82f6" />
                <StatItem label="Pending" value={stats.pending} color="#f59e0b" />
                <StatItem label="Blocked" value={stats.blocked} color="#f43f5e" />
                {stats.overdue > 0 && <StatItem label="Overdue" value={stats.overdue} color="#f43f5e" />}
                {stats.dueToday > 0 && <StatItem label="Due Today" value={stats.dueToday} color="#f59e0b" />}

                {/* Completion rate bar */}
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={12} /> Completion Rate
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#f43f5e' }}>
                      {completionRate}%
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '4px', transition: 'width 0.5s ease',
                      width: `${completionRate}%`,
                      background: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#f43f5e'
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section switcher */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FilterBtn active={appSection === 'tasks'} onClick={() => setAppSection('tasks')} label="Task Tracker" icon={<Briefcase size={16} />} />
              <FilterBtn active={appSection === 'pipeline'} onClick={() => setAppSection('pipeline')} label="Mfg Pipeline" icon={<Factory size={16} />} />
            </div>
          </div>

          {/* Task-specific sidebar */}
          {appSection === 'tasks' && (
            <>
              <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--primary)" /> View
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FilterBtn active={viewMode === 'personal' && filter !== 'assigned_to_me'} onClick={() => { setViewMode('personal'); setFilter('all') }} label="My Tasks" icon={<Briefcase size={16} />} />
                  <FilterBtn active={filter === 'assigned_to_me'} onClick={() => { setViewMode('personal'); setFilter('assigned_to_me') }} label="Assigned to Me" icon={<UserCheck size={16} />} />
                  <FilterBtn active={viewMode === 'team'} onClick={() => setViewMode('team')} label="Team View" icon={<Users size={16} />} />
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="var(--primary)" /> Status
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
                  <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pending" />
                  <FilterBtn active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} label="In Progress" />
                  <FilterBtn active={filter === 'blocked'} onClick={() => setFilter('blocked')} label="Blocked" icon={<AlertCircle size={14} />} />
                  <FilterBtn active={filter === 'completed'} onClick={() => setFilter('completed')} label="Completed" />
                </div>
              </div>
            </>
          )}
        </aside>

        <main>
          {appSection === 'pipeline' && <PipelineView session={session} />}

          {appSection === 'tasks' && (
            <>
              <AnimatePresence mode="wait">
                {showForm && (
                  <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ marginBottom: '24px' }}>
                    <TaskForm
                      onTaskAdded={() => { fetchTasks(); setShowForm(false) }}
                      userId={user.id}
                      userEmail={userEmail}
                      fullName={fullName}
                      teamName={user.user_metadata.team_name}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search bar */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search tasks by title, remarks, person..."
                  style={{ width: '100%', paddingLeft: '40px' }}
                />
              </div>

              {/* Task list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="loader" />
                    <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Syncing tasks...</p>
                  </div>
                ) : filteredTasks.length > 0 ? (
                  filteredTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdate={fetchTasks}
                      onAddToCalendar={() => addToOutlook(task)}
                      currentUserId={user.id}
                      currentUserEmail={userEmail}
                      currentUserName={fullName}
                    />
                  ))
                ) : (
                  <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                      {searchTerm ? `No tasks match "${searchTerm}"` : 'No tasks found.'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>
                      {searchTerm ? 'Try a different search term.' : 'Create a new task to get started!'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
