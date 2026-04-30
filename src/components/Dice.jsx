import DiceFace from './DiceFace.jsx';
import './Dice.css';

export default function Dice({ die, index, canHold, onToggleHold, isRolling }) {
  const { value, held } = die;
  const unrolled = value === 0;

  // Drive animation class directly from the isRolling prop.
  // DiceArea's rolling state lasts exactly 420 ms, matching the CSS animation duration,
  // so no internal timer is needed and there is no stuck-animating edge case.
  const rolling = isRolling && !held && !unrolled;

  return (
    <button
      className={[
        'die',
        held    ? 'die--held'      : '',
        rolling ? 'die--rolling'   : '',
        unrolled ? 'die--unrolled' : '',
        canHold && !unrolled && !rolling ? 'die--holdable' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => canHold && !unrolled && onToggleHold(index)}
      aria-pressed={held}
      aria-label={unrolled ? 'Unrolled die' : `Die ${index + 1}: ${value}${held ? ', held' : ''}`}
      disabled={!canHold || unrolled}
    >
      {unrolled ? (
        <span className="die__blank" aria-hidden="true" />
      ) : (
        <DiceFace value={value} size={64} held={held} dieIndex={index} />
      )}
      {held && <span className="die__held-label">HELD</span>}
    </button>
  );
}
