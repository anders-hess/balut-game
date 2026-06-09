-- ============================================================================
-- Balut — Achievements migration
-- Run this in the Supabase SQL editor (https://app.supabase.com → SQL).
--
-- Stores one row per (user, achievement). `tier` is 0 for one-time feat badges
-- and 1..4 (bronze..platinum) for tiered progression/streak badges; it holds the
-- HIGHEST tier reached. Lifetime counters and streaks themselves are derived
-- from the `scores` table at read time — not stored here.
-- ============================================================================

create table if not exists public.achievements (
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null,
  tier           smallint not null default 0,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;

-- Public-read so profiles can show badges; users write only their own rows.
drop policy if exists "achievements readable by all" on public.achievements;
create policy "achievements readable by all"
  on public.achievements for select using (true);

drop policy if exists "users insert own achievements" on public.achievements;
create policy "users insert own achievements"
  on public.achievements for insert
  with check (auth.uid() = user_id);

drop policy if exists "users update own achievements" on public.achievements;
create policy "users update own achievements"
  on public.achievements for update using (auth.uid() = user_id);
