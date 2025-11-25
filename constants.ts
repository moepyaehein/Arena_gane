import { GameConfig, Rect } from './types';

export const CONFIG: GameConfig = {
  mapWidth: 1600,
  mapHeight: 900,
  botCount: 5, // 1 Player + 5 Bots = 6 Total
  matchDuration: 180,
  scoreToWin: 15,
};

export const PHYSICS = {
  PLAYER_SPEED: 300,
  BOT_SPEED: 260,
  PROJECTILE_SPEED: 800,
  FRICTION: 0.92,
  PLAYER_RADIUS: 20,
  PROJECTILE_RADIUS: 5,
  PROJECTILE_DAMAGE: 25,
  FIRE_RATE: 200, // ms
};

export const COLORS = {
  PLAYER: '#3b82f6', // blue-500
  BOT: '#ef4444', // red-500
  PROJECTILE: '#fcd34d', // amber-300
  OBSTACLE: '#1f2937', // gray-800
  BACKGROUND: '#111827', // gray-900
  GRID: '#1f2937',
};

// Simple symmetric arena map
export const MAP_OBSTACLES: Rect[] = [
  // Center Pillar
  { x: 700, y: 350, width: 200, height: 200 },
  // Top Left L
  { x: 200, y: 150, width: 200, height: 50 },
  { x: 200, y: 150, width: 50, height: 200 },
  // Top Right L
  { x: 1200, y: 150, width: 200, height: 50 },
  { x: 1350, y: 150, width: 50, height: 200 },
  // Bottom Left L
  { x: 200, y: 700, width: 200, height: 50 },
  { x: 200, y: 550, width: 50, height: 200 },
  // Bottom Right L
  { x: 1200, y: 700, width: 200, height: 50 },
  { x: 1350, y: 550, width: 50, height: 200 },
];
