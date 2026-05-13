import { useState, useEffect } from 'react'
import { Plus, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { type SubTask } from '../../supabase'
import { subtaskService } from '../../services/subtaskService'

interface SubTaskListProps {
  taskId: string
  currentUserEmail: string
}

export function SubTaskList({ taskId, currentUserEmail }: SubTaskListProps) {
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await subtaskService.fetchSubtasks(taskId)
    setSubtasks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId])

  const addSubtask = async () => {
    const t = newTitle.trim()
    if (!t) return
    setAdding(true)
    const { data, error } = await subtaskService.addSubtask(taskId, t, currentUserEmail)
    if (error) {
      toast.error('Failed to add subtask')
    } else if (data) {
      setSubtasks(prev => [...prev, data])
      setNewTitle('')
      setShowInput(false)
    }
    setAdding(false)
  }

  const toggle = async (id: string, completed: boolean) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed } : s))
    await subtaskService.toggleSubtask(id, completed)
  }

  const remove = async (id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id))
    await subtaskService.deleteSubtask(id)
  }

  const done = subtasks.filter(s => s.completed).length
  const pct = subtasks.length > 0 ? Math.round((done / subtasks.length) * 100) : 0

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Checklist
          </span>
          {subtasks.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: pct === 100 ? '#10b981' : 'var(--text-muted)' }}>
              {done}/{subtasks.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowInput(v => !v)}
          style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={13} /> Add
        </button>
      </div>

      {subtasks.length > 0 && (
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : 'var(--primary)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
      )}

      {loading ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {subtasks.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
              <button
                onClick={() => toggle(s.id, !s.completed)}
                style={{
                  width: '18px', height: '18px', flexShrink: 0, borderRadius: '5px',
                  background: s.completed ? '#10b981' : 'transparent',
                  border: s.completed ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {s.completed && <Check size={11} color="white" />}
              </button>
              <span style={{ flex: 1, fontSize: '0.85rem', color: s.completed ? 'var(--text-muted)' : 'rgba(255,255,255,0.85)', textDecoration: s.completed ? 'line-through' : 'none' }}>
                {s.title}
              </span>
              <button onClick={() => remove(s.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.15)', opacity: 0.6, padding: '2px' }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showInput && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') { setShowInput(false); setNewTitle('') } }}
            placeholder="Subtask title... (Enter to add)"
            maxLength={500}
            style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px', borderRadius: '10px' }}
          />
          <button
            onClick={addSubtask}
            disabled={adding || !newTitle.trim()}
            style={{ background: 'var(--primary)', color: 'white', borderRadius: '10px', padding: '8px 14px', opacity: !newTitle.trim() ? 0.5 : 1 }}
          >
            <Plus size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
