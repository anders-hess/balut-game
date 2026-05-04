# Balut App — Claude Context

## What this is
A single-player Balut dice game built with React + Vite. Multiplayer (local and online) is the planned next major feature; the game logic is already architected to support it.

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
Live at **https://balut-game.vercel.app** — connected to the `main` branch of `https://github.com/anders-hess/balut-game`. Every `git push origin main` triggers an automatic Vercel redeploy. No manual deploy steps needed.

---

## Project structure

```
src/
  logic/              # Pure game logic — NO React imports
    gameConstants.js      # NUM_DICE, MAX_ROLLS, NUM_COLUMNS, CATEGORIES, scoring rules
    gameState.js          # State factories, rollDice, toggleHold, resetTurn
    scoring.js            # calculateScore, calcTotals, calcBonus, isGameOver, etc.
    oracle/               # BPIV engine (see Oracle section below)
      index.js            # recommend() — public entry point
      bpiv.js             # bpivScoreNow(), bpivRerollAllHolds()
      recursion.js        # createMaxBpiv() memoized recursion, holdLabel()
      thresholds.js       # pThreshold(), expectedBonus()
      probabilities.js    # normalCDF, DIST combinatorics, uniqueSubsets()
      scoring.js          # scoreCell(), categoryCurrentSum(), etc.
      outcomes.js         # selectTop5Outcomes(), describeResult()
      constants.js        # Per-category statistics (Monte Carlo TODO — see Oracle section)
      __tests__/          # 92 Vitest unit tests
  services/           # External service integrations
    supabase.js           # Supabase client singleton (null when .env.local absent)
    highscores.js         # fetchLeaderboard(), checkQualifies(), submitScore()
  hooks/
    useGameState.js       # useReducer wrapping all game actions
  components/
    App.jsx               # Routing: showHighscores state + phase-based routing
    StartScreen           # Landing page — hero title, mode buttons, Leaderboard button
    GameBoard             # Two-column layout shell + header
    DiceArea              # 5-die tray + Roll button + pip counter
    Dice                  # Single die button (holds DiceFace, manages rolling class)
    DiceFace              # SVG pip renderer (pure, no state)
    Scorecard             # 7×4 scoring table + footer totals bar
    TheOracle             # Sidebar advisor panel — BPIV recommendations + tooltips
    GameOverScreen        # Final score summary + leaderboard submit flow
    HighscoresScreen      # Full leaderboard view (Daily / Monthly / Yearly tabs)
    HighscoresCard        # Compact "Today's Top 3" widget in GameBoard right column
    BalutToast            # Fixed-position celebration toast (2.8 s)
  styles/
    theme.css             # All CSS custom properties (colors, fonts, radii, shadows)
```

---

## Architecture rules

### Game logic is strictly separated from UI
`src/logic/` contains only pure functions with zero React imports. This is intentional for multiplayer — the same logic will drive multiple players. **Never import React into logic files.**

### State lives in one place
`useGameState.js` owns all game state via `useReducer`. Components receive data and callbacks as props; they do not hold game state locally.

### State shape
```js
{
  phase:            'start' | 'playing' | 'gameover',
  dice:             [{ value: 0–6, held: bool }, ×5],  // value 0 = unrolled
  rollsLeft:        0–3,
  scorecard:        { [category]: [null|number, ×4] },  // null = unfilled
  turnNumber:       number,   // 1-based
  oracleEnabled:    bool,     // true by default
  justScoredBalut:  bool,     // resets to false on next ROLL
}
```

### App routing
`App.jsx` uses a local `showHighscores` boolean (separate from game phase) to render `HighscoresScreen`. The game phase (`'start' | 'playing' | 'gameover'`) is owned by `useGameState`.

### Scoring categories (fill order matters — always left to right)
`fours | fives | sixes | straight | fullHouse | choice | balut`  
Each has 4 columns. `nextColumn(scorecard, category)` returns the next fillable index.

---

## The Oracle

The Oracle is a statistically rigorous advisor in `src/logic/oracle/`. It ranks every possible action by **BPIV (Big Point Incremental Value)** — the expected big-point gain of an action relative to a baseline of scoring the expected average in that cell.

### Public API
```js
import { recommend } from './src/logic/oracle/index.js';

recommend({ currentDice, rollsRemaining, scorecard })
// Returns: { actions: [...], isAllNegative: bool, recommendedRank: 1 }
// Each action: { rank, type, description, bpiv, breakdown, held, tooltipOutcomes }
```

