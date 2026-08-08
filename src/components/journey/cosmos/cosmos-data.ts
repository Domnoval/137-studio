// cosmos/cosmos-data.ts — OWNED BY COSMOS agent.
// Layout math for the golden-angle helix, the apps constellation, and the
// contraction sigil geometry. Pure data — no three imports, no React.

import { GOLDEN_ANGLE } from '../journey-utils';
import { artworks, type Artwork } from '@/lib/works';

/* ---------------------------------------------------------------- helix */

export const SLAB_SPACING = 5.2; // z distance between successive slabs
export const CAM_START_Z = 10; // camera rest position before the first slab
/**
 * Distance ahead of the camera at which a slab is "the subject" of the frame.
 * The staging in Slabs.tsx composes the hero to fill ~60-76% of the viewport
 * at this distance, so it must be far enough that a wide canvas still fits.
 */
export const SWEET_D = 7.3;
/** How much of its off-axis offset the hero surrenders while it owns the frame. */
export const HERO_PULL_X = 0.62;
export const HERO_PULL_Y = 0.72;
/**
 * End of the cosmos dolly. Stops the instant the LAST slab has finished its
 * dissolve (d ≈ 3.4, just inside Slabs' EXIT_DONE) instead of sailing 8 units
 * past it — otherwise the corridor is empty for the last ~6% of the phase and
 * the journey shows a dead frame right before the contraction.
 */
export const CAM_END_Z = -(artworks.length - 1) * SLAB_SPACING + 3.4;
export const CAM_CONTRACT_DRIFT = 6; // slow push during contraction
export const SIGIL_Z = CAM_END_Z - CAM_CONTRACT_DRIFT - 13; // sigil plane ahead of resting camera
export const CAM_RETURN_PUSH = 26; // return: camera flies THROUGH the sigil

export interface SlabPlacement {
  work: Artwork;
  index: number;
  x: number;
  y: number;
  z: number;
  /** point the slab faces (a spot on the camera axis, slightly ahead) */
  lookX: number;
  lookY: number;
  lookZ: number;
  /** slab height in world units (width = height * texture aspect) */
  height: number;
  /** unique float phase */
  phase: number;
  floatSpeed: number;
}

const sorted = [...artworks].sort((a, b) => a.order - b.order);

export const SLABS: SlabPlacement[] = sorted.map((work, i) => {
  const angle = i * GOLDEN_ANGLE;
  // radius breathes between ~5.0 and ~7.2 — satellites sit well off the frame
  // axis so the staged hero owns the middle of the picture instead of sharing it
  const radius = 6.1 + Math.sin(i * 2.39996) * 1.05;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.62; // flattened helix — keeps art nearer eye level
  const z = -i * SLAB_SPACING;
  return {
    work,
    index: i,
    x,
    y,
    z,
    lookX: x * 0.12,
    lookY: y * 0.18,
    lookZ: z + 8.5,
    height: 3.35 + (work.featured ? 0.55 : 0) + ((i * 7) % 3) * 0.14,
    phase: i * 1.7 + 0.61,
    floatSpeed: 0.5 + ((i * 13) % 5) * 0.07,
  };
});

/** Which slab is nearest a given camera z (the subject sits SWEET_D ahead). */
export function nearestSlabIndex(camZ: number): number {
  const i = Math.round((-camZ + SWEET_D) / SLAB_SPACING);
  return Math.min(SLABS.length - 1, Math.max(0, i));
}

/** 0-1 travel along the whole slab corridor — drives the void's color arc. */
export function descentAt(camZ: number): number {
  const span = CAM_START_Z - CAM_END_Z;
  return Math.min(1, Math.max(0, (CAM_START_Z - camZ) / span));
}

/* ------------------------------------------------------ apps constellation */

export interface AppNode {
  name: string;
  url: string;
  desc: string;
  x: number;
  y: number;
  z: number;
  /** polyhedron flavor 0..2 */
  kind: number;
  /** mono node mark shown on the label plate — matches the wire solid */
  glyph: string;
  phase: number;
}

/** Node marks, indexed by AppNode.kind. */
export const APP_GLYPHS = ['◇', '◆', '△'];

