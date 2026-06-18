import { useState, useEffect } from 'react'
import { Calendar, Edit2, Trash2, Check, X, User, Clock, MessageCircle, ChevronDown, ChevronUp, AlertCircle, Loader2, CheckSquare, Paperclip, History, Square, Timer, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { type Task, type TaskStatus, type MisRole, supabase, MARKETING_CHANNELS, MARKETING_TASK_TYPES } from '../../supabase'
import { taskService } from '../../services/taskService'
import { commentService } from '../../services/commentService'
import { TaskComments } from './TaskComments'
import { SubTaskList } from './SubTaskList'
import { FileAttachments } from './FileAttachments'
import { ActivityLogPanel } from './ActivityLogPanel'
import { formatDate, getDaysRemaining, sanitizeTag } from '../../utils/dateUtils'
import { Avatar } from '../ui/Avatar'
import { ConfirmModal } from '../ui/ConfirmModal'

interface TaskItemProps {
  task: Task
  onUpdate: () => void
  currentUserId: string
  currentUserEmail: string
  currentUserName: string
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  bulkMode?: boolean
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: 'Pending',     color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', icon: <Clock size={13} /> },
  in_progress: { label: 'In Progress', color: '#3b82f6',               bg: 'rgba(59,130,246,0.12)',  icon: <Loader2 size={13} /> },
  blocked:     { label: 'Blocked',     color: '#f43f5e',               bg: 'rgba(244,63,94,0.12)',   icon: <AlertCircle size={13} /> },
  completed:   { label: 'Done',        color: '#10b981',               bg: 'rgba(16,185,129,0.12)',  icon: <Check size={13} /> },
}

const RECURRENCE_LABEL: Record<string, string> = {
  daily: '↻ Daily', weekly: '↻ Weekly', monthly: '↻ Monthly',
}

type Panel = 'comments' | 'subtasks' | 'attachments' | 'dependencies' | 'activity' | null

export function TaskItem({ task, onUpdate, currentUserId, currentUserEmail, currentUserName, isSelected, onToggleSelect, bulkMode }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState({ ...task, tags: task.tags || [], time_logged_minutes: task.time_logged_minutes || 0 })
  const [tagInput, setTagInput] = useState('')
  const [activePanel, setActivePanel] = useState<Panel>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [subtasksInfo, setSubtasksInfo] = useState({ total: 0, completed: 0 })
  const [showDailyUpdate, setShowDailyUpdate] = useState(false)
  const [dailyUpdateText, setDailyUpdateText] = useState('')
  const [submittingUpdate, setSubmittingUpdate] = useState(false)

  useEffect(() => {
    const fetchSubtasks = async () => {
      const { data } = await supabase.from('subtasks').select('completed').eq('task_id', task.id)
      if (data) {
        setSubtasksInfo({ total: data.length, completed: data.filter((s: any) => s.completed).length })
      }
    }
    fetchSubtasks()
  }, [task.id])

  const togglePanel = (panel: Panel) => setActivePanel(p => p === panel ? null : panel)

  const cycleStatus = async () => {
    const { error, nextStatus } = await taskService.cycleStatus(task, currentUserEmail, currentUserName)
    if (error) {
      toast.error('Could not update status. You may not have permission.')
    } else {
      if (nextStatus === 'completed' && task.recurrence && task.recurrence !== 'none') {
        toast.success(`Task completed! Next ${task.recurrence} occurrence created.`)
      } else {
        toast.success(`Status → ${STATUS_CONFIG[nextStatus as TaskStatus]?.label}`)
      }
      onUpdate()
    }
  }

  const markAsCompleted = async () => {
    const { error } = await taskService.updateTask(task.id, { status: 'completed' }, currentUserEmail, currentUserName)
    if (error) {
      toast.error('Could not mark as done. You may not have permission.')
    } else {
      toast.success('Task marked as done!')
      onUpdate()
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const performDelete = async () => {
    setShowDeleteConfirm(false)
    const { error } = await taskService.deleteTask(task.id)
    if (!error) {
      toast.success('Task deleted')
      onUpdate()
    } else {
      toast.error('Failed to delete task')
    }
  }

  const handleSave = async () => {
    const { error } = await taskService.updateTask(task.id, {
      title: editedTask.title.slice(0, 500),
      task_giver: editedTask.task_giver,
      start_date: editedTask.start_date,
      deadline: editedTask.deadline,
      priority: editedTask.priority,
      remarks: editedTask.remarks,
      tags: editedTask.tags,
      time_logged_minutes: editedTask.time_logged_minutes,
      assigned_to_email: editedTask.assigned_to_email || null,
      mis_role: editedTask.mis_role || 'none',
      channel: editedTask.mis_role && editedTask.mis_role !== 'none' ? (editedTask.channel || null) : null,
      task_type: editedTask.mis_role && editedTask.mis_role !== 'none' ? (editedTask.task_type || null) : null,
      num_products: editedTask.num_products ?? null,
      num_creatives: editedTask.num_creatives ?? null,
      total_designs: editedTask.mis_role === 'designer' ? (editedTask.total_designs ?? null) : null,
      approved_input: editedTask.mis_role === 'designer' ? (editedTask.approved_input ?? null) : null,
      rejected_inputs: editedTask.mis_role === 'designer' ? (editedTask.rejected_inputs ?? null) : null,
      quality_score: editedTask.mis_role === 'designer' ? (editedTask.quality_score ?? null) : null,
      actual_delivery: editedTask.mis_role === 'designer' ? (editedTask.actual_delivery || null) : null,
      shoot_units: editedTask.mis_role === 'photographer' ? (editedTask.shoot_units ?? null) : null,
      num_angles: editedTask.mis_role === 'photographer' ? (editedTask.num_angles ?? null) : null,
      edit_units: editedTask.mis_role === 'photographer' ? (editedTask.edit_units ?? null) : null,
      shoot_hours: editedTask.mis_role === 'photographer' ? (editedTask.shoot_hours ?? null) : null,
      edit_hours: editedTask.mis_role === 'photographer' ? (editedTask.edit_hours ?? null) : null,
    }, currentUserEmail, currentUserName)
    if (!error) {
      toast.success('Task updated')
      setIsEditing(false)
      onUpdate()
    } else {
      toast.error('Update failed')
    }
  }

  const daysRemaining = getDaysRemaining(task.deadline)
  const isDueSoon = task.status !== 'completed' && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2
  const isOverdue = task.status !== 'completed' && daysRemaining !== null && daysRemaining < 0
  const isOwner = task.user_id === currentUserId
  const isAssignee = task.assigned_to_email === currentUserEmail
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending

  const addTag = () => {
    const t = sanitizeTag(tagInput)
    if (!t || editedTask.tags.includes(t)) { setTagInput(''); return }
    if (editedTask.tags.length >= 5) { toast.error('Max 5 tags'); return }
    setEditedTask(prev => ({ ...prev, tags: [...prev.tags, t] }))
    setTagInput('')
  }
  const removeTag = (i: number) => {
    setEditedTask(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))
  }

  const handleTimeLog = async (minutes: number) => {
    const newTotal = (task.time_logged_minutes || 0) + minutes
    if (newTotal < 0) return
    const { error } = await taskService.updateTask(task.id, { time_logged_minutes: newTotal }, currentUserEmail, currentUserName)
    if (!error) {
      toast.success(`Logged ${minutes > 0 ? '+' : ''}${minutes}m`)
      onUpdate()
    }
  }

  const submitDailyUpdate = async () => {
    if (!dailyUpdateText.trim()) return
    setSubmittingUpdate(true)
    const { error } = await commentService.addComment(task.id, currentUserEmail, currentUserName, `[Daily Update]: ${dailyUpdateText.trim()}`)
    if (!error) {
      toast.success('Daily update posted!')
      setDailyUpdateText('')
      setShowDailyUpdate(false)
      setActivePanel('comments') // Open comments panel to show the update
    } else {
      toast.error('Failed to post update')
    }
    setSubmittingUpdate(false)
  }

  const panelBtn = (icon: React.ReactNode, panel: Panel, label: string) => (
    <button
      onClick={() => togglePanel(panel)}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        background: activePanel === panel ? 'rgba(99,102,241,0.15)' : 'transparent',
        color: activePanel === panel ? 'var(--primary)' : 'var(--text-muted)',
        fontSize: '0.75rem', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.2s',
      }}
    >
      {icon}
      <span>{label}</span>
      {activePanel === panel ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
    </button>
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card task-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        opacity: task.status === 'completed' ? 0.7 : 1,
        border: isSelected
          ? '1px solid rgba(99,102,241,0.5)'
          : isOverdue
            ? '1px solid rgba(244,63,94,0.4)'
            : isDueSoon
              ? '1px solid rgba(245,158,11,0.4)'
              : task.status === 'blocked'
                ? '1px solid rgba(244,63,94,0.25)'
                : '1px solid var(--glass-border)',
        background: isSelected ? 'rgba(99,102,241,0.05)' : undefined,
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Bulk checkbox */}
        {bulkMode && (
          <button
            onClick={() => onToggleSelect?.(task.id)}
            style={{ background: 'transparent', color: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.2)', flexShrink: 0, padding: '2px' }}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
        )}

        {/* Status cycle button */}
        <button
          onClick={cycleStatus}
          title={`Status: ${statusCfg.label} — click to advance`}
          style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '5px',
            background: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.color}50`,
            borderRadius: '20px', padding: '4px 10px',
            fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {statusCfg.icon}
          <span>{statusCfg.label}</span>
        </button>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600, background: 'rgba(255,255,255,0.1)' }}
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
              maxLength={500}
            />
          ) : (
            <div>
              <h4 
                onDoubleClick={() => isOwner && setIsEditing(true)}
                style={{
                  fontSize: '1.1rem', fontWeight: 600,
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: isOwner ? 'pointer' : 'default',
                }}
                title={isOwner ? "Double click to edit" : ""}
              >
                {task.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
                {task.recurrence && task.recurrence !== 'none' && (
                  <span style={{ fontSize: '0.72rem', color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    {RECURRENCE_LABEL[task.recurrence]}
                  </span>
                )}
                {task.user_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px 2px 4px', borderRadius: '20px' }}>
                    <Avatar email={task.user_email} size={16} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {task.user_email.split('@')[0]}
                    </span>
                  </div>
                )}
                {task.assigned_to_email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', padding: '2px 6px 2px 4px', borderRadius: '20px' }} title={task.assigned_to_email}>
                    <Avatar email={task.assigned_to_email} size={16} />
                  </div>
                )}
                {task.team_name && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    {task.team_name}
                  </span>
                )}
                {task.tags && task.tags.map((t, i) => (
                  <span key={i} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '10px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isEditing ? (
            <>
              <button onClick={handleSave} style={{ background: 'transparent', color: '#10b981' }}><Check size={20} /></button>
              <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: 'var(--accent)' }}><X size={20} /></button>
            </>
          ) : (
            <>
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={handleDeleteClick} style={{ background: 'transparent', color: 'rgba(255,255,255,0.15)' }}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', paddingLeft: '4px' }}>
        {isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
            <input placeholder="Assigned by" value={editedTask.task_giver} onChange={e => setEditedTask({ ...editedTask, task_giver: e.target.value })} />
            <input placeholder="Assigned to (email)" value={editedTask.assigned_to_email || ''} onChange={e => setEditedTask({ ...editedTask, assigned_to_email: e.target.value })} />
            <select value={editedTask.priority} onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as any })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={editedTask.start_date || ''} onChange={e => setEditedTask({ ...editedTask, start_date: e.target.value })} />
            <input type="date" value={editedTask.deadline || ''} onChange={e => setEditedTask({ ...editedTask, deadline: e.target.value })} />
            <textarea
              style={{ gridColumn: 'span 2', height: '60px' }}
              value={editedTask.remarks || ''}
              onChange={e => setEditedTask({ ...editedTask, remarks: e.target.value })}
              placeholder="Remarks..."
              maxLength={1000}
            />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tags:</span>
              {editedTask.tags.map((t, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  #{t} <button type="button" onClick={() => removeTag(i)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)' }}><X size={10} /></button>
                </span>
              ))}
              <input 
                value={tagInput} onChange={e => setTagInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="+ Add tag (Enter)" style={{ padding: '2px 8px', fontSize: '0.75rem', width: '130px', borderRadius: '10px' }} 
              />
            </div>
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Initial Time Logged (mins):</span>
              <input type="number" value={editedTask.time_logged_minutes || 0} onChange={e => setEditedTask({ ...editedTask, time_logged_minutes: parseInt(e.target.value) || 0 })} style={{ width: '80px', padding: '4px 8px' }} />
            </div>

            {/* ── Marketing / MIS ── */}
            <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
              <select style={{ gridColumn: 'span 2' }} value={editedTask.mis_role || 'none'} onChange={e => setEditedTask({ ...editedTask, mis_role: e.target.value as MisRole })}>
                <option value="none">Not a marketing MIS task</option>
                <option value="designer">Graphic Designer task</option>
                <option value="photographer">Photographer task</option>
              </select>
              {editedTask.mis_role && editedTask.mis_role !== 'none' && (
                <>
                  <select value={editedTask.channel || ''} onChange={e => setEditedTask({ ...editedTask, channel: e.target.value })}>
                    <option value="">Channel —</option>
                    {MARKETING_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={editedTask.task_type || ''} onChange={e => setEditedTask({ ...editedTask, task_type: e.target.value })}>
                    <option value="">Task Type —</option>
                    {MARKETING_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" placeholder="No. of Products" value={editedTask.num_products ?? ''} onChange={e => setEditedTask({ ...editedTask, num_products: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" placeholder="No. of Creatives" value={editedTask.num_creatives ?? ''} onChange={e => setEditedTask({ ...editedTask, num_creatives: e.target.value === '' ? null : Number(e.target.value) })} />
                </>
              )}
              {editedTask.mis_role === 'designer' && (
                <>
                  <input type="number" placeholder="Total Designs" value={editedTask.total_designs ?? ''} onChange={e => setEditedTask({ ...editedTask, total_designs: e.target.value === '' ? null : Number(e.target.value) })} />
                  <select value={editedTask.approved_input ?? ''} onChange={e => setEditedTask({ ...editedTask, approved_input: e.target.value === '' ? null : Number(e.target.value) })}>
                    <option value="">Approved? —</option>
                    <option value="1">Approved</option>
                    <option value="0">Not yet</option>
                  </select>
                  <input type="number" placeholder="Rejected Inputs" value={editedTask.rejected_inputs ?? ''} onChange={e => setEditedTask({ ...editedTask, rejected_inputs: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" min={1} max={5} placeholder="Quality (1-5)" value={editedTask.quality_score ?? ''} onChange={e => setEditedTask({ ...editedTask, quality_score: e.target.value === '' ? null : Number(e.target.value) })} />
                  <label style={{ gridColumn: 'span 2', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Actual Delivery
                    <input type="date" value={editedTask.actual_delivery || ''} onChange={e => setEditedTask({ ...editedTask, actual_delivery: e.target.value })} />
                  </label>
                </>
              )}
              {editedTask.mis_role === 'photographer' && (
                <>
                  <input type="number" placeholder="Shoot Units" value={editedTask.shoot_units ?? ''} onChange={e => setEditedTask({ ...editedTask, shoot_units: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" placeholder="No. of Angles" value={editedTask.num_angles ?? ''} onChange={e => setEditedTask({ ...editedTask, num_angles: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" placeholder="Edit Units" value={editedTask.edit_units ?? ''} onChange={e => setEditedTask({ ...editedTask, edit_units: e.target.value === '' ? null : Number(e.target.value) })} />
                  <div />
                  <input type="number" step="0.25" placeholder="Shoot Hours" value={editedTask.shoot_hours ?? ''} onChange={e => setEditedTask({ ...editedTask, shoot_hours: e.target.value === '' ? null : Number(e.target.value) })} />
                  <input type="number" step="0.25" placeholder="Edit Hours" value={editedTask.edit_hours ?? ''} onChange={e => setEditedTask({ ...editedTask, edit_hours: e.target.value === '' ? null : Number(e.target.value) })} />
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="meta-info">
              <User size={13} />
              <span>By: {task.task_giver}</span>
            </div>
            <div className="meta-info">
              <Calendar size={13} />
              <span>{formatDate(task.start_date)} → {formatDate(task.deadline)}</span>
            </div>
            {daysRemaining !== null && (
              <div className={`meta-info ${isOverdue ? 'overdue' : isDueSoon ? 'warning' : ''}`}>
                <Clock size={13} />
                <span>
                  {daysRemaining === 0 ? 'Due Today' : isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                </span>
                {isDueSoon && !isOverdue && <span className="reminder-tag">URGENT</span>}
                {isOverdue && <span className="reminder-tag" style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e' }}>OVERDUE</span>}
              </div>
            )}
            {subtasksInfo.total > 0 && (
              <div className="meta-info" style={{ color: subtasksInfo.completed === subtasksInfo.total ? '#10b981' : 'var(--text-muted)' }}>
                <CheckSquare size={13} />
                <span>{subtasksInfo.completed} / {subtasksInfo.total} Subtasks</span>
              </div>
            )}
            {((task.time_logged_minutes ?? 0) > 0 || isAssignee) && (
              <div className="meta-info">
                <Timer size={13} />
                {(task.time_logged_minutes ?? 0) > 0 && <span>{task.time_logged_minutes}m logged</span>}
                {isAssignee && (
                  <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                    <button onClick={() => handleTimeLog(15)} title="+15m" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px' }}>+15</button>
                    <button onClick={() => handleTimeLog(60)} title="+1h" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px' }}>+1h</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Remarks */}
      {!isEditing && task.remarks && (
        <div className="task-remarks">
          <p>"{task.remarks}"</p>
        </div>
      )}

      {/* Marketing / MIS summary */}
      {!isEditing && task.mis_role && task.mis_role !== 'none' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingLeft: '4px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--primary)', background: 'rgba(99,102,241,0.12)', padding: '2px 8px', borderRadius: '10px' }}>
            {task.mis_role}
          </span>
          {task.channel && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>{task.channel}</span>}
          {task.task_type && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '10px' }}>{task.task_type}</span>}
          {task.mis_role === 'designer' && <>
            {task.num_creatives != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🎨 {task.num_creatives} creatives</span>}
            {task.total_designs != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.total_designs} designs</span>}
            {task.approved_input != null && <span style={{ fontSize: '0.72rem', color: task.approved_input >= 1 ? '#10b981' : 'var(--text-muted)' }}>{task.approved_input >= 1 ? '✓ Approved' : 'Pending approval'}</span>}
            {task.rejected_inputs != null && task.rejected_inputs > 0 && <span style={{ fontSize: '0.72rem', color: '#f43f5e' }}>{task.rejected_inputs} rejected</span>}
            {task.quality_score != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>★ {task.quality_score}/5</span>}
          </>}
          {task.mis_role === 'photographer' && <>
            {task.shoot_units != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📷 {task.shoot_units} shot</span>}
            {task.num_angles != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.num_angles} angles</span>}
            {task.edit_units != null && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.edit_units} edits</span>}
            {(task.shoot_hours != null || task.edit_hours != null) && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{((task.shoot_hours || 0) + (task.edit_hours || 0))}h</span>}
          </>}
        </div>
      )}

      {/* Assignee actions */}
      {!isEditing && (isAssignee || isOwner) && task.status !== 'completed' && (
        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={markAsCompleted}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '6px 14px', borderRadius: '10px', fontWeight: 600, border: '1px solid rgba(16,185,129,0.25)' }}
          >
            <Check size={14} /> Mark as Done
          </button>
          {!showDailyUpdate ? (
            <button
              onClick={() => setShowDailyUpdate(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '6px 12px', borderRadius: '10px', fontWeight: 600, border: '1px solid rgba(99,102,241,0.2)' }}
            >
              <MessageCircle size={14} /> Add Daily Update
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={14} color="var(--primary)" /> Post Daily Progress Update
              </span>
              <textarea 
                autoFocus
                placeholder="What did you accomplish today?"
                value={dailyUpdateText}
                onChange={e => setDailyUpdateText(e.target.value)}
                style={{ height: '60px', width: '100%', fontSize: '0.85rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button onClick={() => setShowDailyUpdate(false)} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '6px 12px' }}>Cancel</button>
                <button 
                  onClick={submitDailyUpdate} 
                  disabled={submittingUpdate || !dailyUpdateText.trim()}
                  className="primary-gradient action-btn" 
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  {submittingUpdate ? <Loader2 size={14} className="animate-spin" /> : 'Post Update'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel toggle bar */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--glass-border)' }}>
          {panelBtn(<MessageCircle size={12} />, 'comments', 'Comments')}
          {panelBtn(<CheckSquare size={12} />, 'subtasks', 'Checklist')}
          {panelBtn(<Paperclip size={12} />, 'attachments', 'Files')}
          {panelBtn(<History size={12} />, 'activity', 'Activity')}
        </div>
      )}

      {/* Active panel */}
      {!isEditing && activePanel === 'comments' && (
        <TaskComments
          taskId={task.id}
          currentUserEmail={currentUserEmail}
          currentUserName={currentUserName}
          taskTitle={task.title}
        />
      )}
      {!isEditing && activePanel === 'subtasks' && (
        <SubTaskList taskId={task.id} currentUserEmail={currentUserEmail} />
      )}
      {!isEditing && activePanel === 'attachments' && (
        <FileAttachments taskId={task.id} currentUserEmail={currentUserEmail} />
      )}
{!isEditing && activePanel === 'activity' && (
        <ActivityLogPanel taskId={task.id} />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"?`}
          confirmText="Delete"
          onConfirm={performDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </motion.div>
  )
}

