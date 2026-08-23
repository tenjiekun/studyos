-- ===== CONVERSATIONS TABLE =====

create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  user1_id uuid references auth.users(id) on delete cascade not null,
  user2_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user1_id, user2_id)
);

create index if not exists idx_convos_user1 on public.conversations(user1_id);
create index if not exists idx_convos_user2 on public.conversations(user2_id);

-- ===== DM MESSAGES TABLE =====

create table if not exists public.dm_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  message_type text check (message_type in ('text', 'image', 'audio')) not null default 'text',
  text text,
  media_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dm_msg_convo on public.dm_messages(conversation_id);
create index if not exists idx_dm_msg_created on public.dm_messages(conversation_id, created_at);

-- ===== DM MESSAGE READS TABLE =====

create table if not exists public.dm_message_reads (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.dm_messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

create index if not exists idx_dm_reads_msg on public.dm_message_reads(message_id);

-- ===== ROW LEVEL SECURITY =====

alter table public.conversations enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_message_reads enable row level security;

-- Conversations: users can only see conversations they're part of
CREATE POLICY "conv_select" ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conv_insert" ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DM Messages: users can only see messages in their conversations
CREATE POLICY "dm_select" ON dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "dm_insert" ON dm_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "dm_delete" ON dm_messages FOR DELETE
  USING (sender_id = auth.uid());

-- DM Reads
CREATE POLICY "dmr_select" ON dm_message_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "dmr_insert" ON dm_message_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ===== ENABLE REALTIME =====

ALTER PUBLICATION supabase_realtime ADD TABLE dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
