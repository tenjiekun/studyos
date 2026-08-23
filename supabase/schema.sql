-- StudyOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tasks table
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subject text not null,
  description text,
  priority text check (priority in ('low', 'medium', 'high')) not null default 'medium',
  estimated_minutes integer not null default 30,
  scheduled_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Study sessions table
create table public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  subject text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer not null default 0,
  session_type text check (session_type in ('focus', 'pomodoro')) not null default 'focus',
  created_at timestamptz not null default now()
);

-- User settings table
create table public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  theme text check (theme in ('light', 'dark', 'system')) not null default 'system',
  daily_goal_minutes integer not null default 360,
  pomodoro_focus_duration integer not null default 25,
  pomodoro_short_break integer not null default 5,
  pomodoro_long_break integer not null default 15,
  pomodoro_sessions_before_long integer not null default 4,
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_scheduled_date on public.tasks(scheduled_date);
create index idx_tasks_user_date on public.tasks(user_id, scheduled_date);
create index idx_sessions_user_id on public.study_sessions(user_id);
create index idx_sessions_start_time on public.study_sessions(start_time);
create index idx_sessions_user_time on public.study_sessions(user_id, start_time);

-- Row Level Security
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.user_settings enable row level security;

-- Tasks policies
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- Study sessions policies
create policy "Users can view own sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.study_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.study_sessions for delete
  using (auth.uid() = user_id);

-- User settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- ===== COMMUNITY MODULE =====

-- Profiles table
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default 'Student',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Community groups
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text not null default '',
  image_url text,
  category text not null default 'General',
  privacy text check (privacy in ('public', 'private')) not null default 'public',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Group members
create table public.group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'member')) not null default 'member',
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  message_type text check (message_type in ('text', 'image', 'audio')) not null default 'text',
  text text,
  media_url text,
  created_at timestamptz not null default now()
);

-- Message reads
create table public.message_reads (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references public.messages(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

-- Community indexes
create index idx_profiles_id on public.profiles(id);
create index idx_groups_category on public.groups(category);
create index idx_groups_created_by on public.groups(created_by);
create index idx_group_members_group_id on public.group_members(group_id);
create index idx_group_members_user_id on public.group_members(user_id);
create index idx_messages_group_id on public.messages(group_id);
create index idx_messages_created_at on public.messages(created_at);
create index idx_messages_group_time on public.messages(group_id, created_at desc);
create index idx_message_reads_message_id on public.message_reads(message_id);

-- Community RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

-- Profile policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Group policies
create policy "Public groups are viewable by everyone"
  on public.groups for select
  using (privacy = 'public' or exists (
    select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid()
  ));

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = created_by);

create policy "Group admins can update groups"
  on public.groups for update
  using (exists (
    select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

create policy "Group admins can delete groups"
  on public.groups for delete
  using (exists (
    select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

-- Group members policies
create policy "Group members are viewable by group members"
  on public.group_members for select
  using (exists (
    select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
  ));

create policy "Users can join public groups"
  on public.group_members for insert
  with check (auth.uid() = user_id);

create policy "Users can leave groups"
  on public.group_members for delete
  using (auth.uid() = user_id);

create policy "Admins can remove members"
  on public.group_members for delete
  using (exists (
    select 1 from public.group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

-- Message policies
create policy "Group members can view messages"
  on public.messages for select
  using (exists (
    select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid()
  ));

create policy "Group members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Users can delete own messages"
  on public.messages for delete
  using (auth.uid() = user_id);

create policy "Admins can delete any message in their group"
  on public.messages for delete
  using (exists (
    select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid() and gm.role = 'admin'
  ));

-- Message reads policies
create policy "Users can view own reads"
  on public.message_reads for select
  using (auth.uid() = user_id);

create policy "Users can mark messages as read"
  on public.message_reads for insert
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Student'));
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Storage buckets
insert into storage.buckets (id, name, public) values ('group-images', 'group-images', true);
insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', false);
insert into storage.buckets (id, name, public) values ('voice-notes', 'voice-notes', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Storage policies
create policy "Anyone can view group images"
  on storage.objects for select
  using (bucket_id = 'group-images');

create policy "Authenticated users can upload group images"
  on storage.objects for insert
  with check (bucket_id = 'group-images' and auth.role() = 'authenticated');

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Group members can view chat images"
  on storage.objects for select
  using (bucket_id = 'chat-images');

create policy "Authenticated users can upload chat images"
  on storage.objects for insert
  with check (bucket_id = 'chat-images' and auth.role() = 'authenticated');

create policy "Group members can view voice notes"
  on storage.objects for select
  using (bucket_id = 'voice-notes');

create policy "Authenticated users can upload voice notes"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes' and auth.role() = 'authenticated');

-- Auto-create settings on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
