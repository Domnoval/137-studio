/**
 * Painter: turns a State into SVG. It owns the projection (plan / axon / 1-2-3 point
 * perspective), every construction's drawing routine, and the drafting overlays.
 *
 * It writes only into the six layer groups it is given. Colours are never baked in: strokes
 * reference CSS custom properties (`var(--geometry)`, `var(--accent)` …), so a theme switch or
 * the print stylesheet restyles the drawing without repainting it. The same code paints the
 * live canvas, the plan-study inset and (at a higher sample density, `res`) the geometry the
 * Studio harvests for print.
 */

import { MAX_STEPS, PENTAGONAL, TITLES, YANTRA_DEFS, type PatternId } from './catalog';
import { scaledPoly } from './polyhedra';
import type { State } from './state';

const NS = 'http://www.w3.org/2000/svg';

export interface Vec3 {
  x: number;
  y: number;
  z?: number;
}
export interface Projected {
  x: number;
  y: number;
  z: number;
  sc: number;
}
export interface Layers {
  grid: SVGGElement;
  perspective: SVGGElement;
  guides: SVGGElement;
  shapes: SVGGElement;
  points: SVGGElement;
  overlay: SVGGElement;
}

type Attrs = Record<string, string | number>;
type Plane = 'xy' | 'xz' | 'yz';

export const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export const clear = (e: Element) => {
  while (e.firstChild) e.removeChild(e.firstChild);
};

/** Axial hex coordinates → plane position. */
const axial = (q: number, r: number, s = 90): Vec3 => ({ x: s * Math.sqrt(3) * (q + r / 2), y: s * 1.5 * r, z: 0 });

const CUBE_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

export class Painter {
  /** Sample-density multiplier. The Studio raises it so circles stay smooth at print scale. */
  res = 1;

  constructor(
    public state: State,
    public layers: Layers,
  ) {}

  // ───────────────────────────── projection ─────────────────────────────

  project(p: Vec3): Projected {
    const { state } = this;
    const { x, y } = p;
    const z = p.z ?? 0;
    const rz = (state.rotation * Math.PI) / 180;
    const tx = ((state.mode === 'plan' ? 0 : state.tilt) * Math.PI) / 180;
    const x1 = x * Math.cos(rz) - y * Math.sin(rz);
    const y1 = x * Math.sin(rz) + y * Math.cos(rz);
    const xm = state.mirror ? -x1 : x1;

    if (state.mode === 'perspective') {
      if (state.perspectivePoints === 1) {
        const y2 = y1 * Math.cos(tx) - z * Math.sin(tx);
        const z2 = y1 * Math.sin(tx) + z * Math.cos(tx);
        const f = 690;
        const d = f + z2 + state.depth * 1.7;
        const sc = f / Math.max(220, d);
        return { x: state.vp1X + xm * sc, y: state.horizon + y2 * sc, z: z2, sc };
      }
      const cx = (state.vpLeft + state.vpRight) / 2;
      const f = Math.max(190, (state.vpRight - state.vpLeft) / 2);
      const yaw = Math.PI / 4;
      const yt = y1 * Math.cos(tx) - z * Math.sin(tx);
      const zt = y1 * Math.sin(tx) + z * Math.cos(tx);
      const xr = xm * Math.cos(yaw) - zt * Math.sin(yaw);
      let zr = xm * Math.sin(yaw) + zt * Math.cos(yaw);
      let yr = yt;
      if (state.perspectivePoints === 3) {
        const direction = state.vp3Y >= state.horizon ? 1 : -1;
        const span = Math.max(80, Math.abs(state.vp3Y - state.horizon));
        const pitch = direction * Math.min(0.58, Math.max(0.15, (f / span) * 0.34));
        const y3 = yr * Math.cos(pitch) - zr * Math.sin(pitch);
        zr = yr * Math.sin(pitch) + zr * Math.cos(pitch);
        yr = y3;
      }
      const d = f + zr + state.depth * 1.45;
      const sc = f / Math.max(145, d);
      const skew =
        state.perspectivePoints === 3
          ? ((state.vp3X - cx) / Math.max(140, Math.abs(state.vp3Y - state.horizon))) * 0.22
          : 0;
      return { x: cx + xr * sc + yr * sc * skew, y: state.horizon + yr * sc, z: zr, sc };
    }

    const y2 = y1 * Math.cos(tx) - z * Math.sin(tx);
    const z2 = y1 * Math.sin(tx) + z * Math.cos(tx);
    return { x: 450 + xm, y: 350 + y2, z: z2, sc: 1 };
  }

