import { useState } from 'react';
import { useGameState } from './hooks/useGameState.js';
import StartScreen from './components/StartScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import HighscoresScreen from './components/HighscoresScreen.jsx';
import './styles/theme.css';

export default function App() {
  const { state, startGame, goHome, roll, toggleHold, scoreCategory, toggleOracle } = useGameState();
  const [showHighscores, setShowHighscores] = useState(false);

  if (showHighscores) {
    return <HighscoresScreen onClose={() => setShowHighscores(false)} />;
  }

  if (state.phase === 'start') {
    return (
      <StartScreen
        onStart={startGame}
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
      onGoHome={goHome}
      onNewGame={startGame}
      onViewHighscores={() => setShowHighscores(true)}
    />
  );
}
