import { supabase, type TaskAttachment } from '../supabase'

const BUCKET = 'task-attachments'

export const attachmentService = {
  async fetchAttachments(taskId: string): Promise<{ data: TaskAttachment[]; error: any }> {
    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
    return { data: (data as TaskAttachment[]) || [], error }
  },

  async uploadFile(taskId: string, file: File, uploaderEmail: string): Promise<{ data: TaskAttachment | null; error: any }> {
    const ext = file.name.split('.').pop()
    const path = `${taskId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) return { data: null, error: uploadError }

    const { data, error } = await supabase
      .from('task_attachments')
      .insert([{
        task_id: taskId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || `application/${ext}`,
        uploaded_by: uploaderEmail,
      }])
      .select()
      .single()

    return { data: data as TaskAttachment | null, error }
  },

  async getSignedUrl(filePath: string): Promise<string | null> {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600)
    return data?.signedUrl || null
  },

  async deleteAttachment(attachmentId: string, filePath: string) {
    await supabase.storage.from(BUCKET).remove([filePath])
    return await supabase.from('task_attachments').delete().eq('id', attachmentId)
  },
}
