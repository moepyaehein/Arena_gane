import React, { useEffect, useRef, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameEngine } from './services/GameEngine';
import { GameState, Character, EntityType } from './types';
import { CONFIG } from './constants';
import { Target, Trophy, Skull, Clock, RotateCcw } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerName, setPlayerName] = useState('Hero');
  const [winner, setWinner] = useState<string | null>(null);
  
  // HUD State (synced less frequently for performance)
  const [scores, setScores] = useState<Character[]>([]);
  const [time, setTime] = useState(CONFIG.matchDuration);

  // Engine Ref
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine(CONFIG.mapWidth, CONFIG.mapHeight, (win) => {
      setWinner(win);
      setGameState(GameState.GAME_OVER);
    });
  }

  // Input Handling
  useEffect(() => {
    const keys = new Set<string>();
    let mousePos = { x: 0, y: 0 };
    let isMouseDown = false;

    const handleKeyDown = (e: KeyboardEvent) => keys.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keys.delete(e.key);
    
    const handleMouseMove = (e: MouseEvent) => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            // Scale mouse pos to canvas resolution
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            mousePos = { 
                x: (e.clientX - rect.left) * scaleX, 
                y: (e.clientY - rect.top) * scaleY 
            };
        }
    };
    const handleMouseDown = () => isMouseDown = true;
    const handleMouseUp = () => isMouseDown = false;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Sync Input to Engine
    const interval = setInterval(() => {
        if (engineRef.current) {
            engineRef.current.handleInput(keys, mousePos, isMouseDown);
            
            // Sync HUD data every 100ms
            if (engineRef.current.gameState === GameState.PLAYING) {
                 const players = engineRef.current.entities
                    .filter(e => e.type === EntityType.PLAYER || e.type === EntityType.BOT) as Character[];
                 setScores([...players].sort((a, b) => b.kills - a.kills));
                 setTime(Math.ceil(engineRef.current.timeLeft));
            }
        }
    }, 1000 / 60);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        clearInterval(interval);
    };
  }, []);

  const startGame = () => {
    engineRef.current?.start(playerName);
    setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center font-sans text-gray-100 overflow-hidden">
      
      {/* Game Container */}
      <div className="relative">
        <GameCanvas engine={engineRef.current!} width={CONFIG.mapWidth} height={CONFIG.mapHeight} />

        {/* --- UI Overlays --- */}

        {/* Main Menu */}
        {gameState === GameState.MENU && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-8 tracking-tighter">
              NEON ARENA BLITZ
            </h1>
            <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl w-96">
                <label className="block text-sm font-medium text-gray-400 mb-2">OPERATOR NAME</label>
                <input 
                    type="text" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white mb-6 focus:outline-none focus:border-blue-500 transition-colors"
                />
                
                <div className="space-y-2 mb-6 text-sm text-gray-400">
                    <p className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-700 rounded text-center leading-6 text-xs text-white">W</div> Move Up</p>
                    <p className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-700 rounded text-center leading-6 text-xs text-white">A</div> Move Left</p>
                    <p className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-700 rounded text-center leading-6 text-xs text-white">S</div> Move Down</p>
                    <p className="flex items-center gap-2"><div className="w-6 h-6 bg-gray-700 rounded text-center leading-6 text-xs text-white">D</div> Move Right</p>
                    <p className="flex items-center gap-2"><Target size={16}/> Aim & Shoot</p>
                </div>

                <button 
                    onClick={startGame}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all transform hover:scale-105"
                >
                    ENTER ARENA
                </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
             <div className="bg-gray-800 p-10 rounded-2xl border-2 border-purple-500 shadow-2xl text-center">
                <h2 className="text-4xl font-bold text-white mb-2">MATCH COMPLETE</h2>
                <div className="text-2xl text-purple-400 mb-6">WINNER: <span className="font-black text-white">{winner}</span></div>
                
                <div className="mb-8">
                    {scores.slice(0, 3).map((s, i) => (
                        <div key={s.id} className="flex items-center justify-between w-64 border-b border-gray-700 py-2">
                             <div className="flex items-center gap-2">
                                <span className={`font-bold ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>#{i+1}</span>
                                <span>{s.name}</span>
                             </div>
                             <span className="font-mono">{s.kills}</span>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={startGame}
                    className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded transition-all"
                >
                    <RotateCcw size={20}/> RESTART MATCH
                </button>
             </div>
          </div>
        )}

        {/* HUD */}
        {gameState === GameState.PLAYING && (
          <>
            {/* Timer */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-gray-800/90 border border-gray-600 px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
                <Clock className="text-blue-400" size={20} />
                <span className={`font-mono text-2xl font-bold ${time < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
                </span>
            </div>

            {/* Scoreboard */}
            <div className="absolute top-4 right-4 bg-gray-800/80 p-4 rounded-lg border border-gray-700 w-64 backdrop-blur-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Trophy size={14}/> Leaderboard (Goal: {CONFIG.scoreToWin})
                </h3>
                <div className="space-y-1">
                    {scores.map((s, i) => (
                        <div key={s.id} className={`flex justify-between text-sm ${s.name === playerName ? 'bg-blue-900/50 p-1 rounded' : ''}`}>
                            <div className="flex gap-2">
                                <span className="w-4 text-gray-500 text-right">{i+1}.</span>
                                <span className={s.name === playerName ? 'text-blue-300 font-bold' : 'text-gray-300'}>{s.name}</span>
                            </div>
                            <div className="flex gap-3 font-mono">
                                <span className="text-green-400">{s.kills}</span>
                                <span className="text-red-400">{s.deaths}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls hint */}
            <div className="absolute bottom-4 left-4 text-gray-500 text-xs">
                WASD to Move • Click to Shoot
            </div>
          </>
        )}

      </div>
    </div>
  );
}
