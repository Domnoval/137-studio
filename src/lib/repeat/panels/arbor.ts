/**
 * Panel IV — arbor vitae, what's at stake.
 *
 * The Tree of Life laid over the cerebellum's tree of life: ten lobules
 * fan out from Tiferet like the vermis's ten (Larsell I–X), folia on
 * every twig, and the brainstem rises as the trunk along the middle
 * pillar.
 *
 * Machado-Joseph damage doesn't fall branch by branch. It rises: pons,
 * peduncles and the dentate at the white-matter core go first; the folia
 * hold longest. So the damage here is a tide — gold where the tree still
 * holds, umber where it has broken, crimson knots where the protein has
 * clumped — rising from the root, heaviest at the core, and never quite
 * reaching the crown.
 *
 * Growth and damage use separate noise, so dragging the tide moves the
 * waterline without regrowing the tree.
 */

import { mulberry32, strHash } from '@/lib/temple/seed';
import { arc, clamp, dist, DEG, ellipse, knot, lerp, mix, polar, smoothstep, TAU, type Pt } from '../geom';
import type { PanelParams } from '../params';
import { Sketch, type Scene, type Style } from '../scene';
import type { Weight } from '../tokens';

const PILLAR = 2.25;
const SEPH_R = 0.42;

const SEPHIROT: Record<string, Pt> = {
  keter: [6, 1.25],
  chokmah: [6 + PILLAR, 2.45],
  binah: [6 - PILLAR, 2.45],
  chesed: [6 + PILLAR, 4.85],
  gevurah: [6 - PILLAR, 4.85],
  tiferet: [6, 6.05],
  netzach: [6 + PILLAR, 7.25],
  hod: [6 - PILLAR, 7.25],
  yesod: [6, 8.45],
  malkuth: [6, 10.85],
};
const DAAT: Pt = [6, 3.65];

/** The 22 paths. */
const PATHS: [string, string][] = [
  ['keter', 'chokmah'], ['keter', 'binah'], ['keter', 'tiferet'], ['chokmah', 'binah'],
  ['chokmah', 'tiferet'], ['chokmah', 'chesed'], ['binah', 'tiferet'], ['binah', 'gevurah'],
  ['chesed', 'gevurah'], ['chesed', 'tiferet'], ['chesed', 'netzach'], ['gevurah', 'tiferet'],
  ['gevurah', 'hod'], ['tiferet', 'netzach'], ['tiferet', 'yesod'], ['tiferet', 'hod'],
  ['netzach', 'hod'], ['netzach', 'yesod'], ['netzach', 'malkuth'], ['hod', 'yesod'],
  ['hod', 'malkuth'], ['yesod', 'malkuth'],
];

const FAN: Pt = SEPHIROT.tiferet;
const DEPTH_WEIGHT: Weight[] = ['medium', 'fine', 'hair'];
const MAX_DEPTH = 2;

interface Seg { a: Pt; b: Pt; weight: Weight; noise: number[] }
interface Leaf { pts: Pt[]; noise: number[] }

function noise(rng: () => number): number[] {
  return [rng(), rng(), rng(), rng(), rng(), rng()];
}

const insideSephira = (pt: Pt): boolean =>
  Object.values(SEPHIROT).some((c) => dist(c, pt) < SEPH_R + 0.06);

