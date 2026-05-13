import { supabase, type TaskComment } from '../supabase'

export const commentService = {
  async fetchComments(taskId: string): Promise<{ data: TaskComment[]; error: any }> {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    return { data: (data as TaskComment[]) || [], error }
  },

  async addComment(taskId: string, userEmail: string, userName: string, content: string) {
    return await supabase
      .from('task_comments')
      .insert([{ task_id: taskId, user_email: userEmail, user_name: userName, content }])
      .select()
      .single()
  },

  async deleteComment(commentId: string) {
    return await supabase.from('task_comments').delete().eq('id', commentId)
  },
}
