-- ============================================================================
-- Balut — Auth & Profiles migration
-- Run this in the Supabase SQL editor (https://app.supabase.com → SQL).
--
-- IMPORTANT (one-time Auth setting): for "stay logged in after first login"
-- with no email round-trip, disable email confirmation:
--   Authentication → Providers → Email → turn OFF "Confirm email".
-- The profile row is created by a trigger below, so it works either way, but
-- with confirmation ON the user must click the email link before a session
-- exists.
-- ============================================================================

-- citext gives case-insensitive unique usernames.
create extension if not exists citext;

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   citext unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Usernames are public (shown on the leaderboard); users manage only their row.
drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all"
  on public.profiles for select using (true);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── auto-create a profile row on signup ──────────────────────────────────────
-- Username is passed in auth metadata (options.data.username) at sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── scores: attribute games to a user when logged in ─────────────────────────
alter table public.scores add column if not exists user_id  uuid references auth.users (id) on delete set null;
alter table public.scores add column if not exists is_guest boolean not null default true;

-- Insert policy: guests may insert with user_id NULL; logged-in users may only
-- stamp their own id (prevents spoofing another account's scores).
drop policy if exists "anyone can insert a score" on public.scores;
create policy "insert own or guest score"
  on public.scores for insert
  with check (user_id is null or user_id = auth.uid());

-- (SELECT remains open for the public leaderboard — keep your existing
--  "anyone can read scores" SELECT policy as-is.)
