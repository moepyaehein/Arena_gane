export type Vector2 = { x: number; y: number };

export enum EntityType {
  PLAYER = 'PLAYER',
  BOT = 'BOT',
  PROJECTILE = 'PROJECTILE',
  PARTICLE = 'PARTICLE'
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  rotation: number;
  markedForDeletion: boolean;
}

export interface Character extends Entity {
  name: string;
  health: number;
  maxHealth: number;
  speed: number;
  fireRate: number; // ms between shots
  lastFired: number;
  kills: number;
  deaths: number;
  teamId: number;
}

export interface Projectile extends Entity {
  damage: number;
  ownerId: string;
  speed: number;
}

export interface Particle extends Entity {
  life: number; // 0 to 1
  decay: number;
}

export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  botCount: number;
  matchDuration: number; // seconds
  scoreToWin: number;
}
