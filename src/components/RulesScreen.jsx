import './RulesScreen.css';

function Logo({ size = 36 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: size * 0.27,
        background: 'var(--color-accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
        fontWeight: 500, fontSize: size * 0.62,
      }}>b</div>
      <span style={{
        fontFamily: 'var(--font-sans)', fontWeight: 500,
        fontSize: size * 0.62, color: 'var(--color-ink)', letterSpacing: '-0.3px',
      }}>balut</span>
    </div>
  );
}

export default function RulesScreen({ onClose }) {
  return (
    <div className="rules-screen">
      {/* Marketing header — matches HighscoresScreen style */}
      <header className="rules-marketing-header">
        <Logo size={36} />
        <button className="rules-back" onClick={onClose}>← Back to home</button>
      </header>

      <div className="rules-inner">
        <h1 className="rules-page-title">How to play Balut</h1>

        <div className="rules-body">

          {/* Overview */}
          <section className="rules-section">
            <h2 className="rules-section-title">Overview</h2>
            <p className="rules-text">
              Balut is a dice game for 1–4 players. Each player has a scorecard with
              7 categories and 4 columns per category — 28 cells in total.
              On each turn you roll 5 dice (up to 3 rolls), then score one cell.
              The goal is to earn as many <strong>big points</strong> as possible.
            </p>
            <div className="rules-steps">
              <div className="rules-step">
                <span className="rules-step-num">1</span>
                <span>Roll all 5 dice</span>
              </div>
              <div className="rules-step">
                <span className="rules-step-num">2</span>
                <span>Hold any dice you want to keep</span>
              </div>
              <div className="rules-step">
                <span className="rules-step-num">3</span>
                <span>Reroll the rest — up to 2 more times</span>
              </div>
              <div className="rules-step">
                <span className="rules-step-num">4</span>
                <span>Score your dice in one open category cell</span>
              </div>
            </div>
          </section>

          {/* Scoring categories */}
          <section className="rules-section">
            <h2 className="rules-section-title">Scoring Categories</h2>
            <p className="rules-text">Each category is scored in 4 columns, filled one per turn in any order.</p>
            <div className="rules-table-wrap">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Required Pattern</th>
                    <th>Small Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rules-cat">Fours</td>
                    <td>Only fours</td>
                    <td>Sum of all 4-face dice</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Fives</td>
                    <td>Only fives</td>
                    <td>Sum of all 5-face dice</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Sixes</td>
                    <td>Only sixes</td>
                    <td>Sum of all 6-face dice</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Straight</td>
                    <td>All 5 dice sequential</td>
                    <td>1-2-3-4-5 = <strong>15</strong> · 2-3-4-5-6 = <strong>20</strong></td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Full House</td>
                    <td>Three of a kind + pair</td>
                    <td>Sum of all 5 dice</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Choice</td>
                    <td>Any dice (always valid)</td>
                    <td>Sum of all 5 dice</td>
                  </tr>
                  <tr className="rules-row-highlight">
                    <td className="rules-cat">Balut</td>
                    <td>Five of a kind</td>
                    <td>Sum of all dice + <strong>20 bonus</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="rules-footnote">
              If your dice don't match a category's required pattern (Straight, Full House, Balut)
              you must still score that cell — but you score 0. Plan carefully.
            </p>
          </section>

          {/* Big points */}
          <section className="rules-section">
            <h2 className="rules-section-title">Big Points</h2>
            <p className="rules-text">
              Big points are your final score. You earn them by hitting thresholds
              across all 4 columns of a category.
            </p>
            <div className="rules-table-wrap">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>How to Earn</th>
                    <th>Big Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rules-cat">Fours</td>
                    <td>Total across all 4 columns ≥ 52</td>
                    <td className="rules-pts">+2</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Fives</td>
                    <td>Total across all 4 columns ≥ 65</td>
                    <td className="rules-pts">+2</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Sixes</td>
                    <td>Total across all 4 columns ≥ 78</td>
                    <td className="rules-pts">+2</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Straight</td>
                    <td>All 4 columns scored (no forced zeros)</td>
                    <td className="rules-pts">+4</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Full House</td>
                    <td>All 4 columns scored (no forced zeros)</td>
                    <td className="rules-pts">+3</td>
                  </tr>
                  <tr>
                    <td className="rules-cat">Choice</td>
                    <td>Total across all 4 columns ≥ 100</td>
                    <td className="rules-pts">+2</td>
                  </tr>
                  <tr className="rules-row-highlight">
                    <td className="rules-cat">Balut</td>
                    <td>Each successful Balut scored</td>
                    <td className="rules-pts">+2 each</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Bonus */}
          <section className="rules-section">
            <h2 className="rules-section-title">Small Points Bonus</h2>
            <p className="rules-text">
              Your total small points (the sum of every cell on your scorecard)
              determines a bonus or penalty applied to your final big points total.
            </p>
            <div className="rules-table-wrap rules-table-wrap--narrow">
              <table className="rules-table">
                <thead>
                  <tr>
                    <th>Total Small Points</th>
                    <th>Bonus / Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="rules-row-bad">
                    <td>Below 300</td>
                    <td className="rules-pts rules-pts--neg">−2 big points</td>
                  </tr>
                  <tr className="rules-row-bad">
                    <td>300 – 349</td>
                    <td className="rules-pts rules-pts--neg">−1 big point</td>
                  </tr>
                  <tr>
                    <td>350 – 399</td>
                    <td className="rules-pts">±0</td>
                  </tr>
                  <tr className="rules-row-good">
                    <td>400 – 449</td>
                    <td className="rules-pts rules-pts--pos">+1 big point</td>
                  </tr>
                  <tr className="rules-row-good">
                    <td>450 – 499</td>
                    <td className="rules-pts rules-pts--pos">+2 big points</td>
                  </tr>
                  <tr className="rules-row-good">
                    <td>500 – 549</td>
                    <td className="rules-pts rules-pts--pos">+3 big points</td>
                  </tr>
                  <tr className="rules-row-good">
                    <td>550+</td>
                    <td className="rules-pts rules-pts--pos">+4 or more…</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Column placement */}
          <section className="rules-section">
            <h2 className="rules-section-title">Column Placement</h2>
            <p className="rules-text">
              High scores are automatically placed in the <strong>rightmost</strong> open column,
              saving your best results for maximum impact. Low scores fill from the <strong>left</strong>.
            </p>
            <div className="rules-placement-grid">
              <div className="rules-placement-card rules-placement-card--high">
                <span className="rules-placement-label">High score → Right column</span>
                <ul>
                  <li>Fours ≥ 16 (four 4s)</li>
                  <li>Fives ≥ 20 (four 5s)</li>
                  <li>Sixes ≥ 24 (four 6s)</li>
                  <li>High Straight (2-3-4-5-6 = 20)</li>
                </ul>
              </div>
              <div className="rules-placement-card rules-placement-card--low">
                <span className="rules-placement-label">Normal score → Left column</span>
                <ul>
                  <li>Everything else</li>
                  <li>Full House, Choice, Balut always left</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
