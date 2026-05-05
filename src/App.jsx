import { useState } from 'react';
import { useGameState } from './hooks/useGameState.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HighscoresScreen from './components/HighscoresScreen.jsx';
import './styles/theme.css';

export default function App() {
  const {
    state,
    startGame, setupMultiplayer, dismissHandoff,
    goHome, roll, toggleHold, scoreCategory, toggleOracle,
  } = useGameState();

  const [showHighscores, setShowHighscores] = useState(false);
  const [showSetup,      setShowSetup]      = useState(false);

  // Submission tracking — lifted here so they survive GameBoard unmount when viewing leaderboard
  const [scoreSubmitted,    setScoreSubmitted]    = useState(false);
  const [mpSubmittedNames,  setMpSubmittedNames]  = useState([]);

  const { phase, players, currentPlayerIndex } = state;

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
    return <HighscoresScreen onClose={() => setShowHighscores(false)} />;
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
        onHighscores={() => setShowHighscores(true)}
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
      onViewHighscores={() => setShowHighscores(true)}
      onDismissHandoff={dismissHandoff}
      scoreSubmitted={scoreSubmitted}
      onScoreSubmitted={() => setScoreSubmitted(true)}
      mpSubmittedNames={mpSubmittedNames}
      onMpPlayerSubmitted={(name) => setMpSubmittedNames(prev => [...prev, name])}
    />
  );
}
