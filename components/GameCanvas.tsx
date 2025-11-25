import React, { useEffect, useRef } from 'react';
import { Entity, EntityType, Character, Particle } from '../types';
import { GameEngine } from '../services/GameEngine';
import { COLORS, MAP_OBSTACLES } from '../constants';

interface GameCanvasProps {
  engine: GameEngine;
  width: number;
  height: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ engine, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = (time: number) => {
      engine.update(time);

      // --- Drawing ---
      
      // Background
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = COLORS.GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let x = 0; x <= width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for(let y = 0; y <= height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      ctx.stroke();

      // Obstacles
      ctx.fillStyle = COLORS.OBSTACLE;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#000';
      for (const wall of MAP_OBSTACLES) {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        // Highlight edge
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
      }
      ctx.shadowBlur = 0;

      // Entities
      for (const entity of engine.entities) {
        ctx.save();
        ctx.translate(entity.position.x, entity.position.y);
        ctx.rotate(entity.rotation);

        if (entity.type === EntityType.PLAYER || entity.type === EntityType.BOT) {
          const char = entity as Character;
          if (char.health > 0) {
              // Body
              ctx.fillStyle = entity.color;
              ctx.shadowColor = entity.color;
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
              ctx.fill();

              // Gun
              ctx.fillStyle = '#1f2937'; // Gun color
              ctx.fillRect(0, -5, entity.radius + 10, 10);
              
              ctx.shadowBlur = 0;

              // Health Bar
              ctx.rotate(-entity.rotation); // Reset rotation for UI
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(-20, -35, 40, 6);
              ctx.fillStyle = '#22c55e';
              ctx.fillRect(-20, -35, 40 * (char.health / char.maxHealth), 6);
              
              // Name
              ctx.fillStyle = '#fff';
              ctx.font = '12px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(char.name, 0, -42);
          } else {
              // Dead marker
              ctx.fillStyle = '#6b7280';
              ctx.beginPath();
              ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
              ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
              ctx.stroke();
          }

        } else if (entity.type === EntityType.PROJECTILE) {
          ctx.fillStyle = entity.color;
          ctx.shadowColor = entity.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

        } else if (entity.type === EntityType.PARTICLE) {
          const p = entity as Particle;
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [engine, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height}
      className="block bg-gray-900 border border-gray-700 rounded-lg shadow-2xl cursor-crosshair"
    />
  );
};

export default GameCanvas;
