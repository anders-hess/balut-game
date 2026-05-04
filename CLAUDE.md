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
    scoring.js            # calculateScore, calcTotals, calcBonus, isGameOver, etc.
    oracle/               # BPIV engine (see Oracle section below)
      index.js            # recommend() — public entry point
      bpiv.js             # bpivScoreNow(), bpivRerollAllHolds()
      recursion.js        # createMaxBpiv() memoized recursion, holdLabel()
      thresholds.js       # pThreshold(), expectedBonus()
      probabilities.js    # normalCDF, DIST combinatorics, uniqueSubsets()
      scoring.js          # scoreCell(), categoryCurrentSum(), etc.
      outcomes.js         # selectTop5Outcomes(), describeResult()
      constants.js        # Per-category statistics (Monte Carlo TODO)
      __tests__/          # 92 Vitest unit tests
  services/           # External service integrations
    supabase.js           # Supabase client singleton (null when .env.local absent)
    highscores.js         # fetchLeaderboard(), checkQualifies(), submitScore()
  hooks/
    useGameState.js       # useReducer — all game actions including multiplayer
  components/
    App.jsx               # Routing: showHighscores + showSetup booleans + phase
    StartScreen           # Landing page — Single Player, Local Multiplayer, Leaderboard
    PlayerSetupScreen     # Multiplayer setup — player count (2–4) + name inputs
    HandoffOverlay        # Full-screen "pass the device" overlay between turns
    GameBoard             # Two-column layout; reads from players[currentPlayerIndex]
    MultiplayerStandings  # Header badge strip showing all players' live big-point totals
    MultiplayerGameOverScreen  # Ranked results table + per-player leaderboard submit
    DiceArea              # 5-die tray + Roll button + pip counter
    Dice                  # Single die button
    DiceFace              # SVG pip renderer (pure, no state)
    Scorecard             # 7×4 scoring table + footer totals bar
    TheOracle             # Sidebar advisor — BPIV recommendations + tooltips
    GameOverScreen        # Single-player game over + leaderboard submit
    HighscoresScreen      # Full leaderboard (Daily / Monthly / Yearly tabs)
    HighscoresCard        # Compact "Today's Top 3" widget in GameBoard right column
    BalutToast            # Fixed-position celebration toast (2.8 s)
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
  currentPlayerIndex: number,   // index into players[]
  showHandoff:        bool,     // true after SCORE in multiplayer; cleared by DISMISS_HANDOFF
  dice:               [{ value: 0–6, held: bool }, ×5],
  rollsLeft:          0–3,
  turnNumber:         number,
  oracleEnabled:      bool,
  justScoredBalut:    bool,
}
```

Single player uses `players.length === 1` — no separate code path. `players[0].scorecard` is always the canonical scorecard for single player.

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
`App.jsx` uses two local booleans (`showHighscores`, `showSetup`) alongside the reducer phase. `showSetup` controls the multiplayer `PlayerSetupScreen` — it's not a reducer phase, just a UI layer.

### Scoring categories (fill order — always left to right)
`fours | fives | sixes | straight | fullHouse | choice | balut`
Each has 4 columns. `nextColumn(scorecard, category)` returns the next fillable index.

---

## Local Multiplayer

- 2–4 players on a shared device; free choice of category each turn
- **Setup**: "Local Multiplayer" → `PlayerSetupScreen` (player count + names) → `SETUP_MULTIPLAYER`
- **Turn flow**: roll → score → `HandoffOverlay` ("🎲 [Name]'s turn — tap to start") → next player
- **Scorecard toggle**: player tabs above the scorecard let any player peek at others' scorecards (read-only); tab resets to current player on each turn change via `useEffect`
- **Standings**: `MultiplayerStandings` shows live big-point totals for all players in the header
- **Game over**: `MultiplayerGameOverScreen` shows ranked table; each qualifying score gets its own leaderboard submit prompt (same `checkQualifies`/`submitScore` as single player)
- `GameBoard` reads `players[currentPlayerIndex]` for dice/Oracle; `players[displayIdx]` for the Scorecard tab being viewed

---

## The Oracle

The Oracle is a statistically rigorous advisor in `src/logic/oracle/`. It ranks every possible action by **BPIV (Big Point Incremental Value)** — the expected big-point gain of an action relative to a baseline of scoring the expected average in that cell.

### Public API
```js
recommend({ currentDice, rollsRemaining, scorecard })
// Returns: { actions: [...], isAllNegative: bool, recommendedRank: 1 }
```

### How BPIV works
```
BPIV(action) = categoryBigDelta + bonusBigDelta
```
- **categoryBigDelta**: change in P(threshold met) × big points at stake, vs. baseline
- **bonusBigDelta**: change in E[end-game bonus], vs. baseline
- **Baseline**: `EXPECTED_SCORE_PER_COLUMN[category]` for that cell

### Constants (important caveat)
`constants.js` values are **calibrated estimates, not Monte Carlo**:
- `fours: 12.5` and `choice: 23.0` are kept at these values to preserve SPEC TEST 3 ordering — changing to 12/25 reverses the assertion.
- `fives: 15.0`, `sixes: 18.0` reflect "three of face value" as discrete baseline.

### Tests
92 Vitest tests in `__tests__/`. Run with `npm.cmd run test`.

---

## Highscore Leaderboard

### Backend: Supabase
- **Project URL**: `https://ehpguosbtfnrfttghcnz.supabase.co`
- **Table**: `scores` — `id`, `player_name` (max 20), `big_points`, `small_points`, `balut_count`, `created_at`
- **Sort**: `big_points DESC, small_points DESC, balut_count DESC`
- **Time windows**: daily / monthly / yearly filtered at query time — no resets needed
- **RLS**: anonymous SELECT + INSERT; no auth required

### Credentials
In `.env.local` (gitignored) and Vercel env vars:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```
Client returns `null` gracefully when absent — leaderboard degrades silently.

### Submit flow
`checkQualifies(bigPts, smallPts, balutCount)` → returns qualifying periods → name input → `submitScore()`. Last-used name persisted in `localStorage` (`balut_player_name`). Works the same for single and multiplayer (each player submits independently).

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

---

## Known cleanup items

- **`APPLY_HOLD` reducer case** (`useGameState.js`) and `onApplyHold` prop in `GameBoard.jsx` are vestigial — safe to delete.

---

## Roadmap

- **Online multiplayer**: the `players[]` state shape is already multi-player aware; the main work is adding a real-time sync layer (WebSockets / Supabase Realtime) and a lobby/room system.
- **`scores` table**: no `player_count` column — multiplayer scores submit identically to single-player scores (ranking is player-agnostic).

---

## Responsive breakpoints

| Breakpoint | Layout change |
|---|---|
| ≤ 800px | Oracle and leaderboard card move below scorecard (single column) |
| ≤ 480px | Turn counter / standings hidden, font sizes reduce |
