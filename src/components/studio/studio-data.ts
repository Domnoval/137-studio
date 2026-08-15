// The room, as Michael described it: "you wake up in my studio… desk with an
// ancient futuristic monitor, monitors on the wall, easel with a painting,
// radio playing my Suno songs — those are all the doors."
//
// Everything here is in METRES, and the scale matters more than it looks. The
// props were reconstructed from single hero images, so each mesh arrives
// normalised to a unit bounding box with no real-world size attached. `height`
// below is the actual physical height we want the object to be; the loader
// scales each mesh to hit it. Get this wrong and the room reads like a doll's
// house — which is the single most common way a first-person scene feels fake.

export type PropId =
  | 'desk' | 'consoleMV' | 'radio' | 'monitors' | 'monitorsR' | 'easel'
  | 'neon' | 'orrery' | 'grimoire' | 'telephone' | 'apothecary'
  | 'candelabra' | 'plant';

export interface PropSpec {
  id: PropId;
  file: string;
  /** Real-world height in metres — the mesh is scaled to match. */
  height: number;
  /** Floor position [x, y, z]; y is the height of the object's BASE. */
  position: [number, number, number];
  /** Y rotation in degrees. Props face -Z by default, the seated view. */
  rotation?: number;
  /** Base-colour multiplier and roughness floor — the image-to-3D bake
   *  consistently lifts dark materials pale and glossy. Mirrors GRADES in
   *  tools/asset-forge/render.mjs; these two must be kept in step. */
  tint?: number;
  rough?: number;
  /** Emissive boost. Opt-in: these bakes give a prop ONE material, so
   *  boosting anything with an emissive map torches props whose only bright
   *  pixels are a white canvas or a pale label. */
  emis?: number;
  /** Door label. null = dressing, not interactive.
   *  PROVISIONAL — which props are doors is Michael's call, still open. */
  door: string | null;
  /** A painting hung on this prop's face, in the mesh's own normalised units
   *  (before the height scaling above), so the slot travels with the model.
   *
   *  The easel's canvas cannot be textured directly: the reconstruction fuses
   *  the whole prop into one mesh with one material, and its "canvas" is not a
   *  clean plane — the Z-facing vertices scatter across z = 0.04…0.10 rather
   *  than sitting flat. So the artwork is a separate plane laid just proud of
   *  that face. It also has to be separate anyway, because the painting on the
   *  easel needs to change. */
  canvas?: { art: string; x: number; y: number; z: number; w: number; h: number };
  /** Tile this prop into a grid, laid out from its own measured size so the
   *  spacing holds whatever the mesh's aspect turns out to be. Used to build
   *  the monitor walls out of one 3x3 bank rather than generating a bigger
   *  mesh: reusing the asset is free, and a wall of mismatched salvaged
   *  screens is more the point than one enormous tidy one. */
  grid?: { cols: number; rows: number; gap: number };
}

/** Room envelope. Wider than deep so the seated view has something to look
 *  across rather than a wall two metres from your face. */
export const ROOM = {
  width: 7.4,
  depth: 6.2,
  height: 3.5,
} as const;

/** The height of the bench's timber surface. Everything that sits ON the bench
 *  is placed at exactly this y.
 *
 *  This is measured, not guessed. The workbench mesh has a machinist's vice
 *  bolted to one end that stands proud of the slab, so the mesh's bounding box
 *  is taller than the working surface — a vertex histogram puts the two faces
 *  of the timber at 0.66 and 0.83 of the bbox height, with everything above
 *  0.84 being the vice. Scale the mesh by its bbox and place props at the top
 *  of it and they float 15 cm in the air, which is exactly what the first
 *  render showed. DESK_BBOX below is back-solved so the slab lands here. */
export const WORKTOP = 0.8;
const SLAB_FRACTION = 0.83;
const DESK_BBOX = WORKTOP / SLAB_FRACTION; // ≈ 0.964

