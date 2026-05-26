import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export type UserRole = 'admin' | 'manager' | 'member';

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  category: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  assigned_to_email: string | null;
  task_giver: string;
  deadline: string | null;
  start_date: string | null;
  remarks: string | null;
  outlook_link: string | null;
  team_name?: string;
  recurrence: TaskRecurrence;
  tags?: string[];
  time_logged_minutes?: number;
  position?: number;
  deleted_at?: string | null;
};

export type TaskComment = {
  id: string;
  task_id: string;
  user_email: string;
  user_name: string;
  content: string;
  created_at: string;
};

export type SubTask = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_by: string;
  position: number;
  created_at: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
  depends_on?: Task;
};

export type ActivityLog = {
  id: string;
  task_id: string | null;
  user_email: string;
  user_name: string;
  action: string;
  details: Record<string, any> | null;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_email: string;
  title: string;
  message: string;
  type: 'info' | 'task' | 'comment' | 'mention';
  read: boolean;
  related_task_id: string | null;
  created_at: string;
};

