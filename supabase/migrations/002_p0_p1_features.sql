-- Migration 002: P0 fixes + P1 features
-- Run this in your Supabase SQL Editor after 001_comments_recurrence.sql

-- 1. Add role to profiles (RBAC)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'
  CHECK (role IN ('admin', 'manager', 'member'));

-- 2. Input length constraints (security)
ALTER TABLE tasks ALTER COLUMN title TYPE VARCHAR(500);
ALTER TABLE task_comments ALTER COLUMN content TYPE VARCHAR(2000);

-- 3. Notifications inbox
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'task', 'comment', 'pipeline', 'mention')),
  read BOOLEAN DEFAULT FALSE,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (user_email = auth.email());
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE USING (user_email = auth.email());
CREATE POLICY "Users delete own notifications"
  ON notifications FOR DELETE USING (user_email = auth.email());
CREATE INDEX IF NOT EXISTS notifications_user_email_idx ON notifications(user_email);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);

-- 4. Subtasks (checklists)
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_by TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read subtasks"
  ON subtasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users insert subtasks"
  ON subtasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users update subtasks"
  ON subtasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users delete subtasks"
  ON subtasks FOR DELETE USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON subtasks(task_id);

-- 5. File attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage attachments"
  ON task_attachments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS attachments_task_id_idx ON task_attachments(task_id);

-- 6. Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage dependencies"
  ON task_dependencies FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Activity / audit log
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read activity"
  ON activity_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users insert activity"
  ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS activity_logs_task_id_idx ON activity_logs(task_id);
CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- 8. Team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  invited_by_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_name, invited_email)
);
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members manage invitations"
  ON team_invitations FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. Storage bucket for attachments (run this separately in Supabase Dashboard → Storage)
-- CREATE BUCKET task-attachments with public = false
-- Then add policy: allow authenticated users to SELECT, INSERT, DELETE on task-attachments bucket
