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
  ctx.filter = 'blur(7px)';
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, S - 44, S - 44);
  ctx.restore();
  ctx.save();
  ctx.filter = 'blur(1.6px)';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, S - 44, S - 44);
  ctx.restore();
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

/* ============================================================== THE MOUNT
 *
 * ONE FRAMING SYSTEM, APPLIED IN THE RENDERER.
 *
 * MEASURED across the fifteen source photographs (mean ring luminance at 0.5%,
 * 1%, 2%, 3%, 5%, 8% and 12% inset from the edge, against each image's own
 * central median): six of them carry a studio paper / mount border past the
 * painted edge, and the borders are all different sizes —
 *
 *   broken-signal   rgb≈191 flat out to 12% of the short side  (a 15% mat)
 *   pink-skull      rgb≈223 out to 5%                          (a 6–10% mat)
 *   undertow        rgb≈217 out to 5%                          (a 5–7% mat)
 *   teal-skull      rgb≈240 out to 3%                          (a 4% mat)
 *   the-delegate    rgb≈166 out to 5%                          (a 9% mat)
 *   math-chaos      rgb≈255 at the very edge                   (a 2% mat)
 *   the other nine  no border at all
 *
 * At archive scale that is the loudest thing in the frame and it reads as a
 * design decision nobody made. The artwork is never touched: the files in
 * public/art are the artist's and stay byte-identical. What happens here is
 * PRESENTATION — the incidental border is measured and excluded from the UV
 * window, so every work presents as the plate itself, and Slabs then mounts all
 * fifteen identically (one inner shadow, one screen-constant dark keyline).
 *
 * The test for "border" is deliberately strict, because a painted ground is not
 * a mount: a scanline counts only if it is BOTH much brighter than the image's
 * own central median (+42) AND flat across its whole length (70% of samples
 * within ±22 of the line mean), at least 60% of the lines inside the accepted
 * depth qualify, and no side may lose more than 13%. MEASURED against that
 * rule: the six above are cropped, and the nine that have no mat — including
 * Totem, whose wide painted tan surround is bright but mottled — are left at
 * 0,0,0,0. That is the correct answer for all fifteen.
 */

