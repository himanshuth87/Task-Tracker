-- Migration 004: Productivity Features
-- Adds tags, time tracking, ordering, and soft delete to tasks.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS time_logged_minutes INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Optional: Create indices for performance
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks (position);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks (deleted_at);
