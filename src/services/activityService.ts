import { supabase, type ActivityLog } from '../supabase'

export const activityService = {
  async fetchActivity(taskId: string): Promise<{ data: ActivityLog[]; error: any }> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50)
    return { data: (data as ActivityLog[]) || [], error }
  },

  async log(
    taskId: string,
    userEmail: string,
    userName: string,
    action: string,
    details?: Record<string, any>
  ) {
    return await supabase
      .from('activity_logs')
      .insert([{ task_id: taskId, user_email: userEmail, user_name: userName, action, details: details || null }])
  },
}
