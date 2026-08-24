-- ===== CALL LOGS TABLE =====
-- Run this in your Supabase SQL Editor

create table if not exists public.call_logs (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  caller_id uuid references auth.users(id) on delete cascade not null,
  receiver_id uuid references auth.users(id) on delete cascade not null,
  call_type text check (call_type in ('audio', 'video')) not null default 'audio',
  status text check (status in ('completed', 'missed', 'declined')) not null default 'completed',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_call_logs_conversation on public.call_logs(conversation_id);
create index if not exists idx_call_logs_started on public.call_logs(started_at desc);
create index if not exists idx_call_logs_caller on public.call_logs(caller_id);
create index if not exists idx_call_logs_receiver on public.call_logs(receiver_id);

-- Row Level Security
alter table public.call_logs enable row level security;

-- Users can see call logs for conversations they're part of
create policy "Users can view own call logs"
  on public.call_logs for select
  using (
    auth.uid() = caller_id or auth.uid() = receiver_id
  );

-- Users can insert call logs (when they start/end a call)
create policy "Users can insert call logs"
  on public.call_logs for insert
  with check (
    auth.uid() = caller_id or auth.uid() = receiver_id
  );

-- Users can update their own call logs (to set ended_at, duration, status)
create policy "Users can update own call logs"
  on public.call_logs for update
  using (
    auth.uid() = caller_id or auth.uid() = receiver_id
  );
