-- ===== ADVANCED YEARLY STUDY PLANNER =====
-- Run this in Supabase SQL Editor

-- 1. SUBJECTS (unlimited, with color + priority)
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  priority text CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  target_completion_date date,
  weekly_target_hours numeric DEFAULT 0,
  allocation_pct numeric DEFAULT 0 CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- 2. SYLLABUS CHAPTERS (per subject)
CREATE TABLE IF NOT EXISTS public.syllabus_chapters (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  topics text[], -- optional array of topic names
  status text CHECK (status IN ('not_started', 'planned', 'in_progress', 'completed', 'revising', 'needs_revision')) DEFAULT 'not_started',
  priority text CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  estimated_hours numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  target_date date,
  completed_at timestamptz,
  revision_count integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. YEAR PLANS (enhanced)
CREATE TABLE IF NOT EXISTS public.year_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Study Plan',
  academic_year text NOT NULL DEFAULT '2026-2027',
  start_date date NOT NULL DEFAULT '2026-04-01',
  end_date date NOT NULL DEFAULT '2027-03-31',
  daily_study_hours numeric DEFAULT 6,
  weekly_study_days integer DEFAULT 6,
  buffer_pct numeric DEFAULT 15 CHECK (buffer_pct >= 0 AND buffer_pct <= 50),
  total_available_hours numeric DEFAULT 0,
  total_planned_hours numeric DEFAULT 0,
  status text CHECK (status IN ('draft', 'active', 'completed', 'archived')) DEFAULT 'draft',
  locked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. PLAN MONTHLY DISTRIBUTIONS (year → month mapping)
CREATE TABLE IF NOT EXISTS public.plan_distributions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_plan_id uuid REFERENCES public.year_plans(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL, -- 'YYYY-MM'
  planned_hours numeric DEFAULT 0,
  planned_chapters integer DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  actual_chapters integer DEFAULT 0,
  locked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. CHAPTER ASSIGNMENTS (which month/week a chapter is assigned to)
CREATE TABLE IF NOT EXISTS public.chapter_assignments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_id uuid REFERENCES public.syllabus_chapters(id) ON DELETE CASCADE NOT NULL,
  year_plan_id uuid REFERENCES public.year_plans(id) ON DELETE CASCADE,
  assigned_month text, -- 'YYYY-MM'
  assigned_week text, -- 'YYYY-Www'
  assigned_date date,
  estimated_start date,
  estimated_end date,
  locked boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. WEEKLY PLANS (generated from monthly)
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_plan_id uuid REFERENCES public.year_plans(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  planned_hours numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  planned_chapters integer DEFAULT 0,
  actual_chapters integer DEFAULT 0,
  status text CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
  locked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- 7. DAILY PLANS (generated from weekly)
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  planned_hours numeric DEFAULT 0,
  actual_hours numeric DEFAULT 0,
  focus_minutes integer DEFAULT 0,
  productivity_score integer DEFAULT 0,
  status text CHECK (status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
  locked boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 8. DAILY PLAN BLOCKS (individual study sessions in a day)
CREATE TABLE IF NOT EXISTS public.daily_plan_blocks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  daily_plan_id uuid REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  chapter_id uuid REFERENCES public.syllabus_chapters(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  type text CHECK (type IN ('study', 'revision', 'mock_test', 'break', 'free')) DEFAULT 'study',
  completed boolean DEFAULT false,
  actual_minutes integer,
  locked boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. REPLAN HISTORY
CREATE TABLE IF NOT EXISTS public.replan_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_plan_id uuid REFERENCES public.year_plans(id) ON DELETE CASCADE,
  reason text,
  chapters_behind integer DEFAULT 0,
  hours_behind numeric DEFAULT 0,
  changes_made jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. FREE TIME LOGS (per day)
CREATE TABLE IF NOT EXISTS public.free_time_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  category text CHECK (category IN ('entertainment', 'social', 'hobbies', 'exercise', 'rest', 'gaming', 'reading', 'travel', 'other')) NOT NULL,
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user ON public.syllabus_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.syllabus_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status ON public.syllabus_chapters(status);
CREATE INDEX IF NOT EXISTS idx_distributions_year ON public.plan_distributions(year_plan_id);
CREATE INDEX IF NOT EXISTS idx_distributions_month ON public.plan_distributions(month);
CREATE INDEX IF NOT EXISTS idx_assignments_chapter ON public.chapter_assignments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_month ON public.chapter_assignments(assigned_month);
CREATE INDEX IF NOT EXISTS idx_weekly_user_week ON public.weekly_plans(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_daily_user_date ON public.daily_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_blocks_plan ON public.daily_plan_blocks(daily_plan_id);
CREATE INDEX IF NOT EXISTS idx_free_time_user_date ON public.free_time_logs(user_id, date);

-- DISABLE RLS on all new tables
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.replan_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_time_logs DISABLE ROW LEVEL SECURITY;

-- Enable realtime on key tables
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['subjects','syllabus_chapters','plan_distributions','chapter_assignments','weekly_plans','daily_plans','daily_plan_blocks'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
    END IF;
  END LOOP;
END $$;
