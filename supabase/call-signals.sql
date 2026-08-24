-- ===== CALL SIGNALS TABLE (WebRTC Signaling via Database) =====
-- Run this in your Supabase SQL Editor

-- 1. Create the table (skip if exists)
create table if not exists public.call_signals (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  signal_type text not null,  -- offer, accept, answer, ice-candidate, reject, end
  call_type text,             -- audio, video
  sender_name text,
  signal_data jsonb,
  created_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists idx_call_signals_conversation
  on public.call_signals(conversation_id, created_at desc);

-- 3. Enable realtime (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
  END IF;
END $$;

-- 4. Row Level Security
alter table public.call_signals enable row level security;

-- Drop old policies if they exist (safe re-runnable)
DROP POLICY IF EXISTS "Users can view call signals" ON public.call_signals;
DROP POLICY IF EXISTS "Users can insert call signals" ON public.call_signals;

-- Users can see signals for their conversations
create policy "Users can view call signals"
  on public.call_signals for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  );

-- Users can insert call signals (must be the sender)
create policy "Users can insert call signals"
  on public.call_signals for insert
  with check (auth.uid() = sender_id);

-- 5. Auto-cleanup function (run via cron or trigger)
create or replace function public.cleanup_old_call_signals()
returns void
language sql
security definer
as $$
  delete from public.call_signals
  where created_at < now() - interval '5 minutes';
$$;
