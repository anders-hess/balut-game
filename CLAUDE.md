# Balut App — Claude Context

## What this is
A Balut dice game built with React + Vite supporting single player and local multiplayer (2–4 players). Online multiplayer is the next planned feature.

---

## Environment

### Node.js (no admin rights — portable install)
Node is installed as a portable zip, not via system installer. **PATH must be set in every new PowerShell session before running any npm/node commands:**

```powershell
$env:PATH = "C:\Users\anhes\node\node-v22.14.0-win-x64;$env:PATH"
```

### Common commands
```powershell
# Start dev server
npm.cmd run dev        # → http://localhost:5173

# Run tests (Vitest)
npm.cmd run test

# Production build
npm.cmd run build

# npm.ps1 is blocked by execution policy — always use npm.cmd, never npm
```

### Deployment
Live at **https://balut-game.vercel.app** — connected to the `main` branch of `https://github.com/anders-hess/balut-game`. Every `git push origin main` triggers an automatic Vercel redeploy.

---

## Project structure

```
src/
  logic/              # Pure game logic — NO React imports
    gameConstants.js      # NUM_DICE, MAX_ROLLS, NUM_COLUMNS, CATEGORIES, scoring rules
    gameState.js          # State factories incl. createInitialPlayer()
    scoring.js            # calculateScore, calcTotals, calcBonus, isGameOver,
                          # nextColumn, getTargetColumn (high-score right-fill)
    oracle/               # BPIV engine (see Oracle section below)
      index.js            # recommend() — public entry point
      bpiv.js             # bpivScoreNow()
      recursion.js        # createMaxBpiv() memoized recursion, bpivRerollAllHolds(), holdLabel()
      thresholds.js       # pThreshold(), expectedBonus(), BASELINE_SCORE sentinel
      probabilities.js    # normalCDF, binomialCDF, DIST combinatorics, uniqueSubsets()
      scoring.js          # scoreCell(), categoryCurrentSum(), computeTurnsRemaining(), etc.
      outcomes.js         # selectTop5Outcomes(), describeResult()
      constants.js        # Definition-B Monte Carlo statistics + ATTEMPT_FRACTION
      distributions.js    # Discrete score PMFs, SUM_CDF, CHOICE_MIXED_CDF
      __tests__/          # 115 Vitest unit tests
    achievements/         # Gamification engine (see Achievements section below)
      definitions.js        # FEATS / PROGRESSION / STREAKS catalog (ids, names, icons, tiers)
      evaluate.js           # evaluateFeats(), computeStats(), evaluateProgression()
      streaks.js            # weekIndex(), streakFromWeekSet(), playStreak(), leaderboardStreak()
      index.js              # public re-exports
      __tests__/            # 26 Vitest unit tests
  services/           # External service integrations
    supabase.js           # Supabase client singleton (null when .env.local absent)
    highscores.js         # fetchLeaderboard(), checkQualifies(), submitScore()
    analytics.js          # trackEvent(), fetchInsights() — writes to events table; all calls no-op if Supabase absent
    onlineGame.js         # All Supabase DB + Realtime calls for online multiplayer (pure, no React)
    achievements.js       # processSoloGame() (award+persist), loadProfileAchievements(); Supabase + guest localStorage
  hooks/
    useGameState.js       # useReducer — all game actions including multiplayer; exports reducer + __RESTORE__
    useOnlineGame.js      # Connection state machine + game action wrappers for online play
  components/
    App.jsx               # Routing: showHighscores + showSetup + showRules + showOracle + showOnlineLobby + showInsights + showScanner (opened via ?scanner URL param)
    StartScreen           # Hero layout (orange/cream split), mode cards, utility links
    PlayerSetupScreen     # Local multiplayer setup — player count (2–4) + name inputs
    OnlineLobbyScreen     # Online multiplayer lobby — create/join room, waiting room UI
    RulesScreen           # Standalone rules page (marketing header style)
    OracleScreen          # Standalone Oracle sandbox (marketing header style)
    AppInsightsScreen     # Analytics dashboard — visitor stats, games played, score averages, scorecard %s
    GameBoard             # Two-column layout; Oracle always in left column
    MultiplayerStandings  # Header badge strip (names + active indicator, no scores)
    MultiplayerGameOverScreen  # Ranked results table + per-player leaderboard submit
    DiceArea              # 5-die tray + Roll button + roll-counter pips
    Dice                  # Single die button
    DiceFace              # SVG pip renderer (pure, no state); accepts strokeWidth prop
    Scorecard             # 7×4 scoring table + footer totals strip
    TheOracle             # Left-column advisor — BPIV recommendations, Show/Hide, On/Off
    GameOverScreen        # Single-player game over + leaderboard submit
    HighscoresScreen      # Full leaderboard (This Week / Month / Year tabs)
    HighscoresCard        # Compact "This Week's Top 3" widget in GameBoard right column
    BalutToast            # Fixed-position celebration toast (2.8 s)
    AchievementToast      # Sequential unlock-toast queue (achievement / personal-best / milestone + guest nudge)
    AchievementsPanel     # Profile section: streak cards, badge grid, progression bars
    ProfileScreen         # "My Profile" — stats, history, + AchievementsPanel
  scanner/            # OCR scorecard scanner (see Scorecard Scanner section below)
    ScannerScreen.jsx     # Step machine: capture → processing → review → done | error
    capture/              # ScannerCamera.jsx (entry + live camera + photo editor), useCamera.js
    ocr/                  # ocrSpace.js (OCR.space call), cellMapper.js (+ __tests__/)
    review/               # ScannerReview.jsx, CellEditor.jsx, ScorecardDisplay.jsx
    errors/               # errorLog.js, ErrorLogPanel.jsx (debug log, bottom-left toggle)
    validators.js         # isInvalid(category, value) — exact legal-score check, enumerated from logic/scoring.js
  styles/
    theme.css             # All CSS custom properties (colors, fonts, radii, shadows)
```

