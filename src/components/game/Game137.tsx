'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { GameEngine, type GameState, type Bumper, type Obstacle, type Glyph } from './gameEngine';
import { GameRenderer } from './gameRenderer';
import { COLORS } from './gameData';

export default function Game137() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle canvas click/touch
  const handleCanvasInteraction = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();

    if (!engineRef.current) return;

    const engine = engineRef.current;
    const state = engine.getState();

    if (state.gameOver) {
      engine.restart();
      return;
    }

    if (!state.gameStarted) {
      engine.launch();
      return;
    }

    // Determine if left or right side was clicked/tapped
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number;

    if ('touches' in event) {
      if (event.touches.length === 0) return;
      clientX = event.touches[0].clientX;
    } else {
      clientX = event.clientX;
    }

    const x = clientX - rect.left;
    const centerX = canvas.width / 2;

    engine.nudge(x < centerX ? 'left' : 'right');
  }, []);

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number | undefined;
    let lastTime = 0;
    let cleanupResize: (() => void) | undefined;

    // Animation loop — declared inside the effect so it can refer to itself
    // without breaking the react-hooks/immutability rule about useCallback
    // self-references.
    const animate = (currentTime: number) => {
      const engine = engineRef.current;
      const renderer = rendererRef.current;
      if (!engine || !renderer || !canvasRef.current) return;

      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update game logic
      engine.update(deltaTime);
      const state = engine.getState();
      setGameState(state);

      // Clear and draw background
      renderer.clear();
      renderer.drawGridLines();

      // Draw bumpers
      state.bumpers.forEach((bumper: Bumper) => {
        if (bumper.type === 'circle') {
          renderer.drawCircleBumper(bumper.x, bumper.y, bumper.size, bumper.hit);
        } else if (bumper.type === 'triangle') {
          renderer.drawTriangleBumper(bumper.x, bumper.y, bumper.size, bumper.pointUp, bumper.hit);
        } else if (bumper.type === 'hexagon') {
          renderer.drawHexagonBumper(bumper.x, bumper.y, bumper.size, bumper.hit);
        }
      });

      // Draw obstacles
      state.obstacles.forEach((obstacle: Obstacle) => {
        renderer.drawObstacle(obstacle.x, obstacle.y, obstacle.symbol);
      });

      // Draw glyphs
      state.glyphs.forEach((glyph: Glyph) => {
        if (!glyph.collected) {
          renderer.drawGlyph(glyph.x, glyph.y, glyph.symbol);
        }
      });

      // Draw player
      renderer.drawPlayer(state.playerPos.x, state.playerPos.y, 15);

      // Draw UI
      renderer.drawUI(
        state.score,
        state.lives,
        state.currentTarotCard?.name
      );

      // Draw death message
      if (state.lastDeathMessage && Date.now() < state.showDeathMessage) {
        renderer.drawDeathMessage(state.lastDeathMessage);
      }

      // Draw start prompt
      if (!state.gameStarted) {
        renderer.drawStartPrompt();
      }

      // Draw game over screen
      if (state.gameOver) {
        renderer.drawGameOver(state.score, state.highScore);
      }

      // Milestone flash effect
      if (engine.shouldShowMilestoneFlash()) {
        renderer.flashScreen(COLORS.AMBER, 0.2);
      }

      // Continue animation loop
      animationId = requestAnimationFrame(animate);
    };

    const initGame = async () => {
      try {
        // Set canvas size
        const updateCanvasSize = () => {
          const container = canvas.parentElement;
          if (!container) return;

          const maxWidth = 600;
          const containerWidth = container.clientWidth;

          const scale = Math.min(1, containerWidth / maxWidth);
          canvas.width = maxWidth * scale;
          canvas.height = 800 * scale;

          canvas.style.width = `${canvas.width}px`;
          canvas.style.height = `${canvas.height}px`;

          if (rendererRef.current) {
            rendererRef.current.updateScale(scale);
          }
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        cleanupResize = () => window.removeEventListener('resize', updateCanvasSize);

        // Initialize game components
        const engine = new GameEngine(canvas);
        const renderer = new GameRenderer(canvas);

        await engine.initMatter();

        engineRef.current = engine;
        rendererRef.current = renderer;

        setIsInitialized(true);

        // Start animation loop
        lastTime = performance.now();
        animationId = requestAnimationFrame(animate);
      } catch (error) {
        console.error('Failed to initialize game:', error);
      }
    };

    initGame();

    return () => {
      if (animationId !== undefined) {
        cancelAnimationFrame(animationId);
      }
      cleanupResize?.();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#141218] p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 
          className="text-4xl md:text-6xl font-bold text-[#d0c8be] mb-4"
          style={{ fontFamily: 'Cinzel Decorative, serif' }}
        >
          THE GREAT WORK
        </h1>
        <p className="text-lg md:text-xl text-[#d4a040] max-w-2xl mx-auto leading-relaxed">
          Navigate the dimensions. Dodge the planets. Bounce off the sacred geometry.
          <br />
          <span className="text-[#c43070]">Don&apos;t get Uranus&apos;d.</span>
        </p>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasInteraction}
          onTouchStart={handleCanvasInteraction}
          className="border border-[#706870] rounded-lg shadow-2xl cursor-pointer"
          style={{ 
            maxWidth: '100%', 
            height: 'auto',
            imageRendering: 'pixelated'
          }}
        />
        
        {!isInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#141218] bg-opacity-75 rounded-lg">
            <div className="text-[#d4a040] text-xl">Loading The Great Work...</div>
          </div>
        )}
      </div>

      {/* Game Instructions */}
      {gameState && !gameState.gameStarted && (
        <div className="mt-8 text-center max-w-md">
          <h3 className="text-xl text-[#d4a040] mb-4">How to Play:</h3>
          <ul className="text-[#d0c8be] text-sm space-y-2 text-left">
            <li>• Tap to launch your sacred glyph upward</li>
            <li>• Tap left/right sides to nudge while airborne</li>
            <li>• Bounce off sacred geometry for points</li>
            <li>• Dodge the planetary obstacles in zodiac lanes</li>
            <li>• Collect all glyphs for cipher bonus</li>
            <li>• Each life grants a random tarot effect</li>
          </ul>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8">
        <Link
          href="/"
          className="text-[#d4a040] hover:text-[#c43070] transition-colors duration-300"
        >
          ← Back to 137 Studio
        </Link>
      </div>
    </div>
  );
}
