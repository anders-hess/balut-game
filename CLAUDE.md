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
# Start dev server (run in background or separate terminal)
npm.cmd run dev        # → http://localhost:5173

# Production build
npm.cmd run build

# npm.ps1 is blocked by execution policy — always use npm.cmd, never npm
```

### Deployment
Targeting **Vercel** (not yet set up). No special build config needed beyond `npm run build` — Vite's default output is `dist/`.

---

## Project structure

```
src/
  logic/           # Pure game logic — NO React imports
    gameConstants.js   # NUM_DICE, MAX_ROLLS, NUM_COLUMNS, CATEGORIES, scoring rules
    gameState.js       # State factories, rollDice, toggleHold, resetTurn
    scoring.js         # calculateScore, calcTotals, calcBonus, isGameOver, etc.
    oracle.js          # EV engine — computeRecommendations(), pure functions only
  hooks/
    useGameState.js    # useReducer wrapping all game actions
  components/
    App.jsx            # Phase router: 'start' | 'playing' | 'gameover'
    StartScreen        # Landing page (hero title + mode-button card)
    GameBoard          # Two-column layout shell + header
    DiceArea           # 5-die tray + Roll button + pip counter
    Dice               # Single die button (holds DiceFace, manages rolling class)
    DiceFace           # SVG pip renderer (pure, no state)
    Scorecard          # 7×4 scoring table + footer totals bar
    TheOracle          # Sidebar advisor panel with tooltip placeholders
    GameOverScreen     # Final score summary replacing DiceArea on game over
    BalutToast         # Fixed-position celebration toast (2.8 s)
  styles/
    theme.css          # All CSS custom properties (colors, fonts, radii, shadows)
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

### Scoring categories (fill order matters — always left to right)
`fours | fives | sixes | straight | fullHouse | choice | balut`  
Each has 4 columns. `nextColumn(scorecard, category)` returns the next fillable index.

---

## The Oracle

`src/logic/oracle.js` — pure EV engine, no React.

- **`computeRecommendations(diceValues, rollsLeft, scorecard)`** returns all possible actions (hold patterns + score-now options) sorted by expected value descending.
- Uses combinatorial outcome distributions (max 252 distinct multisets for 5 dice, vs 7776 raw) for performance.
- Memoises `holdEV` within each call — fast enough for synchronous `useMemo`.
- **`BIG_PT_VALUE = 50`** (line 9 of oracle.js) — tuning constant: how many small-point-equivalents one big point is worth in EV comparisons. Increase to make the Oracle more aggressive about chasing big-point thresholds.
- Oracle tooltip `i` buttons currently show **"Detailed probability breakdown coming soon."** — intentional placeholder.

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

- **`APPLY_HOLD` reducer case** (`useGameState.js` line ~61) and the `onApplyHold` prop in `GameBoard.jsx` are vestigial — they were used when the Oracle had an "Apply" button, which was removed. Neither is connected to any UI. Safe to delete when tidying up.

---

## Multiplayer roadmap notes

- The `phase` field and App-level routing are already designed with multi-player in mind.
- All scoring logic (`src/logic/scoring.js`) is stateless and player-agnostic.
- `StartScreen` has stubbed "Local Multiplayer" and "Online Multiplayer" buttons (`mode-btn--disabled`).
- When building multiplayer: the scorecard state will need to become an array (one per player); the turn-routing logic in `useGameState.js` is the primary thing to extend.

---

## Responsive breakpoints

| Breakpoint | Layout change |
|---|---|
| ≤ 800px | Oracle moves below scorecard (single column) |
| ≤ 480px | Turn counter hidden, font sizes reduce |