export interface MatCrop {
  /** fractions of the image to exclude on each side */
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const NO_MAT: MatCrop = { left: 0, right: 0, top: 0, bottom: 0 };

/** No side may lose more than this fraction — a guard against eating artwork. */
const MAT_CAP = 0.13;
/** How much brighter than the central median a line must be to be a mount. */
const MAT_BRIGHT = 42;
/** Half-width of the flatness window, and the share of samples inside it. */
const MAT_FLAT = 22;
const MAT_FLAT_FRAC = 0.7;
/** Share of lines inside the accepted depth that must themselves qualify. */
const MAT_DENSITY = 0.6;
/** Extra bite past the last qualifying line, to swallow the scan's soft edge. */
const MAT_BITE = 0.008;
/** Longest side of the analysis raster. */
const MAT_RASTER = 200;

const matCache = new Map<string, MatCrop>();

/**
 * Measure the incidental mount border of one artwork photograph.
 * Memoized by `key`; returns NO_MAT if the image cannot be read.
 */
export function matCropFor(key: string, image: unknown): MatCrop {
  const hit = matCache.get(key);
  if (hit) return hit;
  const img = image as { width?: number; height?: number } | null;
  if (!img || !img.width || !img.height || typeof document === 'undefined') return NO_MAT;
  let out = NO_MAT;
  try {
    const scale = MAT_RASTER / Math.max(img.width, img.height);
    const W = Math.max(8, Math.round(img.width * scale));
    const H = Math.max(8, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return NO_MAT;
    ctx.drawImage(image as CanvasImageSource, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const L = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
    }
    // the image's own centre, as the reference the border has to stand against
    const cen: number[] = [];
    for (let y = Math.floor(H * 0.3); y < H * 0.7; y++) {
      for (let x = Math.floor(W * 0.3); x < W * 0.7; x++) cen.push(L[y * W + x]);
    }
    cen.sort((a, b) => a - b);
    const ref = cen[cen.length >> 1] ?? 0;

    const qualifies = (get: (k: number) => number, n: number): boolean => {
      let sum = 0;
      const v = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        v[k] = get(k);
        sum += v[k];
      }
      const m = sum / n;
      if (m <= ref + MAT_BRIGHT) return false;
      let flat = 0;
      for (let k = 0; k < n; k++) if (Math.abs(v[k] - m) < MAT_FLAT) flat++;
      return flat / n > MAT_FLAT_FRAC;
    };

    const scan = (dim: number, other: number, get: (i: number, k: number) => number): number => {
      const capI = Math.max(1, Math.round(MAT_CAP * dim));
      const flags: boolean[] = [];
      let last = -1;
      for (let i = 0; i < capI; i++) {
        const ok = qualifies((k) => get(i, k), other);
        flags.push(ok);
        if (ok) last = i;
      }
      if (last < 0) return 0;
      let cnt = 0;
      for (let i = 0; i <= last; i++) if (flags[i]) cnt++;
      if (cnt / (last + 1) < MAT_DENSITY) return 0;
      return Math.min(capI, last + 1 + Math.round(MAT_BITE * dim)) / dim;
    };

    out = {
      top: scan(H, W, (i, k) => L[i * W + k]),
      bottom: scan(H, W, (i, k) => L[(H - 1 - i) * W + k]),
      left: scan(W, H, (i, k) => L[k * W + i]),
      right: scan(W, H, (i, k) => L[k * W + (W - 1 - i)]),
    };
  } catch {
    out = NO_MAT;
  }
  matCache.set(key, out);
  return out;
}

/* ================================================== TWO NAMES, ONE PICTURE
 *
 * THE RENDERER IS DEFENSIVE ABOUT THE CATALOGUE.
 *
 * Four catalogue entries are backed by two photographs: public/art/totem.jpg
 * and composite-head.jpg are byte-identical, and so are chaos-garden.jpg and
 * menagerie.jpg (verified with sha256 over the source files AND over the
 * 1200px /art/tex derivatives). Those files are the artist's and are not
 * touched here, and the metadata says they are four different works — so the
 * data cannot be corrected from this side.
 *
 * What CAN be guaranteed is that the same picture is never hung twice in one
 * frame. Every artwork texture is fingerprinted as it decodes — a 12x12
 * luminance raster, quantised to 32 levels — and the FIRST work to present a
 * given fingerprint owns it. Any later work presenting the same fingerprint is
 * refused a plate in any formation that shows the whole body of work at once
 * (the archive); in the corridor, where exactly one work owns a beat, it is
 * shown normally because it can never share the frame with its twin.
 *
 * The fingerprint is content-based rather than a hard-coded pair list on
 * purpose: if the artist replaces one of the four files tomorrow, the collision
 * disappears on its own and all four plate again.
 */

/** Side of the fingerprint raster. */
const SIG_N = 12;
/** Luminance quantisation — coarse enough to survive JPEG re-encoding. */
const SIG_LEVELS = 32;

const sigCache = new Map<string, string>();
const sigOwner = new Map<string, { key: string; index: number }>();
const collisionLog: string[] = [];

/** Content fingerprint of a decoded artwork image. Memoized by `key`. */
function plateSignature(key: string, image: unknown): string | null {
  const hit = sigCache.get(key);
  if (hit !== undefined) return hit || null;
  const img = image as { width?: number; height?: number } | null;
  if (!img || !img.width || !img.height || typeof document === 'undefined') return null;
  let sig = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SIG_N;
    canvas.height = SIG_N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image as CanvasImageSource, 0, 0, SIG_N, SIG_N);
    const d = ctx.getImageData(0, 0, SIG_N, SIG_N).data;
    const out = new Array<string>(SIG_N * SIG_N);
    for (let i = 0; i < SIG_N * SIG_N; i++) {
      const l = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
      out[i] = Math.min(SIG_LEVELS - 1, Math.floor((l / 256) * SIG_LEVELS)).toString(32);
    }
    // aspect is part of identity: two crops of one photograph are two pictures
    sig = `${(img.width / img.height).toFixed(3)}:${out.join('')}`;
  } catch {
    return null;
  }
  sigCache.set(key, sig);
  return sig;
}

/**
 * Claim the right to present `key` as a plate. Returns the index of the work
 * that OWNS this picture — its own `index` when the picture is unique, and the
 * earlier work's index when it is a duplicate.
 */
export function claimPlate(key: string, index: number, image: unknown): number {
  const sig = plateSignature(key, image);
  if (!sig) return index;
  const owner = sigOwner.get(sig);
  if (!owner) {
    sigOwner.set(sig, { key, index });
    return index;
  }
  if (owner.key === key) return owner.index;
  const line = `${key} -> ${owner.key}`;
  if (!collisionLog.includes(line)) {
    collisionLog.push(line);
    if (process.env.NODE_ENV !== 'production') {
      // Not an error — the catalogue is the artist's. It is a note that the
      // renderer refused to hang the same picture twice, and which pair did it.
      console.info(`[cosmos] duplicate artwork source refused a second plate: ${line}`);
    }
  }
  return owner.index;
}

/** Dev/QA readout: which artwork files were found to be the same picture. */
export function plateCollisions(): string[] {
  return collisionLog;
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __plateCollisions?: string[] }).__plateCollisions = collisionLog;
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
