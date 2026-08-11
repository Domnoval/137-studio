// cosmos/sigil-form.ts — OWNED BY COSMOS agent.
//
// THE PAYLOAD. Not the borrowed eye-in-triangle: this is Michael's OWN eye,
// the one that recurs in the Totem canvas and stares out of the Teal Skull —
// a round socket struck in ONE CLOSED pass, a heavy brow that is re-struck over
// the crown and rejoins the socket line at both ends, a CONCENTRIC iris with a
// small pupil and a crescent catchlight, and the filaments that radiate out of
// the iris into the white. Blown to full scale as line-work, it is an ownable
// mark; the stock symbol was not.
//
// THE KEYSTONE IS EXACT. This is the section called THE CONSTANT, so the mark
// is built so that its centres COINCIDE BY CONSTRUCTION, not by nudging:
//
//   · every ring's radius wobble uses EVEN harmonics only, so r(θ+π) = r(θ)
//     and therefore x(θ+π) = −x(θ). The drawn bounding box of a hand-wobbled
//     ring is then exactly centred on its nominal centre — it breathes like a
//     hand-drawn circle and still measures like a compassed one.
//   · every ring closes: exactly one revolution (turns = 2, in units of π) with
//     a radius that is a pure function of θ, so the last sample lands on the
//     first. No spiral drift term, no unclosed overshoot doubling back on one
//     side of the circle only.
//   · the iris and the pupil sit on the socket's own centre, [0, EYE_CY].
//   · the armature's hand-drawn overshoots are SYMMETRIC at every corner, so
//     the triangle's drawn extent is centred on x = 0 and its base terminates
//     at exactly ±BASE_X1 — the two points the dimension line registers to.
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
import { PHI_SPIRAL_B } from './cosmos-data';

/* --------------------------------------------------------------- metrics */

/** Triangle circumradius; equilateral height = 1.5R = 4.62 world units, which
 *  at the sigil's hold distance is ~62% of viewport height. */
export const TRI_R = 3.08;
export const TRI_CY = 0;
export const APEX: Pt = [0, TRI_CY + TRI_R];
export const CORNER_R: Pt = [TRI_R * Math.cos(-Math.PI / 6), TRI_CY + TRI_R * Math.sin(-Math.PI / 6)];
export const CORNER_L: Pt = [-CORNER_R[0], CORNER_R[1]];

/* THE ARMATURE'S OVERSHOOTS, as a fraction of a stroke's vertex-to-vertex
   length. A struck triangle runs past its own corners — that is the whole
   difference between a drawn mark and a vector badge — but the two ends of any
   one corner must run past it by the SAME amount, or the mark's drawn extent
   is off-centre from the geometry it claims to be. All three sides of an
   equilateral triangle share one length (R·√3), so these are directly
   comparable numbers and the base's two terminals are analytic. */
const OVER_BASE = 0.024; // past each end of the base
const OVER_FOOT = 0.026; // the two side strokes, past the feet
const OVER_APEX = 0.030; // the two side strokes, past the apex
/** Vertex-to-vertex length of every side of the triangle. */
const SIDE_LEN = TRI_R * Math.sqrt(3);

/** The line the caption baseline-locks to. */
export const BASE_Y = CORNER_R[1];
/** The base stroke's own INK TERMINALS — vertex plus its symmetric overshoot.
 *  The wobble and the bow are both applied along the stroke's normal, which for
 *  the base is vertical, so these two x values are exact: the drawn base begins
 *  and ends on them. The dimension line in Contraction.tsx is derived from
 *  these, which is what makes its extension ticks land on the ink rather than
 *  8px inside it. */
export const BASE_X1 = SIDE_LEN * (0.5 + OVER_BASE);
export const BASE_X0 = -BASE_X1;

const SOCKET_R = 1.25;
/** The eye sits below the triangle's centre, so the whole mark is optically
 *  centred in frame instead of riding the top edge. */
