-- ===== STUDY PLANNER MODULE =====
-- Run this in Supabase SQL Editor

-- 1. YEAR PLANS
CREATE TABLE IF NOT EXISTS public.year_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  academic_year text NOT NULL DEFAULT '2026-2027',
  status text CHECK (status IN ('active', 'completed', 'archived')) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. PLAN GOALS (yearly/monthly goals)
CREATE TABLE IF NOT EXISTS public.plan_goals (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES public.year_plans(id) ON DELETE CASCADE,
  period text CHECK (period IN ('year', 'month', 'week')) NOT NULL DEFAULT 'year',
  period_date text, -- 'YYYY-MM' for month, 'YYYY-Www' for week
  title text NOT NULL,
  description text,
  subject text,
  target_date date,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status text CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')) DEFAULT 'not_started',
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. SYLLABUS ITEMS
CREATE TABLE IF NOT EXISTS public.syllabus_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  chapter text NOT NULL,
  topic text,
  subtopic text,
  status text CHECK (status IN ('not_started', 'in_progress', 'completed', 'revising', 'needs_revision')) DEFAULT 'not_started',
  planned_date date,
  completed_at timestamptz,
  estimated_minutes integer DEFAULT 60,
  actual_minutes integer DEFAULT 0,
  revision_count integer DEFAULT 0,
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. SCHEDULED BLOCKS (calendar/time blocks)
CREATE TABLE IF NOT EXISTS public.scheduled_blocks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text CHECK (type IN ('study', 'school', 'test', 'mock_test', 'revision', 'personal', 'break', 'free', 'other')) NOT NULL DEFAULT 'study',
  title text NOT NULL,
  subject text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  task_id uuid,
  syllabus_item_id uuid,
  test_id uuid,
  status text CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped', 'cancelled')) DEFAULT 'planned',
  actual_minutes integer,
  notes text,
  google_event_id text,
  recurrence text, -- 'daily', 'weekly', 'none'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. TESTS & EXAMS
CREATE TABLE IF NOT EXISTS public.tests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('actual', 'mock', 'practice', 'competitive')) NOT NULL DEFAULT 'mock',
  category text CHECK (category IN ('school', 'coaching', 'self', 'competitive', 'other')) DEFAULT 'self',
  date date NOT NULL,
  start_time timestamptz,
  duration_minutes integer DEFAULT 180,
  subjects text[] DEFAULT '{}',
  syllabus_covered text,
  max_marks numeric DEFAULT 100,
  target_marks numeric,
  actual_marks numeric,
  percentage numeric GENERATED ALWAYS AS (
    CASE WHEN max_marks > 0 AND actual_marks IS NOT NULL THEN (actual_marks / max_marks * 100) ELSE NULL END
  ) STORED,
  rank integer,
  accuracy numeric,
  questions_attempted integer,
  correct_answers integer,
  incorrect_answers integer,
  unattempted integer,
  time_taken_minutes integer,
  notes text,
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. TEST SUBJECT RESULTS (per-subject breakdown)
CREATE TABLE IF NOT EXISTS public.test_subject_results (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  marks numeric,
  max_marks numeric,
  accuracy numeric,
  questions_attempted integer,
  correct_answers integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. FREE TIME LOGS
CREATE TABLE IF NOT EXISTS public.free_time_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  category text CHECK (category IN ('entertainment', 'social', 'hobbies', 'exercise', 'rest', 'gaming', 'reading', 'travel', 'other')) NOT NULL DEFAULT 'other',
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 30,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. DAILY SCHEDULES (user's routine template)
CREATE TABLE IF NOT EXISTS public.daily_schedules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
  wake_time time DEFAULT '06:30',
  sleep_time time DEFAULT '22:30',
  school_start time,
  school_end time,
  coaching_start time,
  coaching_end time,
  max_study_hours numeric DEFAULT 6,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. GOOGLE CALENDAR CONNECTIONS
CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  google_account_email text,
  sync_enabled boolean DEFAULT true,
  sync_study_events boolean DEFAULT true,
  sync_test_events boolean DEFAULT true,
  last_synced_at timestamptz,
  access_token_encrypted text, -- server-side only
  refresh_token_encrypted text, -- server-side only
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 10. CALENDAR EVENT MAPPINGS (bidirectional sync)
CREATE TABLE IF NOT EXISTS public.calendar_event_mappings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  local_record_id uuid NOT NULL,
  local_record_type text CHECK (local_record_type IN ('scheduled_block', 'test', 'task')) NOT NULL,
  google_calendar_id text,
  google_event_id text NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_status text CHECK (sync_status IN ('synced', 'pending', 'error')) DEFAULT 'synced',
  sync_direction text CHECK (sync_direction IN ('app_to_google', 'google_to_app')) DEFAULT 'app_to_google',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. MONTHLY PLANS (detailed monthly targets)
CREATE TABLE IF NOT EXISTS public.monthly_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year uuid REFERENCES public.year_plans(id) ON DELETE CASCADE,
  month text NOT NULL, -- 'YYYY-MM'
  planned_study_hours numeric DEFAULT 0,
  planned_tasks integer DEFAULT 0,
  planned_chapters integer DEFAULT 0,
  planned_mocks integer DEFAULT 0,
  planned_revisions integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_plan_goals_user ON public.plan_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_goals_period ON public.plan_goals(period, period_date);
CREATE INDEX IF NOT EXISTS idx_syllabus_user ON public.syllabus_items(user_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_subject ON public.syllabus_items(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_user ON public.scheduled_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_blocks_time ON public.scheduled_blocks(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_tests_user ON public.tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_date ON public.tests(user_id, date);
CREATE INDEX IF NOT EXISTS idx_free_time_user ON public.free_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_free_time_date ON public.free_time_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_calendar_mappings_user ON public.calendar_event_mappings(user_id);

-- RLS
ALTER TABLE public.year_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_subject_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

-- Simple user-scoped policies (RLS is disabled on tasks table but let's be consistent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'planner_user_policy' AND tablename = 'year_plans') THEN
    CREATE POLICY "planner_user_policy" ON public.year_plans FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.plan_goals FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.syllabus_items FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.scheduled_blocks FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.tests FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.free_time_logs FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.daily_schedules FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.google_calendar_connections FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.calendar_event_mappings FOR ALL USING (auth.uid() = user_id);
    CREATE POLICY "planner_user_policy" ON public.monthly_plans FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Also disable RLS on planner tables for consistency with tasks
ALTER TABLE public.year_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_subject_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_plans DISABLE ROW LEVEL SECURITY;

-- Enable realtime
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['year_plans','plan_goals','syllabus_items','scheduled_blocks','tests','free_time_logs','monthly_plans'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;
