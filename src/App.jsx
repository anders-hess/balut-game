import { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState.js';
import { useOnlineGame } from './hooks/useOnlineGame.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
import OnlineLobbyScreen from './components/OnlineLobbyScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HighscoresScreen from './components/HighscoresScreen.jsx';
import RulesScreen from './components/RulesScreen.jsx';
import OracleScreen from './components/OracleScreen.jsx';
import AppInsightsScreen from './components/AppInsightsScreen.jsx';
import ScannerScreen from './scanner/ScannerScreen.jsx';
import { trackEvent } from './services/analytics.js';
import { calcTotals, countBaluts } from './logic/scoring.js';
import './styles/theme.css';

export default function App() {
  const {
    state,
    startGame, setupMultiplayer, dismissHandoff, cancelPending,
    goHome, roll, toggleHold, scoreCategory, toggleOracle,
  } = useGameState();

  const onlineGame = useOnlineGame();

  const [showHighscores,  setShowHighscores]  = useState(false);
  const [hsContext,       setHsContext]       = useState('home'); // 'home' | 'game'
  const [showSetup,       setShowSetup]       = useState(false);
  const [showRules,       setShowRules]       = useState(false);
  const [showOracle,      setShowOracle]      = useState(false);
  const [showOnlineLobby, setShowOnlineLobby] = useState(false);
  const [showInsights,    setShowInsights]    = useState(false);
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

  useEffect(() => {
    if (state.phase === 'gameover' && state.players.length === 1) {
      const sc = state.players[0].scorecard;
      const { totalBig, totalSmall } = calcTotals(sc);
      const colSum    = (cat) => sc[cat].reduce((a, v) => a + (v ?? 0), 0);
      const allFilled = (cat) => sc[cat].every(v => v !== null && v > 0);
      const anyPositive = (cat) => sc[cat].some(v => v !== null && v > 0);
      trackEvent('game_completed', {
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
      });
    }
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

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
        isOnlineGame
        onlineGame={onlineGame}
      />
    );
  }

  if (showScanner) {
    return <ScannerScreen onClose={closeScanner} />;
  }

  if (showInsights) {
    return <AppInsightsScreen onClose={() => setShowInsights(false)} />;
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
    />
  );
}
