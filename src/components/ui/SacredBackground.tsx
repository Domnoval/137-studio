'use client';

import { useEffect, useRef } from 'react';
import { flowerOfLifePoints, GOLDEN_ANGLE, PHI } from '@/lib/sacred-math';

/**
 * Sacred Background - Canvas-based subtle geometric patterns
 * Barely visible Flower of Life that rotates with scroll
 * This is the invisible architecture made (almost) visible
 */
export function SacredBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Draw Flower of Life pattern
    const drawFlowerOfLife = (centerX: number, centerY: number, radius: number, opacity: number) => {
      const points = flowerOfLifePoints(radius, 2);
      
      ctx.strokeStyle = `rgba(201, 168, 76, ${opacity})`; // gold with opacity
      ctx.lineWidth = 0.5;
      
      points.forEach(point => {
        ctx.beginPath();
        ctx.arc(centerX + point.x, centerY + point.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    };

    // Animation loop
    const animate = () => {
      const now = Date.now() * 0.0005; // Slow time
      const scrollProgress = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Multiple layers of geometry at different scales and opacities
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Main pattern - rotates with scroll
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(scrollProgress * GOLDEN_ANGLE * (Math.PI / 180) * 0.1);
      ctx.translate(-centerX, -centerY);
      
      drawFlowerOfLife(centerX, centerY, 50, 0.03);
      drawFlowerOfLife(centerX, centerY, 80, 0.02);
      drawFlowerOfLife(centerX, centerY, 130, 0.015);
      
      ctx.restore();
      
      // Secondary patterns - breathe with time
      const breathe = Math.sin(now * PHI) * 0.01 + 0.02;
      drawFlowerOfLife(centerX * 0.3, centerY * 0.3, 30, breathe);
      drawFlowerOfLife(centerX * 1.7, centerY * 0.7, 40, breathe * 0.8);
      drawFlowerOfLife(centerX * 0.8, centerY * 1.6, 35, breathe * 0.6);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'var(--void)',
        mixBlendMode: 'screen'
      }}
    />
  );
}