export const EYE_CY = -0.42;
/** ONE CENTRE. Socket, iris, pupil. The eye used to be drawn with the iris
 *  0.15 units right of the socket — an authored "off-centre iris" that measured
 *  as a 28px, 16%-of-radius eccentricity at the apex of the section called THE
 *  CONSTANT. The character it was buying is now carried by the catchlight, the
 *  brow and the filaments, none of which is a concentric-circle claim. */
const IRIS_C: Pt = [0, EYE_CY];
const IRIS_R = 0.66;
const PUPIL_C: Pt = [0, EYE_CY];
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

/**
 * A hand-drawn ring's radius, as a pure function of θ.
 *
 * TWO PROPERTIES, BOTH LOAD-BEARING.
 *
 * (1) It is 2π-periodic, so a full revolution CLOSES on itself exactly. The
 *     previous ring drew 2.11π — one revolution plus 19.8° — on a radius that
 *     also drifted +2% along the sweep, so the tail ran parallel to the head
 *     instead of over it: an arc that doubles back on one side of the circle
 *     only and never closes. That is a rendering error, not draughtsmanship.
 *
 * (2) Every harmonic is EVEN, so r(θ+π) = r(θ), so x(θ+π) = −x(θ) and
 *     y(θ+π) = −y(θ). The drawn extent is therefore centred on (cx, cy) to
 *     within the sampling step — the ring still breathes out of round (the 2nd
 *     harmonic is exactly the slight ellipse a hand draws) but it can no longer
 *     measure off-centre. The old ring's odd 3rd harmonic put r(0) and r(π) up
 *     to 2·irr·R apart, which is where the socket's own ~3px bias came from.
 */
function ringRadius(r: number, irr: number, seed: number) {
  return (th: number) =>
    r *
    (1 +
      irr * Math.sin(2 * th + seed) +
      irr * 0.55 * Math.sin(6 * th + seed * 2.1) +
      irr * 0.34 * Math.cos(4 * th + seed * 1.3));
}

/** hand-drawn ring: one closed revolution, radius breathes, never a compass */
function ring(cx: number, cy: number, r: number, opts: { start?: number; seed?: number; irr?: number }) {
  const start = opts.start ?? -0.42 * Math.PI;
  const seed = opts.seed ?? 0;
  const irr = opts.irr ?? 0.016;
  const rad = ringRadius(r, irr, seed);
  return (t: number): Pt => {
    const th = start + t * Math.PI * 2;
    const rr = rad(th);
    return [cx + Math.cos(th) * rr, cy + Math.sin(th) * rr];
  };
}

/* ---------------------------------------------------------- the armature */

