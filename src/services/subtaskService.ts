import { supabase, type SubTask } from '../supabase'

export const subtaskService = {
  async fetchSubtasks(taskId: string): Promise<{ data: SubTask[]; error: any }> {
    const { data, error } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
    return { data: (data as SubTask[]) || [], error }
  },

  async addSubtask(taskId: string, title: string, createdBy: string): Promise<{ data: SubTask | null; error: any }> {
    const { data: existing } = await supabase
      .from('subtasks')
      .select('position')
      .eq('task_id', taskId)
      .order('position', { ascending: false })
      .limit(1)
    const position = existing && existing.length > 0 ? (existing[0].position + 1) : 0
    const { data, error } = await supabase
      .from('subtasks')
      .insert([{ task_id: taskId, title: title.slice(0, 500), created_by: createdBy, position }])
      .select()
      .single()
    return { data: data as SubTask | null, error }
  },

  async toggleSubtask(subtaskId: string, completed: boolean) {
    return await supabase
      .from('subtasks')
      .update({ completed })
      .eq('id', subtaskId)
  },

  async deleteSubtask(subtaskId: string) {
    return await supabase.from('subtasks').delete().eq('id', subtaskId)
  },
}