/** Seated at the bench: eye 46 cm above the surface, which is what sitting at
 *  a desk actually looks like. Pulled back far enough from the edge that the
 *  console reads as an object rather than wallpaper. */
export const SEAT = {
  position: [0, 1.26, 1.35] as [number, number, number],
  /** Look limits in degrees — you can turn your head, not walk away. */
  yaw: 105,
  pitchUp: 26,
  pitchDown: 34,
} as const;

const W = ROOM.width / 2;
const D = ROOM.depth / 2;

export const PROPS: PropSpec[] = [
  // ——— the bench you are sitting at ————————————————————————————————
  {
    id: 'desk', file: 'desk.glb',
    height: DESK_BBOX, position: [0, 0, -0.15], rotation: 0,
    tint: 0.58, rough: 0.62, door: null,
  },
  // ——— on the bench ————————————————————————————————————————————————
  {
    id: 'consoleMV', file: 'consoleMV.glb',
    // The centrepiece. 0.52 m read as a desktop toy, 0.85 m was still shy of
    // the reference. At 1.05 m its top sits at 1.85 m — well above the 1.26 m
    // eye line — so you are looking UP at it from the chair, which is the
    // whole feeling of the organ-console reference.
    height: 1.05, position: [-0.05, WORKTOP, -0.5], rotation: 4,
    // Re-graded for the NEW bake, which is a different mesh entirely: at
    // emis 1.4 its screen blew to a flat white blob and the mandala vanished.
    // Grades belong to the bake, not the prop. Tint pulled down again once the
    // machine grew — a bigger object catches more of the warm practical, and
    // at 0.42 the iron was reading as polished brass.
    tint: 0.34, rough: 0.66, emis: 0.55,
    door: 'THE BUILDS',
  },
  {
    id: 'radio', file: 'radio.glb',
    height: 0.24, position: [0.78, WORKTOP, -0.16], rotation: -22,
    tint: 0.9, rough: 0.3, emis: 1.2,
    door: 'THE SOUND',
  },
  {
    id: 'grimoire', file: 'grimoire.glb',
    height: 0.09, position: [0.34, WORKTOP, 0.12], rotation: 14,
    tint: 0.75, rough: 0.65,
    door: 'THE JOURNAL',   // and contact, in the back, like a real notebook
  },
  {
    id: 'telephone', file: 'telephone.glb',
    height: 0.17, position: [-1.02, WORKTOP, 0.06], rotation: 26,
    tint: 0.7, rough: 0.55,
    // Not a door. Contact lives in the back of the journal now, where an
    // address goes in a real notebook, so a phone would be a second way to
    // the same place for no reason. It stays as furniture.
    door: null,
  },
  // ——— the walls ———————————————————————————————————————————————————
  // Two banks of screens, each roughly a third of the back wall, flanking the
  // machine. One 3x3 bank at 1.05 m read as a picture frame on a big wall.
  {
    id: 'monitors', file: 'monitors.glb',
    height: 1.02, position: [-2.42, 0.95, -D + 0.04], rotation: 9,
    grid: { cols: 2, rows: 2, gap: 0.04 },
    tint: 0.7, rough: 0.5, emis: 1.8,
    door: 'THE BUILDS',    // loops back to the same place as the machine
  },
  {
    id: 'monitorsR', file: 'monitors.glb',
    height: 1.02, position: [2.42, 0.95, -D + 0.04], rotation: -9,
    grid: { cols: 2, rows: 2, gap: 0.04 },
    tint: 0.7, rough: 0.5, emis: 1.8,
    door: 'THE BUILDS',
  },
  {
    id: 'neon', file: 'neon.glb',
    // Centre-high above the machine now that both thirds of the wall are
    // screens. It is the room's sign; it belongs over the altar, not off in
    // a corner competing with a monitor bank for the same square metre.
    height: 0.7, position: [0, 2.62, -D + 0.1], rotation: 0,
    tint: 1.0, rough: 0.3, emis: 3.0,
    door: null,
  },
  // ——— the easel: the way into the paintings ———————————————————————
  {
    id: 'easel', file: 'easel.glb',
    height: 1.62, position: [-2.55, 0, -1.5], rotation: 38,
    tint: 0.7, rough: 0.6,
    door: 'THE PAINTINGS',
    // Slot measured off the mesh: its Z-facing vertices cluster at z ≈ 0.08,
    // spanning x -0.49…0.43 and y -0.50…0.64. The plane sits just proud of
    // that and is inset from the stretcher bars.
    canvas: { art: '/art/tex/rosetta.jpg', x: -0.03, y: 0.09, z: 0.115, w: 0.72, h: 0.90 },
  },
  // ——— dressing ————————————————————————————————————————————————————
  // These three stand on their own surfaces off the bench, so they get a
  // shelf height of their own rather than WORKTOP.
  {
    id: 'orrery', file: 'orrery.glb',
    height: 0.44, position: [2.15, 0.86, -1.1], rotation: -14,
    tint: 0.8, rough: 0.4, door: null,
  },
  {
    id: 'apothecary', file: 'apothecary.glb',
    height: 0.34, position: [2.62, 0.86, -0.35], rotation: -30,
    tint: 0.85, rough: 0.35, door: null,
  },
  {
    id: 'candelabra', file: 'candelabra.glb',
    height: 0.78, position: [-2.15, 0.86, -0.5], rotation: 12,
    tint: 0.75, rough: 0.6, emis: 2.4, door: null,
  },
  {
    id: 'plant', file: 'plant.glb',
    height: 0.95, position: [W - 0.95, 0, -D + 0.85], rotation: -40,
    tint: 0.8, rough: 0.6, door: null,
  },
];

