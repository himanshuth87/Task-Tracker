import { useState, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { type TaskComment } from '../../supabase'
import { commentService } from '../../services/commentService'

interface TaskCommentsProps {
  taskId: string
  currentUserEmail: string
  currentUserName: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function TaskComments({ taskId, currentUserEmail, currentUserName }: TaskCommentsProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await commentService.fetchComments(taskId)
    setComments(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId])

  const submit = async () => {
    const text = draft.trim()
    if (!text) return
    setSubmitting(true)
    const { error } = await commentService.addComment(taskId, currentUserEmail, currentUserName, text)
    if (error) {
      toast.error('Failed to post comment')
    } else {
      setDraft('')
      await load()
    }
    setSubmitting(false)
  }

  const remove = async (id: string) => {
    const { error } = await commentService.deleteComment(id)
    if (!error) setComments(c => c.filter(x => x.id !== id))
    else toast.error('Failed to delete comment')
  }

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '8px' }}>
      {loading ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading comments...</p>
      ) : (
        <>
          {comments.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>No comments yet. Be the first to add an update.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, color: 'white'
                }}>
                  {c.user_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>{c.user_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                      {c.user_email === currentUserEmail && (
                        <button onClick={() => remove(c.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '0' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Add an update or note... (Enter to send)"
          rows={2}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
            borderRadius: '10px', padding: '8px 12px', color: 'white',
            fontFamily: 'inherit', fontSize: '0.85rem', resize: 'none'
          }}
        />
        <button
          onClick={submit}
          disabled={submitting || !draft.trim()}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', borderRadius: '10px', padding: '10px 14px',
            opacity: !draft.trim() ? 0.4 : 1, transition: 'opacity 0.2s'
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
