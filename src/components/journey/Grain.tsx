'use client';

// OWNED BY ATMOSPHERE agent.
// Full-viewport animated film grain. A handful of monochrome noise tiles are
// pre-generated once, then the visible canvas is re-filled from a random tile
// with a random offset at ~8fps — real grain crawl, near-zero per-frame cost
// (one pattern fill). Canvas renders at half resolution and stretches, which
// reads as film grain rather than pixel noise. Static under reduced motion.
// Contract kept: `export function Grain()` — fixed overlay zIndex 80,
// pointer-events none, opacity ~0.06.
//
// THE LIGHT ACT. Overlay noise is not symmetric about mid-grey: on the void
// ground it modulates a near-black plate by ~0.6%, on the bone ground of the
// return it modulates by ~1.8% — the same plate that reads as film on black
// reads as dirt on cream. So the opacity is a token (--jp-grain, journey.css)
// that Finale scrubs down across the inversion, which keeps the tooth of the
// grain constant while the ground turns over. Blend mode never switches: a
// mid-transit change of blend mode would pop on the wipe edge.

import { useEffect, useRef } from 'react';

const TILE = 224;
const TILE_COUNT = 6;
const FPS_INTERVAL = 125; // ~8fps

export function Grain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-generate noise tiles.
    const tiles: CanvasPattern[] = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const t = document.createElement('canvas');
      t.width = TILE;
      t.height = TILE;
      const tc = t.getContext('2d');
      if (!tc) continue;
      const img = tc.createImageData(TILE, TILE);
      const d = img.data;
      for (let p = 0; p < d.length; p += 4) {
        const v = (Math.random() * 255) | 0;
        d[p] = v;
        d[p + 1] = v;
        d[p + 2] = v;
        d[p + 3] = 255;
      }
      tc.putImageData(img, 0, 0);
      const pat = ctx.createPattern(t, 'repeat');
      if (pat) tiles.push(pat);
    }
    if (tiles.length === 0) return;

    let frame = 0;
    const draw = () => {
      const pat = tiles[frame % tiles.length];
      frame++;
      const ox = (Math.random() * TILE) | 0;
      const oy = (Math.random() * TILE) | 0;
      ctx.save();
      ctx.translate(-ox, -oy);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, canvas.width + TILE, canvas.height + TILE);
      ctx.restore();
    };

    const resize = () => {
      // Half-res buffer stretched to the viewport = filmic grain size.
      canvas.width = Math.max(1, Math.ceil(window.innerWidth / 2));
      canvas.height = Math.max(1, Math.ceil(window.innerHeight / 2));
      draw();
    };
    resize();
    window.addEventListener('resize', resize);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = 0;
    if (!reduced) {
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (now - last < FPS_INTERVAL) return;
        last = now;
        if (document.hidden) return;
        draw();
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 80,
        pointerEvents: 'none',
        opacity: 'var(--jp-grain, 0.06)',
        mixBlendMode: 'overlay',
      }}
    />
  );
}
