import { Character, Entity, EntityType, GameState, Particle, Projectile, Rect, Vector2 } from '../types';
import { COLORS, CONFIG, MAP_OBSTACLES, PHYSICS } from '../constants';
import { soundService } from './SoundService';

export class GameEngine {
  public entities: Entity[] = [];
  public gameState: GameState = GameState.MENU;
  public timeLeft: number = CONFIG.matchDuration;
  public width: number;
  public height: number;
  
  private lastTime: number = 0;
  private inputKeys: Set<string> = new Set();
  private mousePos: Vector2 = { x: 0, y: 0 };
  private onGameOver: (winner: string) => void;

  constructor(width: number, height: number, onGameOver: (winner: string) => void) {
    this.width = width;
    this.height = height;
    this.onGameOver = onGameOver;
  }

  public start(playerName: string) {
    this.entities = [];
    this.timeLeft = CONFIG.matchDuration;
    this.gameState = GameState.PLAYING;
    this.lastTime = performance.now();
    soundService.init();

    // Spawn Player
    this.spawnCharacter(playerName, true);

    // Spawn Bots
    for (let i = 0; i < CONFIG.botCount; i++) {
      this.spawnCharacter(`Bot-${i + 1}`, false);
    }
  }

  public handleInput(keys: Set<string>, mousePos: Vector2, isMouseDown: boolean) {
    this.inputKeys = keys;
    this.mousePos = mousePos;

    if (this.gameState === GameState.PLAYING && isMouseDown) {
      const player = this.getPlayer();
      if (player) {
        this.tryShoot(player, mousePos);
      }
    }
  }

  public update(time: number) {
    if (this.gameState !== GameState.PLAYING) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // Cap dt to prevent skipping
    this.lastTime = time;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.endGame('Time Limit');
      return;
    }

    // Process Entities
    this.entities.forEach(entity => {
      if (entity.type === EntityType.PLAYER) {
        this.updatePlayer(entity as Character, dt);
      } else if (entity.type === EntityType.BOT) {
        this.updateBot(entity as Character, dt);
      } else if (entity.type === EntityType.PROJECTILE) {
        this.updateProjectile(entity as Projectile, dt);
      } else if (entity.type === EntityType.PARTICLE) {
        this.updateParticle(entity as Particle, dt);
      }
    });

    // Clean up
    this.entities = this.entities.filter(e => !e.markedForDeletion);
    
    // Check Win Condition
    const topScorer = this.entities
        .filter(e => (e.type === EntityType.PLAYER || e.type === EntityType.BOT))
        .map(e => e as Character)
        .sort((a, b) => b.kills - a.kills)[0];

