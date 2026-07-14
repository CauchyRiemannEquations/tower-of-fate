import { useEffect, useRef } from 'react';
import { initGame } from './game/PhaserGame';
import { useGameStore } from './hooks/useGameStore';
import { HUD } from './components/HUD';
import { BlockCards } from './components/BlockCards';
import { Controls } from './components/Controls';
import { MenuScreen } from './components/MenuScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { Toast } from './components/Toast';
import { DebugPanel } from './components/DebugPanel';

const DEBUG = typeof window !== 'undefined' && window.location.search.includes('debug');

export default function App() {
  const gameRef = useRef<HTMLDivElement>(null);
  const state = useGameStore();

  useEffect(() => {
    if (gameRef.current) initGame(gameRef.current);
  }, []);

  const inRun =
    state.phase === 'choosing' ||
    state.phase === 'aiming' ||
    state.phase === 'dropping' ||
    state.phase === 'collapsing';

  return (
    <div className="app">
      <div className="game-root" ref={gameRef} />
      <div className="ui-layer">
        {inRun && <HUD />}
        {inRun && (
          <div className="bottom-panel">
            <BlockCards />
            <Controls />
          </div>
        )}
        {state.phase === 'menu' && <MenuScreen />}
        {state.phase === 'gameover' && <GameOverScreen />}
        <TutorialOverlay />
        <Toast />
        {DEBUG && <DebugPanel />}
      </div>
    </div>
  );
}
