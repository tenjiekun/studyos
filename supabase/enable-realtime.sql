-- ===== ENABLE REALTIME ON ALL TABLES =====
-- Run this in your Supabase SQL Editor to fix real-time subscriptions

-- Add tables to the realtime publication (safe to run multiple times)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'tasks',
    'study_sessions',
    'user_settings',
    'profiles',
    'groups',
    'group_members',
    'messages',
    'message_reads',
    'notifications',
    'dm_messages',
    'conversations',
    'call_signals'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND tablename = tbl
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        RAISE NOTICE 'Added % to supabase_realtime', tbl;
      EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping', tbl;
      END;
    ELSE
      RAISE NOTICE 'Table % already in supabase_realtime, skipping', tbl;
    END IF;
  END LOOP;
END $$;
