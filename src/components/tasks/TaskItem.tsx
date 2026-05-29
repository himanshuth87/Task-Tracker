import { useState, useEffect } from 'react'
import { Calendar, Mail, Edit2, Trash2, Check, X, User, Clock, MessageCircle, ChevronDown, ChevronUp, AlertCircle, Loader2, CheckSquare, Paperclip, Link2, History, Square, Timer, Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { type Task, type TaskStatus, supabase } from '../../supabase'
import { taskService } from '../../services/taskService'
import { commentService } from '../../services/commentService'
import { TaskComments } from './TaskComments'
import { SubTaskList } from './SubTaskList'
import { FileAttachments } from './FileAttachments'
import { TaskDependencies } from './TaskDependencies'
import { ActivityLogPanel } from './ActivityLogPanel'
import { formatDate, getDaysRemaining } from '../../utils/dateUtils'
import { Avatar } from '../ui/Avatar'
import { ConfirmModal } from '../ui/ConfirmModal'

interface TaskItemProps {
  task: Task
  onUpdate: () => void
  onAddToCalendar: () => void
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

export function TaskItem({ task, onUpdate, onAddToCalendar, currentUserId, currentUserEmail, currentUserName, isSelected, onToggleSelect, bulkMode }: TaskItemProps) {
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
    if (!error) {
      if (nextStatus === 'completed' && task.recurrence && task.recurrence !== 'none') {
        toast.success(`Task completed! Next ${task.recurrence} occurrence created.`)
      } else {
        toast.success(`Status → ${STATUS_CONFIG[nextStatus as TaskStatus]?.label}`)
      }
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
    }, currentUserEmail, currentUserName)
    if (!error) {
      toast.success('Task updated')
      setIsEditing(false)
      onUpdate()
    } else {
      toast.error('Update failed')
    }
  }

  const sendNotificationMail = () => {
    const subject = encodeURIComponent(`Task Update: ${task.title}`)
    const body = encodeURIComponent(`Hello,\n\nHere's an update on the task assigned to you.\n\nTask: ${task.title}\nAssigned By: ${task.task_giver}\nDeadline: ${formatDate(task.deadline)}\n\nRemarks: ${task.remarks || 'None'}\n\nView Task Tracker: ${window.location.origin}`)
    window.location.href = `mailto:${task.assigned_to_email || ''}?subject=${subject}&body=${body}`
  }

  const daysRemaining = getDaysRemaining(task.deadline)
  const isDueSoon = task.status !== 'completed' && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2
  const isOverdue = task.status !== 'completed' && daysRemaining !== null && daysRemaining < 0
  const isOwner = task.user_id === currentUserId
  const isAssignee = task.assigned_to_email === currentUserEmail
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', padding: '2px 8px 2px 4px', borderRadius: '20px' }}>
                    <Avatar email={task.assigned_to_email} size={16} />
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                      {task.assigned_to_email.split('@')[0]}
                    </span>
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
              <button onClick={onAddToCalendar} title="Add to Calendar" style={{ background: 'transparent', color: 'var(--primary)', opacity: 0.8 }}>
                <Calendar size={18} />
              </button>
              <button onClick={sendNotificationMail} title="Email Assignee" style={{ background: 'transparent', color: 'var(--text-muted)', opacity: 0.6 }}>
                <Mail size={18} />
              </button>
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
            <div className="meta-info">
              <Timer size={13} />
              <span>{task.time_logged_minutes || 0}m logged</span>
              {isAssignee && (
                <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                  <button onClick={() => handleTimeLog(15)} title="+15m" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px' }}>+15</button>
                  <button onClick={() => handleTimeLog(60)} title="+1h" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px' }}>+1h</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Remarks */}
      {!isEditing && task.remarks && (
        <div className="task-remarks">
          <p>"{task.remarks}"</p>
        </div>
      )}

      {/* Daily Update Prompt for Assignee */}
      {!isEditing && isAssignee && task.status !== 'completed' && (
        <div style={{ marginTop: '4px' }}>
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
          {panelBtn(<Link2 size={12} />, 'dependencies', 'Deps')}
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
      {!isEditing && activePanel === 'dependencies' && (
        <TaskDependencies taskId={task.id} teamName={task.team_name || 'General'} />
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

