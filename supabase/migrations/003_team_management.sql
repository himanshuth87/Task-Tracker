-- Migration 003: Team Management & Role Security

-- 1. Create RPC to check if a team exists
CREATE OR REPLACE FUNCTION check_team_exists(p_team_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- runs as postgres, can bypass RLS to check all profiles
AS $$
DECLARE
  team_found boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE team_name = p_team_name
  ) INTO team_found;
  RETURN team_found;
END;
$$;

-- 2. Create RPC to check if an email is invited to a team
CREATE OR REPLACE FUNCTION check_team_invitation(p_team_name text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_found boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM team_invitations 
    WHERE team_name = p_team_name 
      AND invited_email = p_email 
      AND status = 'pending'
  ) INTO invite_found;
  RETURN invite_found;
END;
$$;

-- 3. Lock down tasks deletion (role-based)
-- Drop existing delete policy if it exists (assuming it was open to auth.uid() IS NOT NULL)
-- We need to check if we can do this dynamically or just enforce it.
-- We will replace the tasks DELETE policy.
DROP POLICY IF EXISTS "Authenticated users delete tasks" ON tasks;
CREATE POLICY "Users can delete own tasks or admins/managers can delete any"
  ON tasks FOR DELETE
  USING (
    auth.uid() = user_id -- They own the task (assuming user_id is the owner)
    OR (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'manager')
      )
    )
  );

-- Note: Ensure tasks table has a policy for other operations. 
-- We will assume INSERT, SELECT, UPDATE are already handled correctly.
