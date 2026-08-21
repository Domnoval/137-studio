// cosmos/chalk-ribbon.ts — OWNED BY COSMOS agent.
//
// A struck-chalk stroke renderer. drei's <Line> draws a uniform hairline; a
// chalk mark does not — it is heavy where the hand lands, heavy again where
// the wrist changes direction, and it lifts as the stroke runs out. This
// builds screen-space ribbons whose half-width is authored PER POINT, so the
// weight modulates along arc length (2px–6px), and whose fragments are gated
// by a normalised arc-length uniform so a stroke can DRAW itself on.
//
// One geometry can hold many strokes; they are laid out on a shared 0-1
// timeline with configurable overlap, so a group of strokes writes itself on
// in sequence from a single uniform. Zero per-frame allocation.

import * as THREE from 'three';

export interface Stroke {
  /** flat xyz polyline */
  pts: Float32Array;
  /** half-width in CSS px, one per point */
  w: Float32Array;
}

export interface Ribbon {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
}

const VERT = /* glsl */ `
  uniform vec2 uRes;
  uniform float uWidth;
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aU;
  attribute float aW;
  varying float vU;
  varying float vSide;

  vec2 toPx(vec4 c) {
    return c.xy / max(abs(c.w), 1e-4) * uRes * 0.5;
  }

  void main() {
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 cur = mvp * vec4(position, 1.0);
    vec4 prv = mvp * vec4(aPrev, 1.0);
    vec4 nxt = mvp * vec4(aNext, 1.0);

    vec2 sc = toPx(cur);
    vec2 sp = toPx(prv);
    vec2 sn = toPx(nxt);

    vec2 dir = sn - sp;
    if (dot(dir, dir) < 1e-8) dir = sc - sp;
    if (dot(dir, dir) < 1e-8) dir = vec2(1.0, 0.0);
    dir = normalize(dir);
    vec2 nrm = vec2(-dir.y, dir.x);

    vec2 off = nrm * aSide * max(aW * uWidth, 0.35);
    cur.xy += off * 2.0 / uRes * max(abs(cur.w), 1e-4);

    vU = aU;
    vSide = aSide;
    gl_Position = cur;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  uniform float uDraw;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uGrain;
  uniform float uSeed;
  varying float vU;
  varying float vSide;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(41.317, 289.113))) * 43758.5453);
  }

  void main() {
    if (vU > uDraw) discard;
    // ragged, chalk-dusty edge: the falloff width itself wanders
    float g1 = hash(vec2(floor(vU * 540.0 + uSeed), 1.0));
    float g2 = hash(vec2(floor(vU * 133.0 + uSeed), 7.0));
    float edge = 1.0 - abs(vSide);
    float a = smoothstep(0.0, 0.30 + 0.42 * g1 * uGrain, edge);
    // the mark skips, the way chalk skips over tooth
    a *= mix(1.0, 0.62 + 0.38 * g2, uGrain);
    // Soften the DRAWING tip so nothing pops into being — and then let go of
    // it. Ungated, this ramp is still eroding the last 1.2% of the timeline at
    // uDraw = 1.0, i.e. the tail of the last stroke never finishes. MEASURED on
    // the armature (3 strokes, 0.42 overlap → the base owns 46% of the
    // timeline): the base's left terminal faded out over its final 19px while
    // its right terminal was a hard cut, so the finished triangle's ink was
    // 2px off-centre from its own geometry and the dimension line — which is
    // derived from the geometry — could not register to it. The soft tip is
    // now released as the stroke completes.
    a *= 1.0 - smoothstep(uDraw - 0.012, uDraw, vU) * (1.0 - smoothstep(0.984, 1.0, uDraw));
    a *= uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * (0.85 + 0.15 * g1), a);
  }
`;

/**
 * @param strokes  polylines with per-point half widths
 * @param overlap  0 = strictly sequential on the draw timeline, 1 = all at once
 */
