// cosmos/sigil-form.ts — OWNED BY COSMOS agent.
//
// THE PAYLOAD. Not the borrowed eye-in-triangle: this is Michael's OWN eye,
// the one that recurs in the Totem canvas and stares out of the Teal Skull —
// a round socket struck in one overlapping pass, a heavy brow arc that
// overshoots it on both sides, an OFF-CENTRE iris with a small pupil and a
// crescent catchlight, and the filaments that radiate out of the iris into the
// white. Blown to full scale as line-work, it is an ownable mark; the stock
// symbol was not.
//
// The 137 armature survives as three STRUCK strokes that cross past each other
// at the corners — a hand-drawn triangle, not a closed vector badge — and the
// socket deliberately breaks through the baseline, so the eye is drawn THROUGH
// the armature rather than parked inside it.
//
// Everything is authored as polylines with per-point pressure so the strokes
// can be rendered as chalk ribbons (chalk-ribbon.ts) and, at the same time,
// sampled as particle homes so the dust resolves INTO the geometry.

import { type Stroke, type Pt, curve, pressure } from './chalk-ribbon';

/* --------------------------------------------------------------- metrics */

/** Triangle circumradius; equilateral height = 1.5R = 4.62 world units, which
 *  at the sigil's hold distance is ~62% of viewport height. */
export const TRI_R = 3.08;
export const TRI_CY = 0;
export const APEX: Pt = [0, TRI_CY + TRI_R];
export const CORNER_R: Pt = [TRI_R * Math.cos(-Math.PI / 6), TRI_CY + TRI_R * Math.sin(-Math.PI / 6)];
export const CORNER_L: Pt = [-CORNER_R[0], CORNER_R[1]];
/** The line the caption baseline-locks to. */
export const BASE_Y = CORNER_R[1];
export const BASE_X0 = CORNER_L[0];
export const BASE_X1 = CORNER_R[0];

const SOCKET_R = 1.25;
/** The eye sits below the triangle's centre, so the whole mark is optically
 *  centred in frame instead of riding the top edge. */
export const EYE_CY = -0.42;
const IRIS_C: Pt = [0.15, -0.50];
const IRIS_R = 0.66;
const PUPIL_C: Pt = [0.20, -0.54];
const PUPIL_R = 0.25;

/* ------------------------------------------------------------------ util */

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** low-frequency hand wobble — a ruled line is a dead line */
const wob = (t: number, seed: number, amp: number, freq = 5.4) =>
  amp * (Math.sin(t * freq + seed) + 0.55 * Math.sin(t * freq * 2.37 + seed * 1.9)) / 1.55;

/** straight run from a to b, extended past both ends, bowed, hand-wobbled */
function struck(
  a: Pt,
  b: Pt,
  opts: { pre?: number; post?: number; bow?: number; seed?: number; amp?: number },
): (t: number) => Pt {
  const pre = opts.pre ?? 0;
  const post = opts.post ?? 0;
  const bow = opts.bow ?? 0;
  const seed = opts.seed ?? 0;
  const amp = opts.amp ?? 0.009;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const x0 = a[0] - ux * pre * len;
  const y0 = a[1] - uy * pre * len;
  const span = len * (1 + pre + post);
  return (t: number) => {
    const s = t * span;
    const k = Math.sin(Math.PI * t) * bow + wob(t, seed, amp);
    return [x0 + ux * s + nx * k, y0 + uy * s + ny * k];
  };
}

/** hand-drawn ring: overlaps its own start, radius breathes, never a compass */
function ring(cx: number, cy: number, r: number, opts: { turns?: number; start?: number; seed?: number; irr?: number }) {
  const turns = opts.turns ?? 2.10;
  const start = opts.start ?? -0.42 * Math.PI;
  const seed = opts.seed ?? 0;
  const irr = opts.irr ?? 0.016;
  return (t: number): Pt => {
    const th = start + t * Math.PI * turns;
    const rr =
      r *
      (1 + irr * Math.sin(th * 3 + seed) + irr * 0.55 * Math.sin(th * 7.4 + seed * 2.1)) *
      (1 + 0.02 * t);
    return [cx + Math.cos(th) * rr, cy + Math.sin(th) * rr];
  };
}

/* ---------------------------------------------------------- the armature */

