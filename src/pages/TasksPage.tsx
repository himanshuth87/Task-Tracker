import { useState, useEffect, useCallback, useRef } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import {
  Plus, Search, List, LayoutGrid, BarChart2, AlertCircle,
  Bell, Users, Briefcase, UserCheck, Download,
  BarChart3, TrendingUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TaskForm } from '../components/tasks/TaskForm'
import { TaskItem } from '../components/tasks/TaskItem'
import { KanbanBoard } from '../components/tasks/KanbanBoard'
import { AnalyticsCharts } from '../components/ui/AnalyticsCharts'
import { BulkActionBar } from '../components/ui/BulkActionBar'
import { FilterBtn } from '../components/ui/FilterBtn'
import { StatItem } from '../components/ui/StatItem'
import { taskService } from '../services/taskService'
import { getDaysRemaining } from '../utils/dateUtils'
import { downloadExcel, addToOutlook } from '../utils/exportUtils'
import { type Task } from '../supabase'
import type { AppContext } from '../components/layout/AppLayout'

type FilterValue = 'all' | 'pending' | 'in_progress' | 'blocked' | 'completed' | 'assigned_to_me'
type ViewLayout = 'list' | 'kanban' | 'charts'

export function TasksPage() {
  const { session, viewMode, setViewMode, setUnreadCount } = useOutletContext<AppContext>()
  const location = useLocation()

  const [filter, setFilter] = useState<FilterValue>('all')
  const [viewLayout, setViewLayout] = useState<ViewLayout>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if ((location.state as any)?.openForm) {
      setShowForm(true)
      window.history.replaceState({}, '')
    }
  }, [])

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(h)
  }, [searchTerm])

  const fetchTasksRef = useRef<(resetPage?: boolean) => Promise<void>>(async () => {})

  const fetchTasks = useCallback(async (resetPage = false) => {
    if (!session) return
    setLoading(true)
    const currentPage = resetPage ? 0 : page
    if (resetPage) setPage(0)
    const { data, error, count } = await taskService.fetchTasks(session, viewMode, filter, currentPage, debouncedSearch)
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
  }, [session, viewMode, filter, page, debouncedSearch])

  const loadMore = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    setLoading(true)
    const { data, error, count } = await taskService.fetchTasks(session, viewMode, filter, nextPage, debouncedSearch)
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
  }, [session, viewMode, filter, debouncedSearch])

  useEffect(() => { fetchTasksRef.current = fetchTasks }, [fetchTasks])

  useEffect(() => {
    if (!session) return
    const channel = taskService.subscribeToTasks((payload: any) => {
      fetchTasksRef.current(true)
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
    return () => { channel.unsubscribe() }
  }, [session])

  const filteredTasks = allTasks

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

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const toggleSelectAll = () =>
    setSelectedIds(prev => prev.length === filteredTasks.length ? [] : filteredTasks.map(t => t.id))

  const clearBulk = () => { setSelectedIds([]); setBulkMode(false) }

  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''
  const hasMore = allTasks.length < totalCount

  return (
    <>
      {/* Due soon banner */}
      <AnimatePresence>
        {tasksDueSoon.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="glass-card"
            style={{
              marginBottom: '20px', padding: '14px 24px',
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

      {/* Stats mini bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={15} color="var(--primary)" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overview</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <StatItem label="Total" value={stats.total} color="var(--primary)" />
          <StatItem label="Done" value={stats.completed} color="#10b981" />
          <StatItem label="In Progress" value={stats.inProgress} color="#3b82f6" />
          <StatItem label="Pending" value={stats.pending} color="#f59e0b" />
          {stats.blocked > 0 && <StatItem label="Blocked" value={stats.blocked} color="#f43f5e" />}
          {stats.overdue > 0 && <StatItem label="Overdue" value={stats.overdue} color="#f43f5e" />}
          {stats.dueToday > 0 && <StatItem label="Due Today" value={stats.dueToday} color="#f59e0b" />}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={13} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Completion:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#f43f5e' }}>{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* View mode + Status filter tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <FilterBtn
            active={viewMode === 'personal' && filter !== 'assigned_to_me'}
            onClick={() => { setViewMode('personal'); setFilter('all') }}
            label="My Tasks"
            icon={<Briefcase size={13} />}
          />
          <FilterBtn
            active={filter === 'assigned_to_me'}
            onClick={() => { setViewMode('personal'); setFilter('assigned_to_me') }}
            label="Assigned to Me"
            icon={<UserCheck size={13} />}
          />
          <FilterBtn
            active={viewMode === 'team'}
            onClick={() => setViewMode('team')}
            label="Team"
            icon={<Users size={13} />}
          />
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)', flexShrink: 0 }} />

        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <FilterBtn active={filter === 'all' || filter === 'assigned_to_me'} onClick={() => { if (filter !== 'assigned_to_me') setFilter('all') }} label="All" />
          <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="Pending" />
          <FilterBtn active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} label="In Progress" />
          <FilterBtn active={filter === 'blocked'} onClick={() => setFilter('blocked')} label="Blocked" icon={<AlertCircle size={12} />} />
          <FilterBtn active={filter === 'completed'} onClick={() => setFilter('completed')} label="Done" />
        </div>
      </div>

      {/* Search + view toggle + actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title, remarks, person..."
            style={{ width: '100%', paddingLeft: '40px' }}
          />
        </div>

        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid var(--glass-border)', gap: '4px' }}>
          {([
            { key: 'list' as const, icon: <List size={14} />, label: 'List' },
            { key: 'kanban' as const, icon: <LayoutGrid size={14} />, label: 'Board' },
            { key: 'charts' as const, icon: <BarChart2 size={14} />, label: 'Charts' },
          ]).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setViewLayout(key)}
              style={{
                padding: '6px 12px', borderRadius: '9px',
                background: viewLayout === key ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: viewLayout === key ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <button onClick={() => downloadExcel(allTasks)} className="glass-card action-btn" title="Export to Excel">
          <Download size={16} />
          <span style={{ fontSize: '0.85rem' }}>Export</span>
        </button>

        <button
          onClick={() => setShowForm(v => !v)}
          className="primary-gradient action-btn main-action"
        >
          <Plus size={18} />
          {showForm ? 'Close' : 'New Task'}
        </button>

        <button
          onClick={() => { setBulkMode(v => !v); setSelectedIds([]) }}
          style={{
            padding: '8px 14px', borderRadius: '12px',
            background: bulkMode ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            color: bulkMode ? 'var(--primary)' : 'var(--text-muted)',
            border: bulkMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--glass-border)',
            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
          }}
        >
          {bulkMode ? 'Cancel' : 'Select'}
        </button>
      </div>

      {/* Task form */}
      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginBottom: '24px' }}
          >
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

      {/* Bulk select-all bar */}
      {bulkMode && filteredTasks.length > 0 && viewLayout !== 'charts' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <button onClick={toggleSelectAll} style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>
            {selectedIds.length === filteredTasks.length ? 'Deselect All' : `Select All (${filteredTasks.length})`}
          </button>
          {selectedIds.length > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedIds.length} selected</span>}
        </div>
      )}

      {/* Task content */}
      {loading && allTasks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }} />)}
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
      ) : viewLayout === 'charts' ? (
        <AnalyticsCharts tasks={allTasks} />
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

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={clearBulk}
        onUpdate={() => { fetchTasks(true); clearBulk() }}
      />
    </>
  )
}
