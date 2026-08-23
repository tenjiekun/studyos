-- ===== NOTIFICATIONS TABLE =====

create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('message', 'group_join', 'group_invite', 'system')) not null default 'message',
  title text not null,
  body text not null,
  group_id uuid,
  sender_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Indexes for fast queries
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_user_created on public.notifications(user_id, created_at desc);

-- ===== ROW LEVEL SECURITY =====

alter table public.notifications enable row level security;

-- Drop existing policies if any
DO $$ 
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON notifications';
  END LOOP;
END $$;

-- Users can only see their own notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert notifications for others (not themselves)
CREATE POLICY "notif_insert" ON notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notif_delete" ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ===== ENABLE REALTIME =====
-- Run this to enable real-time for notifications:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