---

## Architecture rules

### Game logic is strictly separated from UI
`src/logic/` contains only pure functions with zero React imports. **Never import React into logic files.**

### State lives in one place
`useGameState.js` owns all game state via `useReducer`. Components receive data and callbacks as props.

### State shape
```js
{
  phase:              'start' | 'playing' | 'gameover',
  players:            [{ name: string, scorecard: { [cat]: [null|number, ×4] } }, ...],
  currentPlayerIndex: number,
  showHandoff:        bool,
  dice:               [{ value: 0–6, held: bool }, ×5],
  rollsLeft:          0–3,
  turnNumber:         number,
  oracleEnabled:      bool,     // controls Show/Hide state of Oracle panel
  justScoredBalut:    bool,
  pendingScore:       null | { category, column, score, originalDice, nextPlayerIdx? },
  //                  nextPlayerIdx is only set in multiplayer (who the handoff addresses)
  featFlags:          {},      // transient per-game achievement flags (e.g. { one_roll_wonder: true })
}
```

Single player uses `players.length === 1` — no separate code path.

### Actions in `useGameState.js`
| Action | Effect |
|---|---|
| `START_GAME` | Single-player game; `players: [{ name: 'You', scorecard: empty }]` |
| `SETUP_MULTIPLAYER({ names })` | Multiplayer; builds `players[]` from names array |
| `ROLL` | If `pendingScore` set (single player only): commits it via `applyScore`, then auto-rolls. Otherwise: rerolls unheld dice, decrements rollsLeft. |
| `TOGGLE_HOLD` | Toggles held flag on a die. Blocked while `pendingScore` is set. |
| `PENDING_SCORE({ category })` | **Single player**: stores `pendingScore`, clears dice, resets rollsLeft. Second click same cell = cancel. Click different cell = move. **Multiplayer**: commits immediately via handoff (see below). Last turn always calls `applyScore` directly. |
| `DISMISS_HANDOFF` | If `pendingScore` exists: commits it via `applyScore` then clears handoff. Otherwise just clears handoff. |
| `CANCEL_PENDING` | Clears `pendingScore` + `showHandoff`, restores original dice, sets rollsLeft→0. |
| `PLAY_AGAIN` | Rematch: rebuilds fresh scorecards for the same players, resets everything else to `playing` (used by online host rematch) |
| `GO_HOME` | Full reset |
| `TOGGLE_ORACLE` | Toggles Oracle panel open/closed |