/** Grow one branch and its children; folia along the sides and at the tip. */
function grow(rng: () => number, from: Pt, angle: number, length: number, depth: number, segs: Seg[], leaves: Leaf[]): void {
  const steps = 6;
  const stepLen = length / steps;
  const bend = (rng() - 0.5) * 0.08;
  let pos = from;
  let a = angle;
  for (let i = 1; i <= steps; i++) {
    a += bend + (rng() - 0.5) * 0.06;
    const next = polar(pos, stepLen, a);
    segs.push({ a: pos, b: next, weight: DEPTH_WEIGHT[depth], noise: noise(rng) });
    pos = next;
    const side = i % 2 === 0 ? 1 : -1;
    if (depth < MAX_DEPTH) {
      const len = 0.22 * (1 - depth * 0.25);
      leaves.push({ pts: ellipse(polar(pos, len * 0.55, a + side * 0.95), len / 2, 0.035, a + side * 0.95, 14), noise: noise(rng) });
    }
    if (depth < MAX_DEPTH && i >= 2 && i <= 5 && rng() < (depth === 0 ? 0.95 : 0.7)) {
      const childAngle = a + side * (0.45 + rng() * 0.35);
      const childLen = length * (0.42 + rng() * 0.12) * (1 - (i / steps) * 0.45);
      grow(rng, pos, childAngle, childLen, depth + 1, segs, leaves);
    }
  }
  const tip = 0.3 * (1 - depth * 0.15);
  leaves.push({ pts: ellipse(polar(pos, tip / 2, a), tip / 2, 0.055, a, 16), noise: noise(rng) });
}

