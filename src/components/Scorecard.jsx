import { CATEGORIES, CATEGORY_LABELS, BIG_POINT_RULES, NUM_COLUMNS } from '../logic/gameConstants.js';
import { calculateScore, calcTotals, nextColumn, getTargetColumn, countBaluts } from '../logic/scoring.js';
import './Scorecard.css';

const MAX_ROLLS_IMPORT = 3;

export default function Scorecard({ scorecard, dice, rollsLeft, onScore, playerName, pendingScore, showAvailability = true }) {
  const hasRolled  = rollsLeft < MAX_ROLLS_IMPORT;
  const diceValues = dice.map(d => d.value);
  const allRolled  = diceValues.every(v => v > 0);
  const hasPending = !!pendingScore;

  // When a pending score is set, compute potential scores from the stored original
  // dice (the actual dice have been cleared). Otherwise use current dice.
  const effectiveDice = hasPending ? pendingScore.originalDice : diceValues;
  const effectiveRolled = hasPending || (hasRolled && allRolled);

  // For footer totals and big-pt completion badges, use a virtual scorecard
  // that includes the pending score so they update immediately on placement/move.
  const displayScorecard = hasPending
    ? {
        ...scorecard,
        [pendingScore.category]: scorecard[pendingScore.category].map(
          (v, i) => i === pendingScore.column ? pendingScore.score : v
        ),
      }
    : scorecard;

  const { totalSmall, totalBig, bonus, categoryBigPoints, categoryTotals } = calcTotals(displayScorecard);
  const balutCount = countBaluts(displayScorecard);
  function getCellState(category) {
    if (!effectiveRolled) return 'empty';
    if (nextColumn(scorecard, category) === -1) return 'full';
    const score = calculateScore(category, effectiveDice);
    if (score === null || score === 0) return 'zero';
    return 'valid';
  }

  function getPotentialScore(category) {
    const s = calculateScore(category, effectiveDice);
    return s ?? 0;
  }

  return (
    <div className="scorecard">
      <div className="scorecard-header">
        <h2 className="scorecard-title">Scorecard</h2>
        {playerName && (
          <span className="scorecard-player-label">{playerName}</span>
        )}
      </div>

      <div className="scorecard-scroll">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th className="th-category">Category</th>
              {Array(NUM_COLUMNS).fill(0).map((_, i) => (
                <th key={i} className="th-entry">#{i + 1}</th>
              ))}
              <th className="th-sum">Sum</th>
              <th className="th-big">Big</th>
            </tr>
          </thead>

          <tbody>
            {CATEGORIES.map(cat => {
              const cellState = getCellState(cat);
              const potential = getPotentialScore(cat);
              const targetCol = getTargetColumn(scorecard, cat, potential);
              const catTotal  = categoryTotals[cat];
              const bigPts    = categoryBigPoints[cat];
              const isComplete = displayScorecard[cat].every(s => s !== null);
              const isGreat    = cellState === 'valid' && isGreatScore(cat, potential, scorecard[cat]);

              return (
                <tr key={cat} className="srow">
                  <td className="td-category">
                    <span className="cat-label">{CATEGORY_LABELS[cat]}</span>
                  </td>

                  {scorecard[cat].map((score, colIdx) => {
                    const isFilled  = score !== null;
                    const isNext    = colIdx === targetCol;

                    // The pending cell — visually identical to a filled cell.
                    const isPending = hasPending &&
                      pendingScore.category === cat &&
                      pendingScore.column   === colIdx;

                    // Normal scoring availability (no pending state).
                    const isAvailableNormal = showAvailability && !hasPending && isNext &&
                      (cellState === 'valid' || cellState === 'zero') &&
                      hasRolled && allRolled;

                    // Move-target availability (pending state active, different unfilled cell).
                    const isAvailableMove = showAvailability && hasPending && !isPending && !isFilled &&
                      isNext && cellState !== 'full' && cellState !== 'empty';

                    const isAvailable = isPending || isAvailableNormal || isAvailableMove;

                    // Display value: pending shows pending score as a plain number.
                    const displayScore = isPending ? pendingScore.score : score;

                    return (
                      <td
                        key={colIdx}
                        className={[
                          'td-entry',
                          (isFilled || isPending)                              ? 'td-entry--filled'    : 'td-entry--empty',
                          isPending                                            ? 'td-entry--pending'   : '',
                          isAvailableMove && isGreat                           ? 'td-entry--great'     : '',
                          isAvailableMove && !isGreat && cellState === 'valid' ? 'td-entry--available' : '',
                          isAvailableMove && cellState === 'zero'              ? 'td-entry--zero'      : '',
                          isAvailableNormal && isGreat                         ? 'td-entry--great'     : '',
                          isAvailableNormal && !isGreat && cellState === 'valid' ? 'td-entry--available' : '',
                          isAvailableNormal && cellState === 'zero'            ? 'td-entry--zero'      : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => isAvailable && onScore?.(cat)}
                        title={
                          isPending
                            ? `${pendingScore.score} pts (pending) — tap to cancel, or Roll to confirm`
                            : isAvailableMove
                              ? `Move score here: ${potential} pts for ${CATEGORY_LABELS[cat]}`
                              : isAvailableNormal
                                ? `Score ${potential} pts for ${CATEGORY_LABELS[cat]}`
                                : undefined
                        }
                        role={isAvailable ? 'button' : undefined}
                        tabIndex={isAvailable ? 0 : undefined}
                        onKeyDown={e => isAvailable && e.key === 'Enter' && onScore?.(cat)}
                      >
                        {isPending ? (
                          <span className="entry-chip">{fmtZero(displayScore)}</span>
                        ) : isFilled ? (
                          fmtZero(score)
                        ) : isAvailable ? (
                          <span className="entry-chip">
                            <span className="ghost-score">{fmtZero(potential)}</span>
                          </span>
                        ) : ''}
                      </td>
                    );
                  })}

                  <td className="td-sum">
                    {displayScorecard[cat].some(s => s !== null) ? catTotal : ''}
                  </td>
                  <td className="td-big">
                    {bigPts > 0
                      ? <span className="big-pts-earned">+{bigPts}</span>
                      : isComplete
                        ? <span className="big-pts-zero">0</span>
                        : <span className="big-pts-target">{bigPtTarget(BIG_POINT_RULES[cat])}</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      <div className="scorecard-footer">
        <div className="running-total running-total--small">
          <span className="rt-label">Small Points</span>
          <span className="rt-value">{totalSmall}</span>
          <span className="rt-hint">
            ({bonus >= 0 ? `+${bonus}` : bonus} big points)
          </span>
        </div>
        <div className="running-total running-total--small">
          <span className="rt-label">Balut</span>
          <span className="rt-value">{balutCount}</span>
        </div>
        <div className="running-total running-total--big">
          <span className="rt-label">
            Grand Total<span className="rt-label-big-suffix"> (Big)</span>
          </span>
          <div className="rt-big-row">
            <span className="rt-value">{totalBig}</span>
            <span className="rt-big-sub">big points</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// A scored 0 (a scratched / forced-zero cell) reads more clearly as a dash.
function fmtZero(v) {
  return v === 0 ? '–' : v;
}

function isGreatScore(category, score, columns) {
  if (!score || score <= 0) return false;

  // Last-column rule: when only one column is left to fill in a sum category
  // (fours, fives, sixes, choice), green means "this score meets the row's
  // big-point threshold" — regardless of the usual per-column cutoff. The last
  // column can need either a higher or a lower score than normal depending on
  // how the already-filled columns add up.
  if (columns) {
    const rule = BIG_POINT_RULES[category];
    const emptyCount = columns.filter(s => s === null).length;
    if (rule && rule.type === 'sum' && emptyCount === 1) {
      const currentSum = columns.reduce((sum, s) => sum + (s ?? 0), 0);
      return currentSum + score >= rule.threshold;
    }
  }

  if (category === 'fours')     return score >= 12;
  if (category === 'fives')     return score >= 15;
  if (category === 'sixes')     return score >= 18;
  if (category === 'straight')  return score > 0;
  if (category === 'fullHouse') return score > 0;
  if (category === 'choice')    return score >= 25;
  if (category === 'balut')     return score > 0;
  return false;
}

function bigPtTarget(rule) {
  if (rule.type === 'sum')      return `/${rule.threshold}`;
  if (rule.type === 'filled')   return `+${rule.points}`;
  if (rule.type === 'perBalut') return '+2 ea';
  return '';
}

