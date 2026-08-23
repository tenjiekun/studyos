-- ===== UNIQUE USERNAME FEATURE =====
-- Run this in your Supabase SQL Editor

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;
END $$;

-- Add unique constraint on username (nullable — only enforced when set)
create unique index if not exists idx_profiles_username_unique
  on public.profiles (username)
  where username is not null;

-- Index for fast username lookups (search by user ID)
create index if not exists idx_profiles_username
  on public.profiles (username);

-- Function to check username availability
create or replace function public.check_username_available(username_to_check text)
returns boolean
language sql
security definer
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(username_to_check)
  );
$$;

-- Allow everyone to call the username check function
grant execute on function public.check_username_available(text) to authenticated;
grant execute on function public.check_username_available(text) to anon;
