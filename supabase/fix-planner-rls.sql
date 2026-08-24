-- Fix RLS on all planner tables (run this if subjects/syllabus_chapters/etc return 403)
-- Some tables were created by the old planner.sql with RLS enabled

ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_chapters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_distributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.replan_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_time_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_plans DISABLE ROW LEVEL SECURITY;
