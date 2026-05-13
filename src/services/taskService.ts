import { supabase, type Task } from '../supabase'

export const taskService = {
  async fetchTasks(session: any, viewMode: 'personal' | 'team', filter: string) {
    if (!session) return { data: [], error: null }
    
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })

    if (viewMode === 'personal') {
      if (filter === 'assigned_to_me') {
        query = query.eq('assigned_to_email', session.user.email)
      } else {
        query = query.eq('user_id', session.user.id)
      }
    } else if (viewMode === 'team') {
      // Filter by the user's team name
      const teamName = session.user.user_metadata.team_name || 'General'
      query = query.eq('team_name', teamName)
    }

    return await query
  },

  async addTask(taskData: any) {
    const result = await supabase.from('tasks').insert([taskData]).select().single()

    // Send email notification to assignee (only if assigned to someone else)
    if (!result.error && taskData.assigned_to_email && taskData.assigned_to_email !== taskData.user_email) {
      supabase.functions.invoke('notify-assignee', { body: result.data }).catch(console.error)
    }

    return result
  },

  async updateTaskStatus(taskId: string, currentStatus: 'pending' | 'completed') {
    return await supabase
      .from('tasks')
      .update({ status: currentStatus === 'completed' ? 'pending' : 'completed' })
      .eq('id', taskId)
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    return await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
  },

  async deleteTask(taskId: string) {
    return await supabase.from('tasks').delete().eq('id', taskId)
  },

  subscribeToTasks(callback: (payload: any) => void) {
    return supabase
      .channel('tasks_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks' 
      }, callback)
      .subscribe()
  }
}
