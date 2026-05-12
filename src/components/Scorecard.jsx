import { CATEGORIES, CATEGORY_LABELS, BIG_POINT_RULES, NUM_COLUMNS } from '../logic/gameConstants.js';
import { calculateScore, calcTotals, countBaluts, nextColumn, getTargetColumn } from '../logic/scoring.js';
import './Scorecard.css';

const MAX_ROLLS_IMPORT = 3;

export default function Scorecard({ scorecard, dice, rollsLeft, onScore, playerName, pendingScore }) {
  const hasRolled  = rollsLeft < MAX_ROLLS_IMPORT;
  const diceValues = dice.map(d => d.value);
  const allRolled  = diceValues.every(v => v > 0);
  const hasPending = !!pendingScore;

  // When a pending score is set, compute potential scores from the stored original
  // dice (the actual dice have been cleared). Otherwise use current dice.
  const effectiveDice = hasPending ? pendingScore.originalDice : diceValues;
  const effectiveRolled = hasPending || (hasRolled && allRolled);

  const { totalSmall, totalBig, bonus, categoryBigPoints, categoryTotals } = calcTotals(scorecard);
  const balutCount  = countBaluts(scorecard);
  const catBigTotal = totalBig - bonus;

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
        <h2 className="scorecard-title">
          {playerName ? `Scorecard – ${playerName}` : 'Scorecard'}
        </h2>
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
              const isComplete = scorecard[cat].every(s => s !== null);
              const isGreat    = cellState === 'valid' && isGreatScore(cat, potential);

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
                    const isAvailableNormal = !hasPending && isNext &&
                      (cellState === 'valid' || cellState === 'zero') &&
                      hasRolled && allRolled;

                    // Move-target availability (pending state active, different unfilled cell).
                    const isAvailableMove = hasPending && !isPending && !isFilled &&
                      isNext && cellState !== 'full' && cellState !== 'empty';

                    const isAvailable = isPending || isAvailableNormal || isAvailableMove;

                    // Display value: pending shows pending score as a plain number.
                    const displayScore = isPending ? pendingScore.score : score;

                    return (
                      <td
                        key={colIdx}
                        className={[
                          'td-entry',
                          // Pending cell: same appearance as filled
                          (isFilled || isPending)                              ? 'td-entry--filled'    : 'td-entry--empty',
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
                        {isPending
                          ? displayScore
                          : isFilled
                            ? score
                            : isAvailable
                              ? <span className="ghost-score">{potential}</span>
                              : ''}
                      </td>
                    );
                  })}

                  <td className="td-sum">
                    {catTotal > 0 ? catTotal : ''}
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

          <tfoot>
            <tr className="srow srow--subtotal">
              <td className="td-category"><span className="foot-label">Total</span></td>
              <td colSpan={NUM_COLUMNS} />
              <td className="td-sum td-sum--total">{totalSmall}</td>
              <td className="td-big td-big--total">{catBigTotal > 0 ? catBigTotal : 0}</td>
            </tr>
            <tr className="srow srow--subtotal">
              <td className="td-category"><span className="foot-label">Bonus</span></td>
              <td colSpan={NUM_COLUMNS} className="td-bonus-hint-cell">
                <span className="foot-hint">{bonusHint(totalSmall)}</span>
              </td>
              <td className="td-sum" />
              <td className="td-big td-big--bonus">
                {bonus >= 0 ? `+${bonus}` : bonus}
              </td>
            </tr>
            <tr className="srow srow--grand-total">
              <td className="td-category"><span className="foot-label">Grand Total</span></td>
              <td colSpan={NUM_COLUMNS} />
              <td className="td-sum" />
              <td className="td-big td-big--grand">{totalBig}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="scorecard-footer">
        <div className="running-total running-total--big">
          <span className="rt-label">Big Points</span>
          <span className="rt-value">{totalBig}</span>
        </div>
        <div className="running-total running-total--small">
          <span className="rt-label">Small Points</span>
          <span className="rt-value">{totalSmall}</span>
        </div>
        <div className="running-total running-total--balut">
          <span className="rt-label">Baluts</span>
          <span className="rt-value">{balutCount}</span>
        </div>
      </div>
    </div>
  );
}

function isGreatScore(category, score) {
  if (!score || score <= 0) return false;
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

function bonusHint(total) {
  if (total < 300)  return 'Need 300 for −1';
  if (total < 350)  return '−1 big · need 350 for ±0';
  if (total < 400)  return '±0 · need 400 for +1';
  if (total < 450)  return '+1 big · need 450 for +2';
  const extra = Math.floor((total - 450) / 50);
  return `+${2 + extra} big pts bonus`;
}
