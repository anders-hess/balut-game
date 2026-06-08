import { useState, useEffect, useRef } from 'react';
import { fetchGameCount } from '../services/analytics.js';
import './StartScreen.css';

// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo({ size = 32 }) {
  return (
    <div className="logo" style={{ '--logo-size': `${size}px` }}>
      <div className="logo__mark">b</div>
      <span className="logo__word">balut</span>
    </div>
  );
}

// ── Simple SVG die (white body, ink dots — on terracotta background) ──────────
function Die({ value, size = 72, rotation = 0 }) {
  const dots = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72]],
  }[value] || [];

  return (
    <div
      className="hero-die"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        transform: `rotate(${rotation}deg)`,
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {dots.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8" fill="rgba(42,38,32,0.85)" />
        ))}
      </svg>
    </div>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ title, subtitle, primary, disabled, onClick, icon = '→' }) {
  return (
    <button
      className={[
        'mode-card',
        primary   ? 'mode-card--primary'   : 'mode-card--secondary',
        disabled  ? 'mode-card--disabled'  : '',
      ].filter(Boolean).join(' ')}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <div className="mode-card__text">
        <div className="mode-card__title">{title}</div>
        <div className="mode-card__sub">{subtitle}</div>
      </div>
      <span className="mode-card__icon">{icon}</span>
    </button>
  );
}

// ── Animated game counter ─────────────────────────────────────────────────────
function AnimatedCount({ target, onClick }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const duration = 1500;
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  return (
    <button className="game-counter" onClick={onClick} aria-label="View App Insights">
      <span className="game-counter__number">{display.toLocaleString()}</span>
      <span className="game-counter__label">games played</span>
    </button>
  );
}

// ── StartScreen ───────────────────────────────────────────────────────────────
export default function StartScreen({ onStart, onMultiplayer, onOnlineMultiplayer, onHighscores, onRules, onOracle, onInsights, authAvailable = false, username = null, onLogin, onProfile }) {
  const heroRots = [-4, 3, -2, 5, -3];
  const heroVals = [5, 5, 3, 5, 2];

  const [gameCount, setGameCount] = useState(0);
  useEffect(() => { fetchGameCount().then(setGameCount).catch(() => {}); }, []);

  return (
    <div className="start-screen">
      {/* Marketing header — logo + account control */}
      <header className="start-header">
        <Logo size={36} />
        {authAvailable && (
          username ? (
            <button className="start-account" onClick={onProfile}>
              <span className="start-account__avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
              <span className="start-account__name">{username}</span>
            </button>
          ) : (
            <button className="start-account start-account--login" onClick={onLogin}>Log in</button>
          )
        )}
      </header>

      {/* Hero split */}
      <main className="start-main">
        {/* ── Left: terracotta hero panel ── */}
        <div className="start-hero-left">
          {/* Faded "b" watermark */}
          <span className="start-watermark" aria-hidden="true">b</span>

          <div className="start-hero-content">
            <div className="start-hero-top">
              <p className="start-hero-kicker">Game · Five dice · Three rolls</p>
              <h1 className="start-hero-headline">
                One quiet<br />evening<br />of dice.
              </h1>
            </div>

            <div className="start-hero-bottom">
              <div className="start-hero-dice">
                {heroVals.map((v, i) => (
                  <Die key={i} value={v} size={72} rotation={heroRots[i]} />
                ))}
              </div>
              <p className="start-hero-quote">
                "Three of a kind. The Oracle says keep all three."
              </p>
            </div>
          </div>

          {gameCount > 0 && <AnimatedCount target={gameCount} onClick={onInsights} />}
        </div>

        {/* ── Right: mode selection ── */}
        <div className="start-hero-right">
          <p className="start-right-kicker">Begin</p>
          <h2 className="start-right-heading">How will you play?</h2>

          <div className="start-modes">
            <ModeCard
              title="Single player"
              subtitle="Beat your last grand total."
              primary
              onClick={onStart}
            />
            <ModeCard
              title="Local multiplayer"
              subtitle="Pass-and-play with 2–4 friends."
              onClick={onMultiplayer}
            />
            <ModeCard
              title="Online multiplayer"
              subtitle="Play with friends anywhere."
              onClick={onOnlineMultiplayer}
            />
          </div>

          <div className="start-rule" />

          <div className="start-util-links">
            <button className="start-link" onClick={onHighscores}>Leaderboard</button>
            <button className="start-link" onClick={onRules}>
              <span className="link-label--desktop">Rules of play</span>
              <span className="link-label--mobile">Rules</span>
            </button>
            <button className="start-link" onClick={onOracle}>The Oracle</button>
            <button className="start-link" onClick={onInsights}>
              <span className="link-label--desktop">App Insights</span>
              <span className="link-label--mobile">Insights</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
