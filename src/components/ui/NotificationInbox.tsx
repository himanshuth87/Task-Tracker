import { useState, useEffect } from 'react'
import { Bell, CheckCheck, Trash2, Briefcase, MessageCircle, AtSign, Info } from 'lucide-react'
import { type AppNotification } from '../../supabase'
import { notificationService } from '../../services/notificationService'
import { timeAgo } from '../../utils/dateUtils'

interface NotificationInboxProps {
  userEmail: string
  onUnreadChange: (count: number) => void
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  task: <Briefcase size={14} color="#6366f1" />,
  comment: <MessageCircle size={14} color="#a855f7" />,
  mention: <AtSign size={14} color="#3b82f6" />,
  info: <Info size={14} color="#94a3b8" />,
}


export function NotificationInbox({ userEmail, onUnreadChange }: NotificationInboxProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await notificationService.fetchNotifications(userEmail)
    setNotifications(data)
    onUnreadChange(data.filter(n => !n.read).length)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = notificationService.subscribeToNotifications(userEmail, load)
    return () => { channel.unsubscribe() }
  }, [userEmail])

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await notificationService.markRead(id)
    onUnreadChange(notifications.filter(n => !n.read && n.id !== id).length)
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    onUnreadChange(0)
    await notificationService.markAllRead(userEmail)
  }

  const remove = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await notificationService.deleteNotification(id)
    onUnreadChange(notifications.filter(n => !n.read && n.id !== id).length)
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ padding: '16px 20px', minWidth: '320px', maxHeight: '480px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="var(--primary)" />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Notifications</h4>
          {unreadCount > 0 && (
            <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', borderRadius: '10px' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px' }}>Loading...</p>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 20px' }}>
            <Bell size={28} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 10px' }} />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>All caught up!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '10px 12px', borderRadius: '12px',
                background: n.read ? 'transparent' : 'rgba(99,102,241,0.08)',
                border: n.read ? '1px solid transparent' : '1px solid rgba(99,102,241,0.15)',
                cursor: n.read ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{TYPE_ICON[n.type] || TYPE_ICON.info}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: n.read ? 400 : 600, color: 'var(--text-main)', marginBottom: '2px' }}>{n.title}</p>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{n.message}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.5, marginTop: '4px' }}>{timeAgo(n.created_at)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(n.id) }}
                style={{ background: 'transparent', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, marginTop: '2px' }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
