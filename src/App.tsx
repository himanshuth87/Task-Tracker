import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Clock, User, Calendar, Trash2, Filter, BarChart3, ChevronRight, Edit2, X, Check, LogOut, Bell, Download, Users, Briefcase, Zap, Mail, UserCheck } from 'lucide-react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { supabase, type Task } from './supabase'
import { Auth } from './Auth'
import type { Session } from '@supabase/supabase-js'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'assigned_to_me'>('all')
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal')
  const [isLive, setIsLive] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, (payload) => {
        // Show in-app alert if new task is assigned to current user
        if (payload.eventType === 'INSERT' && payload.new.assigned_to_email === session.user.email) {
          setUnreadCount(prev => prev + 1)
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("New Task Assigned!", {
              body: `Task: ${payload.new.title}\nAssigned by: ${payload.new.task_giver}`,
              icon: '/vite.svg'
            });
          }
        }
        fetchTasks()
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, viewMode])

  useEffect(() => {
    if (session) {
      fetchTasks()
    }
  }, [session, viewMode, filter])

  async function fetchTasks() {
    if (!session) return
    setLoading(true)
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (viewMode === 'personal') {
      if (filter === 'assigned_to_me') {
        query = query.eq('assigned_to_email', session.user.email)
      } else {
        query = query.eq('user_id', session.user.id)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

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

  function getDaysRemaining(deadline: string | null) {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const downloadExcel = () => {
    const dataToExport = tasks.map(t => ({
      'Task Title': t.title,
      'Status': t.status,
      'Priority': t.priority,
      'Assigned By': t.task_giver,
      'Task Owner': t.user_email?.split('@')[0] || 'Unknown',
      'Assigned To': (t as any).assigned_to_email || 'Unassigned',
      'Team': (t as any).team_name || 'General',
      'Start Date': t.start_date || 'N/A',
      'Deadline': t.deadline || 'N/A',
      'Pending Days': getDaysRemaining(t.deadline) ?? 'N/A',
      'Remarks': t.remarks || ''
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Team Tasks')
    XLSX.writeFile(wb, `Team_Task_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const addToOutlook = (task: Task) => {
    const start = task.start_date ? task.start_date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')
    const end = task.deadline ? task.deadline.replace(/-/g, '') : start
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const uid = `task-${task.id}@hscvpl.com`
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HSCVPL//TaskTracker//EN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `SUMMARY:${task.title}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `DESCRIPTION:${task.remarks || ''}\n\nTask Giver: ${task.task_giver}`,
      'STATUS:CONFIRMED',
      'PRIORITY:3',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n')

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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
            onClick={downloadExcel}
            className="glass-card action-btn"
            title="Export to Excel"
          >
            <Download size={20} />
            <span>Export</span>
          </button>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="primary-gradient action-btn main-action"
          >
            <Plus size={20} />
            {showForm ? 'Close' : 'New Task'}
          </button>
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
              <Filter size={18} color="var(--primary)" />
              Filters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All Status" />
              <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="Active Only" />
              <FilterBtn active={filter === 'completed'} onClick={() => setFilter('completed')} label="Completed Only" />
            </div>
          </div>
        </aside>

        <main>
          <AnimatePresence mode="wait">
            {showForm && (
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
                  teamName={session.user.user_metadata.team_name} 
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div className="loader"></div>
                <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Syncing team tasks...</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskItem key={task.id} task={task} onUpdate={fetchTasks} onAddToCalendar={() => addToOutlook(task)} currentUserId={session.user.id} />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No tasks found in this category.</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>Create a new task to get started!</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function StatItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: '1.1rem' }}>{value}</span>
    </div>
  )
}

function FilterBtn({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        borderRadius: '12px',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: active ? 600 : 400
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        {label}
      </div>
      {active && <ChevronRight size={16} />}
    </button>
  )
}

function TaskForm({ onTaskAdded, userId, userEmail, teamName }: { onTaskAdded: () => void, userId: string, userEmail?: string, teamName?: string }) {
  const [title, setTitle] = useState('')
  const [giver, setGiver] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [remarks, setRemarks] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('tasks').insert([{
      title,
      task_giver: giver,
      assigned_to_email: assignedTo || userEmail,
      start_date: startDate,
      deadline,
      remarks,
      priority,
      status: 'pending',
      user_id: userId,
      user_email: userEmail,
      team_name: teamName || 'General'
    }])

    if (error) {
      alert('Error adding task: ' + error.message)
    } else {
      setTitle('')
      setGiver('')
      setAssignedTo('')
      setStartDate('')
      setDeadline('')
      setRemarks('')
      onTaskAdded()
    }
    setLoading(false)
  }

  return (
    <form className="glass-card" style={{ padding: '32px' }} onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Task Title</label>
          <input 
            required 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="What needs to be done?" 
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Assigned By</label>
          <input 
            required 
            value={giver} 
            onChange={e => setGiver(e.target.value)} 
            placeholder="Who assigned this?" 
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Assign To (Email)</label>
          <input 
            value={assignedTo} 
            onChange={e => setAssignedTo(e.target.value)} 
            placeholder="Team member email" 
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ width: '100%' }}>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Deadline</label>
          <input 
            required 
            type="date" 
            value={deadline} 
            onChange={e => setDeadline(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Remarks</label>
          <textarea 
            value={remarks} 
            onChange={e => setRemarks(e.target.value)} 
            placeholder="Add any extra notes..." 
            style={{ width: '100%', height: '80px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'white' }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <button 
            type="submit" 
            disabled={loading}
            className="primary-gradient" 
            style={{ width: '100%', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600 }}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </form>
  )
}

function TaskItem({ task, onUpdate, onAddToCalendar, currentUserId }: { task: Task, onUpdate: () => void, onAddToCalendar: () => void, currentUserId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState({ ...task })

  const toggleStatus = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: task.status === 'completed' ? 'pending' : 'completed' })
      .eq('id', task.id)
    
    if (!error) onUpdate()
  }

  const deleteTask = async () => {
    if (!confirm('Are you sure?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (!error) onUpdate()
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: editedTask.title,
        task_giver: editedTask.task_giver,
        start_date: editedTask.start_date,
        deadline: editedTask.deadline,
        priority: editedTask.priority,
        remarks: editedTask.remarks
      })
      .eq('id', task.id)
    
    if (!error) {
      setIsEditing(false)
      onUpdate()
    }
  }

  const daysRemaining = getDaysRemaining(task.deadline)
  const isDueSoon = task.status !== 'completed' && daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 2
  const isOwner = task.user_id === currentUserId

  function getDaysRemaining(deadline: string | null) {
    if (!deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

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
                {(task as any).assigned_to_email && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    Assigned: @{(task as any).assigned_to_email.split('@')[0]}
                  </span>
                )}
                {(task as any).team_name && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                    {(task as any).team_name}
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
              <button onClick={onAddToCalendar} title="Add to Calendar" style={{ background: 'transparent', color: 'var(--primary)', opacity: 0.8 }}>
                <Calendar size={20} />
              </button>
              <button onClick={() => window.open(`mailto:${(task as any).assigned_to_email || ''}?subject=Task Update: ${task.title}&body=Update for task: ${task.title}%0D%0AStatus: ${task.status}%0D%0ADeadline: ${task.deadline}`)} title="Contact Assignee" style={{ background: 'transparent', color: 'var(--text-muted)', opacity: 0.6 }}>
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
              <span>{task.start_date || 'N/A'} → {task.deadline || 'N/A'}</span>
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

export default App