### How BPIV works
```
BPIV(action) = categoryBigDelta + bonusBigDelta
```
- **categoryBigDelta**: change in P(category big-point threshold met) × big points at stake, vs. baseline
- **bonusBigDelta**: change in E[end-game small-points bonus], vs. baseline
- **Baseline**: scoring `EXPECTED_SCORE_PER_COLUMN[category]` in that cell
- BPIV = 0 → this action is no better or worse than an average roll

### Filtering
- If any action has BPIV > 0: show only positive-BPIV actions (max 5), sorted descending
- If all BPIV ≤ 0: show all actions sorted descending + `isAllNegative: true`

### REROLL recursion
`createMaxBpiv(scorecard)` returns a memoised function that finds the best achievable BPIV from any dice state and rollsRemaining. It considers ALL categories at every leaf node — holding 4-4-4 and rolling 4-4 correctly values the result as Balut, not Fours.

### Constants (important caveat)
`src/logic/oracle/constants.js` contains `EXPECTED_SCORE_PER_COLUMN` and `VARIANCE_PER_COLUMN`. These are **calibrated estimates, not true Monte Carlo values**. In particular:
- `fours: 12.5` and `choice: 23.0` are kept at these specific values to preserve the correct BPIV ordering for SPEC TEST 3 ("Hopeless Fours"). Changing them to their "intuitive" values (12 and 25) reverses the test outcome.
- `fives: 15.0` and `sixes: 18.0` reflect "three of face value" as the discrete baseline.
- A Monte Carlo simulation pass is needed before treating these as authoritative.

### Tests
92 Vitest tests in `src/logic/oracle/__tests__/`. Run with `npm.cmd run test`. Includes 8 spec integration tests (spec tests 1–8) covering Full House traps, threshold crossing, recursion correctness, and filtering logic.

---

## Highscore Leaderboard

### Backend: Supabase
- **Project URL**: `https://ehpguosbtfnrfttghcnz.supabase.co`
- **Table**: `scores` — columns: `id`, `player_name` (max 20 chars), `big_points`, `small_points`, `balut_count`, `created_at`
- **Time windows**: daily / monthly / yearly — filtered by `created_at` at query time (no cron jobs, data never deleted)
- **Sort order**: `big_points DESC, small_points DESC, balut_count DESC`
- **RLS**: anonymous SELECT and INSERT enabled; no auth required

### Credentials
Stored in `.env.local` (gitignored). Required vars:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
Both are also set as Vercel environment variables on the `balut-game` project. The Supabase client (`src/services/supabase.js`) returns `null` gracefully when these vars are absent — leaderboard features degrade silently rather than crashing.

### Submit flow
On game over, `checkQualifies(bigPts, smallPts, balutCount)` fetches all three leaderboards and returns which periods the score beats. If any qualify, `GameOverScreen` shows a name input. One `submitScore()` call covers all qualifying periods. Last-used name is persisted in `localStorage` (`balut_player_name`).

---

## Visual theme

All design tokens live in `src/styles/theme.css` as CSS custom properties. Key ones:

| Token | Value | Use |
|---|---|---|
| `--color-parchment` | `#f5e6c8` | Scorecard, cards |
| `--color-felt` | `#274f22` | Page background |
| `--color-gold` | `#c9a84c` | Borders, highlights, Oracle |
| `--color-accent` | `#8b1a1a` | Buttons, headers, alerts |
| `--font-serif` | Georgia | Titles, labels |
| `--transition-fast` | `0.12s ease` | Buttons, dice |

---

## Known cleanup items

- **`APPLY_HOLD` reducer case** (`useGameState.js` line ~61) and the `onApplyHold` prop in `GameBoard.jsx` are vestigial — safe to delete.

---

## Multiplayer roadmap notes

- All scoring logic (`src/logic/scoring.js`) is stateless and player-agnostic.
- `StartScreen` has stubbed "Local Multiplayer" and "Online Multiplayer" buttons (`mode-btn--disabled`).
- When building multiplayer: the scorecard state will need to become an array (one per player); the turn-routing logic in `useGameState.js` is the primary thing to extend.
- The `scores` table in Supabase has no `player_count` column yet — add this when multiplayer scores need to be distinguished from single-player scores.

---

## Responsive breakpoints

| Breakpoint | Layout change |
|---|---|
| ≤ 800px | Oracle and leaderboard card move below scorecard (single column) |
| ≤ 480px | Turn counter hidden, font sizes reduce |
