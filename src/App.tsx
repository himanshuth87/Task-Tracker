import { useState, useEffect, useCallback } from 'react'
import { Plus, BarChart3, LogOut, Bell, Download, Users, Briefcase, Zap, UserCheck, Factory, Search, TrendingUp, AlertCircle, Clock, LayoutGrid, List, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { supabase } from './supabase'
import { Auth } from './Auth'
import type { Session } from '@supabase/supabase-js'

import { TaskForm } from './components/tasks/TaskForm'
import { TaskItem } from './components/tasks/TaskItem'
import { KanbanBoard } from './components/tasks/KanbanBoard'
import { StatItem } from './components/ui/StatItem'
import { FilterBtn } from './components/ui/FilterBtn'
import { AnalyticsCharts } from './components/ui/AnalyticsCharts'
import { NotificationInbox } from './components/ui/NotificationInbox'
import { BulkActionBar } from './components/ui/BulkActionBar'
import { PipelineView } from './components/pipeline/PipelineView'

import { taskService } from './services/taskService'
import { getDaysRemaining } from './utils/dateUtils'
import { downloadExcel, addToOutlook } from './utils/exportUtils'
import { type Task } from './supabase'

type FilterValue = 'all' | 'pending' | 'in_progress' | 'blocked' | 'completed' | 'assigned_to_me'
type ViewLayout = 'list' | 'kanban'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filter, setFilter] = useState<FilterValue>('all')
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [appSection, setAppSection] = useState<'tasks' | 'pipeline'>('tasks')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewLayout, setViewLayout] = useState<ViewLayout>('list')
  const [showCharts, setShowCharts] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLive, setIsLive] = useState(false)

  // Pagination
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  const fetchTasks = useCallback(async (resetPage = false) => {
    if (!session) return
    setLoading(true)
    const currentPage = resetPage ? 0 : page
    if (resetPage) setPage(0)

    const { data, error, count } = await taskService.fetchTasks(session, viewMode, filter, currentPage)
    if (!error) {
      if (resetPage || currentPage === 0) {
        setAllTasks(data as Task[])
      } else {
        setAllTasks(prev => {
          const ids = new Set(prev.map(t => t.id))
          return [...prev, ...(data as Task[]).filter(t => !ids.has(t.id))]
        })
      }
      setTotalCount(count)
    }
    setLoading(false)
  }, [session, viewMode, filter, page])

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    setLoading(true)
    const { data, error, count } = await taskService.fetchTasks(session!, viewMode, filter, nextPage)
    if (!error) {
      setAllTasks(prev => {
        const ids = new Set(prev.map(t => t.id))
        return [...prev, ...(data as Task[]).filter(t => !ids.has(t.id))]
      })
      setTotalCount(count)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchTasks(true)
  }, [session, viewMode, filter])

  // Real-time subscription
  useEffect(() => {
    if (!session) return
    const channel = taskService.subscribeToTasks((payload: any) => {
      fetchTasks(true)
      if (payload.eventType === 'INSERT' && payload.new.assigned_to_email === session.user.email) {
        setUnreadCount(prev => prev + 1)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Task Assigned!', {
            body: `Task: ${payload.new.title}\nAssigned by: ${payload.new.task_giver}`,
            icon: '/vite.svg',
          })
        }
      }
    })
    setIsLive(true)
    return () => { channel.unsubscribe() }
  }, [session])

  const filteredTasks = allTasks.filter(task => {
    const matchesStatus = filter === 'all' || filter === 'assigned_to_me' || task.status === filter
    const matchesSearch = !searchTerm ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.remarks?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.task_giver?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (task.assigned_to_email?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: totalCount,
    completed: allTasks.filter(t => t.status === 'completed').length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
    overdue: allTasks.filter(t => {
      if (t.status === 'completed') return false
      const d = getDaysRemaining(t.deadline)
      return d !== null && d < 0
    }).length,
    dueToday: allTasks.filter(t => {
      if (t.status === 'completed') return false
      return getDaysRemaining(t.deadline) === 0
    }).length,
  }

  const completionRate = allTasks.length > 0 ? Math.round((stats.completed / allTasks.length) * 100) : 0

  const tasksDueSoon = allTasks.filter(t => {
    if (t.status === 'completed') return false
    const days = getDaysRemaining(t.deadline)
    return days !== null && days >= 0 && days <= 2
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTasks.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTasks.map(t => t.id))
    }
  }

  const clearBulk = () => {
    setSelectedIds([])
    setBulkMode(false)
  }

  if (!session) return <Auth />

  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''
  const hasMore = allTasks.length < totalCount

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
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
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
                  style={{ right: 0, left: 'auto', minWidth: '340px' }}
                >
                  <NotificationInbox
                    userEmail={userEmail}
                    onUnreadChange={count => { setUnreadCount(count) }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => downloadExcel(allTasks)} className="glass-card action-btn" title="Export to Excel">
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
              display: 'flex', alignItems: 'center', gap: '14px',
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
                      background: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#f43f5e',
                    }} />
                  </div>
                </div>

                {/* Charts toggle */}
                <button
                  onClick={() => setShowCharts(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: showCharts ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', color: showCharts ? 'var(--primary)' : 'var(--text-muted)', borderRadius: '10px', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 600, marginTop: '8px', border: showCharts ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent', transition: 'all 0.2s' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={14} /> Charts</span>
                  {showCharts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <AnimatePresence>
                {showCharts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginTop: '16px' }}
                  >
                    <AnalyticsCharts tasks={allTasks} />
                  </motion.div>
                )}
              </AnimatePresence>
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
                      onTaskAdded={() => { fetchTasks(true); setShowForm(false) }}
                      userId={user.id}
                      userEmail={userEmail}
                      fullName={fullName}
                      teamName={user.user_metadata.team_name}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toolbar: search + view toggles */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search tasks by title, remarks, person..."
                    style={{ width: '100%', paddingLeft: '40px' }}
                  />
                </div>

                {/* View layout toggle */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid var(--glass-border)', gap: '4px' }}>
                  <button
                    onClick={() => setViewLayout('list')}
                    style={{ padding: '6px 12px', borderRadius: '9px', background: viewLayout === 'list' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewLayout === 'list' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <List size={14} /> List
                  </button>
                  <button
                    onClick={() => setViewLayout('kanban')}
                    style={{ padding: '6px 12px', borderRadius: '9px', background: viewLayout === 'kanban' ? 'rgba(99,102,241,0.2)' : 'transparent', color: viewLayout === 'kanban' ? 'var(--primary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s' }}
                  >
                    <LayoutGrid size={14} /> Board
                  </button>
                </div>

                {/* Bulk mode toggle */}
                <button
                  onClick={() => { setBulkMode(v => !v); setSelectedIds([]) }}
                  style={{ padding: '8px 14px', borderRadius: '12px', background: bulkMode ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', color: bulkMode ? 'var(--primary)' : 'var(--text-muted)', border: bulkMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--glass-border)', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  {bulkMode ? 'Cancel' : 'Select'}
                </button>
              </div>

              {/* Bulk select-all bar */}
              {bulkMode && filteredTasks.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <button onClick={toggleSelectAll} style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {selectedIds.length === filteredTasks.length ? 'Deselect All' : `Select All (${filteredTasks.length})`}
                  </button>
                  {selectedIds.length > 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedIds.length} selected</span>
                  )}
                </div>
              )}

              {/* Task content */}
              {loading && allTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>
                  <div className="loader" />
                  <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Syncing tasks...</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {searchTerm ? `No tasks match "${searchTerm}"` : 'No tasks found.'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>
                    {searchTerm ? 'Try a different search term.' : 'Create a new task to get started!'}
                  </p>
                </div>
              ) : viewLayout === 'kanban' ? (
                <div style={{ overflowX: 'auto' }}>
                  <KanbanBoard tasks={filteredTasks} onUpdate={() => fetchTasks(true)} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onUpdate={() => fetchTasks(true)}
                        onAddToCalendar={() => addToOutlook(task)}
                        currentUserId={user.id}
                        currentUserEmail={userEmail}
                        currentUserName={fullName}
                        isSelected={selectedIds.includes(task.id)}
                        onToggleSelect={toggleSelect}
                        bulkMode={bulkMode}
                      />
                    ))}
                  </div>

                  {/* Load more / pagination */}
                  {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        style={{ padding: '10px 28px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        {loading ? 'Loading...' : `Load More (${totalCount - allTasks.length} remaining)`}
                      </button>
                    </div>
                  )}
                  {!hasMore && allTasks.length > 0 && (
                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.15)' }}>
                      All {totalCount} tasks loaded
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Bulk action floating bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearBulk}
        onUpdate={() => { fetchTasks(true); clearBulk() }}
      />
    </div>
  )
}

export default App
