-- ============================================================================
-- Balut — Events RLS fix
-- Run in the Supabase SQL editor.
--
-- Symptom: "Scorecard Insights" / "Scorecard rates" show "—" for everyone.
-- Cause: analytics `game_completed` events fail to INSERT for LOGGED-IN users
-- because the `events` table's RLS predates accounts and didn't permit the
-- `authenticated` role to insert. trackEvent() swallows the error, so the rows
-- are silently dropped. This re-grants insert (and select) to anon + authed.
--
-- Run the diagnostics in the chat first if you want to confirm before applying.
-- These statements are idempotent and safe to re-run.
-- ============================================================================

alter table public.events enable row level security;

-- Anyone (anonymous visitors and logged-in users) may record analytics events.
drop policy if exists "anyone can insert events" on public.events;
create policy "anyone can insert events"
  on public.events for insert
  to anon, authenticated
  with check (true);

-- Public read for the Insights dashboard.
drop policy if exists "anyone can read events" on public.events;
create policy "anyone can read events"
  on public.events for select
  to anon, authenticated
  using (true);
