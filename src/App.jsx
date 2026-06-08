import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import { useOnlineGame } from './hooks/useOnlineGame.js';
import { useAuth } from './hooks/useAuth.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
import OnlineLobbyScreen from './components/OnlineLobbyScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HighscoresScreen from './components/HighscoresScreen.jsx';
import RulesScreen from './components/RulesScreen.jsx';
import OracleScreen from './components/OracleScreen.jsx';
import AppInsightsScreen from './components/AppInsightsScreen.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import ScannerScreen from './scanner/ScannerScreen.jsx';
import { trackEvent } from './services/analytics.js';
import { calcTotals, countBaluts } from './logic/scoring.js';
import './styles/theme.css';

// game_completed metadata for one player's final scorecard (drives Insights).
function scorecardMetadata(sc) {
  const { totalBig, totalSmall } = calcTotals(sc);
  const colSum      = (cat) => sc[cat].reduce((a, v) => a + (v ?? 0), 0);
  const allFilled   = (cat) => sc[cat].every(v => v !== null && v > 0);
  const anyPositive = (cat) => sc[cat].some(v => v !== null && v > 0);
  return {
    bigPoints:    totalBig,
    smallPoints:  totalSmall,
    balutCount:   countBaluts(sc),
    hadFours:     colSum('fours')  >= 52,
    hadFives:     colSum('fives')  >= 65,
    hadSixes:     colSum('sixes')  >= 78,
    hadStraight:  allFilled('straight'),
    hadFullHouse: allFilled('fullHouse'),
    hadChoice:    colSum('choice') >= 100,
    hadBalut:     anyPositive('balut'),
  };
}

