import { useState, useCallback } from 'react';
import Dice from './Dice.jsx';
import './DiceArea.css';
import { MAX_ROLLS } from '../logic/gameConstants.js';

export default function DiceArea({ dice, rollsLeft, onRoll, onToggleHold, turnNumber, totalTurns }) {
  const [rolling, setRolling] = useState(false);

  const hasRolled = rollsLeft < MAX_ROLLS;
  const canRoll   = rollsLeft > 0 && !rolling;
  const canHold   = hasRolled && rollsLeft > 0;

  const handleRoll = useCallback(() => {
    if (!canRoll) return;
    setRolling(true);
    onRoll();
    setTimeout(() => setRolling(false), 420);
  }, [canRoll, onRoll]);

  const rollLabel = !hasRolled
    ? 'Roll Dice'
    : rollsLeft > 0
      ? 'Roll Again'
      : 'No Rolls Left';

  const heldCount = dice.filter(d => d.held && d.value > 0).length;
  const turnStatus = !hasRolled
    ? 'Roll to start your turn.'
    : heldCount > 0
      ? `${heldCount === 1 ? 'One die' : `${heldCount} dice`} held.`
      : rollsLeft < MAX_ROLLS
        ? 'Pick dice to hold, or score.'
        : '';

  return (
    <section className="dice-area">
      <div className="dice-area__info">
        <div className="dice-area__turn">
          {turnNumber != null && (
            <div className="dice-area__turn-label">
              Turn {Math.min(turnNumber, totalTurns || 28)} of {totalTurns || 28}
            </div>
          )}
          <div className="dice-area__turn-status">{turnStatus}</div>
        </div>
        <div className="dice-area__rolls-wrap">
          <div className="dice-area__rolls-label">Rolls left</div>
          <div className="rolls-pips" aria-label={`${rollsLeft} rolls remaining`}>
            {Array(MAX_ROLLS).fill(0).map((_, i) => (
              <span
                key={i}
                className={`rolls-pip ${i < rollsLeft ? 'rolls-pip--active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="dice-tray" role="group" aria-label="Dice">
        {dice.map((die, i) => (
          <Dice
            key={i}
            die={rollsLeft === 0 ? { ...die, held: false } : die}
            index={i}
            canHold={canHold}
            onToggleHold={onToggleHold}
            isRolling={rolling}
          />
        ))}
      </div>

      <div className="dice-controls">
        <button
          className="btn-roll"
          onClick={handleRoll}
          disabled={!canRoll}
          aria-label={rollLabel}
        >
          {rollLabel}
        </button>
      </div>

      {canHold && (
        <p className="dice-hint">Tap a die to hold it between rolls</p>
      )}
    </section>
  );
}