export function armatureStrokes(): Stroke[] {
  // Overshoots are paired at every corner (foot/foot, apex/apex, base/base), so
  // the mark runs past its own corners the way a struck triangle does while its
  // drawn extent stays centred on x = 0. The base's OVER_BASE pair is the widest
  // pair, which is why BASE_X0/BASE_X1 — and therefore the dimension line — are
  // derived from it.
  const defs: Array<[Pt, Pt, number, number, number, number]> = [
    // [from, to, pre, post, bow, seed]
    [CORNER_L, APEX, OVER_FOOT, OVER_APEX, 0.032, 1.4],
    [APEX, CORNER_R, OVER_APEX, OVER_FOOT, -0.028, 3.1],
    [CORNER_R, CORNER_L, OVER_BASE, OVER_BASE, -0.030, 5.6],
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

const SOCKET_IRR = 0.017;
const SOCKET_SEED = 0.7;
/** The socket's own radius law. The brow is built on it, so the two lines are
 *  the same line wherever the brow's lift is zero. */
const socketRadius = ringRadius(SOCKET_R, SOCKET_IRR, SOCKET_SEED);
/** Angular span of the re-struck brow, centred on the crown. */
const BROW_SPAN = 0.88 * Math.PI;
/** How far the re-strike bows off the socket at the crown, as a fraction of R. */
const BROW_LIFT = 0.052;

export function socketStrokes(): Stroke[] {
  // THE EYE ITSELF: ONE CONTINUOUS CLOSED STROKE. Exactly one revolution on a
  // radius that is a pure function of θ, sampled 241 points (an even number of
  // steps, so θ and θ+π are both landed on and the drawn bbox is symmetric to
  // the sampling grid as well as to the maths).
  const socket = curve(241, ring(0, EYE_CY, SOCKET_R, { start: -0.38 * Math.PI, seed: SOCKET_SEED, irr: SOCKET_IRR }));
  // THE BROW: the hand goes back over the crown a second time, heavier — and
  // it LEAVES AND REJOINS THE SOCKET LINE. Its lift is a bell that is exactly
  // zero at both terminals and it rides the socket's own radius law, so the
  // re-strike merges into the circle instead of terminating as a second,
  // parallel arc hanging off one side. (MEASURED before: two parallel strokes
  // 15px apart at the socket's left horizontal, which is where the old brow's
  // constant 1.075R offset simply stopped. That is the doubled arc.)
  // It is also centred on the crown rather than skewed left, so if you read the
  // doubling at all, you read it on both shoulders equally.
  const BROW_N = 171;
  const brow = curve(BROW_N, (t: number): Pt => {
    const th = Math.PI / 2 - BROW_SPAN / 2 + t * BROW_SPAN;
    const bell = Math.pow(Math.sin(Math.PI * t), 0.7);
    const r = socketRadius(th) * (1 + (BROW_LIFT + wob(t, 2.2, 0.013, 3.1)) * bell);
    return [Math.cos(th) * r, EYE_CY + Math.sin(th) * r];
  });
  const bw = new Float32Array(BROW_N);
  for (let i = 0; i < BROW_N; i++) {
    const t = i / (BROW_N - 1);
    // lands and lifts symmetrically — a re-strike, heaviest across the crown,
    // vanishing to nothing exactly where it rejoins the socket
    bw[i] = 0.3 + 3.3 * Math.pow(Math.sin(t * Math.PI), 0.55);
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
    // the filaments radiate into the white and STOP there. Uncapped they ran to
    // 1.37R — through the socket ring — which on a now-concentric eye would put
    // stray chalk outside the circle at the very angles the circle is measured
    // on. They are clipped a hair inside the socket instead.
    const len = Math.min(0.12 + Math.pow(rnd(), 1.6) * 0.44, Math.max(0.06, SOCKET_R * 0.94 - r0));
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
  // Both closed, both concentric with the socket, both sampled on an even
  // number of steps. Their drawn extents are centred on [0, EYE_CY] by the
  // same even-harmonic argument as the socket — no magic offset anywhere.
  const iris = curve(161, ring(IRIS_C[0], IRIS_C[1], IRIS_R, { start: 0.24 * Math.PI, seed: 2.3, irr: 0.021 }));
  const pupil = curve(105, ring(PUPIL_C[0], PUPIL_C[1], PUPIL_R, { start: -0.9 * Math.PI, seed: 5.1, irr: 0.03 }));
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
    // pushed a little further off the (now concentric) centre so the crescent
    // still clears the pupil's edge — the catchlight is where the eye's
    // asymmetry lives now, and a highlight is not a concentricity claim
    return [IRIS_C[0] - 0.3 + Math.cos(th) * r, IRIS_C[1] + 0.3 + Math.sin(th) * r];
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
  // φ growth per half turn rather than per quarter: a true quarter-turn golden
  // spiral gains 6.8x per revolution, so only ~1.4 turns are ever on screen at
  // once and it reads as a circle with a hook. This keeps the φ relation and
  // shows 2.3 legible turns.
  //
  // IMPORTED, not restated. This is the same b the ARCHIVE lays its fifteen
  // works on, which is the whole claim the two chapters make together: the
  // contraction is the archive's own curve collapsing, not a curve that
  // resembles it. A local copy of the number is a contract waiting to drift.
  const b = PHI_SPIRAL_B;
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
