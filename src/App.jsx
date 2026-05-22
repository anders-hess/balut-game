import { useState } from 'react';
import { useGameState } from './hooks/useGameState.js';
import { useOnlineGame } from './hooks/useOnlineGame.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
import OnlineLobbyScreen from './components/OnlineLobbyScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HighscoresScreen from './components/HighscoresScreen.jsx';
import RulesScreen from './components/RulesScreen.jsx';
import OracleScreen from './components/OracleScreen.jsx';
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

  // Submission tracking — lifted here so they survive GameBoard unmount when viewing leaderboard
  const [scoreSubmitted,   setScoreSubmitted]   = useState(false);
  const [mpSubmittedNames, setMpSubmittedNames] = useState([]);

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
