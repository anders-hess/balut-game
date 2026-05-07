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
      __tests__/          # 113 Vitest unit tests
  services/           # External service integrations
    supabase.js           # Supabase client singleton (null when .env.local absent)
    highscores.js         # fetchLeaderboard(), checkQualifies(), submitScore()
  hooks/
    useGameState.js       # useReducer — all game actions including multiplayer
  components/
    App.jsx               # Routing: showHighscores + showSetup + showRules + showOracle
    StartScreen           # Landing page — game modes + Oracle + Rules + Leaderboard buttons
    PlayerSetupScreen     # Multiplayer setup — player count (2–4) + name inputs
    RulesScreen           # Standalone rules explanation page
    OracleScreen          # Standalone Oracle sandbox (set dice, get advice)
    GameBoard             # Two-column layout; useIsNarrow() hook for responsive Oracle
    MultiplayerStandings  # Header badge strip (names + active indicator, no scores)
    MultiplayerGameOverScreen  # Ranked results table + per-player leaderboard submit
    DiceArea              # 5-die tray + Roll button + pip counter
    Dice                  # Single die button
    DiceFace              # SVG pip renderer (pure, no state)
    Scorecard             # 7×4 scoring table + footer totals bar
    TheOracle             # Sidebar/inline advisor — BPIV recommendations + tooltips
    GameOverScreen        # Single-player game over + leaderboard submit
    HighscoresScreen      # Full leaderboard (This Week / Monthly / Yearly tabs)
    HighscoresCard        # Compact "This Week's Top 3" widget in GameBoard right column
    BalutToast            # Fixed-position celebration toast (2.8 s)
  styles/
    theme.css             # All CSS custom properties (colors, fonts, radii, shadows)
```

**Note:** `HandoffOverlay.jsx/.css` still exist in the file system but are no longer imported or used — the handoff is now integrated inline into the dice area section of `GameBoard.jsx`. Safe to delete.

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
  currentPlayerIndex: number,   // index into players[]
  showHandoff:        bool,     // true after SCORE in multiplayer; cleared by DISMISS_HANDOFF
  dice:               [{ value: 0–6, held: bool }, ×5],
  rollsLeft:          0–3,
  turnNumber:         number,
  oracleEnabled:      bool,     // initialised to window.innerWidth > 800 (open on desktop, closed on mobile)
  justScoredBalut:    bool,
}
```

Single player uses `players.length === 1` — no separate code path.

### Actions in `useGameState.js`
| Action | Effect |
|---|---|
| `START_GAME` | Single-player game; `players: [{ name: 'You', scorecard: empty }]` |
| `SETUP_MULTIPLAYER({ names })` | Multiplayer; builds `players[]` from names array |
| `ROLL` | Rerolls unheld dice, decrements rollsLeft |
| `TOGGLE_HOLD` | Toggles held flag on a die |
| `SCORE` | Scores for current player; rotates to next unfinished player; sets `showHandoff: true` in multiplayer |
| `DISMISS_HANDOFF` | Clears `showHandoff` |
| `GO_HOME` | Full reset |
| `TOGGLE_ORACLE` | Toggles Oracle panel |

### App routing
`App.jsx` uses four local booleans (`showHighscores`, `showSetup`, `showRules`, `showOracle`) alongside the reducer phase. Each triggers a full-screen replacement component. Submission tracking state (`scoreSubmitted`, `mpSubmittedNames`) is also lifted here so it survives navigating to the leaderboard and back.

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

Use `getTargetColumn(scorecard, category, score)` (exported from `scoring.js`) to get the target column index. `nextColumn` is still exported for the "is row full?" check.

---

## Local Multiplayer

- 2–4 players on a shared device; free choice of category each turn
- **Setup**: "Local Multiplayer" → `PlayerSetupScreen` (player count + names) → `SETUP_MULTIPLAYER`
- **Turn flow**: roll → score → inline handoff prompt replaces dice area → next player dismisses it → their turn begins. (No full-screen overlay — `HandoffOverlay` component is unused.)
- **Scorecard header** shows the current player's name: "Scorecard – Anders"
- **Player tabs**: active player gets dice emoji (🎲) only — no background highlight. Tab for the currently *viewed* scorecard gets yellow background.
- **Top bar** (`MultiplayerStandings`): shows player names + active indicator only. No live score numbers in the header.
- **Scorecard toggle**: player tabs above the scorecard let any player peek at others' scorecards (read-only); resets to current player on each turn change
- **Game over**: `MultiplayerGameOverScreen` shows ranked table; each qualifying score gets its own leaderboard submit prompt

