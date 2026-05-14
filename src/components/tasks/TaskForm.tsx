import { useState } from 'react'
import { toast } from 'sonner'
import { taskService } from '../../services/taskService'

interface TaskFormProps {
  onTaskAdded: () => void;
  userId: string;
  userEmail?: string;
  fullName?: string;
  teamName?: string;
}

export function TaskForm({ onTaskAdded, userId, userEmail, fullName, teamName }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [giver, setGiver] = useState(fullName || '')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [remarks, setRemarks] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await taskService.addTask({
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
    })

    if (error) {
      toast.error('Error adding task: ' + error.message)
    } else {
      toast.success('Task created successfully!')
      setTitle('')
      setGiver(fullName || '')
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
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Task Title
          </label>
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Assigned By
          </label>
          <input
            required
            value={giver}
            onChange={e => setGiver(e.target.value)}
            placeholder="Your name"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Assign To (Email)
          </label>
          <input
            type="email"
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
            placeholder="colleague@company.com"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Priority
          </label>
          <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ width: '100%' }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Deadline
          </label>
          <input
            required
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Remarks
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Any extra context or instructions for your colleague..."
            style={{ width: '100%', height: '88px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'white', resize: 'vertical' }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <button
            type="submit"
            disabled={loading}
            className="primary-gradient"
            style={{ width: '100%', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600, fontSize: '1rem', letterSpacing: '0.03em' }}
          >
            {loading ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>

      </div>
    </form>
  )
}
