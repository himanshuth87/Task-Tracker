import { supabase, type Task, type TaskStatus } from '../supabase'

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'blocked',
  blocked: 'completed',
  completed: 'pending',
}

const RECURRENCE_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
}

function shiftDate(dateStr: string | null, days: number): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

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
      const teamName = session.user.user_metadata.team_name || 'General'
      query = query.eq('team_name', teamName)
    }

    return await query
  },

  async addTask(taskData: any) {
    const result = await supabase.from('tasks').insert([taskData]).select().single()

    if (!result.error && taskData.assigned_to_email && taskData.assigned_to_email !== taskData.user_email) {
      supabase.functions.invoke('notify-assignee', { body: result.data }).catch(console.error)
    }

    return result
  },

  async cycleStatus(task: Task) {
    const nextStatus = STATUS_CYCLE[task.status] ?? 'pending'

    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)

    // Auto-create next occurrence when a recurring task is completed
    if (!error && nextStatus === 'completed' && task.recurrence && task.recurrence !== 'none') {
      const days = RECURRENCE_DAYS[task.recurrence]
      if (days) {
        await supabase.from('tasks').insert([{
          title: task.title,
          task_giver: task.task_giver,
          assigned_to_email: task.assigned_to_email,
          start_date: shiftDate(task.start_date, days),
          deadline: shiftDate(task.deadline, days),
          remarks: task.remarks,
          priority: task.priority,
          status: 'pending',
          user_id: task.user_id,
          user_email: task.user_email,
          team_name: task.team_name,
          recurrence: task.recurrence,
        }])
      }
    }

    return { error, nextStatus }
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
