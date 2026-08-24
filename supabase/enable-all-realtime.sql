-- ===== FIX: Enable Realtime on ALL tables =====
-- Run this ONE SQL in your Supabase SQL Editor to fix all real-time subscriptions
-- This is safe to run multiple times (idempotent)

-- 1. Add all tables to supabase_realtime publication
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
    'call_signals',
    'dm_message_reads'
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
        RAISE NOTICE '✅ Added % to supabase_realtime', tbl;
      EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⚠️ Table % does not exist, skipping', tbl;
      END;
    ELSE
      RAISE NOTICE '✓ % already in supabase_realtime', tbl;
    END IF;
  END LOOP;
END $$;

-- 2. Verify what's in the publication
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