---

## The Oracle

The Oracle is a statistically rigorous advisor in `src/logic/oracle/`. It ranks every possible action by **BPIV (Big Point Incremental Value)** — the expected big-point gain vs. a baseline of scoring the Definition-B expected average in that cell.

### Public API
```js
recommend({ currentDice, rollsRemaining, scorecard, turnsRemaining? })
// turnsRemaining defaults to 28 − filled cells if omitted.
// Returns:
// {
//   actions: [{ rank, type, category?, held?, description, bpiv,
//               breakdown: {categoryBigDelta, bonusBigDelta},
//               tooltipOutcomes, isForcedAction? }],
//   isAllNegative:  bool,
//   isForcedAction?: bool,   // true when only one cell remains and rollsRemaining=0
//   recommendedRank: 1,
// }
```

**Forced-action shortcut**: when `rollsRemaining === 0` and exactly one cell is unfilled, `recommend()` returns `{ isForcedAction: true, actions: [{ bpiv: 0 }] }` immediately — the player has no decision to make.

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

**Filled types (straight, fullHouse)** — binomial time-pressure model:
```
available_attempts = turnsRemaining × ATTEMPT_FRACTION[cat]
P(threshold met) = 1 − BinomialCDF(K − 1, available_attempts, P_COMPLETE_IN_3_ROLLS[cat])
```
Effect: with few turns left, scoring a valid pattern NOW has high BPIV; early in the game it's lower (you'll probably fill it eventually anyway).

**Balut** — expected big points (linear per filled column):
```
E[balutBigPts] = 2 × (filledPositive + thisColPositive + min(remainingCols, futureAttempts × p))
```

### Definition-B constants (`constants.js`)
Values from Oracle-directed Monte Carlo, iteration 2 (10 000 games).

```js
EXPECTED_SCORE_PER_COLUMN = {
  fours: 10.50, fives: 13.01, sixes: 14.21,
  straight: 7.17, fullHouse: 14.70, choice: 25.06, balut: 6.30,
};

VARIANCE_PER_COLUMN = {
  fours: 11.79, fives: 19.11, sixes: 30.96,
  straight: 71.34, fullHouse: 83.49, choice: 4.12, balut: 232.63,
};

P_COMPLETE_IN_3_ROLLS = { straight: 0.25, fullHouse: 0.35, balut: 0.046 };

// Calibrated from empirical completion rates (10k games):
//   straight 5.7%,  fullHouse 70.7%,  balut 0.07%
ATTEMPT_FRACTION = { straight: 0.235, fullHouse: 0.457, balut: 0.351 };

// Turn-aware baseline (new in Phase 3):
effectiveExpected(cat, turnsRemaining) = EXPECTED[cat] × (0.6 + 0.4 × t/28)
// Shrinks the baseline late-game when forced fills are inevitable.
// t=28→1.0×, t=14→0.8×, t=5→0.67×
```

**No BASELINE_DISCOUNT** — `thresholds.js` uses `effectiveExpected(cat, turnsRemaining)` for `BASELINE_SCORE`, scaling with game stage.

### Choice: K−1 oracle + 1 forced column model (`distributions.js`)
The Oracle scores choice selectively (waits for good dice) for the first K−1 fills, but the final fill is always forced. This models the reality that you can't indefinitely defer the last choice column.

- **Columns 1 to K−1**: score drawn from the full Oracle-directed PMF (mean ~25)
- **Column K** (last): score drawn from isolated keep-≥4 simulation (FORCED_CHOICE_PMF, mean 23.13)

`CHOICE_MIXED_CDF[K]` = `toCDF(conv(oraclePMF^(K-1), forcedPMF))`, precomputed at module load.
- K=1: just forcedPMF (must score regardless)
- K=2: conv(oracle, forced)
- K=3: conv(oracle², forced)
- K=4: conv(oracle³, forced)

This lowers P(choice threshold) compared to treating all columns as Oracle-directed, especially for K=2.

**Deferred (Phase 3)**: turn-aware baselines — `EXPECTED_SCORE_PER_COLUMN[cat] × (0.6 + 0.4 × t/28)`. Currently a flat per-game mean is used for all categories' baselines regardless of when the column is filled.

### Tooltip outcome grouping (`outcomes.js`)
- **Choice** splits into two rows based on score vs baseline:
  - General game: **"Choice ≥ 25"** / **"Choice < 25"**
  - Last column (K=1): **"Choice ≥ N (threshold!)"** / **"Choice < N"** (N = 100 − currentChoiceSum)
