/**
 * The five Platonic solids as vertex/edge lists. Edges are discovered, not tabulated:
 * every pair of vertices at the minimum pairwise distance is an edge. That holds for all
 * five solids and keeps the data honest to the geometry.
 */

import type { PatternId } from './catalog';

export type Triple = [number, number, number];
export interface PolyData {
  vertices: Triple[];
  edges: [number, number][];
}
export interface ScaledPoly {
  vertices: { x: number; y: number; z: number }[];
  edges: [number, number][];
}

const dist = (a: Triple, b: Triple) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const polyCache = new Map<string, PolyData>();
const scaledCache = new Map<string, ScaledPoly>();

/** The vertices and edges of a solid. The data is constant, and the painter asks for it every frame, so it is built once. */
export function polyData(type: PatternId | 'cube'): PolyData {
  const hit = polyCache.get(type);
  if (hit) return hit;
  const built = buildPolyData(type);
  polyCache.set(type, built);
  return built;
}

function buildPolyData(type: PatternId | 'cube'): PolyData {
  const phi = (1 + Math.sqrt(5)) / 2;
  const inv = 1 / phi;
  let vertices: Triple[] = [];

  if (type === 'tetrahedron')
    vertices = [
      [1, 1, 1],
      [-1, -1, 1],
      [-1, 1, -1],
      [1, -1, -1],
    ];
  if (type === 'cube') for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) vertices.push([x, y, z]);
  if (type === 'octahedron')
    vertices = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
  if (type === 'icosahedron')
    vertices = [
      [0, 1, phi],
      [0, -1, phi],
      [0, 1, -phi],
      [0, -1, -phi],
      [1, phi, 0],
      [-1, phi, 0],
      [1, -phi, 0],
      [-1, -phi, 0],
      [phi, 0, 1],
      [phi, 0, -1],
      [-phi, 0, 1],
      [-phi, 0, -1],
    ];
  if (type === 'dodecahedron') {
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) vertices.push([x, y, z]);
    for (const a of [-1, 1])
      for (const b of [-1, 1]) vertices.push([0, a * inv, b * phi], [a * inv, b * phi, 0], [a * phi, 0, b * inv]);
  }

  let min = Infinity;
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++) {
      const d = dist(vertices[i], vertices[j]);
      if (d > 0.001 && d < min) min = d;
    }

  const edges: [number, number][] = [];
  for (let i = 0; i < vertices.length; i++)
    for (let j = i + 1; j < vertices.length; j++) {
      const d = dist(vertices[i], vertices[j]);
      if (Math.abs(d - min) < 0.015) edges.push([i, j]);
    }
  return { vertices, edges };
}

/** Scale a solid so its circumradius equals `size`. */
export function scaledPoly(type: PatternId | 'cube', size = 170): ScaledPoly {
  const key = `${type}@${size}`;
  const hit = scaledCache.get(key);
  if (hit) return hit;
  const built = buildScaledPoly(type, size);
  scaledCache.set(key, built);
  return built;
}

function buildScaledPoly(type: PatternId | 'cube', size: number): ScaledPoly {
  const data = polyData(type);
  const radius = Math.max(...data.vertices.map(v => Math.hypot(...v)));
  const scale = size / radius;
  return {
    vertices: data.vertices.map(([x, y, z]) => ({ x: x * scale, y: y * scale, z: z * scale })),
    edges: data.edges,
  };
}
