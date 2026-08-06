// cosmos/textures.ts — OWNED BY COSMOS agent.
// Canvas-generated textures (client only): the mono glyph atlas and the soft
// red edge-glow used behind the nearest slab. Module-memoized singletons.

import * as THREE from 'three';
import { GLYPHS } from './cosmos-data';

export const ATLAS_GRID = 8; // 8x8 cells
const ATLAS_SIZE = 1024;

let glyphAtlas: THREE.CanvasTexture | null = null;

/** One shared atlas of chalk equation glyphs (JetBrains Mono). */
export function getGlyphAtlas(): THREE.CanvasTexture {
  if (glyphAtlas) return glyphAtlas;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;
  const cell = ATLAS_SIZE / ATLAS_GRID;

  const draw = () => {
    ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    ctx.fillStyle = '#e8e4dc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < GLYPHS.length && i < ATLAS_GRID * ATLAS_GRID; i++) {
      const g = GLYPHS[i];
      const cx = (i % ATLAS_GRID) * cell + cell / 2;
      const cy = Math.floor(i / ATLAS_GRID) * cell + cell / 2;
      const size = g.length > 4 ? 30 : g.length > 2 ? 44 : 64;
      ctx.font = `300 ${size}px 'JetBrains Mono', monospace`;
      ctx.fillText(g, cx, cy);
    }
    if (glyphAtlas) glyphAtlas.needsUpdate = true;
  };

  draw();
  glyphAtlas = new THREE.CanvasTexture(canvas);
  glyphAtlas.colorSpace = THREE.SRGBColorSpace;
  glyphAtlas.anisotropy = 4;
  // redraw once webfonts are actually available (mono metrics differ)
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(draw).catch(() => undefined);
  }
  return glyphAtlas;
}

let glowTexture: THREE.CanvasTexture | null = null;

/**
 * Soft rectangular halo: transparent core, luminous rim fading outward.
 * Drawn once, tinted red by the material. Used as the nearest-slab edge glow.
 */
export function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, S, S);
  // build an inset "frame band" with blur: bright thin rectangle ring
  ctx.save();
  ctx.filter = 'blur(10px)';
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 10;
  ctx.strokeRect(26, 26, S - 52, S - 52);
  ctx.restore();
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, S - 52, S - 52);
  ctx.restore();
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

let dustSprite: THREE.CanvasTexture | null = null;

/** Tiny radial-falloff dot for the dust points. */
export function getDustSprite(): THREE.CanvasTexture {
  if (dustSprite) return dustSprite;
  const S = 64;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  dustSprite = new THREE.CanvasTexture(canvas);
  return dustSprite;
}
