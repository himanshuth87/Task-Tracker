import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trash2, X, ChevronDown } from 'lucide-react'
import { type TaskStatus } from '../../supabase'
import { taskService } from '../../services/taskService'
import { toast } from 'sonner'
import { useState } from 'react'

interface BulkActionBarProps {
  selectedIds: string[]
  onClear: () => void
  onUpdate: () => void
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: '#94a3b8' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'blocked', label: 'Blocked', color: '#f43f5e' },
  { value: 'completed', label: 'Done', color: '#10b981' },
]

export function BulkActionBar({ selectedIds, onClear, onUpdate }: BulkActionBarProps) {
  const [showStatuses, setShowStatuses] = useState(false)
  const [loading, setLoading] = useState(false)

  const applyStatus = async (status: TaskStatus) => {
    setLoading(true)
    setShowStatuses(false)
    const results = await Promise.all(selectedIds.map(id => taskService.updateTask(id, { status })))
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      toast.error(`Failed to update ${errors.length} task(s)`)
    } else {
      toast.success(`${selectedIds.length} task(s) → ${status.replace('_', ' ')}`)
    }
    onUpdate()
    onClear()
    setLoading(false)
  }

  const deleteAll = async () => {
    if (!confirm(`Delete ${selectedIds.length} task(s)? This cannot be undone.`)) return
    setLoading(true)
    await Promise.all(selectedIds.map(id => taskService.deleteTask(id)))
    toast.success(`${selectedIds.length} task(s) deleted`)
    onUpdate()
    onClear()
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(15,15,22,0.97)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '20px', padding: '12px 20px', zIndex: 100,
            display: 'flex', alignItems: 'center', gap: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
            {selectedIds.length} selected
          </span>

          <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatuses(v => !v)}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', color: 'white', borderRadius: '10px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <Check size={14} /> Set Status <ChevronDown size={13} />
            </button>
            <AnimatePresence>
              {showStatuses && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', background: 'rgba(15,15,22,0.98)', border: '1px solid var(--glass-border)', borderRadius: '14px', overflow: 'hidden', minWidth: '160px' }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => applyStatus(opt.value)}
                      style={{ width: '100%', padding: '10px 16px', background: 'transparent', color: opt.color, fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={deleteAll}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '10px', padding: '7px 14px', fontSize: '0.82rem', fontWeight: 600 }}
          >
            <Trash2 size={14} /> Delete
          </button>

          <button
            onClick={onClear}
            style={{ background: 'transparent', color: 'var(--text-muted)', padding: '6px' }}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
