import { calcTotals } from '../logic/scoring.js';
import { isGameOver } from '../logic/scoring.js';
import './MultiplayerStandings.css';

export default function MultiplayerStandings({ players, currentPlayerIndex }) {
  return (
    <div className="mp-standings">
      {players.map((p, i) => {
        const { totalBig } = calcTotals(p.scorecard);
        const isActive   = i === currentPlayerIndex;
        const isDone     = isGameOver(p.scorecard);
        return (
          <div
            key={i}
            className={[
              'mp-standings__badge',
              isActive ? 'mp-standings__badge--active' : '',
              isDone   ? 'mp-standings__badge--done'   : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="mp-standings__name">{p.name}</span>
            <span className="mp-standings__pts">{totalBig}</span>
            {isDone && <span className="mp-standings__check">✓</span>}
          </div>
        );
      })}
    </div>
  );
}
