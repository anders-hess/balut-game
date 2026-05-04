import { useGameState } from './hooks/useGameState.js';
import StartScreen from './components/StartScreen.jsx';
import GameBoard from './components/GameBoard.jsx';
import './styles/theme.css';

export default function App() {
  const { state, startGame, goHome, roll, toggleHold, scoreCategory, toggleOracle } = useGameState();

  if (state.phase === 'start') {
    return <StartScreen onStart={startGame} />;
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
    />
  );
}
