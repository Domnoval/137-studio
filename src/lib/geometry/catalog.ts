/**
 * Pattern catalogue: the eleven constructions, their copy, step counts and
 * the named phases of each build. Pure data: no DOM, safe on the server.
 */

export const PATTERN_IDS = [
  'seed',
  'flower',
  'metatron',
  'metatron3d',
  'tetrahedron',
  'cube',
  'octahedron',
  'dodecahedron',
  'icosahedron',
  'vesica',
  'yantra',
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

export const isPatternId = (v: unknown): v is PatternId =>
  typeof v === 'string' && (PATTERN_IDS as readonly string[]).includes(v);

export const NOTES: Record<PatternId, string> = {
  seed: 'Seven equal circles unfold from a single radius.',
  flower: 'A hexagonal lattice grows outward; every circle passes through its neighbours’ centres.',
  metatron: 'Thirteen centers joined into a map of every direction.',
  metatron3d: 'Thirteen spatial nodes reveal the cube as a layered three-dimensional lattice.',
  tetrahedron: 'Four vertices and six equal edges — the simplex of three-dimensional space.',
  cube: 'Eight vertices form six equal square faces.',
  octahedron: 'Six vertices form eight equal triangular faces.',
  dodecahedron: 'Twenty vertices form twelve regular pentagonal faces.',
  icosahedron: 'Twelve vertices form twenty equal triangular faces.',
  vesica:
    'Two equal circles meet at each other’s center; the lens between them stands √3 tall for every 1 wide.',
  yantra: 'Nine interlocking triangles, four rising and five descending, converge on a single bindu.',
};

export const TITLES: Record<PatternId, string> = {
  seed: 'Seed of Life',
  flower: 'Flower of Life',
  metatron: 'Metatron’s Cube',
  metatron3d: 'Metatron’s Cube · 3D',
  tetrahedron: 'Tetrahedron',
  cube: 'Cube',
  octahedron: 'Octahedron',
  dodecahedron: 'Dodecahedron',
  icosahedron: 'Icosahedron',
  vesica: 'Vesica Piscis',
  yantra: 'Nine-fold Yantra',
};

export const MAX_STEPS: Record<PatternId, number> = {
  seed: 7,
  flower: 20,
  metatron: 18,
  metatron3d: 18,
  tetrahedron: 8,
  cube: 8,
  octahedron: 8,
  dodecahedron: 8,
  icosahedron: 8,
  vesica: 5,
  yantra: 10,
};

/** Figures governed by φ. The hexagonal figures run on √3 instead. */
export const PENTAGONAL: readonly PatternId[] = ['dodecahedron', 'icosahedron'];

/** Figures that live in three dimensions (they rotate, and default to the "solid" primitive set). */
export const SPATIAL: readonly PatternId[] = [
  'metatron3d',
  'tetrahedron',
  'cube',
  'octahedron',
  'dodecahedron',
  'icosahedron',
];

export const PLATONIC: readonly PatternId[] = ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'];

/** [pointing up, scale, vertical offset, ] for each of the nine triangles of the yantra. */
export const YANTRA_DEFS: readonly (readonly [boolean, number, number])[] = [
  [false, 205, 5],
  [true, 202, -4],
  [false, 168, 18],
  [true, 171, -18],
  [false, 137, -8],
  [true, 139, 10],
  [false, 109, 17],
  [true, 112, -17],
  [false, 80, 0],
];

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'];

const SOLID_PHASES = [
  'Vertices',
  'Edges',
  'Edges',
  'Edges',
  'Edges',
  'Edges',
  'Full frame',
  'Circumsphere',
];

export const PHASES: Record<PatternId, readonly string[]> = {
  seed: ['Origin', 'First orbit', 'Second orbit', 'Triad', 'Four directions', 'Sixfold field', 'Completion'],
  flower: [
    'Origin',
    'First orbit',
    'Seed ring',
    'Seed ring',
    'Seed ring',
    'Seed ring',
    'Seed complete',
    ...Array<string>(11).fill('Second ring'),
    'Lattice complete',
    'Boundary · 3d',
  ],
  metatron: [
    'Origin',
    'Inner ring',
    'Inner ring',
    'Inner ring',
    'Inner ring',
    'Inner ring',
    'Inner ring complete',
    'Outer ring',
    'Outer ring',
    'Outer ring',
    'Outer ring',
    'Outer ring',
    'Thirteen centers',
    'Radial chords',
    'Inner web',
    'Outer web',
    'All 78 chords',
    'Completion',
  ],
  metatron3d: [
    'Origin',
    'X axis',
    'X axis',
    'Y axis',
    'Y axis',
    'Z axis',
    'Octahedron nodes',
    'Crown ring',
    'Crown ring',
    'Crown ring',
    'Crown ring',
    'Crown ring',
    'Thirteen nodes',
    'Axial chords',
    'Octahedron web',
    'Cube frame',
    'Outer web',
    'Bounding sphere',
  ],
  tetrahedron: SOLID_PHASES,
  cube: SOLID_PHASES,
  octahedron: SOLID_PHASES,
  dodecahedron: SOLID_PHASES,
  icosahedron: SOLID_PHASES,
  vesica: ['First circle', 'Second circle', 'Shared axis', 'Vesica lens', '√3 proportion'],
  yantra: [
    'Bindu',
    ...YANTRA_DEFS.map((d, i) => `${ORDINALS[i]} triangle · ${d[0] ? '▲ Shiva' : '▼ Shakti'}`),
  ],
};
