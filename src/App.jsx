import { useState } from 'react';
import { useGameState } from './hooks/useGameState.js';
import StartScreen from './components/StartScreen.jsx';
import PlayerSetupScreen from './components/PlayerSetupScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HandoffOverlay from './components/HandoffOverlay.jsx';
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

  const { phase, players, currentPlayerIndex, showHandoff } = state;

  if (showHighscores) {
    return <HighscoresScreen onClose={() => setShowHighscores(false)} />;
  }

  if (phase === 'start') {
    if (showSetup) {
      return (
        <PlayerSetupScreen
          onStart={names => { setupMultiplayer(names); setShowSetup(false); }}
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
    <>
      {showHandoff && (
        <HandoffOverlay
          playerName={players[currentPlayerIndex].name}
          onStart={dismissHandoff}
        />
      )}
      <GameBoard
        state={state}
        onRoll={roll}
        onToggleHold={toggleHold}
        onScore={scoreCategory}
        onToggleOracle={toggleOracle}
        onGoHome={() => { goHome(); setShowSetup(false); }}
        onNewGame={startGame}
        onViewHighscores={() => setShowHighscores(true)}
      />
    </>
  );
}
