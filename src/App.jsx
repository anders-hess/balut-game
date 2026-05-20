import { useState } from 'react';
import { useGameState } from './hooks/useGameState.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
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

  const [showHighscores, setShowHighscores] = useState(false);
  const [hsContext,      setHsContext]      = useState('home'); // 'home' | 'game'
  const [showSetup,      setShowSetup]      = useState(false);
  const [showRules,      setShowRules]      = useState(false);
  const [showOracle,     setShowOracle]     = useState(false);

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