Note: `CANCEL_PENDING` / the cancel branch in `PENDING_SCORE` now restore `prevDice` + `prevRollsLeft` (captured when the pending score was placed) so cancelling keeps the player's remaining rolls.

### App routing
`App.jsx` uses six local booleans (`showHighscores`, `showSetup`, `showRules`, `showOracle`, `showOnlineLobby`, `showInsights`) alongside the reducer phase and `onlineGame.connectionPhase`. `hsContext` ('home' | 'game') tracks which context opened the leaderboard so the back button label is correct. Submission tracking (`scoreSubmitted`, `mpSubmittedNames`) is lifted here so it survives navigating to the leaderboard and back.

Online game rendering bypasses the reducer entirely: when `onlineGame.connectionPhase` is `'playing'` or `'reconnecting'`, `GameBoard` receives `onlineGame.state` and `onlineGame.*` action handlers instead of the local reducer's.

### Scoring categories
`fours | fives | sixes | straight | fullHouse | choice | balut`  
Each has 4 columns. **Column fill direction depends on score value:**

| Category | "High" threshold | Fill direction |
|---|---|---|
| Fours | ≥ 16 | rightmost empty column |
| Fives | ≥ 20 | rightmost empty column |
| Sixes | ≥ 24 | rightmost empty column |
| Straight | 20 (high straight) | rightmost empty column |
| Full House / Choice / Balut | — | always leftmost |

Use `getTargetColumn(scorecard, category, score)` (exported from `scoring.js`) to get the target column index.

---

## Local Multiplayer

- 2–4 players on a shared device; free choice of category each turn
- **Setup**: "Local Multiplayer" → `PlayerSetupScreen` → `SETUP_MULTIPLAYER`
- **Turn flow**: roll → click score cell → **handoff screen appears immediately** (no Roll Dice confirm needed) → next player can either dismiss ("Start [Name]'s Turn") to confirm the score, or cancel ("← Cancel score") to return to the scorecard
- **Scorecard header** shows the current player's name
- **Player tabs**: active player gets 🎲 emoji. Tab for viewed scorecard gets highlighted background.
- **Header** (`MultiplayerStandings`): shows player name badges on desktop only — hidden on mobile
- **Mobile**: player tabs (with name + pts) serve as the only active-player indicator
- **Scorecard toggle**: player tabs let any player peek at others' scorecards (read-only)
- **Game over**: `MultiplayerGameOverScreen` shows ranked table; each qualifying score gets its own leaderboard submit prompt

---

## Online Multiplayer

Real-time multiplayer via Supabase Realtime (Broadcast + Presence). 2–4 players on separate devices.

### Key files
- `src/services/onlineGame.js` — all Supabase DB + Realtime calls (pure, no React)
- `src/hooks/useOnlineGame.js` — connection state machine + game action wrappers
- `src/components/OnlineLobbyScreen.jsx` — create/join room + waiting room UI

### Supabase table: `online_games`
`id` (uuid), `room_code` (char 6, unique), `host_session` (text), `player_sessions` (jsonb array of `{sessionId, name, playerIndex}`), `state` (jsonb — full game state snapshot), `status` (`lobby` | `playing` | `gameover` | `abandoned`), timestamps. RLS: open read/insert/update (anonymous, no auth).

### Sync model
Action-based: active player dispatches locally + broadcasts the action via `game:{ROOMCODE}` channel. Other clients receive and dispatch to their local reducer (same pure reducer, deterministic). Full state snapshot is persisted to DB after each action for reconnection recovery (`__RESTORE__` action in `useGameState.js`).

### Connection phases
```
idle → creating → lobby-host → playing
idle → joining  → lobby-guest → playing
playing ↔ reconnecting  (channel drop/restore: fetches snapshot from DB)
```

