/**
 * Genesis geometry — pure, framework-agnostic math for the 8-stage embryology
 * of Metatron's Cube. No React, no canvas; just points, solids and a
 * hand-rolled perspective projector. Kept separate so the draw loop stays a
 * thin consumer (and so this is independently reasoned-about / portable).
 */

export type Pt = { x: number; y: number };
export type Vec3 = [number, number, number];

const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio — the spine of the solids
const SQRT3 = Math.sqrt(3);

/**
 * Hexagonal lattice of circle centres, the substrate of the Flower of Life.
 * Adjacent centres are exactly `d` apart, so circles of radius `d` drawn at
 * each point pass through their neighbours' centres — the canonical Flower.
 *   rings = 1 → 7 points  (Seed of Life)
 *   rings = 2 → 19 points (Flower of Life)
 * Returned sorted by distance from origin so callers can REVEAL points
 * outward in time (growth = the life voice unfolding).
 */
export function hexLattice(rings: number, d: number): Pt[] {
  const pts: Pt[] = [];
  for (let q = -rings; q <= rings; q++) {
    for (let r = -rings; r <= rings; r++) {
      if (Math.abs(-q - r) > rings) continue;
      pts.push({ x: d * (q + r / 2), y: d * (SQRT3 / 2) * r });
    }
  }
  return pts.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
}

/**
 * The 13 centres of the Fruit of Life — the skeleton of Metatron's Cube.
 * Centre + an inner hexagon at radius `d` + an outer hexagon at radius `2d`,
 * both pointy-top (first vertex at 12 o'clock). y is screen-down.
 */
export function metatronPoints(d: number): Pt[] {
  const pts: Pt[] = [{ x: 0, y: 0 }];
  for (const mult of [1, 2]) {
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 3;
      pts.push({ x: Math.cos(a) * d * mult, y: Math.sin(a) * d * mult });
    }
  }
  return pts;
}

/**
 * All 78 chords between the 13 nodes — drawing them is what turns the Fruit of
 * Life into Metatron's Cube (and reveals the Platonic solids hiding inside).
 * Ordered shortest-first so a progressive reveal grows from the centre out.
 */
export function metatronEdges(pts: Pt[]): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) edges.push([i, j]);
  }
  return edges.sort((e1, e2) => {
    const d = (e: [number, number]) =>
      Math.hypot(pts[e[0]].x - pts[e[1]].x, pts[e[0]].y - pts[e[1]].y);
    return d(e1) - d(e2);
  });
}

// ── The five Platonic solids ────────────────────────────────────────────────
// Vertices centred at the origin; edges derived by nearest-neighbour distance
// (every regular solid's edges are exactly its minimum vertex spacing), then
// each solid normalised to unit circumradius so they share a scale.

export type Solid = { name: string; verts: Vec3[]; edges: [number, number][] };

function normalize(verts: Vec3[]): Vec3[] {
  const max = Math.max(...verts.map((v) => Math.hypot(v[0], v[1], v[2])));
  return verts.map((v) => [v[0] / max, v[1] / max, v[2] / max] as Vec3);
}

function deriveEdges(verts: Vec3[]): [number, number][] {
  const d2 = (a: Vec3, b: Vec3) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  let min = Infinity;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      min = Math.min(min, d2(verts[i], verts[j]));
  const tol = min * 1.08; // generous enough for float noise, tight enough to skip diagonals
  const edges: [number, number][] = [];
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++)
      if (d2(verts[i], verts[j]) <= tol) edges.push([i, j]);
  return edges;
}

function makeSolid(name: string, verts: Vec3[]): Solid {
  const v = normalize(verts);
  return { name, verts: v, edges: deriveEdges(v) };
}

const TETRA: Vec3[] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

const CUBE: Vec3[] = (() => {
  const v: Vec3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
  return v;
})();

const OCTA: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const ICOSA: Vec3[] = [
  [0, 1, PHI],
  [0, 1, -PHI],
  [0, -1, PHI],
  [0, -1, -PHI],
  [1, PHI, 0],
  [1, -PHI, 0],
  [-1, PHI, 0],
  [-1, -PHI, 0],
  [PHI, 0, 1],
  [PHI, 0, -1],
  [-PHI, 0, 1],
  [-PHI, 0, -1],
];

const DODECA: Vec3[] = (() => {
  const ip = 1 / PHI;
  const v: Vec3[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
  for (const a of [-ip, ip])
    for (const b of [-PHI, PHI]) {
      v.push([0, a, b]);
      v.push([a, b, 0]);
      v.push([b, 0, a]);
    }
  return v;
})();

/**
 * The procession of solids, in the order the piece reveals them. The
 * icosahedron is last and dwelt-on: it is the radiolarian — the living
 * organism whose skeleton IS a Platonic solid, where form and life coincide
 * and the two voices reunite.
 */
export const SOLIDS: Solid[] = [
  makeSolid('tetrahedron', TETRA),
  makeSolid('octahedron', OCTA),
  makeSolid('hexahedron', CUBE),
  makeSolid('dodecahedron', DODECA),
  makeSolid('icosahedron', ICOSA),
];

/**
 * Rotate a vertex around X, then Y, then Z, and project to 2D with a simple
 * pinhole perspective (focal length `f`, the source's 5.6). Returns screen
 * offset in unit space plus depth `z` for painter-style ordering / fog.
 */
export function project(
  v: Vec3,
  ax: number,
  ay: number,
  az: number,
  f: number,
): { x: number; y: number; z: number } {
  let [x, y, z] = v;
  // X axis
  let c = Math.cos(ax),
    s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  // Y axis
  c = Math.cos(ay);
  s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  // Z axis
  c = Math.cos(az);
  s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  const scale = f / (f + z);
  return { x: x * scale, y: y * scale, z };
}