export function armatureStrokes(): Stroke[] {
  const defs: Array<[Pt, Pt, number, number, number, number]> = [
    // [from, to, pre, post, bow, seed]
    [CORNER_L, APEX, 0.012, 0.030, 0.032, 1.4],
    [APEX, CORNER_R, 0.016, 0.034, -0.028, 3.1],
    [CORNER_R, CORNER_L, 0.010, 0.038, -0.030, 5.6],
  ];
  return defs.map(([a, b, pre, post, bow, seed], i) => {
    const pts = curve(140, struck(a, b, { pre, post, bow, seed, amp: 0.011 }));
    return {
      pts,
      w: pressure(pts, {
        base: 2.45, min: 1.25, max: 4.3, startBias: 0.75, endLift: 0.52, curveBias: 0.6, seed: seed + i,
      }),
    };
  });
}

/* ----------------------------------------------------------- the socket */

export function socketStrokes(): Stroke[] {
  // the eye itself: one struck, overlapping ring
  const socket = curve(240, ring(0, EYE_CY, SOCKET_R, { turns: 2.11, start: -0.38 * Math.PI, seed: 0.7, irr: 0.017 }));
  // the upper contour, RE-STRUCK: the hand goes back over the top-left of the
  // socket a second time at a hair more radius and a lot more weight. That is
  // the heavy black sweep on the Teal Skull's eye — not a floating second ring.
  const brow = curve(170, (t: number): Pt => {
    const th = 0.14 * Math.PI + t * 0.92 * Math.PI;
    const r = SOCKET_R * (1.075 + 0.02 * Math.sin(th * 2.6));
    return [Math.cos(th) * r, EYE_CY + Math.sin(th) * r + wob(t, 2.2, 0.012, 3.1)];
  });
  const bw = new Float32Array(170);
  for (let i = 0; i < 170; i++) {
    const t = i / 169;
    // lands hard, runs out — a struck contour, heaviest across the crown
    bw[i] = 0.35 + 3.5 * Math.pow(Math.sin(t * Math.PI), 0.55) * (1 - 0.30 * t);
  }
  return [
    {
      pts: socket,
      w: pressure(socket, { base: 2.15, min: 1.15, max: 3.7, loop: true, curveBias: 0.9, seed: 0.9 }),
    },
    { pts: brow, w: bw },
  ];
}

/* ----------------------------------------------------------- the filaments */

export function lashStrokes(): Stroke[] {
  const rnd = mulberry(1370);
  const out: Stroke[] = [];
  const N = 27;
  for (let i = 0; i < N; i++) {
    // irregular angular spacing — nothing here is on a clock face
    const th = (i / N) * Math.PI * 2 + (rnd() - 0.5) * 0.19 + 0.3;
    const r0 = IRIS_R * (1.09 + rnd() * 0.13);
    const len = 0.12 + Math.pow(rnd(), 1.6) * 0.44;
    const bend = (rnd() - 0.5) * 0.28;
    const pts = curve(12, (t: number): Pt => {
      const a = th + bend * t * t;
      const r = r0 + len * t;
      return [IRIS_C[0] + Math.cos(a) * r, IRIS_C[1] + Math.sin(a) * r];
    });
    const w = new Float32Array(12);
    for (let k = 0; k < 12; k++) {
      const t = k / 11;
      w[k] = Math.max(0.20, 1.75 * (1 - t) * (1 - t) + 0.22);
    }
    out.push({ pts, w });
  }
  return out;
}

/* ---------------------------------------------------------------- the iris */

export function irisStrokes(): Stroke[] {
  const iris = curve(160, ring(IRIS_C[0], IRIS_C[1], IRIS_R, { turns: 2.13, start: 0.24 * Math.PI, seed: 2.3, irr: 0.021 }));
  const pupil = curve(104, ring(PUPIL_C[0], PUPIL_C[1], PUPIL_R, { turns: 2.16, start: -0.9 * Math.PI, seed: 5.1, irr: 0.03 }));
  return [
    { pts: iris, w: pressure(iris, { base: 2.0, min: 1.05, max: 3.4, loop: true, curveBias: 0.8, seed: 1.3 }) },
    { pts: pupil, w: pressure(pupil, { base: 2.5, min: 1.3, max: 3.9, loop: true, curveBias: 0.7, seed: 6.2 }) },
  ];
}

