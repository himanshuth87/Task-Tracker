import { useState, useEffect } from 'react'
import { Send, Trash2, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import { type TaskComment } from '../../supabase'
import { commentService } from '../../services/commentService'
import { notificationService } from '../../services/notificationService'
import { activityService } from '../../services/activityService'

interface TaskCommentsProps {
  taskId: string
  currentUserEmail: string
  currentUserName: string
  taskTitle?: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function renderContent(content: string) {
  const parts = content.split(/(@\S+@\S+\.\S+|@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <strong key={i} style={{ color: '#6366f1', fontWeight: 600 }}>{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function extractMentions(text: string): string[] {
  const emailRe = /@(\S+@\S+\.\S+)/g
  const matches = []
  let m
  while ((m = emailRe.exec(text)) !== null) matches.push(m[1])
  return [...new Set(matches)]
}

export function TaskComments({ taskId, currentUserEmail, currentUserName, taskTitle }: TaskCommentsProps) {
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
    const text = draft.trim().slice(0, 2000)
    if (!text) return
    setSubmitting(true)

    const { error } = await commentService.addComment(taskId, currentUserEmail, currentUserName, text)
    if (error) {
      toast.error('Failed to post comment')
    } else {
      setDraft('')
      await load()

      activityService.log(taskId, currentUserEmail, currentUserName, 'commented').catch(console.error)

      const mentions = extractMentions(text)
      mentions
        .filter(email => email !== currentUserEmail)
        .forEach(email => {
          notificationService.createNotification(
            email,
            `${currentUserName} mentioned you`,
            `In task "${taskTitle || 'a task'}": ${text.slice(0, 120)}`,
            'mention',
            taskId
          ).catch(console.error)
        })
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
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)', marginBottom: '12px' }}>
              No comments yet. Use @email to mention someone.
            </p>
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
                <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '10px', padding: '8px 12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>{c.user_name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                      {c.user_email === currentUserEmail && (
                        <button onClick={() => remove(c.id)} style={{ background: 'transparent', color: 'var(--text-muted)', padding: '0' }}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, opacity: 0.85 }}>
                    {renderContent(c.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            placeholder="Add a comment... @email to mention (Enter to send)"
            rows={2}
            maxLength={2000}
            style={{
              width: '100%', borderRadius: '10px', padding: '8px 36px 8px 12px',
              fontFamily: 'inherit', fontSize: '0.85rem', resize: 'none',
            }}
          />
          <AtSign size={14} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: '10px', bottom: '12px', pointerEvents: 'none' }} />
        </div>
        <button
          onClick={submit}
          disabled={submitting || !draft.trim()}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', borderRadius: '10px', padding: '10px 14px',
            opacity: !draft.trim() ? 0.4 : 1, transition: 'opacity 0.2s',
          }}
        >
          <Send size={15} />
        </button>
      </div>
      {draft.length > 1800 && (
        <p style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '4px' }}>{2000 - draft.length} characters remaining</p>
      )}
    </div>
  )
}