/** Practical lights, placed to match the props that appear to emit.
 *  A prop with an emissive map looks lit; it does not LIGHT anything. These
 *  are what actually put the prop's colour onto the walls around it. */
// The first render came back almost entirely magenta: the console screen was
// the closest source to the bench AND the strongest, so it painted the timber,
// the sitter's whole field of view and both side walls pink. A screen lights
// the desk in front of it and very little else — hence the short throw here.
// The candelabra is now the room's dominant source, which is what makes the
// timber read as timber.
export const PRACTICALS = [
  // the neon sign, throwing red across the back wall
  { color: '#c41230', intensity: 4.4, distance: 5.4, position: [0, 2.62, -D + 0.35] },
  // the console screen. Amber now, not magenta: the new machine's mandala is
  // warm, and the old magenta was fighting the neon for the whole room.
  { color: '#d4a030', intensity: 0.85, distance: 1.9, position: [-0.05, WORKTOP + 0.62, -0.2] },
  // COOL RIM on the machine. With only the amber screen on it, a brass-and-
  // iron body lit warm from the front reads as a solid gold lamp — it lost the
  // blackened iron of the reference entirely, and got worse as the machine got
  // bigger. This sits behind and above it, so it catches the top edges and the
  // shoulders and separates the silhouette from the wall. Warm key, cool rim:
  // the oldest trick there is, and the reason the reference photo has depth.
  { color: '#2e9fd4', intensity: 3.2, distance: 3.4, position: [0.35, 1.95, -1.5] },
  // the monitor bank, faint green wash on the stone behind it
  { color: '#4a8f6f', intensity: 1.5, distance: 3.0, position: [-2.42, 1.5, -D + 0.5] },
  { color: '#4a8f6f', intensity: 1.5, distance: 3.0, position: [2.42, 1.5, -D + 0.5] },
  // the candelabra: the warm anchor, and the only thing casting real shadow
  { color: '#ffb46b', intensity: 6.5, distance: 6.0, position: [-2.15, 1.5, -0.5] },
  // the radio dial, a small amber pool on the bench
  { color: '#d4a030', intensity: 0.7, distance: 1.1, position: [0.78, WORKTOP + 0.12, -0.16] },
] as const;
