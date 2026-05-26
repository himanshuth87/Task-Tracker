import { supabase, type Task, type TaskStatus } from '../supabase'
import { activityService } from './activityService'

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

const PAGE_SIZE = 20

export const taskService = {
  async fetchTasks(session: any, viewMode: 'personal' | 'team', filter: string, page = 0, searchTerm = '') {
    if (!session) return { data: [], error: null, count: 0 }

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

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

    const STATUS_FILTERS = ['pending', 'in_progress', 'blocked', 'completed']
    if (STATUS_FILTERS.includes(filter)) {
      query = query.eq('status', filter)
    }

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,remarks.ilike.%${searchTerm}%,task_giver.ilike.%${searchTerm}%,assigned_to_email.ilike.%${searchTerm}%,tags.cs.{${searchTerm.toLowerCase()}}`)
    }

    const { data, error, count } = await query
    return { data: data || [], error, count: count || 0 }
  },

  async fetchAllTasks(session: any, viewMode: 'personal' | 'team', filter: string, searchTerm = '') {
    if (!session) return { data: [], error: null }

    let query = supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('position', { ascending: true })
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

    const STATUS_FILTERS = ['pending', 'in_progress', 'blocked', 'completed']
    if (STATUS_FILTERS.includes(filter)) {
      query = query.eq('status', filter)
    }

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,remarks.ilike.%${searchTerm}%,task_giver.ilike.%${searchTerm}%,assigned_to_email.ilike.%${searchTerm}%,tags.cs.{${searchTerm.toLowerCase()}}`)
    }

    return await query
  },

  async addTask(taskData: any, userEmail?: string, userName?: string) {
    const sanitized = {
      ...taskData,
      title: String(taskData.title || '').slice(0, 500),
      remarks: taskData.remarks ? String(taskData.remarks).slice(0, 1000) : null,
    }

    const result = await supabase.from('tasks').insert([sanitized]).select().single()

    if (!result.error && result.data) {
      if (sanitized.assigned_to_email && sanitized.assigned_to_email !== sanitized.user_email) {
        supabase.functions.invoke('notify-assignee', { body: result.data }).catch(console.error)
        void supabase.from('notifications').insert([{
          user_email: sanitized.assigned_to_email,
          title: 'New Task Assigned',
          message: `"${sanitized.title}" was assigned to you by ${sanitized.task_giver}`,
          type: 'task',
          related_task_id: result.data.id,
        }])
      }
      if (userEmail && userName) {
        activityService.log(result.data.id, userEmail, userName, 'created', { title: sanitized.title }).catch(console.error)
      }
    }

    return result
  },

  async cycleStatus(task: Task, userEmail?: string, userName?: string) {
    const nextStatus = STATUS_CYCLE[task.status] ?? 'pending'

    const { error } = await supabase
      .from('tasks')
      .update({ status: nextStatus })
      .eq('id', task.id)

    if (!error) {
      if (userEmail && userName) {
        activityService.log(task.id, userEmail, userName, 'status_changed', { from: task.status, to: nextStatus }).catch(console.error)
      }

      if (nextStatus === 'completed' && task.recurrence && task.recurrence !== 'none') {
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
            category: task.category,
            tags: task.tags,
            status: 'pending',
            user_id: task.user_id,
            user_email: task.user_email,
            team_name: task.team_name,
            recurrence: task.recurrence,
            position: 0,
          }])
        }
      }
    }

    return { error, nextStatus }
  },

  async updateTask(taskId: string, updates: Partial<Task>, userEmail?: string, userName?: string) {
    const result = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (!result.error && userEmail && userName && Object.keys(updates).length > 0) {
      activityService.log(taskId, userEmail, userName, 'updated', { fields: Object.keys(updates) }).catch(console.error)
    }

    return result
  },

  async deleteTask(taskId: string) {
    return await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId)
  },

  async restoreTask(taskId: string) {
    return await supabase.from('tasks').update({ deleted_at: null }).eq('id', taskId)
  },

  async hardDeleteTask(taskId: string) {
    return await supabase.from('tasks').delete().eq('id', taskId)
  },

  async fetchDeletedTasks(session: any, viewMode: 'personal' | 'team') {
    if (!session) return { data: [], error: null }
    let query = supabase.from('tasks').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
    if (viewMode === 'personal') {
      query = query.eq('user_id', session.user.id)
    } else if (viewMode === 'team') {
      query = query.eq('team_name', session.user.user_metadata.team_name || 'General')
    }
    return await query
  },

  subscribeToTasks(callback: (payload: any) => void) {
    return supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
      .subscribe()
  },

  PAGE_SIZE,
}