    if (topScorer && topScorer.kills >= CONFIG.scoreToWin) {
        this.endGame(topScorer.name);
    }
  }

  private updatePlayer(player: Character, dt: number) {
    if (player.health <= 0) {
      this.respawn(player);
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.inputKeys.has('w') || this.inputKeys.has('ArrowUp')) dy -= 1;
    if (this.inputKeys.has('s') || this.inputKeys.has('ArrowDown')) dy += 1;
    if (this.inputKeys.has('a') || this.inputKeys.has('ArrowLeft')) dx -= 1;
    if (this.inputKeys.has('d') || this.inputKeys.has('ArrowRight')) dx += 1;

    // Normalize
    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    player.velocity = { x: dx * PHYSICS.PLAYER_SPEED, y: dy * PHYSICS.PLAYER_SPEED };
    this.moveCharacter(player, dt);

    // Rotation (Look at mouse)
    player.rotation = Math.atan2(this.mousePos.y - player.position.y, this.mousePos.x - player.position.x);
  }

  private updateBot(bot: Character, dt: number) {
    if (bot.health <= 0) {
      this.respawn(bot);
      return;
    }

    // AI Logic
    const target = this.findNearestEnemy(bot);
    
    if (target) {
      // Aim
      const angle = Math.atan2(target.position.y - bot.position.y, target.position.x - bot.position.x);
      bot.rotation = angle; // Immediate turn for snap, can smooth later

      // Move (Seek) - Stop if too close to avoid clipping
      const dist = this.getDistance(bot.position, target.position);
      if (dist > 200) {
         bot.velocity = {
           x: Math.cos(angle) * PHYSICS.BOT_SPEED,
           y: Math.sin(angle) * PHYSICS.BOT_SPEED
         };
      } else if (dist < 100) {
          // Back up if too close
          bot.velocity = {
            x: -Math.cos(angle) * PHYSICS.BOT_SPEED,
            y: -Math.sin(angle) * PHYSICS.BOT_SPEED
          };
      } else {
          // Strafe
          bot.velocity = {
            x: -Math.sin(angle) * PHYSICS.BOT_SPEED * 0.5,
            y: Math.cos(angle) * PHYSICS.BOT_SPEED * 0.5
          };
      }

      // Shoot (with simple raycast check or just distance)
      if (dist < 500) {
          // Add some randomness/inaccuracy
          const aimError = (Math.random() - 0.5) * 0.2;
          const aimPos = {
             x: target.position.x + (Math.cos(angle + aimError) * 100),
             y: target.position.y + (Math.sin(angle + aimError) * 100),
          };
          this.tryShoot(bot, aimPos);
      }
    } else {
        // Idle / Wander
        bot.velocity = { x: 0, y: 0 };
    }

    this.moveCharacter(bot, dt);
  }

  private moveCharacter(char: Character, dt: number) {
    const nextX = char.position.x + char.velocity.x * dt;
    const nextY = char.position.y + char.velocity.y * dt;

    // Boundary Checks
    let newX = Math.max(char.radius, Math.min(this.width - char.radius, nextX));
    let newY = Math.max(char.radius, Math.min(this.height - char.radius, nextY));

    // Obstacle Collision (AABB vs Circle)
    // Simple resolution: if hitting wall, revert axis
    if (this.checkWallCollision({ x: newX, y: char.position.y }, char.radius)) {
        newX = char.position.x;
    }
    if (this.checkWallCollision({ x: newX, y: newY }, char.radius)) {
        newY = char.position.y;
    }

    char.position.x = newX;
    char.position.y = newY;
  }

  private checkWallCollision(pos: Vector2, radius: number): boolean {
    for (const wall of MAP_OBSTACLES) {
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(wall.x, Math.min(pos.x, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(pos.y, wall.y + wall.height));

        const distanceX = pos.x - closestX;
        const distanceY = pos.y - closestY;

        // If distance < radius, collision
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        if (distanceSquared < (radius * radius)) {
            return true;
        }
    }
    return false;
  }

  private updateProjectile(proj: Projectile, dt: number) {
    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;

    // Wall Collision
    if (
        proj.position.x < 0 || proj.position.x > this.width ||
        proj.position.y < 0 || proj.position.y > this.height ||
        this.checkWallCollision(proj.position, proj.radius)
    ) {
        proj.markedForDeletion = true;
        this.spawnParticles(proj.position, COLORS.PROJECTILE, 5);
        return;
    }

    // Character Collision
    for (const entity of this.entities) {
        if ((entity.type === EntityType.PLAYER || entity.type === EntityType.BOT) && entity.id !== proj.ownerId) {
            const char = entity as Character;
             if (char.health > 0 && this.getDistance(proj.position, char.position) < char.radius + proj.radius) {
                 this.damageCharacter(char, proj.damage, proj.ownerId);
                 proj.markedForDeletion = true;
                 this.spawnParticles(proj.position, '#FFFFFF', 3);
                 soundService.playHit();
                 break;
             }
        }
    }
  }

  private updateParticle(part: Particle, dt: number) {
    part.life -= part.decay * dt;
    part.position.x += part.velocity.x * dt;
    part.position.y += part.velocity.y * dt;
    if (part.life <= 0) {
        part.markedForDeletion = true;
    }
  }

  private damageCharacter(victim: Character, amount: number, attackerId: string) {
    victim.health -= amount;
    if (victim.health <= 0) {
        victim.deaths++;
        soundService.playDie();
        this.spawnParticles(victim.position, victim.color, 20);
        
        // Award kill
        const attacker = this.entities.find(e => e.id === attackerId) as Character;
        if (attacker) {
            attacker.kills++;
        }
    }
  }

  private respawn(char: Character) {
      // Find a safe spot
      let safePos = { x: 0, y: 0 };
      let attempts = 0;
      do {
          safePos.x = Math.random() * (this.width - 100) + 50;
          safePos.y = Math.random() * (this.height - 100) + 50;
          attempts++;
      } while (this.checkWallCollision(safePos, char.radius * 2) && attempts < 10);

      char.health = char.maxHealth;
      char.position = safePos;
      char.velocity = { x: 0, y: 0 };
  }

  private tryShoot(shooter: Character, targetPos: Vector2) {
    const now = performance.now();
    if (now - shooter.lastFired < shooter.fireRate) return;

    shooter.lastFired = now;

    const angle = Math.atan2(targetPos.y - shooter.position.y, targetPos.x - shooter.position.x);
    const velocity = {
        x: Math.cos(angle) * PHYSICS.PROJECTILE_SPEED,
        y: Math.sin(angle) * PHYSICS.PROJECTILE_SPEED
    };
    
    // Spawn offset to not hit self
    const spawnPos = {
        x: shooter.position.x + Math.cos(angle) * (shooter.radius + 5),
        y: shooter.position.y + Math.sin(angle) * (shooter.radius + 5)
    };

    const projectile: Projectile = {
        id: Math.random().toString(36).substr(2, 9),
        type: EntityType.PROJECTILE,
        position: spawnPos,
        velocity: velocity,
        radius: PHYSICS.PROJECTILE_RADIUS,
        color: COLORS.PROJECTILE,
        rotation: angle,
        markedForDeletion: false,
        damage: PHYSICS.PROJECTILE_DAMAGE,
        ownerId: shooter.id,
        speed: PHYSICS.PROJECTILE_SPEED
    };

    this.entities.push(projectile);
    soundService.playShoot();
  }

  private spawnParticles(pos: Vector2, color: string, count: number) {
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 100 + 50;
          this.entities.push({
              id: Math.random().toString(),
              type: EntityType.PARTICLE,
              position: { ...pos },
              velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
              radius: Math.random() * 3 + 1,
              color: color,
              rotation: 0,
              markedForDeletion: false,
              life: 1.0,
              decay: Math.random() * 2 + 1
          } as Particle);
      }
  }

  private spawnCharacter(name: string, isPlayer: boolean) {
      const char: Character = {
          id: isPlayer ? 'player-1' : `bot-${Math.random()}`,
          type: isPlayer ? EntityType.PLAYER : EntityType.BOT,
          name: name,
          position: { x: 0, y: 0 }, // Will be reset by respawn
          velocity: { x: 0, y: 0 },
          radius: PHYSICS.PLAYER_RADIUS,
          color: isPlayer ? COLORS.PLAYER : COLORS.BOT,
          rotation: 0,
          markedForDeletion: false,
          health: 100,
          maxHealth: 100,
          speed: isPlayer ? PHYSICS.PLAYER_SPEED : PHYSICS.BOT_SPEED,
          fireRate: PHYSICS.FIRE_RATE + (isPlayer ? 0 : 200), // Bots fire slower
          lastFired: 0,
          kills: 0,
          deaths: 0,
          teamId: isPlayer ? 0 : 1
      };
      this.respawn(char);
      this.entities.push(char);
  }

  private getPlayer(): Character | undefined {
      return this.entities.find(e => e.type === EntityType.PLAYER) as Character;
  }

  private findNearestEnemy(me: Character): Character | null {
      let nearest: Character | null = null;
      let minDist = Infinity;

      for (const entity of this.entities) {
          if (entity.id === me.id) continue;
          if (entity.type !== EntityType.PLAYER && entity.type !== EntityType.BOT) continue;
          
          const target = entity as Character;
          if (target.health <= 0) continue;

          const dist = this.getDistance(me.position, target.position);
          if (dist < minDist) {
              minDist = dist;
              nearest = target;
          }
      }
      return nearest;
  }

  private getDistance(a: Vector2, b: Vector2): number {
      return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  }

  private endGame(winner: string) {
      this.gameState = GameState.GAME_OVER;
      this.onGameOver(winner);
  }
}
