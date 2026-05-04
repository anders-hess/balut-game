import './HandoffOverlay.css';

export default function HandoffOverlay({ playerName, onStart }) {
  return (
    <div className="handoff" onClick={onStart}>
      <div className="handoff__card">
        <span className="handoff__dice">🎲</span>
        <p className="handoff__name">{playerName}'s turn</p>
        <p className="handoff__sub">Pass the device to {playerName}</p>
        <button className="handoff__btn" onClick={e => { e.stopPropagation(); onStart(); }}>
          Start my turn
        </button>
      </div>
    </div>
  );
}