- **Full House**: collapses all score variants into one row (combined probability)
- **Balut**: "Missed Balut" only when all categories score 0

### Simulation tooling (`scripts/`)
```powershell
npm.cmd run simulate   # Oracle-directed 10 000-game sim + isolated P_complete trials
                       # Outputs: EXPECTED_SCORE_PER_COLUMN, VARIANCE_PER_COLUMN,
                       # P_COMPLETE, fixed-point ratios, Oracle PMF, forced-choice PMF
npm.cmd run validate   # 6 hand-traced BPIV scenarios (spot-check after any Oracle change)
```

### Oracle Sandbox page
`OracleScreen.jsx` — standalone page from landing. User sets 5 dice (click to cycle 1→6) and rolls remaining (0/1/2). Oracle runs live. Scorecard defaults to empty.
- TODO Phase 2: manual scorecard cell editor
- TODO Phase 3: OCR scanner to import a physical scorecard via photo

### Tests
113 Vitest tests in `__tests__/`. Run with `npm.cmd run test`.

### SVG gradient ID caution
`DiceFace` generates SVG gradient IDs as `dg-{dieIndex}-{0|1}`. **Never render two `TheOracle` instances simultaneously** — duplicate IDs corrupt die-face colours. `GameBoard` uses a `useIsNarrow()` hook (≤800px breakpoint) to mount exactly one Oracle instance at a time: in `board-left` on mobile, `board-right` on desktop.

---

## Highscore Leaderboard

### Backend: Supabase
- **Project URL**: `https://ehpguosbtfnrfttghcnz.supabase.co`
- **Table**: `scores` — `id`, `player_name` (max 20), `big_points`, `small_points`, `balut_count`, `created_at`
- **Sort**: `big_points DESC, small_points DESC, balut_count DESC`
- **Time windows**: **weekly** (Mon–Sun) / monthly / yearly filtered at query time
- **RLS**: anonymous SELECT + INSERT; no auth required

### Credentials
In `.env.local` (gitignored) and Vercel env vars:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
Client returns `null` gracefully when absent — leaderboard degrades silently.

### Submit flow
`checkQualifies(bigPts, smallPts, balutCount)` → returns qualifying periods → name input → `submitScore()`. Last-used name persisted in `localStorage` (`balut_player_name`).

**Duplicate submission prevention**: `scoreSubmitted` (single player) and `mpSubmittedNames` (multiplayer) are lifted to `App.jsx` state so they survive unmount when navigating to the leaderboard and back.

---

## Visual theme

All tokens in `src/styles/theme.css`:

| Token | Value | Use |
|---|---|---|
| `--color-parchment` | `#f5e6c8` | Scorecard, cards |
| `--color-felt` | `#274f22` | Page background |
| `--color-gold` | `#c9a84c` | Borders, highlights, Oracle |
| `--color-accent` | `#8b1a1a` | Buttons, headers, alerts |
| `--font-serif` | Georgia | Titles, labels |
| `--transition-fast` | `0.12s ease` | Buttons, dice |

### Scorecard cell states
- **Available cell**: yellow background (standard) or **green** if score meets "great" threshold (Fours ≥ 12, Fives ≥ 15, Sixes ≥ 18, Straight/Full House any > 0, Choice ≥ 25, Balut any > 0)
- **Zero cell** (invalid pattern, force-score 0): red-tinted background
- **Filled cell**: no tint — inherits standard row background
- A left border on the Sum column separates the 4 score columns from the summary columns

---

## Known cleanup items

*(none — HandoffOverlay.jsx/.css deleted, APPLY_HOLD reducer case removed)*

---

## Roadmap

- **Online multiplayer**: the `players[]` state shape is already multi-player aware; the main work is adding a real-time sync layer (WebSockets / Supabase Realtime) and a lobby/room system.
- **Oracle Sandbox scorecard input**: Phase 2 = manual per-cell editor; Phase 3 = OCR scanner (camera/image → filled scorecard state).
- **`scores` table**: no `player_count` column — multiplayer scores submit identically to single-player scores (ranking is player-agnostic).

---

## Responsive breakpoints

| Breakpoint | Layout change |
|---|---|
| ≤ 800px | Single-column layout; Oracle moves to between dice and scorecard; `useIsNarrow()` controls which Oracle instance mounts |
| ≤ 480px | Scorecard column widths tighten (category 26%) so BIG column fits; font sizes reduce |