export default function App() {
  const {
    state,
    startGame, setupMultiplayer, dismissHandoff, cancelPending,
    goHome, roll, toggleHold, scoreCategory, toggleOracle,
  } = useGameState();

  const onlineGame = useOnlineGame();
  const auth = useAuth();

  const [showHighscores,  setShowHighscores]  = useState(false);
  const [hsContext,       setHsContext]       = useState('home'); // 'home' | 'game'
  const [showSetup,       setShowSetup]       = useState(false);
  const [showRules,       setShowRules]       = useState(false);
  const [showOracle,      setShowOracle]      = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showInsights,    setShowInsights]    = useState(false);
  const [showAuth,        setShowAuth]        = useState(false);
  const [showProfile,     setShowProfile]     = useState(false);
  const [showScanner,     setShowScanner]     = useState(
    () => new URLSearchParams(window.location.search).has('scanner')
  );

  function openScanner()  { history.replaceState(null, '', '?scanner'); setShowScanner(true); }
  function closeScanner() { history.replaceState(null, '', window.location.pathname); setShowScanner(false); }

  // Submission tracking — lifted here so they survive GameBoard unmount when viewing leaderboard
  const [scoreSubmitted,   setScoreSubmitted]   = useState(false);
  const [mpSubmittedNames, setMpSubmittedNames] = useState([]);

  // ── Analytics event tracking ──────────────────────────────────────────────
  useEffect(() => { trackEvent('page_view'); }, []);

  const prevPhaseRef = useRef('start');
  useEffect(() => {
    if (state.phase === 'playing' && prevPhaseRef.current === 'start') {
      trackEvent('game_started');
    }
    prevPhaseRef.current = state.phase;
  }, [state.phase]);

  // Local game over: count each player's game separately. Single player attributes
  // to the logged-in user; local pass-and-play players are treated as guests.
  useEffect(() => {
    if (state.phase !== 'gameover') return;
    const single = state.players.length === 1;
    state.players.forEach((p) => {
      trackEvent('game_completed', {
        ...scorecardMetadata(p.scorecard),
        userId: single ? (auth.user?.id ?? null) : null,
      });
    });
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Online game over: each device tracks only its own player's game.
  const onlinePhase = onlineGame.state.phase;
  useEffect(() => {
    const live = onlineGame.connectionPhase === 'playing' || onlineGame.connectionPhase === 'reconnecting';
    if (!live || onlinePhase !== 'gameover') return;
    const me = onlineGame.state.players[onlineGame.myPlayerIndex];
    if (!me) return;
    trackEvent('game_completed', { ...scorecardMetadata(me.scorecard), userId: auth.user?.id ?? null });
  }, [onlinePhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-arm submission prompts when an online rematch starts (gameover → playing).
  const prevOnlinePhaseRef = useRef(onlinePhase);
  useEffect(() => {
    if (prevOnlinePhaseRef.current === 'gameover' && onlinePhase === 'playing') {
      setScoreSubmitted(false);
      setMpSubmittedNames([]);
    }
    prevOnlinePhaseRef.current = onlinePhase;
  }, [onlinePhase]);

  const { phase } = state;

  function handleNewGame() {
    startGame();
    setScoreSubmitted(false);
    setMpSubmittedNames([]);
  }

  function handleSetupMultiplayer(names) {
    setupMultiplayer(names);
    setScoreSubmitted(false);
    setMpSubmittedNames([]);
    setShowSetup(false);
  }

  // ── Reconnecting into a game in progress (after reload) ───────────────────
  // Neutral full-screen loader — never the lobby — until the snapshot lands.
  if (onlineGame.connectionPhase === 'restoring') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'var(--font-sans)', color: 'var(--color-ink-mute)',
      }}>
        <div className="lobby-spinner" aria-label="Reconnecting" />
        <p>Reconnecting to your game…</p>
      </div>
    );
  }

  // ── Online lobby (before game starts) ────────────────────────────────────
  if (showOnlineLobby && onlineGame.connectionPhase !== 'playing') {
    return (
      <OnlineLobbyScreen
        onBack={() => { setShowOnlineLobby(false); onlineGame.leaveRoom(); }}
        onGameStart={() => setShowOnlineLobby(false)}
        onlineGameHook={onlineGame}
      />
    );
  }

  // ── Online game in progress ───────────────────────────────────────────────
  if (onlineGame.connectionPhase === 'playing' || onlineGame.connectionPhase === 'reconnecting') {
    return (
      <GameBoard
        state={onlineGame.state}
        onRoll={onlineGame.roll}
        onToggleHold={onlineGame.toggleHold}
        onScore={onlineGame.scoreCategory}
        onToggleOracle={onlineGame.toggleOracle}
        onGoHome={() => { onlineGame.goHome(); setShowOnlineLobby(false); setScoreSubmitted(false); setMpSubmittedNames([]); }}
        onNewGame={() => { onlineGame.goHome(); setShowOnlineLobby(false); }}
        onViewHighscores={() => { setHsContext('game'); setShowHighscores(true); }}
        onDismissHandoff={onlineGame.dismissHandoff}
        onCancelPending={onlineGame.cancelPending}
        scoreSubmitted={scoreSubmitted}
        onScoreSubmitted={() => setScoreSubmitted(true)}
        mpSubmittedNames={mpSubmittedNames}
        onMpPlayerSubmitted={(name) => setMpSubmittedNames(prev => [...prev, name])}
        authUser={auth.user}
        authUsername={auth.username}
        isOnlineGame
        onlineGame={onlineGame}
      />
    );
  }

  if (showScanner) {
    return <ScannerScreen onClose={closeScanner} />;
  }

  if (showAuth) {
    return (
      <AuthScreen
        onClose={() => setShowAuth(false)}
        onAuthed={() => setShowAuth(false)}
        signIn={auth.signIn}
        signUp={auth.signUp}
      />
    );
  }

  if (showProfile && auth.user) {
    return (
      <ProfileScreen
        onClose={() => setShowProfile(false)}
        onSignOut={async () => { await auth.signOut(); setShowProfile(false); }}
        userId={auth.user.id}
        username={auth.username}
      />
    );
  }

  if (showInsights) {
    return (
      <AppInsightsScreen
        onClose={() => setShowInsights(false)}
        userId={auth.user?.id ?? null}
        username={auth.username}
      />
    );
  }

  if (showHighscores) {
    return (
      <HighscoresScreen
        onClose={() => setShowHighscores(false)}
        backLabel={hsContext === 'game' ? '← Back to game' : '← Back to home'}
      />
    );
  }

  if (showRules) {
    return <RulesScreen onClose={() => setShowRules(false)} />;
  }

  if (showOracle) {
    return <OracleScreen onClose={() => setShowOracle(false)} />;
  }

  if (phase === 'start') {
    if (showSetup) {
      return (
        <PlayerSetupScreen
          onStart={handleSetupMultiplayer}
          onBack={() => setShowSetup(false)}
        />
      );
    }
    return (
      <StartScreen
        onStart={startGame}
        onMultiplayer={() => setShowSetup(true)}
        onOnlineMultiplayer={() => setShowOnlineLobby(true)}
        onHighscores={() => { setHsContext('home'); setShowHighscores(true); }}
        onRules={() => setShowRules(true)}
        onOracle={() => setShowOracle(true)}
        onInsights={() => setShowInsights(true)}
        authAvailable={auth.available}
        username={auth.username}
        onLogin={() => setShowAuth(true)}
        onProfile={() => setShowProfile(true)}
      />
    );
  }

  return (
    <GameBoard
      state={state}
      onRoll={roll}
      onToggleHold={toggleHold}
      onScore={scoreCategory}
      onToggleOracle={toggleOracle}
      onGoHome={() => { goHome(); setShowSetup(false); setScoreSubmitted(false); setMpSubmittedNames([]); }}
      onNewGame={handleNewGame}
      onViewHighscores={() => { setHsContext('game'); setShowHighscores(true); }}
      onDismissHandoff={dismissHandoff}
      onCancelPending={cancelPending}
      scoreSubmitted={scoreSubmitted}
      onScoreSubmitted={() => setScoreSubmitted(true)}
      mpSubmittedNames={mpSubmittedNames}
      onMpPlayerSubmitted={(name) => setMpSubmittedNames(prev => [...prev, name])}
      authUser={auth.user}
      authUsername={auth.username}
    />
  );
}