  private pathFrom(points: Vec3[], close = false): string {
    return (
      points
        .map((p, i) => {
          const v = this.project(p);
          return `${i ? 'L' : 'M'}${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        })
        .join(' ') + (close ? ' Z' : '')
    );
  }

  circlePoints(c: Vec3, r: number, segments = 96, plane: Plane = 'xy'): Vec3[] {
    const n = Math.max(8, Math.round(segments * this.res));
    const x = c.x;
    const y = c.y;
    const z = c.z ?? 0;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const co = Math.cos(a) * r;
      const si = Math.sin(a) * r;
      if (plane === 'xz') return { x: x + co, y, z: z + si };
      if (plane === 'yz') return { x, y: y + co, z: z + si };
      return { x: x + co, y: y + si, z };
    });
  }

  // ───────────────────────────── primitives ─────────────────────────────

  addPath(layer: Element, points: Vec3[], kind = 'main', close = false, extra: Attrs = {}): SVGPathElement {
    const p = svgEl('path', { d: this.pathFrom(points, close), 'vector-effect': 'non-scaling-stroke', ...extra });
    p.dataset.kind = kind;
    layer.appendChild(p);
    return p;
  }

  addLine(a: Vec3, b: Vec3, kind = 'main', extra: Attrs = {}): SVGPathElement {
    return this.addPath(this.layers.shapes, [a, b], kind, false, extra);
  }

  addCircle(c: Vec3, r: number, layer: Element = this.layers.shapes, kind = 'main', extra: Attrs = {}): SVGPathElement {
    const outline = this.addPath(layer, this.circlePoints(c, r), kind, true, extra);
    if (this.state.primitive === 'solid' && kind !== 'boundary') {
      this.addPath(layer, this.circlePoints(c, r, 72, 'xz'), 'sphere-ring', true, extra);
      this.addPath(layer, this.circlePoints(c, r, 72, 'yz'), 'sphere-ring', true, extra);
    }
    return outline;
  }

  private addCube(c: Vec3, size = 10) {
    const h = size / 2;
    const z = c.z ?? 0;
    const vertices = (
      [
        [-h, -h, -h],
        [h, -h, -h],
        [h, h, -h],
        [-h, h, -h],
        [-h, -h, h],
        [h, -h, h],
        [h, h, h],
        [-h, h, h],
      ] as const
    ).map(([x, y, d]) => ({ x: c.x + x, y: c.y + y, z: z + d }));
    CUBE_EDGES.forEach(([a, b]) => this.addPath(this.layers.points, [vertices[a], vertices[b]], 'cube'));
  }

  /** A construction centre: a square mark and an accent dot (flat), or a small cube (solid). */
  point(c: Vec3, i: number) {
    if (this.state.primitive === 'solid') {
      this.addCube(c, 13);
      return;
    }
    const s = 5;
    const z = c.z ?? 0;
    this.addPath(
      this.layers.points,
      [
        { x: c.x - s, y: c.y - s, z },
        { x: c.x + s, y: c.y - s, z },
        { x: c.x + s, y: c.y + s, z },
        { x: c.x - s, y: c.y + s, z },
      ],
      'node',
      true,
    );
    const p = this.project(c);
    const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 1.35, fill: 'var(--accent)' });
    dot.dataset.index = String(i);
    this.layers.points.appendChild(dot);
  }

  addScreenLine(layer: Element, x1: number, y1: number, x2: number, y2: number, kind: string) {
    const line = svgEl('line', { x1, y1, x2, y2, 'vector-effect': 'non-scaling-stroke' });
    line.dataset.kind = kind;
    layer.appendChild(line);
    return line;
  }

  addScreenText(layer: Element, x: number, y: number, text: string, anchor = 'middle', cls = 'draft-label') {
    const t = svgEl('text', { x, y, 'text-anchor': anchor, class: cls });
    t.textContent = text;
    layer.appendChild(t);
    return t;
  }

  // ─────────────────────────── grid & perspective ───────────────────────────

  drawGrid() {
    const { grid } = this.layers;
    clear(grid);
    if (!this.state.guides) return;
    for (let x = -360; x <= 360; x += 45)
      this.addPath(grid, [{ x, y: -300, z: -25 }, { x, y: 300, z: -25 }], 'grid');
    for (let y = -270; y <= 270; y += 45)
      this.addPath(grid, [{ x: -405, y, z: -25 }, { x: 405, y, z: -25 }], 'grid');
    this.addPath(grid, [{ x: -400, y: 0 }, { x: 400, y: 0 }], 'axis-x');
    this.addPath(grid, [{ x: 0, y: -310 }, { x: 0, y: 310 }], 'axis-y');
    if (this.state.mode !== 'plan') this.addPath(grid, [{ x: 0, y: 0, z: -255 }, { x: 0, y: 0, z: 255 }], 'axis-z');
  }

  private activeVanishingPoints(): { x: number; y: number }[] {
    const { state } = this;
    if (state.perspectivePoints === 1) return [{ x: state.vp1X, y: state.horizon }];
    const points = [
      { x: state.vpLeft, y: state.horizon },
      { x: state.vpRight, y: state.horizon },
    ];
    if (state.perspectivePoints === 3) points.push({ x: state.vp3X, y: state.vp3Y });
    return points;
  }

  private screenLine(x1: number, y1: number, x2: number, y2: number, kind = 'perspective-line') {
    const line = svgEl('line', { x1, y1, x2, y2, 'vector-effect': 'non-scaling-stroke' });
    line.dataset.kind = kind;
    this.layers.perspective.appendChild(line);
    return line;
  }

  drawPerspective() {
    const { state } = this;
    const layer = this.layers.perspective;
    clear(layer);
    if (state.mode !== 'perspective') return;
    const vps = this.activeVanishingPoints();
    this.screenLine(0, state.horizon, 900, state.horizon, 'horizon');

    const hg = svgEl('g', { 'data-picker': 'horizon', 'aria-label': 'Horizon picker', role: 'button' });
    hg.appendChild(svgEl('circle', { cx: 24, cy: state.horizon, r: 9, class: 'horizon-handle' }));
    const ht = svgEl('text', { x: 39, y: state.horizon + 4, class: 'vp-label' });
    ht.textContent = 'HORIZON';
    hg.appendChild(ht);
    layer.appendChild(hg);

    if (state.perspectiveLines) {
      const anchors =
        state.perspectivePoints === 1
          ? [[250, 165], [650, 165], [250, 535], [650, 535]]
          : [[315, 200], [585, 200], [315, 500], [585, 500]];
      vps.forEach((vp, i) =>
        anchors
          .filter((_, n) => state.perspectivePoints === 1 || n % 2 === i % 2 || i === 2)
          .forEach(a => this.screenLine(vp.x, vp.y, a[0], a[1])),
      );
    }

    vps.forEach((vp, i) => {
      const g = svgEl('g', { 'data-picker': `vp-${i}`, 'aria-label': `Vanishing point ${i + 1}`, role: 'button' });
      g.appendChild(svgEl('circle', { cx: vp.x, cy: vp.y, r: 10, class: 'vp-handle' }));
      g.appendChild(svgEl('circle', { cx: vp.x, cy: vp.y, r: 2.6, class: 'vp-dot' }));
      const t = svgEl('text', { x: vp.x + 14, y: vp.y - 12, class: 'vp-label' });
      t.textContent = `VP ${i + 1}`;
      g.appendChild(t);
      layer.appendChild(g);
    });
  }

  // ───────────────────────────── constructions ─────────────────────────────

  private drawSeed(flower: boolean) {
    const { state, layers } = this;
    if (flower) {
      // Flower of Life: radius = lattice spacing d, so each circle passes through its six neighbours' centres.
      // Order: centre, ring 1 (the Seed of Life), ring 2, each ring walked by angle. Boundary at 3d.
      const d = 100;
      const centers: (Vec3 & { ring: number })[] = [];
      for (let q = -2; q <= 2; q++)
        for (let rr = -2; rr <= 2; rr++) {
          const ring = Math.max(Math.abs(q), Math.abs(rr), Math.abs(-q - rr));
          if (ring <= 2) {
            const p = axial(q, rr, d / Math.sqrt(3));
            centers.push({ ...p, z: state.depth * ((q - rr) % 3) * 0.13, ring });
          }
        }
      const ang = (c: Vec3) => ((Math.atan2(c.y, c.x) % (2 * Math.PI)) + 2 * Math.PI + 1e-9) % (2 * Math.PI);
      centers.sort((a, b) => a.ring - b.ring || ang(a) - ang(b));
      centers.slice(0, Math.min(state.step, 19)).forEach((c, i) => {
        this.addCircle(c, d, layers.shapes);
        if (state.points) this.point(c, i);
      });
      if (state.step >= 20) this.addCircle({ x: 0, y: 0, z: 0 }, 3 * d, layers.guides, 'boundary');
      return;
    }
    const r = 112;
    const centers: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 3) * r,
        y: Math.sin((i * Math.PI) / 3) * r,
        z: state.depth * (i % 2 ? -0.22 : 0.22),
      })),
    ];
    centers.slice(0, state.step).forEach((c, i) => {
      this.addCircle(c, r, layers.shapes);
      if (state.points) this.point(c, i);
    });
  }

  private drawMetatron() {
    const { state, layers } = this;
    const r = 92;
    const centers: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 3) * r,
        y: Math.sin((i * Math.PI) / 3) * r,
        z: state.depth * 0.12,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 3) * r * 2,
        y: Math.sin((i * Math.PI) / 3) * r * 2,
        z: -state.depth * 0.18,
      })),
    ];
    const circleCount = Math.min(state.step, 13);
    const cr = state.fruit ? r / 2 : r;
    centers.slice(0, circleCount).forEach((c, i) => {
      this.addCircle(c, cr, layers.guides, 'construction');
      if (state.points) this.point(c, i);
    });
    const drawn = new Set<number>();
    const chord = (i: number, j: number, kind?: string) => {
      const key = i < j ? i * 13 + j : j * 13 + i;
      if (drawn.has(key)) return;
      drawn.add(key);
      this.addLine(centers[i], centers[j], kind);
    };
    if (state.step >= 14) for (let i = 1; i < 7; i++) chord(0, i);
    if (state.step >= 15) for (let i = 1; i < 7; i++) chord(i, 1 + (i % 6));
    if (state.step >= 16)
      for (let i = 1; i < 7; i++) {
        chord(i, i + 6);
        chord(i, 7 + (i % 6));
      }
    // every pair of the 13 centres: 78 chords, including the six √3·r chords of the inner hexagram
    if (state.step >= 17) for (let i = 0; i < 13; i++) for (let j = i + 1; j < 13; j++) chord(i, j, 'web');
    if (state.step >= 18) this.addCircle({ x: 0, y: 0, z: 0 }, 2 * r + cr, layers.guides, 'boundary');
  }

  private drawPolyhedron(type: PatternId) {
    const { state, layers } = this;
    const R = type === 'dodecahedron' ? 178 : 170;
    const data = scaledPoly(type, R);
    const max = MAX_STEPS[type];
    const edgeCount = Math.ceil(data.edges.length * Math.min(1, Math.max(0, state.step - 1) / (max - 2)));
    const visible = new Set<number>();
    data.edges.slice(0, edgeCount).forEach(([a, b]) => {
      this.addLine(data.vertices[a], data.vertices[b]);
      visible.add(a);
      visible.add(b);
    });
    if (state.step === 1) data.vertices.forEach((_, i) => visible.add(i));
    if (state.points) visible.forEach(i => this.point(data.vertices[i], i));
    if (state.guides && state.step >= max) {
      (['xy', 'xz', 'yz'] as const).forEach(plane =>
        this.addPath(layers.guides, this.circlePoints({ x: 0, y: 0, z: 0 }, R, 84, plane), 'boundary', true),
      );
    }
  }

  private drawMetatron3D() {
    const { state, layers } = this;
    const r = 88;
    const centers: Vec3[] = [
      { x: 0, y: 0, z: 0 },
      { x: r, y: 0, z: 0 },
      { x: -r, y: 0, z: 0 },
      { x: 0, y: r, z: 0 },
      { x: 0, y: -r, z: 0 },
      { x: 0, y: 0, z: r },
      { x: 0, y: 0, z: -r },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: Math.cos((i * Math.PI) / 3) * r * 1.72,
        y: Math.sin((i * Math.PI) / 3) * r * 1.72,
        z: (i % 2 ? 1 : -1) * r * 0.72,
      })),
    ];
    const d3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
    centers.slice(0, Math.min(state.step, 13)).forEach((c, i) => {
      this.addCircle(c, 38, layers.guides, 'construction');
      if (state.points) this.point(c, i);
    });
    if (state.step >= 14) for (let i = 1; i < centers.length; i++) this.addLine(centers[0], centers[i]);
    if (state.step >= 15)
      for (let i = 1; i <= 6; i++)
        for (let j = i + 1; j <= 6; j++) {
          if (d3(centers[i], centers[j]) < r * 1.5) this.addLine(centers[i], centers[j], 'web');
        }
    if (state.step >= 16) {
      const cube = scaledPoly('cube', 145);
      cube.edges.forEach(([a, b]) => this.addLine(cube.vertices[a], cube.vertices[b], 'main'));
    }
    if (state.step >= 17)
      for (let i = 1; i < centers.length; i++)
        for (let j = i + 1; j < centers.length; j++) {
          const d = d3(centers[i], centers[j]);
          if (d > r * 1.45 && d < r * 2.7) this.addLine(centers[i], centers[j], 'web');
        }
    if (state.step >= 18)
      (['xy', 'xz', 'yz'] as const).forEach(plane =>
        this.addPath(layers.guides, this.circlePoints({ x: 0, y: 0, z: 0 }, 218, 96, plane), 'boundary', true),
      );
  }

  private drawVesica() {
    const { state, layers } = this;
    const r = 165;
    const cs: Vec3[] = [
      { x: -r / 2, y: 0, z: state.depth * 0.12 },
      { x: r / 2, y: 0, z: -state.depth * 0.12 },
    ];
    const h = (r * Math.sqrt(3)) / 2;
    this.addCircle(cs[0], r);
    if (state.step >= 2) this.addCircle(cs[1], r);
    if (state.step >= 3) this.addLine({ x: -r * 1.6, y: 0 }, { x: r * 1.6, y: 0 }, 'axis-x');
    // the lens is two arcs: each circle's arc between the shared points (0,±h), lying on its own circle
    const arcN = Math.round(48 * this.res);
    const arc = (c: Vec3, a0: number, a1: number): Vec3[] =>
      Array.from({ length: arcN + 1 }, (_, i) => {
        const a = ((a0 + ((a1 - a0) * i) / arcN) * Math.PI) / 180;
        return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, z: c.z };
      });
    if (state.step >= 4) {
      this.addPath(layers.shapes, arc(cs[0], -60, 60), 'lens');
      this.addPath(layers.shapes, arc(cs[1], 120, 240), 'lens');
    }
    if (state.step >= 5) {
      this.addLine({ x: 0, y: -h }, { x: 0, y: h }, 'axis-y');
      const top = this.project({ x: 0, y: -h });
      const mid = this.project({ x: r / 2, y: 0 });
      this.addScreenText(layers.guides, top.x, top.y - 26, 'h ÷ w = √3 ≈ 1.732');
      this.addScreenText(layers.guides, mid.x + 10, mid.y - 8, 'w = r', 'start');
    }
    if (state.points) {
      this.point(cs[0], 0);
      if (state.step >= 2) this.point(cs[1], 1);
    }
  }

  private drawYantra() {
    const { state, layers } = this;
    const tri = (up: boolean, scale: number, offset = 0, z = 0): Vec3[] => {
      const h = scale * 0.9;
      return up
        ? [
            { x: 0, y: -h + offset, z },
            { x: scale, y: h * 0.62 + offset, z },
            { x: -scale, y: h * 0.62 + offset, z },
          ]
        : [
            { x: 0, y: h + offset, z },
            { x: scale, y: -h * 0.62 + offset, z },
            { x: -scale, y: -h * 0.62 + offset, z },
          ];
    };
    if (state.points) this.point({ x: 0, y: 0 }, 0);
    YANTRA_DEFS.slice(0, Math.max(0, state.step - 1)).forEach((d, i) =>
      this.addPath(layers.shapes, tri(d[0], d[1], d[2], state.depth * ((i % 3) - 1) * 0.15), 'main', true),
    );
    if (state.guides) {
      this.addCircle({ x: 0, y: 0 }, 238, layers.guides, 'boundary');
      this.addCircle({ x: 0, y: 0 }, 250, layers.guides, 'boundary');
    }
    const p = this.project({ x: 0, y: 0 });
    layers.points.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 3.4, fill: 'var(--accent)' }));
  }

  drawActivePattern() {
    const { pattern } = this.state;
    switch (pattern) {
      case 'seed':
        return this.drawSeed(false);
      case 'flower':
        return this.drawSeed(true);
      case 'metatron':
        return this.drawMetatron();
      case 'metatron3d':
        return this.drawMetatron3D();
      case 'tetrahedron':
      case 'cube':
      case 'octahedron':
      case 'dodecahedron':
      case 'icosahedron':
        return this.drawPolyhedron(pattern);
      case 'vesica':
        return this.drawVesica();
      case 'yantra':
        return this.drawYantra();
    }
  }

  // ───────────────────────────── drafting overlays ─────────────────────────────

  drawPhiOverlay() {
    const { state, layers } = this;
    if (!state.phi || !PENTAGONAL.includes(state.pattern)) return;
    const phi = (1 + Math.sqrt(5)) / 2;
    const w = 360;
    const h = w / phi;
    const x = -w / 2;
    const y = -h / 2;
    this.addPath(layers.guides, [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }], 'phi', true);

    // whirling squares: cut left, top, right, bottom, repeat. Each square carries a quarter arc;
    // the arcs join into one spiral.
    let b = { x, y, w, h };
    const spiral: Vec3[] = [];
    const arc = (cx: number, cy: number, s: number, a0: number) => {
      const n = Math.round(24 * this.res);
      for (let i = spiral.length ? 1 : 0; i <= n; i++) {
        const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
        spiral.push({ x: cx + Math.cos(a) * s, y: cy + Math.sin(a) * s, z: 0 });
      }
    };
    for (let i = 0; i < 10; i++) {
      const side = i % 4;
      if (side === 0) {
        const s = b.h;
        this.addPath(layers.guides, [{ x: b.x + s, y: b.y }, { x: b.x + s, y: b.y + b.h }], 'phi');
        arc(b.x + s, b.y + s, s, 180);
        b = { x: b.x + s, y: b.y, w: b.w - s, h: b.h };
      }
      if (side === 1) {
        const s = b.w;
        this.addPath(layers.guides, [{ x: b.x, y: b.y + s }, { x: b.x + b.w, y: b.y + s }], 'phi');
        arc(b.x, b.y + s, s, 270);
        b = { x: b.x, y: b.y + s, w: b.w, h: b.h - s };
      }
      if (side === 2) {
        const s = b.h;
        this.addPath(layers.guides, [{ x: b.x + b.w - s, y: b.y }, { x: b.x + b.w - s, y: b.y + b.h }], 'phi');
        arc(b.x + b.w - s, b.y, s, 0);
        b = { x: b.x, y: b.y, w: b.w - s, h: b.h };
      }
      if (side === 3) {
        const s = b.w;
        this.addPath(layers.guides, [{ x: b.x, y: b.y + b.h - s }, { x: b.x + b.w, y: b.y + b.h - s }], 'phi');
        arc(b.x + b.w, b.y + b.h - s, s, 90);
        b = { x: b.x, y: b.y, w: b.w, h: b.h - s };
      }
    }
    this.addPath(layers.guides, spiral, 'phi-spiral');
    const tag = this.project({ x: x + w, y: y + h, z: 0 });
    this.addScreenText(layers.guides, tag.x - 8, tag.y - 10, 'φ · 1.618', 'end');
  }

  drawDimensions() {
    const { state, layers } = this;
    if (!state.dimensions) return;
    let span = 220;
    if (state.pattern === 'vesica') span = 275;
    if (state.pattern === 'flower') span = 235;
    if (state.pattern === 'yantra') span = 270;
    const dimension = (a: Vec3, b: Vec3, label: string, ox: number, oy: number) => {
      const p = this.project(a);
      const q = this.project(b);
      const x1 = p.x + ox;
      const y1 = p.y + oy;
      const x2 = q.x + ox;
      const y2 = q.y + oy;
      this.addScreenLine(layers.guides, p.x, p.y, x1, y1, 'extension');
      this.addScreenLine(layers.guides, q.x, q.y, x2, y2, 'extension');
      this.addScreenLine(layers.guides, x1, y1, x2, y2, 'dimension');
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const tick = 5;
      for (const [x, y] of [[x1, y1], [x2, y2]])
        this.addScreenLine(
          layers.guides,
          x - Math.sin(ang) * tick,
          y + Math.cos(ang) * tick,
          x + Math.sin(ang) * tick,
          y - Math.cos(ang) * tick,
          'dimension',
        );
      this.addScreenText(layers.guides, (x1 + x2) / 2, (y1 + y2) / 2 - 7, label);
    };
    dimension({ x: -span, y: span * 0.78, z: 0 }, { x: span, y: span * 0.78, z: 0 }, '2R', 0, 24);
    dimension(
      { x: span, y: -span * 0.78, z: 0 },
      { x: span, y: span * 0.78, z: 0 },
      state.mode === 'plan' ? 'φR' : 'Z / φR',
      24,
      0,
    );
  }

  /** The orthographic plan inset ("study sheet") drawn beneath the active view. */
  private makePlanStudy(): SVGGElement {
    const { state } = this;
    const holder = svgEl('g');
    holder.appendChild(svgEl('rect', { x: 16, y: 405, width: 274, height: 250, rx: 5, class: 'study-frame' }));
    const inner = svgEl('g', { transform: 'translate(18 420) scale(.3)' });
    const parts: Layers = {
      grid: svgEl('g'),
      perspective: svgEl('g'),
      guides: svgEl('g'),
      shapes: svgEl('g'),
      points: svgEl('g'),
      overlay: svgEl('g'),
    };
    // the first five parts are drawn into; `overlay` is never used by the inset
    [parts.grid, parts.perspective, parts.guides, parts.shapes, parts.points].forEach(g => inner.appendChild(g));
    holder.appendChild(inner);

    const plan: State = {
      ...state,
      mode: 'plan',
      rotation: 0,
      tilt: 0,
      depth: 0,
      dimensions: false,
      multiView: false,
    };
    const sub = new Painter(plan, parts);
    sub.res = this.res;
    sub.drawActivePattern();
    if (plan.phi) sub.drawPhiOverlay();
    sub.styleLayers(inner);

    this.addScreenText(holder, 31, 428, 'PLAN · ORTHOGRAPHIC', 'start', 'study-label');
    this.addScreenLine(holder, 153, 405, 153, 350, 'study-rule');
    this.addScreenText(holder, 153, 647, TITLES[state.pattern].toUpperCase(), 'middle', 'study-label');
    return holder;
  }

  drawDraftingOverlays() {
    clear(this.layers.overlay);
    if (this.state.multiView && this.state.mode !== 'plan') this.layers.overlay.appendChild(this.makePlanStudy());
  }

  // ───────────────────────────── styling ─────────────────────────────

  /** Resolve each `data-kind` to stroke, weight and opacity. Colours stay as CSS token references. */
  styleLayers(scope: ParentNode) {
    const { state } = this;
    const geom = state.darkline ? 'var(--accent)' : 'var(--geometry)';
    scope.querySelectorAll<SVGElement>('[data-kind]').forEach(p => {
      const k = p.dataset.kind ?? 'main';
      let stroke = geom;
      let opacity = 1;
      let w = state.weight;
      switch (k) {
        case 'grid':
          stroke = 'var(--grid)';
          opacity = 0.65;
          w = 0.6;
          break;
        case 'axis-x':
          stroke = 'var(--accent)';
          opacity = 0.45;
          w = 0.8;
          break;
        case 'axis-y':
          stroke = 'var(--focus)';
          opacity = 0.45;
          w = 0.8;
          break;
        case 'axis-z':
          stroke = 'var(--z-axis)';
          opacity = 0.78;
          w = 1.15;
          break;
        case 'horizon':
          stroke = 'var(--perspective)';
          opacity = 0.72;
          w = 1;
          break;
        case 'perspective-line':
          stroke = 'var(--perspective)';
          opacity = 0.3;
          w = 0.8;
          p.setAttribute('stroke-dasharray', '5 6');
          break;
        case 'construction':
          stroke = 'var(--ghost)';
          opacity = 0.72;
          w = Math.max(0.7, state.weight * 0.75);
          break;
        case 'boundary':
          stroke = 'var(--accent)';
          opacity = 0.55;
          w = 0.9;
          break;
        case 'web':
          opacity = 0.62;
          w = Math.max(0.65, state.weight * 0.72);
          break;
        case 'lens':
          stroke = 'var(--accent)';
          w = state.weight * 1.35;
          break;
        case 'sphere-ring':
          stroke = geom;
          opacity = 0.34;
          w = Math.max(0.65, state.weight * 0.72);
          break;
        case 'node':
          stroke = 'var(--accent)';
          opacity = 0.9;
          w = 0.9;
          break;
        case 'cube':
          stroke = 'var(--accent)';
          opacity = 0.88;
          w = 0.85;
          break;
        case 'phi':
          stroke = 'var(--z-axis)';
          opacity = 0.34;
          w = 0.8;
          p.setAttribute('stroke-dasharray', '3 5');
          break;
        case 'phi-spiral':
          stroke = 'var(--z-axis)';
          opacity = 0.78;
          w = 1.2;
          break;
        case 'dimension':
          stroke = 'var(--accent)';
          opacity = 0.8;
          w = 0.8;
          break;
        case 'extension':
          stroke = 'var(--accent)';
          opacity = 0.35;
          w = 0.65;
          p.setAttribute('stroke-dasharray', '3 4');
          break;
      }
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', String(w));
      p.setAttribute('opacity', String(opacity));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-linejoin', 'round');
    });
  }

  /** Repaint every layer from the current state. `scope` is the element whose `[data-kind]` descendants get styled. */
  paint(scope: ParentNode) {
    const { layers } = this;
    clear(layers.shapes);
    clear(layers.guides);
    clear(layers.points);
    clear(layers.perspective);
    clear(layers.overlay);
    this.drawGrid();
    this.drawPerspective();
    this.drawActivePattern();
    this.drawPhiOverlay();
    this.drawDimensions();
    this.styleLayers(scope);
    this.drawDraftingOverlays();
  }
}
