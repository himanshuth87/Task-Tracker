import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Clock, User, Calendar, Trash2, Filter, BarChart3, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import './App.css'
import { supabase, type Task } from './supabase'

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length
  }

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 700 }}>TaskTracker</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your workflow with precision</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="primary-gradient"
          style={{ 
            padding: '12px 24px', 
            borderRadius: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: 600,
            color: 'white',
            boxShadow: '0 10px 20px -5px var(--primary-glow)'
          }}
        >
          <Plus size={20} />
          {showForm ? 'Close' : 'New Task'}
        </button>
      </header>

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

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={18} color="var(--primary)" />
              Filters
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')} label="All Tasks" />
              <FilterBtn active={filter === 'pending'} onClick={() => setFilter('pending')} label="Active" />
              <FilterBtn active={filter === 'completed'} onClick={() => setFilter('completed')} label="Completed" />
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
                <TaskForm onTaskAdded={fetchTasks} />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading tasks...</p>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map(task => (
                <TaskItem key={task.id} task={task} onUpdate={fetchTasks} />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>No tasks found in this category.</p>
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
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function FilterBtn({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '10px 16px',
        borderRadius: '10px',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {label}
      {active && <ChevronRight size={16} />}
    </button>
  )
}

function TaskForm({ onTaskAdded }: { onTaskAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [giver, setGiver] = useState('')
  const [deadline, setDeadline] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('tasks').insert([{
      title,
      task_giver: giver,
      deadline,
      priority,
      status: 'pending',
      user_id: 'temp-user-id' // In a real app, this would be from Auth
    }])

    if (error) {
      alert('Error adding task: ' + error.message)
    } else {
      setTitle('')
      setGiver('')
      setDeadline('')
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
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Task Giver</label>
          <input 
            required 
            value={giver} 
            onChange={e => setGiver(e.target.value)} 
            placeholder="Who assigned this?" 
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
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ width: '100%' }}>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
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

function TaskItem({ task, onUpdate }: { task: Task, onUpdate: () => void }) {
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

  const getDaysRemaining = () => {
    if (!task.deadline) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDate = new Date(task.deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysRemaining = getDaysRemaining()

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card" 
      style={{ 
        padding: '20px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        opacity: task.status === 'completed' ? 0.7 : 1
      }}
    >
      <button onClick={toggleStatus} style={{ background: 'transparent', color: task.status === 'completed' ? '#10b981' : 'var(--text-muted)' }}>
        {task.status === 'completed' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      <div style={{ flex: 1 }}>
        <h4 style={{ 
          fontSize: '1.1rem', 
          fontWeight: 600, 
          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          marginBottom: '6px'
        }}>
          {task.title}
        </h4>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <User size={14} /> {task.task_giver}
          </small>
          <small style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <Calendar size={14} /> {task.deadline}
          </small>
          {daysRemaining !== null && (
            <small style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              color: daysRemaining < 0 ? 'var(--accent)' : daysRemaining <= 2 ? '#f59e0b' : 'var(--text-muted)',
              fontWeight: daysRemaining <= 2 ? 600 : 400
            }}>
              <Clock size={14} /> 
              {daysRemaining === 0 ? 'Due Today' : daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
            </small>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '0.75rem', 
          fontWeight: 600,
          background: task.priority === 'high' ? 'rgba(244, 63, 94, 0.1)' : task.priority === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          color: task.priority === 'high' ? 'var(--accent)' : task.priority === 'medium' ? '#f59e0b' : '#10b981',
          textTransform: 'uppercase'
        }}>
          {task.priority}
        </span>
        <button onClick={deleteTask} style={{ background: 'transparent', color: 'rgba(255, 255, 255, 0.15)' }}>
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  )
}

export default App
