-- 1. Create the TASKS table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT DEFAULT 'general',
  task_giver TEXT,
  deadline DATE,
  start_date DATE,
  remarks TEXT,
  user_id UUID REFERENCES auth.users(id), -- Link to Auth
  user_email TEXT, -- Stored for easy display in Team View
  team_name TEXT DEFAULT 'General', -- Track which team the task belongs to
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the PROFILES table (User Metadata)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  team_name TEXT DEFAULT 'General',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Set up TASKS Policies
-- Allow users to see all tasks (Team Visibility)
CREATE POLICY "Enable read access for all users" ON tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to insert their own tasks
CREATE POLICY "Enable insert for authenticated users" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only owners can update or delete their own tasks
CREATE POLICY "Enable update for owners" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for owners" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Set up PROFILES Policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 6. Enable REAL-TIME for Live Updates
-- This allows everyone to see changes instantly
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE tasks;
COMMIT;