### Play-again & reconnect
- **Play again (host-controlled rematch)**: host taps "Play again" on the online game-over screen → `useOnlineGame.playAgain()` dispatches+broadcasts `PLAY_AGAIN` (rebuilds fresh scorecards for the same players, keeps the room). Non-hosts see "Waiting for the host to start a rematch…". `App.jsx` re-arms submission prompts on the gameover→playing transition.
- **Reconnect on reload**: session identity is in **`localStorage`** (`balut_session_id`), and the active room code is saved to `localStorage` (`balut_active_room`) while playing. On mount `useOnlineGame` starts in a `restoring` phase (App shows a neutral "Reconnecting…" loader — never the lobby), fetches the snapshot, restores state, reopens the channel, and goes straight to `playing`. Cleared on `leaveRoom`.

### Known limitations
- No turn timer — game stalls if a player disconnects mid-turn
- Race condition in `joinRoom` (read-modify-write on `player_sessions`) — acceptable for low-concurrency

---

## User Accounts (Auth & Profile)

Email + password via **Supabase Auth** (passwords stored only as a salted hash — never visible). Accounts are **optional**: guests play exactly as before. Session persists in `localStorage`, so users stay logged in.

### Key files
- `src/services/auth.js` — `signUp/signIn/signOut/getSession/fetchProfile/onAuthChange`; all no-op/throw friendly when Supabase absent.
- `src/hooks/useAuth.js` — session + profile mirror; lifted in `App.jsx`, passed down. Exposes `{ user, profile, username, loading, available, signIn, signUp, signOut }`.
- `src/components/AuthScreen.jsx` — login/sign-up (toggled by `showAuth` in App).
- `src/components/ProfileScreen.jsx` — "My Profile": games played, personal best, averages, scorecard rates, recent-games history (`showProfile` in App). Data via `services/profile.js` + `fetchInsights(userId)`.
- Account control in `StartScreen` header: "Log in" → `AuthScreen`; "{username}" chip → `ProfileScreen`.

### DB — `db/001_auth_profiles.sql` (✅ APPLIED 2026-06-08 to the live Supabase project; do not re-run)
- `profiles` (`id`=auth uid, `username` citext unique) — created by an `on_auth_user_created` trigger from signup metadata. RLS: usernames public-readable, self-update only.
- `scores` gains `user_id` (uuid) + `is_guest` (bool).
- **Email confirmation is OFF** in Supabase Auth (so signup → immediate session → "stay logged in"). If signups ever stop creating a session, check this setting first.

### Score identity & submission
- **Logged-in**: every finished game **auto-saves** (stamped `user_id`, `is_guest=false`, username) — to profile history *and* leaderboard, no form.
- **Guest**: existing manual qualify→name→submit flow (`is_guest=true`).
- Leaderboard tags: accounts show a ✓; guests show a "guest" tag (`HighscoresScreen`/`HighscoresCard`).
- **Insights** (`fetchInsights(userId)`): all-players always; when logged in, a per-user `user` block enables the all-players-vs-you side-by-side view. `game_completed` events carry `userId` for per-user scorecard rates. Each player's game is tracked separately (local: each player; online: each device its own).

## Achievements & Gamification

Solo-play gamification to drive engagement. Full design in `docs/gamification-spec.md` (source of truth for every badge definition).

