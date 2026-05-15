import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Trash2, RotateCcw, Flame, X } from 'lucide-react'
import { type Task } from '../../supabase'
import { taskService } from '../../services/taskService'
import { toast } from 'sonner'
import { ConfirmModal } from '../ui/ConfirmModal'
import { formatDate } from '../../utils/dateUtils'

interface DashboardViewProps {
  session: any
  viewMode: 'personal' | 'team'
  onNavigateToTasks: () => void
  onUpdate: () => void
}

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      onClick={onClick}
      style={{ padding: '20px 24px', cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.2s', border: `1px solid ${color}25` }}
      whileHover={onClick ? { scale: 1.02 } : {}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: 40, height: 40, borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

function TaskRow({ task, action }: { task: Task; action?: React.ReactNode }) {
  const deadline = task.deadline ? new Date(task.deadline) : null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isOverdue = deadline && deadline < today && task.status !== 'completed'
  const isDueToday = deadline && deadline.toDateString() === today.toDateString()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        <p style={{ fontSize: '0.75rem', color: isOverdue ? '#f43f5e' : isDueToday ? '#f59e0b' : 'var(--text-muted)', marginTop: '2px' }}>
          {deadline ? (isOverdue ? `Overdue: ${formatDate(task.deadline)}` : `Due: ${formatDate(task.deadline)}`) : 'No deadline'}
        </p>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '8px', background: isOverdue ? 'rgba(244,63,94,0.12)' : 'rgba(245,158,11,0.12)', color: isOverdue ? '#f43f5e' : '#f59e0b', flexShrink: 0 }}>
        {isOverdue ? 'OVERDUE' : 'TODAY'}
      </span>
      {action}
    </div>
  )
}

export function DashboardView({ session, viewMode, onNavigateToTasks, onUpdate }: DashboardViewProps) {
  const [overdue, setOverdue] = useState<Task[]>([])
  const [dueToday, setDueToday] = useState<Task[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, inProgress: 0, blocked: 0 })
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([])
  const [showTrash, setShowTrash] = useState(false)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Task | null>(null)
  const [loadingTrash, setLoadingTrash] = useState(false)

  const loadData = async () => {
    if (!session) return

    // Fetch all non-deleted tasks for stats
    const { data: all } = await taskService.fetchAllTasks(session, viewMode, 'all')
    if (all) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

      const overdueList = all.filter((t: Task) => {
        if (!t.deadline || t.status === 'completed') return false
        return new Date(t.deadline) < today
      })
      const dueTodayList = all.filter((t: Task) => {
        if (!t.deadline || t.status === 'completed') return false
        const d = new Date(t.deadline)
        return d >= today && d < tomorrow
      })

      setOverdue(overdueList)
      setDueToday(dueTodayList)
      setStats({
        total: all.length,
        completed: all.filter((t: Task) => t.status === 'completed').length,
        pending: all.filter((t: Task) => t.status === 'pending').length,
        inProgress: all.filter((t: Task) => t.status === 'in_progress').length,
        blocked: all.filter((t: Task) => t.status === 'blocked').length,
      })
    }
  }

  const loadTrash = async () => {
    setLoadingTrash(true)
    const { data } = await taskService.fetchDeletedTasks(session, viewMode)
    setDeletedTasks((data as Task[]) || [])
    setLoadingTrash(false)
  }

  useEffect(() => { loadData() }, [session, viewMode])

  const handleRestore = async (task: Task) => {
    await taskService.restoreTask(task.id)
    toast.success(`"${task.title}" restored`)
    loadTrash(); loadData(); onUpdate()
  }

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return
    await taskService.hardDeleteTask(hardDeleteTarget.id)
    setHardDeleteTarget(null)
    toast.success('Permanently deleted')
    loadTrash()
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '4px' }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'} 👋
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Here's your task overview for today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <StatCard icon={<TrendingUp size={18} />} label="Total Tasks" value={stats.total} color="#6366f1" onClick={onNavigateToTasks} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={stats.completed} color="#10b981" />
        <StatCard icon={<Clock size={18} />} label="In Progress" value={stats.inProgress} color="#3b82f6" />
        <StatCard icon={<Flame size={18} />} label="Overdue" value={overdue.length} color="#f43f5e" />
        <StatCard icon={<AlertCircle size={18} />} label="Blocked" value={stats.blocked} color="#f59e0b" />
      </div>

      {/* Completion rate bar */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Overall Completion Rate</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: completionRate >= 75 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#f43f5e' }}>{completionRate}%</span>
        </div>
        <div style={{ height: '8px', borderRadius: '10px', background: 'var(--glass-bg)', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionRate}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: '10px', background: completionRate >= 75 ? 'linear-gradient(90deg, #10b981, #34d399)' : completionRate >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #f43f5e, #fb7185)' }}
          />
        </div>
      </div>

      {/* Urgent tasks: Overdue + Due Today */}
      {(overdue.length > 0 || dueToday.length > 0) && (
        <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(244,63,94,0.2)' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
            <Flame size={16} color="#f43f5e" /> Needs Attention
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              {overdue.length + dueToday.length} task{overdue.length + dueToday.length !== 1 ? 's' : ''}
            </span>
          </h3>

          {[...overdue, ...dueToday].slice(0, 8).map(task => (
            <TaskRow key={task.id} task={task} action={
              <button onClick={onNavigateToTasks} style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>View →</button>
            } />
          ))}

          {(overdue.length + dueToday.length) > 8 && (
            <button onClick={onNavigateToTasks} style={{ marginTop: '10px', background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600 }}>
              + {overdue.length + dueToday.length - 8} more — View All
            </button>
          )}
        </div>
      )}

      {overdue.length === 0 && dueToday.length === 0 && (
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle2 size={28} color="#10b981" style={{ margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600, color: '#10b981' }}>You're all caught up!</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>No overdue or due-today tasks.</p>
        </div>
      )}

      {/* Trash Bin */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Trash2 size={16} color="var(--text-muted)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Trash Bin</h3>
          <span style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => { setShowTrash(v => !v); if (!showTrash) loadTrash() }}
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '8px' }}
            >
              {showTrash ? 'Hide' : 'Show Trash'}
            </button>
          </span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Deleted tasks are held for 30 days before permanent removal.</p>

        <AnimatePresence>
          {showTrash && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {loadingTrash ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading...</p>
              ) : deletedTasks.length === 0 ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Trash is empty.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deletedTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Deleted {new Date(task.deleted_at!).toLocaleDateString()}
                        </p>
                      </div>
                      <button onClick={() => handleRestore(task)} title="Restore" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button onClick={() => setHardDeleteTarget(task)} title="Delete Forever" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '5px 8px', borderRadius: '8px' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hardDeleteTarget && (
        <ConfirmModal
          title="Permanently Delete"
          message={`This will permanently erase "${hardDeleteTarget.title}". This cannot be undone.`}
          confirmText="Delete Forever"
          onConfirm={handleHardDelete}
          onCancel={() => setHardDeleteTarget(null)}
        />
      )}
    </div>
  )
}
