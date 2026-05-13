import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { type ActivityLog } from '../../supabase'
import { activityService } from '../../services/activityService'

interface ActivityLogPanelProps {
  taskId: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const ACTION_COLOR: Record<string, string> = {
  created: '#10b981',
  status_changed: '#3b82f6',
  commented: '#a855f7',
  updated: '#f59e0b',
  deleted: '#f43f5e',
  attached: '#6366f1',
  subtask_added: '#10b981',
  subtask_completed: '#10b981',
  dependency_added: '#3b82f6',
}

export function ActivityLogPanel({ taskId }: ActivityLogPanelProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    activityService.fetchActivity(taskId).then(({ data }) => {
      setLogs(data)
      setLoading(false)
    })
  }, [taskId])

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
        <History size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Activity
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : logs.length === 0 ? (
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)' }}>No activity yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
          {logs.map(log => {
            const color = ACTION_COLOR[log.action] || 'var(--text-muted)'
            return (
              <div key={log.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)' }}>
                    <strong style={{ color: 'white' }}>{log.user_name}</strong>{' '}
                    <span style={{ color }}>{log.action.replace(/_/g, ' ')}</span>
                    {log.details?.note && <span style={{ color: 'var(--text-muted)' }}> — {log.details.note}</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{timeAgo(log.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