export function arbor(p: PanelParams): Scene {
  const s = new Sketch();
  const grower = mulberry32(strHash('IV:grow:' + p.seed));

  s.ground([-1, -1, 14, 14], 'indigo');

  // ── Damage field ────────────────────────────────────────────────────
  // A tide rising from the root with a ragged front, a hot core where the
  // dentate sits, and a guarded crown. Canopy elements pass `resist` so
  // the outer folia hold longest; the trunk and the Tree pass 0.
  const tideY = lerp(12.3, -0.3, p.tide);
  const damage = (pt: Pt, resist: number): number => {
    const d = dist(pt, FAN);
    const tide = smoothstep(tideY - 1.6, tideY + 1.6, pt[1]);
    const core = p.core * Math.exp(-(d ** 2) / (2 * 1.3 ** 2));
    const distal = 1 - resist * clamp(d / 4.2) ** 1.5;
    return clamp(tide + core) * distal * smoothstep(1.3, 3.3, pt[1]);
  };

  /** Draw one segment either holding (gold) or broken (umber + knots). */
  const segment = (a: Pt, b: Pt, weight: Weight, n: number[], resist: number): void => {
    const mid = mix(a, b, 0.5);
    if (insideSephira(mid)) return;
    const d = damage(mid, resist);
    if (d <= n[0]) {
      s.path([a, b], { paint: 'gold', weight });
      return;
    }
    if (n[1] > 0.45) {
      const t0 = n[2] * 0.3;
      const t1 = 1 - n[3] * 0.3;
      const len = dist(a, b) || 1;
      const off = (n[4] - 0.5) * 0.05;
      const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      const pa = mix(a, b, t0);
      const pb = mix(a, b, t1);
      s.path([[pa[0] + nx * off, pa[1] + ny * off], [pb[0] + nx * off, pb[1] + ny * off]], { paint: 'umber', weight });
    }
    if (n[5] < d * 0.12) {
      s.path(knot(mulberry32(Math.floor(n[5] * 1e9)), mid, 0.06 + n[2] * 0.12), { paint: 'crimson', weight: 'fine' });
    }
  };

  // ── The arbor: ten lobules fanning from the heart ───────────────────
  const segs: Seg[] = [];
  const leaves: Leaf[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = lerp(-196, 16, i / 9) * DEG + (grower() - 0.5) * 6 * DEG;
    const length = 3.2 + 1.1 * Math.sin((Math.PI * (i + 0.5)) / 10);
    grow(grower, FAN, angle, length, 0, segs, leaves);
  }

  // ── The trunk: brainstem and peduncles, rising along the middle pillar ──
  const phase = grower() * TAU;
  const trunkSegs: Seg[] = [];
  const edge = (side: number, y: number): Pt => {
    const t = (12.3 - y) / (12.3 - FAN[1]);
    const hw = lerp(0.55, 0.26, t) + 0.04 * Math.sin(y * 3.1 + phase + side);
    return [6 + side * hw, y];
  };
  for (let y = 12.3; y > FAN[1] + 0.05; y -= 0.12) {
    const y2 = Math.max(FAN[1], y - 0.12);
    trunkSegs.push({ a: edge(-1, y), b: edge(-1, y2), weight: 'bold', noise: noise(grower) });
    trunkSegs.push({ a: edge(1, y), b: edge(1, y2), weight: 'bold', noise: noise(grower) });
    for (const f of [-0.45, 0, 0.45]) {
      const l = edge(-1, y);
      const r = edge(1, y);
      const l2 = edge(-1, y2);
      const r2 = edge(1, y2);
      trunkSegs.push({ a: mix(l, r, 0.5 + f / 2), b: mix(l2, r2, 0.5 + f / 2), weight: 'hair', noise: noise(grower) });
    }
  }

  for (const seg of trunkSegs) segment(seg.a, seg.b, seg.weight, seg.noise, 0);
  for (const seg of segs) segment(seg.a, seg.b, seg.weight, seg.noise, 0.55);

  for (const leaf of leaves) {
    const c = leaf.pts[0];
    if (insideSephira(c)) continue;
    const d = damage(c, 0.8);
    const n = leaf.noise;
    if (d <= n[0]) {
      s.path(leaf.pts, { paint: 'gold', weight: 'hair' }, true);
    } else if (n[1] > 0.35) {
      const keep = Math.floor(leaf.pts.length * (0.4 + n[2] * 0.35));
      const from = Math.floor(n[3] * leaf.pts.length);
      const part = Array.from({ length: keep }, (_, k) => leaf.pts[(from + k) % leaf.pts.length]);
      s.path(part, { paint: 'umber', weight: 'hair' });
    }
  }

  // ── The Tree of Life over it ────────────────────────────────────────
  const pathNoise = mulberry32(strHash('IV:paths:' + p.seed));
  for (const [from, to] of PATHS) {
    const a = SEPHIROT[from];
    const b = SEPHIROT[to];
    const len = dist(a, b);
    const pieces = Math.max(2, Math.round((len - 2 * SEPH_R) / 0.2));
    for (let k = 0; k < pieces; k++) {
      const t0 = SEPH_R / len + ((1 - (2 * SEPH_R) / len) * k) / pieces;
      const t1 = SEPH_R / len + ((1 - (2 * SEPH_R) / len) * (k + 1)) / pieces;
      segment(mix(a, b, t0), mix(a, b, t1), 'fine', noise(pathNoise), 0);
    }
  }

  const sephNoise = mulberry32(strHash('IV:sephirot:' + p.seed));
  for (const c of Object.values(SEPHIROT)) {
    const n = noise(sephNoise);
    const d = damage(c, 0);
    const cover: Style = { paint: 'gold', weight: 'bold', fill: 'indigo', fillTone: 1 };
    if (d <= n[0]) {
      s.circle(c, SEPH_R, cover);
      s.circle(c, SEPH_R - 0.08, { paint: 'gold', weight: 'hair' });
      continue;
    }
    s.circle(c, SEPH_R, { paint: 'indigo', weight: 'hair', fill: 'indigo', fillTone: 1, only: 'study' });
    let a0 = n[1] * TAU;
    for (let k = 0; k < 4; k++) {
      const span = (0.6 + n[(k + 2) % 6] * 0.6) * (TAU / 4) * 0.7;
      s.path(arc(c, SEPH_R, a0, a0 + span, 10), { paint: 'umber', weight: 'medium' });
      a0 += TAU / 4;
    }
    s.path(knot(mulberry32(Math.floor(n[5] * 1e9)), c, 0.14 + d * 0.1), { paint: 'crimson', weight: 'fine' });
  }
  s.circle(DAAT, SEPH_R * 0.8, { paint: 'gold', weight: 'hair', dash: [0.05, 0.06] });

  // Where the water stands today — a guide, not a line to paint.
  s.path([[-0.1, tideY], [12.1, tideY]], { paint: 'gold', weight: 'hair', dash: [0.12, 0.1], guide: true });

  return s.scene('IV');
}
