-- Create the tasks table
CREATE TABLE tasks (
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
  user_id TEXT, -- For now, we use a placeholder or handle auth later
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access for now (for development)
-- WARNING: In production, you should restrict this to authenticated users
CREATE POLICY "Allow public access" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);