### Layers
- **Feat badges** (11, one-time) — derived from one game's final scorecard, e.g. `first_balut`, `balut_hoarder`, `the_long_road`, `spoilt_for_choice` (choice total > 110), `four_by_four` (one badge, lights up on any of fours/fives/sixes at 4-of-a-kind), `the_tent` (full house = 7), `campsite`, `big_roller` (≥500 small), `clean_sheet`, `the_perfect_game`, plus `one_roll_wonder` (Balut on the first roll — the only live-detected feat).
- **Progression → one overall Collector tier** (bronze/silver/gold/platinum). A tier is reached only when **all three** metrics — `games_played` (10/50/100/500), `lifetime_baluts` (10/50/100/500), `lifetime_big_points` (100/500/2000/5000) — meet that tier's threshold (`overallTier(stats)` in `evaluate.js`). Thresholds ascend, so reached tiers are contiguous (badge earned iff `tier <= current`). Counters are **derived from `scores`**, never stored; the overall tier persists as `overall_progress`. (The old per-metric badges and `weeks_active` were removed.)
- **Streaks/competitive** — `play_streak` + `leaderboard_streak` (weekly Mon–Sun, **no grace**; in-progress current week never breaks), `first_blood` (first time at **#1** on any board), `top_of_the_week` (#1 in a week), `top_of_the_month` (#1 in a calendar month).
- **Toasts** — personal-best + overall-tier toasts via `AchievementToast`.

### Pure logic — `src/logic/achievements/` (zero React, mirrors `oracle/`)
`evaluateFeats({ scorecard, featFlags })`, `computeStats(scores)`, `evaluateProgression(stats)`; weekly streak math in `streaks.js` (`weekIndex` = absolute Monday-based integer index, so streaks are integer-adjacency on a Set). 26 Vitest tests.

### Detection / wiring
- **`one_roll_wonder`** is raised in the reducer (`useGameState.js`) when a Balut is scored with `rollsLeft === MAX_ROLLS - 1`, written to transient `state.featFlags`. Everything else derives from the final scorecard.
- **`App.jsx`** runs a solo-only (`players.length === 1`) game-over effect → `processSoloGame()`. For logged-in users it waits for `scoreSubmitted` (the auto-save) so lifetime aggregates include the game; guests process immediately. Results are queued into `achievementQueue` and shown by `<AchievementToast>`. The screen branches are wrapped in an IIFE (`const screen`) so the toast overlays every screen.

### Service — `services/achievements.js`
`processSoloGame()` (award + persist: Supabase `achievements` table for logged-in, `localStorage 'balut_achievements'` for guests) and `loadProfileAchievements(user, username)` → `{ feats, competitive, overall, trackers, play, leaderboard }` (feeds `AchievementsPanel`). `fetchCompetitive(username, since)` groups `scores` by week (top-10 → streak presence + weekly #1) and by calendar month (monthly #1), matching logged-in scores by `player_name === username && !is_guest`. Safe no-ops when Supabase absent (guests still work). `loadProfileAchievements` is logged-in only (the profile is login-gated).

### Profile UI — `AchievementsPanel.jsx`
Three sections: **Collector** (a 4-medallion tier rail linked by a progress line — serif Roman numerals, metallic gradients, ✓ disc when reached — above three per-metric trackers), **Streaks** (two cards: serif current number + longest, watermark glyph, live-state accent), and the **Achievements** badge grid (feats + competitive, earned/locked). Styling in `AchievementsPanel.css`, all on Scandinavian-Warmth tokens.

### DB — `db/002_achievements.sql` (✅ APPLIED to live Supabase; do not re-run)
`achievements` (`user_id`, `achievement_id`, `tier` smallint [0 = one-time feat; 1..4 = bronze..platinum, highest reached], `unlocked_at`), PK `(user_id, achievement_id)`. RLS: public SELECT (profiles show badges), self-only insert/update.

### Guest nudge
Profile is login-gated, so guests have no badge grid. The only guest nudge is a "Sign up to save your badges →" line appended to the **first** unlock toast a guest ever sees (tracked by `localStorage 'balut_achv_nudged'`), opening the auth screen.

## The Oracle

The Oracle is a statistically rigorous advisor in `src/logic/oracle/`. It ranks every possible action by **BPIV (Big Point Incremental Value)** — the expected big-point gain vs. a baseline of scoring the Definition-B expected average in that cell.

### Public API
```js
recommend({ currentDice, rollsRemaining, scorecard, turnsRemaining? })
// Returns:
// {
//   actions: [{ rank, type, category?, held?, description, bpiv,
//               breakdown: {categoryBigDelta, bonusBigDelta},
//               tooltipOutcomes, isForcedAction? }],
//   isAllNegative:  bool,
//   isForcedAction?: bool,
//   recommendedRank: 1,
// }
```

### Oracle UI
- Lives in the left column of `GameBoard` (always — not split between mobile/desktop)
- **Show/Hide** toggle collapses/expands the recommendations panel (`oracleEnabled` in state)
- **Turn on/off**: `oracleOn` is lifted to `GameBoard` (passed to `TheOracle` as `oracleOn`/`onPowerToggle`). When **on**, the panel sits in the left column. When **off**, the "The Oracle is turned off / Turn on" bar stays in the **left column on desktop** and drops *below the Scorecard* (right column) on **mobile (≤800px)** — rendered twice via paired `oracle-off-slot--desktop` / `--mobile` wrappers, CSS-gated so only one shows. Resets to `on` on remount (new game).

### How BPIV works
```
BPIV(action) = categoryBigDelta + bonusBigDelta
```
- **categoryBigDelta**: change in P(threshold met) × big points at stake, vs. baseline
- **bonusBigDelta**: change in E[end-game bonus], vs. baseline
- **Baseline**: `EXPECTED_SCORE_PER_COLUMN[category]` (Definition-B, no discount)

### P(threshold) by category type

**Sum types (fours, fives, sixes, choice)** — discrete convolution CDF from `distributions.js`:
```
P(threshold met) = 1 − SUM_CDF[cat][K][⌈threshold − newSum⌉ − 1]
```
Choice uses `CHOICE_MIXED_CDF[K]` instead — a two-regime mixture model (see below).

**Last-column baseline (K = 0):** uses `SUM_CDF[cat][1]` (single-column Oracle distribution) rather than the expected-value point estimate, giving correct `pBaseline` when the mean falls below the remaining threshold.

**Filled types (straight, fullHouse)** — binomial time-pressure model:
```
available_attempts = turnsRemaining × ATTEMPT_FRACTION[cat]
P(threshold met) = 1 − BinomialCDF(K − 1, available_attempts, P_COMPLETE_IN_3_ROLLS[cat])
```

**Balut** — expected big points (linear per filled column):
```
E[balutBigPts] = 2 × (filledPositive + thisColPositive + min(remainingCols, futureAttempts × p))
```

### Definition-B constants (`constants.js`)
```js
EXPECTED_SCORE_PER_COLUMN = {
  fours: 10.50, fives: 13.01, sixes: 14.21,
  straight: 7.17, fullHouse: 14.70, choice: 25.06, balut: 6.30,
};
P_COMPLETE_IN_3_ROLLS = { straight: 0.25, fullHouse: 0.35, balut: 0.046 };
ATTEMPT_FRACTION      = { straight: 0.25, fullHouse: 0.35, balut: 0.30 };
```

### Choice: two-regime mixture model (`distributions.js`)
`CHOICE_MIXED_CDF[K]` — high regime (Oracle-directed ≥ 25, q ≈ 0.636) mixed with low regime (forced fill, mean 23.13). Precomputed for K = 1..4.

### Simulation tooling (`scripts/`)
```powershell
npm.cmd run simulate   # Oracle-directed 10 000-game sim
npm.cmd run validate   # 6 hand-traced BPIV scenarios (spot-check after any Oracle change)
```

### Oracle Sandbox page
`OracleScreen.jsx` — standalone page. User sets 5 dice (click to cycle 1→6) and rolls remaining. Oracle runs live. Scorecard defaults to empty.
- TODO Phase 2: manual scorecard cell editor
- TODO Phase 3: OCR scanner

### Tests
115 Vitest tests in `__tests__/`. Run with `npm.cmd run test`.

---

## Highscore Leaderboard

### Backend: Supabase
- **Project URL**: `https://ehpguosbtfnrfttghcnz.supabase.co`
- **Table `scores`**: `id`, `player_name` (max 20), `big_points`, `small_points`, `balut_count`, `created_at`, `user_id` (nullable → auth user), `is_guest` (bool) — no `player_count` column; multiplayer scores submit identically to single-player
- **Table `events`**: `id`, `type` (text), `metadata` (jsonb), `created_at` — stores `page_view` and `game_completed` events for the Insights screen
- **Sort**: `big_points DESC, small_points DESC, balut_count DESC`
- **Time windows**: weekly (Mon–Sun) / monthly / yearly filtered at query time
- **RLS**: anonymous SELECT + INSERT; no auth required

### Credentials
In `.env.local` (gitignored) and Vercel env vars:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

### Submit flow
`checkQualifies()` → qualifying periods → name input → `submitScore()`. Last-used name in `localStorage` (`balut_player_name`).

---

## Visual theme — Scandinavian Warmth

Fonts loaded via Google Fonts in `index.html`: **Newsreader** (serif, italic headlines) + **Work Sans** (sans, UI).

All tokens in `src/styles/theme.css`. Key palette:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f6f1e8` | Page background (warm cream) |
| `--color-surface` | `#fbf7ef` | Cards / panels |
| `--color-surface-2` | `#ede4d3` | Inset strips, footer backgrounds |
| `--color-accent` | `#c97a4a` | Terracotta — primary accent, held dice, CTAs |
| `--color-ink` | `#2a2620` | Dark warm near-black |
| `--color-danger` | `#a44a2c` | Zero scores, negative values |
| `--font-serif` | Newsreader, Georgia | Italic headlines, large numbers |
| `--font-sans` | Work Sans, system-ui | Body, UI |

Legacy aliases (`--color-parchment`, `--color-felt`, `--color-gold`, etc.) are kept in theme.css pointing to new tokens so any unconverted code still compiles.

### GameBoard layout
Two columns on desktop: left (DiceArea + TheOracle + player tabs), right (Scorecard + HighscoresCard). Single column on mobile. Oracle is always mounted in the left column — **no `useIsNarrow` split**, so there is no duplicate SVG gradient ID risk.

### Scorecard cell states
- **Available cell**: cream background (`--color-cell-ok`) — valid score, not great
- **Great cell**: green background (`#d4ecd4`, green text `#3a7a3a`) — Fours ≥ 12, Fives ≥ 15, Sixes ≥ 18, Straight/Full House any > 0, Choice ≥ 25, Balut any > 0
- **Zero cell**: red-tinted background — invalid pattern, forced 0
- **Pending cell**: solid black outline — score placed but not yet locked (single player only; multiplayer commits immediately via handoff)
- All interactive cells use `cursor: pointer`; dice use `cursor: default` when no rolls remain

### Scorecard totals
No `<tfoot>` in the table. Totals shown in a `.scorecard-footer` strip below the table: Small (with bonus hint) / Bonus / Grand Total (Big). On mobile, the Big label shortens to "Grand Total" with "big points" in small text beside the number.

### DiceFace
Accepts optional `strokeWidth` prop (default `1.5` SVG units). Oracle recommendation dice use `size={23}` and `strokeWidth={3}` for better visibility at small size.

### Start screen
Hero split: terracotta left panel (headline, dice tableau) + cream right panel (mode cards, utility links). Logo mark inverted to white-on-terracotta on desktop (visible over orange); reverts to standard terracotta-on-white on mobile (header is over cream background).

### Full-page screens
Rules, Oracle sandbox, and Leaderboard all use a consistent marketing header: balut logo left, contextual back button right. Back button reads "← Back to home" from the start screen, "← Back to game" from GameBoard.

---

## Scorecard Scanner (OCR)

Scans a handwritten Balut scorecard photo and produces a `{ [category]: [null|number ×4] }` scorecard.
Lives in `src/scanner/`. Opened via the `?scanner` URL param (`App.jsx` → `<ScannerScreen onClose=…>`).
**Note:** an older standalone copy exists at the repo-sibling `scorecard-scanner/` — it is NOT the live one; always edit `balut-app/src/scanner/`.

### Pipeline
`ScannerScreen.jsx` step machine: `capture → processing → review → done | error`. On capture it calls
`recognizeGrid` (OCR.space Engine 2 handwriting, key `VITE_OCR_SPACE_KEY` in `.env.local`) → `mapOcrToGrid` → `cellsToScorecard` + `buildFlaggedCells`. Every scan is logged to `localStorage` (`scorecard_ocr_log`, 20 max) and viewable via the bottom-left **Debug log** toggle (`ErrorLogPanel`).

### Capture (`capture/ScannerCamera.jsx`)
Refactored into `useOverlay` hook + `OverlayBox` + `LiveCamera` + `PhotoEditor`. Entry screen offers two paths:
- **Take photo** (mobile only — gated on `getUserMedia` + `(pointer: coarse)`): in-app live `getUserMedia` preview with a **landscape-only** ghost overlay (drag + resize) and a shutter button. Captures via `useCamera.capture()`; no rotation.
- **Upload photo** (all devices): pick an existing file → `PhotoEditor` shows the static image with the 3-way orientation toggle, drag, resize, then Scan.

### Orientation & overlay
Orientations: `landscape | portrait-r | portrait-l`. Overlay labels are arranged so **4s and #1 always meet at the top-left** corner (landscape = categories down the left as 7 rows, players #1–#4 across the top; portrait transposes to 4 rows × 7 cols but keeps 4s/#1 top-left). Portrait crops are rotated upright for OCR (`rotateCCW` for portrait-r, `rotateCW` for portrait-l). `mapOcrToGrid(resp, w, h, orientation)` then undoes the axis the rotation reversed: **portrait-r reverses the category axis**, **portrait-l reverses the player axis**. (If a real scan ever comes out mirrored, swap that axis — it's the two `orientation === 'portrait-*'` lines in `cellMapper.js`.)

### Cell parsing & flagging (`ocr/cellMapper.js`)
- Cell shape: `{ value: number|null, rawText, dirty, zero }` — **no `confidence`** (OCR.space Engine 2 returns no reliable per-word confidence; the old hardcoded `0.5` made every cell read "50% / low", so it was removed).
- A token matching `/^[-–—xX×]+$/` (dash variants / x) is read as a deliberate **0**. A real number overrides a marker-0 in the same cell; first non-null wins on ties.
- `dirty` = the token needed non-digit stripping (e.g. `"l2"` → 2) — flagged as uncertain.
- `buildFlaggedCells` reasons: **`invalid`** (not a legal score for that category → RED, **blocks Confirm**), **`empty`** / **`ambiguous`** (→ YELLOW, non-blocking). `ScannerReview` recomputes flags live from edited values, so fixing a cell clears its flag; Confirm is disabled while any red remains.
- `validators.js` `isInvalid` enforces **true per-category legality**, not a coarse range: it enumerates all 7776 dice rolls through `logic/scoring.js` `calculateScore` once at load and checks membership (e.g. fours ∈ {0,4,8,12,16,20}, straight ∈ {0,15,20}, balut ∈ {0,25,30,35,40,45,50}, full house = 0 or an achievable 3a+2b sum — note 10 and 25 are impossible). `0` is always legal (scratch). Single source of truth — stays in sync if scoring rules change.
- Logic unit tests: `ocr/__tests__/cellMapper.test.js`.

---

## Roadmap

- **Oracle Sandbox Phase 2**: manual per-cell scorecard editor in `OracleScreen`
- **Oracle Sandbox Phase 3**: ✅ OCR scanner built (`src/scanner/`, see Scorecard Scanner section) — still TODO: wire it into a visible button (currently only reachable via `?scanner`) and feed its output into the sandbox/game
- **Online multiplayer v2**: ✅ play-again rematch + reconnect-on-reload done (see Online Multiplayer section); still TODO: turn timer to handle disconnects

---

## Responsive breakpoints

| Breakpoint | Layout change |
|---|---|
| ≤ 800px | Single-column layout; header MultiplayerStandings hidden (player tabs serve instead); start screen hero stacks vertically |
| ≤ 480px | Scorecard column widths tighten (category 26%); font sizes reduce |