export function buildRibbon(
  strokes: Stroke[],
  opts: { overlap?: number; color?: string; grain?: number; seed?: number; arcLength?: boolean } = {},
): Ribbon {
  const overlap = opts.overlap ?? 0.55;
  // arc-length draw runs at constant speed along the mark; index draw runs at
  // constant speed along the PARAMETER, which is what a spiral wants (its
  // outer turns own nearly all the arc length and would eat the whole reveal)
  const byArc = opts.arcLength ?? true;
  const n = strokes.length;
  const slot = 1 / (1 + (n - 1) * (1 - overlap));

  let totalPts = 0;
  let totalIdx = 0;
  for (const s of strokes) {
    const c = s.pts.length / 3;
    totalPts += c;
    totalIdx += (c - 1) * 6;
  }

  const position = new Float32Array(totalPts * 2 * 3);
  const prev = new Float32Array(totalPts * 2 * 3);
  const next = new Float32Array(totalPts * 2 * 3);
  const side = new Float32Array(totalPts * 2);
  const uArr = new Float32Array(totalPts * 2);
  const wArr = new Float32Array(totalPts * 2);
  const index = new Uint32Array(totalIdx);

  let v = 0; // vertex cursor
  let ii = 0; // index cursor

  strokes.forEach((s, si) => {
    const count = s.pts.length / 3;
    const start = si * (1 - overlap) * slot;

    // arc-length parameterisation so the draw-on runs at constant speed
    const arc = new Float32Array(count);
    for (let i = 1; i < count; i++) {
      const dx = s.pts[i * 3] - s.pts[(i - 1) * 3];
      const dy = s.pts[i * 3 + 1] - s.pts[(i - 1) * 3 + 1];
      const dz = s.pts[i * 3 + 2] - s.pts[(i - 1) * 3 + 2];
      arc[i] = arc[i - 1] + Math.hypot(dx, dy, dz);
    }
    const len = Math.max(arc[count - 1], 1e-6);

    const base = v;
    for (let i = 0; i < count; i++) {
      const p = i === 0 ? 0 : i - 1;
      const q = i === count - 1 ? count - 1 : i + 1;
      for (let k = 0; k < 2; k++) {
        const o = (v + k) * 3;
        position[o] = s.pts[i * 3];
        position[o + 1] = s.pts[i * 3 + 1];
        position[o + 2] = s.pts[i * 3 + 2];
        prev[o] = s.pts[p * 3];
        prev[o + 1] = s.pts[p * 3 + 1];
        prev[o + 2] = s.pts[p * 3 + 2];
        next[o] = s.pts[q * 3];
        next[o + 1] = s.pts[q * 3 + 1];
        next[o + 2] = s.pts[q * 3 + 2];
        side[v + k] = k === 0 ? -1 : 1;
        uArr[v + k] = start + (byArc ? arc[i] / len : i / Math.max(count - 1, 1)) * slot;
        wArr[v + k] = s.w[i];
      }
      v += 2;
    }

    for (let i = 0; i < count - 1; i++) {
      const a = base + i * 2;
      index[ii++] = a;
      index[ii++] = a + 1;
      index[ii++] = a + 2;
      index[ii++] = a + 1;
      index[ii++] = a + 3;
      index[ii++] = a + 2;
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
  geo.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
  geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geo.setAttribute('aU', new THREE.BufferAttribute(uArr, 1));
  geo.setAttribute('aW', new THREE.BufferAttribute(wArr, 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uRes: { value: new THREE.Vector2(1440, 900) },
      uWidth: { value: 1 },
      uDraw: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(opts.color ?? '#e8e4dc') },
      uGrain: { value: opts.grain ?? 1 },
      uSeed: { value: opts.seed ?? 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  return { mesh, material };
}

/* ------------------------------------------------------------- authoring */

export type Pt = [number, number];

/** Sample a parametric curve into a polyline in the z=0 plane. */
export function curve(n: number, f: (t: number) => Pt, z = 0): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [x, y] = f(i / (n - 1));
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/**
 * The same ribbon, as an SVG filled outline — so the 2D fallback carries the
 * identical pressure-varied mark instead of a uniform hairline copy of it.
 * `upp` converts the authored px half-widths into viewBox units.
 */
export function strokeOutline(s: Stroke, upp = 0.01): string {
  const n = s.pts.length / 3;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = i === 0 ? 0 : i - 1;
    const q = i === n - 1 ? n - 1 : i + 1;
    let tx = s.pts[q * 3] - s.pts[p * 3];
    let ty = s.pts[q * 3 + 1] - s.pts[p * 3 + 1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l;
    ty /= l;
    const w = s.w[i] * upp;
    const nx = -ty * w;
    const ny = tx * w;
    const x = s.pts[i * 3];
    const y = s.pts[i * 3 + 1];
    left.push(`${(x + nx).toFixed(3)},${(-(y + ny)).toFixed(3)}`);
    right.push(`${(x - nx).toFixed(3)},${(-(y - ny)).toFixed(3)}`);
  }
  right.reverse();
  return `M${left.join('L')}L${right.join('L')}Z`;
}

/** Bounding box of a set of strokes in authored (y-up) space. */
export function strokeBounds(strokes: Stroke[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const s of strokes) {
    for (let i = 0; i < s.pts.length; i += 3) {
      x0 = Math.min(x0, s.pts[i]);
      x1 = Math.max(x1, s.pts[i]);
      y0 = Math.min(y0, s.pts[i + 1]);
      y1 = Math.max(y1, s.pts[i + 1]);
    }
  }
  return { x0, y0, x1, y1 };
}

/**
 * Per-point half-widths for a polyline. Weight is heaviest where the hand
 * lands (stroke start), rises again wherever the line changes direction, and
 * lifts toward the end — i.e. real pressure, not a constant hairline.
 */
export function pressure(
  pts: Float32Array,
  opts: {
    base?: number;
    min?: number;
    max?: number;
    startBias?: number;
    endLift?: number;
    curveBias?: number;
    seed?: number;
    /** closed loops should not get the "landing" weight ramp */
    loop?: boolean;
  } = {},
): Float32Array {
  const count = pts.length / 3;
  const base = opts.base ?? 1.5;
  const min = opts.min ?? 0.9;
  const max = opts.max ?? 3.1;
  const startBias = opts.startBias ?? 0.85;
  const endLift = opts.endLift ?? 0.45;
  const curveBias = opts.curveBias ?? 1.5;
  const seed = opts.seed ?? 0;
  const out = new Float32Array(count);

  // A CLOSED STROKE MUST NOT HAVE A SEAM. On a loop the last point IS the first
  // point, so both the turning term and the wrist modulation are made periodic:
  // neighbours wrap around the join, and the breathing harmonics are whole
  // cycles of t. Otherwise w(0) ≠ w(1) and a ring that is geometrically closed
  // still reads as a stroke with two ends parked on top of each other.
  const loop = opts.loop ?? false;
  const last = count - 1;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / last;
    // turning angle at this point → weight at direction changes
    let turn = 0;
    const hasPrev = i > 0 || loop;
    const hasNext = i < last || loop;
    if (count > 2 && hasPrev && hasNext) {
      // on a loop, index 0 and index `last` are the same point: step over it
      const ip = i > 0 ? i - 1 : last - 1;
      const iq = i < last ? i + 1 : 1;
      const ax = pts[i * 3] - pts[ip * 3];
      const ay = pts[i * 3 + 1] - pts[ip * 3 + 1];
      const bx = pts[iq * 3] - pts[i * 3];
      const by = pts[iq * 3 + 1] - pts[i * 3 + 1];
      const la = Math.hypot(ax, ay) || 1e-6;
      const lb = Math.hypot(bx, by) || 1e-6;
      const cross = Math.abs((ax / la) * (by / lb) - (ay / la) * (bx / lb));
      turn = Math.min(1, cross * 9);
    }
    let w = base;
    if (!loop) {
      w *= 1 + startBias * Math.exp(-t * 6.5) - endLift * t * t;
    }
    w *= 1 + curveBias * turn * 0.35;
    // the wrist breathes: a slow modulation plus a little tooth
    const TAU = Math.PI * 2;
    w *= loop
      ? 1 + 0.2 * Math.sin(t * TAU * 3 + seed) + 0.1 * Math.sin(t * TAU * 11 + seed * 2.7)
      : 1 + 0.2 * Math.sin(t * 7.3 + seed) + 0.1 * Math.sin(t * 23.1 + seed * 2.7);
    out[i] = Math.min(max, Math.max(min, w));
  }
  return out;
}