const APPS_RAW = [
  { name: '137 Cipher', url: 'https://137-cipher.vercel.app', desc: 'Ancient script translator' },
  { name: '137 Geometry', url: 'https://137-geometry.vercel.app', desc: 'Sacred geometry generator' },
  { name: 'Harmonic Arcana', url: 'https://harmonic-arcana.vercel.app', desc: 'Tarot meets music theory' },
  { name: '137 Cycles', url: 'https://137-cycles.vercel.app', desc: 'Life cycle calculator' },
  { name: '137 Pad', url: 'https://137-pad.vercel.app', desc: 'Infinite canvas notepad' },
  { name: 'Lyric Lab', url: 'https://lyric-lab.vercel.app', desc: 'AI lyric assistant' },
];

const helixSpan = (SLABS.length - 1) * SLAB_SPACING;

export const APP_NODES: AppNode[] = APPS_RAW.map((app, k) => {
  // Between slab clusters, and deliberately OFF the frame axis: the middle of
  // the picture belongs to the staged painting, so waypoints live in the
  // periphery where their label plates have empty screen to land in.
  const t = (k + 0.75) / APPS_RAW.length;
  const angle = (t * helixSpan / SLAB_SPACING) * GOLDEN_ANGLE + Math.PI;
  const radius = 4.4 + (k % 2) * 1.1;
  const kind = k % 3;
  return {
    ...app,
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.62,
    z: -t * helixSpan + 1.8,
    kind,
    glyph: APP_GLYPHS[kind],
    phase: k * 2.1,
  };
});

/* ------------------------------------------------------------ sigil paths */
// The 137 sigil: golden spiral resolving into triangle + eye. Everything is
// sampled as dense polylines so lines can draw progressively (setDrawRange)
// and dust particles can target points along the same curves.

const PHI = (1 + Math.sqrt(5)) / 2;
const SPIRAL_B = Math.log(PHI) / (Math.PI / 2); // true golden spiral growth

export function sampleSpiral(n: number): Float32Array {
  // r = a·e^(bθ), θ ∈ [0, 3.6π], scaled so max radius ≈ 3.15
  const out = new Float32Array(n * 3);
  const thetaMax = Math.PI * 3.6;
  const a = 3.15 / Math.exp(SPIRAL_B * thetaMax);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const theta = t * thetaMax;
    const r = a * Math.exp(SPIRAL_B * theta);
    out[i * 3] = Math.cos(theta + Math.PI * 0.72) * r;
    out[i * 3 + 1] = Math.sin(theta + Math.PI * 0.72) * r;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleTriangle(n: number): Float32Array {
  // equilateral, apex up, circumradius 2.7, centered slightly low so the
  // eye sits at the centroid of the visual mass
  const out = new Float32Array(n * 3);
  const R = 2.7;
  const cy = -0.42;
  const corners: [number, number][] = [];
  for (let c = 0; c < 3; c++) {
    const a = Math.PI / 2 + (c * 2 * Math.PI) / 3;
    corners.push([Math.cos(a) * R, Math.sin(a) * R + cy]);
  }
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 3; // 0..3 around perimeter
    const seg = Math.min(2, Math.floor(t));
    const f = t - seg;
    const [ax, ay] = corners[seg];
    const [bx, by] = corners[(seg + 1) % 3];
    out[i * 3] = ax + (bx - ax) * f;
    out[i * 3 + 1] = ay + (by - ay) * f;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleEye(n: number): Float32Array {
  // almond lens: two mirrored circular arcs, width 2.5, centered at origin
  const out = new Float32Array(n * 3);
  const w = 1.25; // half width
  const bulge = 0.62;
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const top = i < half;
    const k = top ? i / (half - 1) : (i - half) / (n - half - 1);
    const t = top ? k : 1 - k; // continuous loop
    const x = -w + t * 2 * w;
    const y = Math.sin(t * Math.PI) * bulge * (top ? 1 : -1);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleCircle(n: number, r: number): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = Math.sin(a) * r;
    out[i * 3 + 2] = 0;
  }
  return out;
}

/* ------------------------------------------------------- equation strings */

export const GLYPHS: string[] = [
  'α', 'ψ', '∆', '∮', 'ℏ', 'λ', 'Ω', 'π',
  'φ', '√5', '∞', '∂', 'Σ', 'θ', 'μ', 'ε₀',
  '137', '1/137', 'α⁻¹', 'e²', 'ℏc', '∇²', 'ζ(s)', 'χ',
  'η', 'ρ', 'τ', 'γ', 'δ', 'κ', 'ξ', 'σ',
  'ω', '∫', '≈', '±', '∝', 'ℓ', 'ħω', 'Λ',
  'c²', 'iℏ∂ψ', 'E=ħν', '4πε₀', 'φ²=φ+1', '.036', 'θ=137.5°', 'eiπ',
];
