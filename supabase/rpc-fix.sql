-- ===== RPC FIX: Bypass RLS with SECURITY DEFINER functions =====
-- Run this in Supabase SQL Editor if RLS policies still block inserts

-- Create a function to insert tasks (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_task(
  p_title text,
  p_subject text,
  p_description text,
  p_priority text,
  p_estimated_minutes integer,
  p_scheduled_date date,
  p_completed boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_task json;
BEGIN
  INSERT INTO public.tasks (
    user_id, title, subject, description, priority, 
    estimated_minutes, scheduled_date, completed
  ) VALUES (
    auth.uid(), p_title, p_subject, p_description, p_priority,
    p_estimated_minutes, p_scheduled_date, p_completed
  )
  RETURNING to_json(tasks.*) INTO new_task;
  
  RETURN new_task;
END;
$$;

-- Create a function to update tasks (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_task(
  p_id uuid,
  p_title text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_estimated_minutes integer DEFAULT NULL,
  p_scheduled_date date DEFAULT NULL,
  p_completed boolean DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks SET
    title = COALESCE(p_title, title),
    subject = COALESCE(p_subject, subject),
    description = COALESCE(p_description, description),
    priority = COALESCE(p_priority, priority),
    estimated_minutes = COALESCE(p_estimated_minutes, estimated_minutes),
    scheduled_date = COALESCE(p_scheduled_date, scheduled_date),
    completed = COALESCE(p_completed, completed),
    completed_at = p_completed_at
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Create a function to delete tasks (bypasses RLS)
CREATE OR REPLACE FUNCTION public.delete_task(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.tasks WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Create a function to toggle task completion (bypasses RLS)
CREATE OR REPLACE FUNCTION public.toggle_task(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tasks SET
    completed = NOT completed,
    completed_at = CASE WHEN NOT completed THEN now() ELSE NULL END
  WHERE id = p_id AND user_id = auth.uid();
END;
$$;

-- Create a function to insert study sessions (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_session(
  p_task_id uuid,
  p_subject text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_duration_minutes integer,
  p_session_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_session json;
BEGIN
  INSERT INTO public.study_sessions (
    user_id, task_id, subject, start_time, end_time, 
    duration_minutes, session_type
  ) VALUES (
    auth.uid(), p_task_id, p_subject, p_start_time, p_end_time,
    p_duration_minutes, p_session_type
  )
  RETURNING to_json(study_sessions.*) INTO new_session;
  
  RETURN new_session;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_task TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_session TO authenticated;
