import { isGameOver } from '../logic/scoring.js';
import './MultiplayerStandings.css';

export default function MultiplayerStandings({ players, currentPlayerIndex, onlinePlayers }) {
  const presenceMap = onlinePlayers
    ? Object.fromEntries(onlinePlayers.map(p => [p.playerIndex, p.isOnline]))
    : null;

  return (
    <div className="mp-standings">
      {players.map((p, i) => {
        const isActive = i === currentPlayerIndex;
        const isDone   = isGameOver(p.scorecard);
        const isOnline = presenceMap ? presenceMap[i] : null;
        return (
          <div
            key={i}
            className={[
              'mp-standings__badge',
              isActive ? 'mp-standings__badge--active' : '',
              isDone   ? 'mp-standings__badge--done'   : '',
            ].filter(Boolean).join(' ')}
          >
            {isActive && <span className="mp-standings__dice">🎲</span>}
            <span className="mp-standings__name">{p.name}</span>
            {isDone && <span className="mp-standings__check">✓</span>}
            {isOnline !== null && (
              <span
                className={`mp-standings__dot ${isOnline ? 'mp-standings__dot--on' : 'mp-standings__dot--off'}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