/** the wet highlight — the one pure-white note in the whole mark */
export function catchlightStrokes(): Stroke[] {
  const pts = curve(46, (t: number): Pt => {
    const th = 0.52 * Math.PI + t * 0.92 * Math.PI;
    const r = 0.155 * (1 + 0.07 * Math.sin(th * 3));
    return [IRIS_C[0] - 0.25 + Math.cos(th) * r, IRIS_C[1] + 0.27 + Math.sin(th) * r];
  });
  const w = new Float32Array(46);
  for (let i = 0; i < 46; i++) w[i] = 0.55 + 0.85 * Math.sin((i / 45) * Math.PI);
  return [{ pts, w }];
}

/* ---------------------------------------------------------------- drips */

export function dripStrokes(): Stroke[] {
  const defs: Array<[number, number, number]> = [
    // [x on the socket, run length, seed]
    [-0.46, 0.34, 1.1],
    [0.15, 0.55, 3.3],
    [0.72, 0.21, 7.7],
  ];
  return defs.map(([x, len, seed]) => {
    const y0 = EYE_CY - Math.sqrt(Math.max(0.02, SOCKET_R * SOCKET_R - x * x));
    const pts = curve(22, (t: number): Pt => [x + wob(t, seed, 0.026, 3.0), y0 - len * t]);
    const w = new Float32Array(22);
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      // runs thin then beads at the tip, the way wet paint does
      w[i] = 1.25 * (1 - t * 0.82) + 0.9 * Math.exp(-Math.pow((t - 0.96) / 0.09, 2));
    }
    return { pts, w };
  });
}

/* --------------------------------------------------------- golden spiral */

/**
 * The golden spiral sampled from the OUTSIDE IN, so a progressive draw sweeps
 * the widest arc across the frame first and winds inward, resolving on the
 * eye. Drawn the other way round it is a 50px comma floating in the dark.
 */
export function spiralOuterFirst(n: number): Float32Array {
  const PHI = (1 + Math.sqrt(5)) / 2;
  // φ growth per half turn rather than per quarter: a true quarter-turn golden
  // spiral gains 6.8x per revolution, so only ~1.4 turns are ever on screen at
  // once and it reads as a circle with a hook. This keeps the φ relation and
  // shows 2.3 legible turns.
  const b = Math.log(PHI) / Math.PI;
  const thetaMax = Math.PI * 4.6;
  const a = 1 / Math.exp(b * thetaMax); // normalised: outer radius = 1
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = 1 - i / (n - 1); // reversed
    const theta = t * thetaMax;
    const r = a * Math.exp(b * theta);
    out[i * 3] = Math.cos(theta + Math.PI * 0.72) * r;
    out[i * 3 + 1] = Math.sin(theta + Math.PI * 0.72) * r;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function spiralStroke(n = 340): Stroke {
  const pts = spiralOuterFirst(n);
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    w[i] = 0.5 + 0.85 * (1 - t) + 0.18 * Math.sin(t * 19);
  }
  return { pts, w };
}

/* --------------------------------------------------- particle homes (dust) */

export interface MarkTarget {
  x: number;
  y: number;
  /** 1 when this point belongs to the burning iris */
  red: number;
}

/** Densely resample the finished mark so particles can land ON it. */
export function markTargets(count: number, seed = 137): MarkTarget[] {
  const rnd = mulberry(seed);
  const groups: Array<{ pts: Float32Array[]; weight: number; red: number }> = [
    { pts: armatureStrokes().map((s) => s.pts), weight: 0.36, red: 0 },
    { pts: socketStrokes().map((s) => s.pts), weight: 0.24, red: 0 },
    { pts: lashStrokes().map((s) => s.pts), weight: 0.13, red: 0 },
    { pts: irisStrokes().map((s) => s.pts), weight: 0.15, red: 1 },
    { pts: dripStrokes().map((s) => s.pts), weight: 0.04, red: 0 },
  ];
  // the remaining ~8% become the residual haze the mark sits in
  const out: MarkTarget[] = [];
  for (let i = 0; i < count; i++) {
    let pick = rnd();
    let done = false;
    for (const g of groups) {
      if (pick < g.weight) {
        const poly = g.pts[Math.floor(rnd() * g.pts.length)];
        const k = Math.floor(rnd() * (poly.length / 3));
        out.push({
          x: poly[k * 3] + (rnd() - 0.5) * 0.055,
          y: poly[k * 3 + 1] + (rnd() - 0.5) * 0.055,
          red: g.red,
        });
        done = true;
        break;
      }
      pick -= g.weight;
    }
    if (!done) {
      const a = rnd() * Math.PI * 2;
      const r = 3.6 + rnd() * 2.4;
      out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.86, red: 0 });
    }
  }
  return out;
}
