import { supabase, type AppNotification } from '../supabase'

export const notificationService = {
  async fetchNotifications(userEmail: string): Promise<{ data: AppNotification[]; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(50)
    return { data: (data as AppNotification[]) || [], error }
  },

  async markRead(notificationId: string) {
    return await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
  },

  async markAllRead(userEmail: string) {
    return await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_email', userEmail)
      .eq('read', false)
  },

  async deleteNotification(notificationId: string) {
    return await supabase.from('notifications').delete().eq('id', notificationId)
  },

  async createNotification(
    userEmail: string,
    title: string,
    message: string,
    type: AppNotification['type'],
    relatedTaskId?: string
  ) {
    return await supabase
      .from('notifications')
      .insert([{ user_email: userEmail, title, message, type, related_task_id: relatedTaskId || null }])
  },

  subscribeToNotifications(userEmail: string, callback: () => void) {
    return supabase
      .channel(`notifications_${userEmail}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_email=eq.${userEmail}`,
      }, callback)
      .subscribe()
  },
}
