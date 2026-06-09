# Gamification Spec — Achievements, Streaks & Milestones

Goal: increase engagement for a small player base (2–3 active + casuals) by making
**solo play self-rewarding**, independent of who else is on the leaderboard.

Three layers: **feat badges** (skill moments), **progression badges** (tiered counters),
**streaks & competitive** badges, plus **personal-best / milestone toasts**.

---

## 1. Feat badges (one-time)

Evaluated from the **final scorecard at game-end**, except ⚡ which needs live roll context (§5).

| ID | Name | Trigger |
|---|---|---|
| `first_balut` | First Balut | Any Balut column scored positive (first time ever). |
| `balut_hoarder` | Balut Hoarder | All 4 Balut columns positive in one game. |
| `one_roll_wonder` ⚡ | One-Roll Wonder | Score a Balut having rolled only once (5-of-a-kind off the first roll). |
| `the_long_road` | The Long Road | Straight row = 20 in all 4 columns (4× big straight). |
| `spoilt_for_choice` | Spoilt for Choice | Choice row total > 110. |
| `four_by_four` | Four by Four | Complete Fours **or** Fives **or** Sixes with all 4 columns at the four-of-a-kind value (16 / 20 / 24). Single badge, lights up on any of the three. |
| `the_tent` | The Tent | A Full House scored as three 1s + two 2s (value = 7; uniquely that combination). |
| `campsite` | Campsite | All 4 Full House columns positive with row total ≤ 40. |
| `clean_sheet` | Clean Sheet | Finish with zero scratched cells (all 28 cells > 0). |
| `the_perfect_game` | The Perfect Game | Earn the big-point bonus in all 7 categories in one game. |

## 2. Progression badges (tiered)

Computed on the fly from existing `scores` rows — no counter column. Persist only *when* a tier
is first crossed (for the toast + "unlocked on" date).

| ID | Name | Metric | Tiers |
|---|---|---|---|
| `games_played` | Games Played | count of games | 10 / 50 / 100 / 500 |
| `lifetime_baluts` | Balut Collector | Σ `balut_count` | 10 / 50 / 100 / 500 |
| `lifetime_big_points` | Big Points | Σ `big_points` | 100 / 500 / 2000 |
| `weeks_active` | Regular | distinct Mon–Sun weeks with ≥1 game | 4 / 12 / 52 |

## 3. Streak & competitive badges

| ID | Name | Definition |
|---|---|---|
| `play_streak` | Play Streak | Consecutive Mon–Sun weeks with ≥1 solo game. Resets on a missed week. Show current + longest. |
| `leaderboard_streak` | Leaderboard Streak | Consecutive weeks in the weekly Top 10. Tiers 2 / 4 / 8 / 12. No grace. Show current + longest. |
| `first_blood` | First Blood | First time appearing in a weekly Top 10. |
| `top_of_the_week` | Top of the Week | Finish a week ranked #1. |

**Top-10 membership:** a user is "on the leaderboard" for a week if ≥1 of their submissions is in
that week's Top 10, ranked `big_points DESC, small_points DESC, balut_count DESC`. Multiple
submissions per player allowed — only presence counts. The in-progress current week never breaks a
streak (only a fully-elapsed missed week does).

## 4. Personal bests & milestones (toasts, no badge)

- **New Personal Best** — at game-end when grand total > stored best. Works solo/offline.
- **Milestone toasts** — on crossing a `games_played` or `lifetime_baluts` tier (not big-points / weeks-active).

## 5. Detection architecture

Pure logic in `src/logic/achievements/` (zero React, mirrors `logic/oracle/`):

```
definitions.js   catalog: FEATS, PROGRESSION, STREAKS (id, name, description, tiers)
evaluate.js      evaluateFeats({scorecard, featFlags}) → feat ids
                 computeStats(scores) → {gamesPlayed, lifetimeBaluts, lifetimeBigPoints, weeksActive}
                 evaluateProgression(stats) → { id: highestTier }
streaks.js       weekIndex(date), streakFromWeekSet(set, nowIdx),
                 playStreak(scores, now), leaderboardStreak(presentWeeks, now)
__tests__/
```

- `one_roll_wonder` is raised live: in the reducer, when a `balut` is scored with
  `rollsLeft === MAX_ROLLS - 1` (only one roll taken), set a transient `featFlags.one_roll_wonder`.
  Everything else derives from the final scorecard, so no other live flags are needed.
- On `isGameOver`, run `evaluateFeats` + `evaluateProgression`; diff against already-unlocked to find
  newly-earned, then award + toast.

## 6. Data model

**Logged-in — new Supabase table `achievements`:**

```sql
create table achievements (
  user_id        uuid references auth.users(id),
  achievement_id text,                            -- 'the_long_road', 'games_played', ...
  tier           smallint not null default 0,     -- 0 = one-time; 1..4 = bronze..platinum
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
-- RLS: public-read (profiles show badges); insert/update self only.
```

Tiered badges store the **highest** tier reached (bump `tier` + refresh `unlocked_at`). Counters stay
**derived** from `scores`. Streaks are computed, not stored.

**Guests — localStorage `balut_achievements`:** `{ unlocked: { id: { tier, at } } }`. Lost on clear
(this sets up the sign-up nudge).

## 7. UI

- **Profile screen** — Achievements grid: earned in color, locked greyed with unlock hint and a
  next-tier progress bar. Two stat cards each for play streak and leaderboard streak (current + longest).
- **Unlock toast** — reuse `BalutToast` (badge variant). Queue multiple unlocks sequentially.
- **Guest nudge (non-intrusive)** — guests earn badges in localStorage. Since the profile screen is
  gated to logged-in users (guests have no grid surface), the nudge lives **only** on the first unlock
  toast a guest ever sees — a subtle "Sign up to save your badges →" that opens the auth screen. No
  modal, never interrupts play. (The grid-footer nudge from the original plan was dropped: it had no
  guest-facing home.)

## Build order

1. ✅ Pure `logic/achievements/` module + Vitest tests (no DB, no UI).
2. ✅ `services/achievements.js` (Supabase + localStorage) + `db/002_achievements.sql` migration.
3. ✅ Game-end evaluation wired: `featFlags.one_roll_wonder` in the reducer; `processSoloGame` on
   solo game-over in `App.jsx`; `AchievementToast` queue (achievements + personal-best + milestones).
4. ✅ `AchievementsPanel` in the profile (streak cards, badge grid, progression bars); toast nudge.

> ⚠️ **Action required:** run `db/002_achievements.sql` in the Supabase SQL editor (same as 001) before
> logged-in achievements will persist. Until then, guest/localStorage achievements still work.
