import { useState } from 'react'
import { CheckCircle2, Circle, Calendar, Mail, Edit2, Trash2, Check, X, User, Clock, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { type Task } from '../../supabase'
import { taskService } from '../../services/taskService'
import { formatDate, getDaysRemaining } from '../../utils/dateUtils'

interface TaskItemProps {
  task: Task;
  onUpdate: () => void;
  onAddToCalendar: () => void;
  currentUserId: string;
}

export function TaskItem({ task, onUpdate, onAddToCalendar, currentUserId }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState({ ...task })

  const toggleStatus = async () => {
    const { error } = await taskService.updateTaskStatus(task.id, task.status)
    if (!error) {
      toast.success(`Task marked as ${task.status === 'completed' ? 'pending' : 'completed'}`)
      onUpdate()
    }
  }

  const deleteTask = async () => {
    if (!confirm('Are you sure?')) return
    const { error } = await taskService.deleteTask(task.id)
    if (!error) {
      toast.success('Task deleted')
      onUpdate()
    } else {
      toast.error('Failed to delete task')
    }
  }

  const handleSave = async () => {
    let finalOutlookLink = editedTask.outlook_link
    // Auto-fix modern Outlook links to Classic OWA if detected
    if (finalOutlookLink?.includes('outlook.office.com')) {
      finalOutlookLink = finalOutlookLink.replace('outlook.office.com', 'outlook.office365.com/owa')
    }

    const { error } = await taskService.updateTask(task.id, {
      title: editedTask.title,
      task_giver: editedTask.task_giver,
      start_date: editedTask.start_date,
      deadline: editedTask.deadline,
      priority: editedTask.priority,
      remarks: editedTask.remarks,
      outlook_link: finalOutlookLink
    })
    
    if (!error) {
      toast.success('Task updated')
      setIsEditing(false)
      onUpdate()
    } else {
      toast.error('Update failed')
    }
  }

  const sendNotificationMail = () => {
    const subject = encodeURIComponent(`New Task Assigned: ${task.title}`)
    const body = encodeURIComponent(`Hello,\n\nA new task has been assigned to you.\n\nTask: ${task.title}\nAssigned By: ${task.task_giver}\nDeadline: ${formatDate(task.deadline)}\n\nRemarks: ${task.remarks || 'None'}\n\nView Task Tracker: ${window.location.origin}`)
    
    // Using a more standard mailto format that Classic Outlook handles better
    window.location.href = `mailto:${task.assigned_to_email || ''}?subject=${subject}&body=${body}`
  }

  const daysRemaining = getDaysRemaining(task.deadline)
  const isDueSoon = task.status !== 'completed' && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2
  const isOwner = task.user_id === currentUserId

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
        gap: '16px',
        opacity: task.status === 'completed' ? 0.7 : 1,
        border: isDueSoon ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid var(--glass-border)',
        boxShadow: isDueSoon ? '0 0 20px rgba(245, 158, 11, 0.1)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={toggleStatus} style={{ background: 'transparent', color: task.status === 'completed' ? '#10b981' : 'var(--text-muted)' }}>
          {task.status === 'completed' ? <CheckCircle2 size={26} /> : <Circle size={26} />}
        </button>

        <div style={{ flex: 1 }}>
          {isEditing ? (
            <input 
              style={{ width: '100%', fontSize: '1.2rem', fontWeight: 600, background: 'rgba(255,255,255,0.1)' }}
              value={editedTask.title}
              onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
            />
          ) : (
            <div>
              <h4 style={{ 
                fontSize: '1.2rem', 
                fontWeight: 600, 
                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
              }}>
                {task.title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span className={`priority-badge ${task.priority}`}>
                  {task.priority}
                </span>
                {task.user_email && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                    Owner: @{task.user_email.split('@')[0]}
                  </span>
                )}
                {task.assigned_to_email && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    Assigned: @{task.assigned_to_email.split('@')[0]}
                  </span>
                )}
                {task.team_name && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    {task.team_name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isEditing ? (
            <>
              <button onClick={handleSave} style={{ background: 'transparent', color: '#10b981' }}><Check size={20} /></button>
              <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: 'var(--accent)' }}><X size={20} /></button>
            </>
          ) : (
            <>
              {task.outlook_link && (
                <button 
                  onClick={() => window.open(task.outlook_link!, '_blank')} 
                  title="View in Outlook" 
                  style={{ background: 'transparent', color: '#0078d4', opacity: 0.9 }}
                >
                  <ExternalLink size={20} />
                </button>
              )}
              <button onClick={onAddToCalendar} title="Add to Calendar" style={{ background: 'transparent', color: 'var(--primary)', opacity: 0.8 }}>
                <Calendar size={20} />
              </button>
              <button 
                onClick={sendNotificationMail} 
                title="Send Notification Email" 
                style={{ background: 'transparent', color: 'var(--text-muted)', opacity: 0.6 }}
              >
                <Mail size={20} />
              </button>
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', color: 'rgba(255, 255, 255, 0.4)' }}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={deleteTask} style={{ background: 'transparent', color: 'rgba(255, 255, 255, 0.15)' }}>
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', paddingLeft: '46px' }}>
        {isEditing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
            <input placeholder="Giver" value={editedTask.task_giver} onChange={e => setEditedTask({ ...editedTask, task_giver: e.target.value })} />
            <select value={editedTask.priority} onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as any })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={editedTask.start_date || ''} onChange={e => setEditedTask({ ...editedTask, start_date: e.target.value })} />
            <input type="date" value={editedTask.deadline || ''} onChange={e => setEditedTask({ ...editedTask, deadline: e.target.value })} />
            <input 
              style={{ gridColumn: 'span 2' }}
              placeholder="Paste Outlook Link" 
              value={editedTask.outlook_link || ''} 
              onChange={e => setEditedTask({ ...editedTask, outlook_link: e.target.value })} 
            />
            <textarea 
              style={{ gridColumn: 'span 2', height: '60px' }}
              value={editedTask.remarks || ''}
              onChange={e => setEditedTask({ ...editedTask, remarks: e.target.value })}
            />
          </div>
        ) : (
          <>
            <div className="meta-info">
              <User size={14} /> 
              <span>By: {task.task_giver}</span>
            </div>
            <div className="meta-info">
              <Calendar size={14} /> 
              <span>{formatDate(task.start_date)} → {formatDate(task.deadline)}</span>
            </div>
            {daysRemaining !== null && (
              <div className={`meta-info ${daysRemaining < 0 ? 'overdue' : daysRemaining <= 2 ? 'warning' : ''}`}>
                <Clock size={14} /> 
                <span>
                  {daysRemaining === 0 ? 'Due Today' : daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                </span>
                {isDueSoon && <span className="reminder-tag">URGENT</span>}
              </div>
            )}
          </>
        )}
      </div>

      {!isEditing && task.remarks && (
        <div className="task-remarks">
          <p>"{task.remarks}"</p>
        </div>
      )}
    </motion.div>
  )
}
