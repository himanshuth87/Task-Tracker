-- Migration 005: Fix assignee task visibility
-- Ensures that when a task is assigned to a user by email, that user can
-- always read it — even if they registered after the task was created or
-- belong to a different team than the task's team_name.

-- Add a dedicated SELECT policy for task assignees.
-- Supabase evaluates multiple SELECT policies with OR logic, so this
-- simply expands read access for the assigned user without touching
-- any existing team/owner-based policies.
DROP POLICY IF EXISTS "Assignees can view their assigned tasks" ON tasks;
CREATE POLICY "Assignees can view their assigned tasks"
  ON tasks FOR SELECT
  USING (assigned_to_email = auth.email());

-- Index to keep email-based lookups fast
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_email ON tasks (assigned_to_email);
