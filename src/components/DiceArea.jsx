import { useState, useCallback } from 'react';
import Dice from './Dice.jsx';
import './DiceArea.css';
import { MAX_ROLLS } from '../logic/gameConstants.js';

export default function DiceArea({ dice, rollsLeft, onRoll, onToggleHold }) {
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
      ? `Roll Again`
      : 'No Rolls Left';

  return (
    <section className="dice-area">
      <div className="dice-tray" role="group" aria-label="Dice">
        {dice.map((die, i) => (
          <Dice
            key={i}
            die={die}
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

        <div className="rolls-pips" aria-label={`${rollsLeft} rolls remaining`}>
          {Array(MAX_ROLLS).fill(0).map((_, i) => (
            <span
              key={i}
              className={`rolls-pip ${i < rollsLeft ? 'rolls-pip--active' : ''}`}
            />
          ))}
        </div>
      </div>

      {canHold && (
        <p className="dice-hint">
          Click a die to hold it between rolls
        </p>
      )}
    </section>
  );
}
