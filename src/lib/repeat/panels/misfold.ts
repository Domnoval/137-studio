/**
 * Panel III — misfold, the consequence.
 *
 * Left of the divider: a perfect icosahedron, ataxin-3 on duty. Front
 * edges carry weight; back edges fall to hairline so the solid reads in
 * depth. Right of it: the same twelve vertices collapsed inward on a
 * seed, edges crumpled, two vertices pushed through the centre, a few
 * wrong contacts made. The ghost of the healthy solid stays behind it.
 *
 * The poly-Q tail tangles off the wreck, one sphere per glutamine. Its
 * outline doubles and drifts toward the end — AlphaFold's own confidence
 * falls from ~90 on the enzyme to ~71 on this tract. No expanded
 * structure has ever been solved; this half is drawn from inference.
 */

import { mulberry32, strHash } from '@/lib/temple/seed';
import { arc, clamp, TAU, type Pt } from '../geom';
import type { PanelParams } from '../params';
import { Sketch, type Scene, type Style } from '../scene';

type V3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2;
const SIZE = 2.2;
const LEFT: Pt = [3.0, 5.6];
const RIGHT: Pt = [9.0, 4.4];
const SPHERE_R = 0.17;

const RAW: V3[] = [
  [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
  [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1],
];
const NORM = Math.hypot(1, PHI);
const VERTS: V3[] = RAW.map(([x, y, z]) => [x / NORM, y / NORM, z / NORM]);

const EDGES: [number, number][] = [];
for (let i = 0; i < 12; i++)
  for (let j = i + 1; j < 12; j++) {
    const d = Math.hypot(RAW[i][0] - RAW[j][0], RAW[i][1] - RAW[j][1], RAW[i][2] - RAW[j][2]);
    if (Math.abs(d - 2) < 1e-6) EDGES.push([i, j]);
  }
const ADJ = new Set(EDGES.map(([i, j]) => i * 12 + j));
const adjacent = (i: number, j: number) => ADJ.has(Math.min(i, j) * 12 + Math.max(i, j));
const FACES: [number, number, number][] = [];
for (let i = 0; i < 12; i++)
  for (let j = i + 1; j < 12; j++)
    for (let k = j + 1; k < 12; k++)
      if (adjacent(i, j) && adjacent(j, k) && adjacent(i, k)) FACES.push([i, j, k]);

/** A fixed three-quarter view, so both solids are seen from the same place. */
function view([x, y, z]: V3): V3 {
  const [ax, ay] = [0.42, 0.62];
  const y1 = y * Math.cos(ax) - z * Math.sin(ax);
  const z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
  return [x2, y1, z2];
}

function project(v: V3, at: Pt): Pt {
  const persp = 6 / (6 - v[2]);
  return [at[0] + v[0] * SIZE * persp, at[1] - v[1] * SIZE * persp];
}

/** Which edges face the viewer, judged on the healthy solid. */
function frontEdges(): Set<number> {
  const front = new Set<number>();
  for (const [a, b, c] of FACES) {
    const z = view(VERTS[a])[2] + view(VERTS[b])[2] + view(VERTS[c])[2];
    if (z <= 0) continue;
    for (const [i, j] of [[a, b], [b, c], [a, c]]) front.add(Math.min(i, j) * 12 + Math.max(i, j));
  }
  return front;
}

export function misfold(p: PanelParams): Scene {
  const s = new Sketch();
  const rng = mulberry32(strHash('III:' + p.seed));
  const front = frontEdges();

  s.ground([-1, -1, 7, 14], 'warmWhite');
  s.ground([6, -1, 7, 14], 'umber');

  // ── On duty: the perfect solid ──────────────────────────────────────
  const healthy = VERTS.map((v) => project(view(v), LEFT));
  for (const [i, j] of EDGES) {
    const isFront = front.has(i * 12 + j);
    s.path([healthy[i], healthy[j]], isFront ? { paint: 'ink', weight: 'medium' } : { paint: 'ink', weight: 'hair', dash: [0.06, 0.05] });
  }
  for (const v of healthy) s.circle(v, 0.045, { paint: 'ink', weight: 'fine', fill: 'ink', fillTone: 1 });

  // ── The ghost it remembers ──────────────────────────────────────────
  const ghost = VERTS.map((v) => project(view(v), RIGHT));
  for (const [i, j] of EDGES) s.path([ghost[i], ghost[j]], { paint: 'bone', weight: 'hair', dash: [0.04, 0.08] });

  // ── Collapse: the same twelve vertices, pulled inward on the seed ───
  const inverted = new Set([Math.floor(rng() * 12), Math.floor(rng() * 12)]);
  const collapsed: V3[] = VERTS.map(([x, y, z], i) => {
    const k = inverted.has(i) ? -0.1 + rng() * 0.25 : 0.42 + rng() * 0.4;
    const twist = (rng() - 0.5) * 0.5;
    const nx = x * Math.cos(twist) - z * Math.sin(twist);
    const nz = x * Math.sin(twist) + z * Math.cos(twist);
    return [nx * k + (rng() - 0.5) * 0.15, y * k + (rng() - 0.5) * 0.15, nz * k + (rng() - 0.5) * 0.15];
  });
  const wreck = collapsed.map((v) => project(view(v), RIGHT));
  const crimson = (weight: Style['weight']): Style => ({ paint: 'crimson', weight });
  for (const [i, j] of EDGES) {
    const [a, b] = [wreck[i], wreck[j]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, ny] = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    // Crumple scales with the edge, so the solid stays legible as itself.
    const pts: Pt[] = [a];
    for (let t = 1; t < 5; t++) {
      const off = (rng() - 0.5) * (0.03 + 0.28 * len) * p.crumple;
      pts.push([a[0] + ((b[0] - a[0]) * t) / 5 + nx * off, a[1] + ((b[1] - a[1]) * t) / 5 + ny * off]);
    }
    pts.push(b);
    s.path(pts, crimson(front.has(i * 12 + j) ? 'bold' : 'fine'));
  }
  // Wrong contacts: bonds a folded protein should never make.
  for (let n = 0; n < 3; n++) {
    const i = Math.floor(rng() * 12);
    let j = Math.floor(rng() * 12);
    if (i === j || adjacent(i, j)) j = (i + 6) % 12;
    s.path([wreck[i], wreck[j]], { paint: 'crimson', weight: 'hair', dash: [0.03, 0.04] });
  }
  for (const v of wreck) s.circle(v, 0.04, { paint: 'crimson', weight: 'fine', fill: 'crimson', fillTone: 1 });

  // ── The poly-Q tail ─────────────────────────────────────────────────
  const count = Math.max(1, Math.round(p.tail));
  let start = 0;
  for (let i = 1; i < 12; i++) if (wreck[i][1] > wreck[start][1]) start = i;
  let pos: Pt = wreck[start];
  let heading = Math.PI / 2 + (rng() - 0.5) * 0.6;
  let turn = (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 0.2);
  const target: Pt = [8.9, 8.3];
  const spacing = SPHERE_R * 2 * 0.92;
  const inBounds = ([x, y]: Pt) => x > 6.5 && x < 11.5 && y > 0.5 && y < 11.5;
  for (let n = 0; n < count; n++) {
    // Persistent turning coils the chain into loops; the odd reversal
    // makes figure-eights; a soft pull keeps the tangle in one place.
    if (rng() < 0.1) turn = -Math.sign(turn) * (0.3 + rng() * 0.3);
    turn = clamp(turn + (rng() - 0.5) * 0.08, -0.7, 0.7);
    const toTarget = Math.atan2(target[1] - pos[1], target[0] - pos[0]);
    const diff = Math.atan2(Math.sin(toTarget - heading), Math.cos(toTarget - heading));
    const far = Math.hypot(target[0] - pos[0], target[1] - pos[1]);
    heading += turn * clamp(n / 3, 0, 1) + diff * 0.35 * clamp((far - 1.8) / 1.0, 0, 1);
    let next: Pt = [pos[0] + Math.cos(heading) * spacing, pos[1] + Math.sin(heading) * spacing];
    if (!inBounds(next)) {
      heading = toTarget + (rng() - 0.5) * 0.8;
      next = [pos[0] + Math.cos(heading) * spacing, pos[1] + Math.sin(heading) * spacing];
    }
    pos = next;
    const drift = p.uncertainty * (n / Math.max(1, count - 1));
    s.circle(pos, SPHERE_R, { paint: 'crimson', weight: 'fine', fill: 'crimson', fillTone: 0.75 + rng() * 0.25 });
    s.path(arc([pos[0] - SPHERE_R * 0.3, pos[1] - SPHERE_R * 0.3], SPHERE_R * 0.38, Math.PI, Math.PI * 1.5, 8), {
      paint: 'bone',
      weight: 'hair',
    });
    if (drift > 0.08) {
      const a = rng() * TAU;
      const off = drift * 0.07;
      s.circle([pos[0] + Math.cos(a) * off, pos[1] + Math.sin(a) * off], SPHERE_R * (1 + drift * 0.12), {
        paint: 'crimson',
        weight: 'hair',
      });
    }
  }

  // ── The event horizon between function and failure ─────────────────
  s.path([[6, -0.2], [6, 12.2]], { paint: 'payne', weight: 'bold' });

  return s.scene('III');
}
