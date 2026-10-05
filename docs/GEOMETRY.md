# /geometry — Sacred Geometry Studio

Eleven constructions drawn step by step, in plan, axonometric and one-, two- and three-point
perspective. Every view is shareable as a link, can be run as an installation, and exports at real
size for print, pen plotter or hand-cut stencil.

It began as a single-file Claude artifact and was ported to this repo as typed TypeScript. See
**Parity** for the state of the port's verification against the original.

## The eleven constructions

Seed of Life · Flower of Life · Metatron's Cube (2D and 3D) · the five Platonic solids ·
Vesica Piscis · Nine-fold Yantra. Hexagonal figures run on √3, pentagonal ones (dodecahedron,
icosahedron) on φ. The φ overlay (whirling squares and spiral) exists only for the pentagonal pair.

## For users

| Control | What it does |
| --- | --- |
| `←` `→` | Step through the construction |
| `Space` | Play / pause the build |
| `[` `]` | Previous / next figure |
| `P` | **Present**: fullscreen installation loop through all eleven figures (Space pauses, `←` `→` skip, Esc exits) |
| `S` | Open the **Studio** drawer |
| `Ctrl/⌘ Z`, `Ctrl/⌘ ⇧ Z` | Undo / redo (100 steps) |

Shortcuts step aside for everything else: they are ignored with `Alt`, `Ctrl/⌘` (except undo) or
`Shift` held, while a key is held down (no repeat), and inside the Studio drawer or any form field,
so browser history, native text undo and screen-reader chords keep working.
| Drag the canvas | Rotate and tilt (with inertia). Drag the horizon / VP handles in perspective |
| **Link** | Copies a URL that restores exactly this drawing |
| **Sound** (Resonance) | Opt-in. Off until clicked |

### Share links

The state lives in the URL hash. Only values that differ from the defaults are written.

```
/geometry#p=flower&s=20&v=axon&mi=1
```

| Key | Meaning | Range / values |
| --- | --- | --- |
| `p` | figure | `seed flower metatron metatron3d tetrahedron cube octahedron dodecahedron icosahedron vesica yantra` |
| `s` | step | 1 … that figure's step count |
| `v` | view | `plan axon perspective` |
| `n` | perspective points | 1, 2, 3 |
| `u` | primitive set | `flat solid` (default follows the figure) |
| `rot` `tilt` `depth` `w` | rotation, tilt, Z depth, line weight | −180…180, 0…72, 0…100, 0.6…3.4 |
| `h` `x1` `xl` `xr` `x3` `y3` | horizon and vanishing points | 70…630 / 35…865 |
| `g c mi dk pl phi dim mv fr` | toggles: guides, centres, mirror, ink accent, perspective lines, φ, dimensions, plan study, fruit circles | `0` / `1` |
| `theme` | `void` (default) or `paper` | |
| `present` | `1` opens straight into Present mode | |

Decoding is defensive: unknown keys are ignored and every number is clamped, so a stale or
hand-edited link can't wedge the app (`src/lib/geometry/share.ts`).

### Studio (print, plotter, stencil)

Everything is derived from the figure on screen and fitted to a real sheet (A3 → 2A0, 18×24 in →
4×8 ft, walls, or custom).

- **Print**: layered vector at true size, pen widths in mm. Opens in Illustrator, Inkscape, Affinity.
- **Plotter**: one path per stroke, a numbered layer per pen, overlapping chords merged so no line
  is drawn twice, strokes ordered to keep pen-up travel short. Works with AxiDraw layer mode.
- **Stencil**: one sheet per layer; lines become slots of the width you set, with bridges across
  long slots and registration crosses in the corners. **Check the preview before you cut.** A bridge
  only helps where there is room for one: where two crossings sit closer together than the slot
  width (dense chord webs such as Metatron's Cube at a small sheet size, or a wide slot), a small
  piece can still be left floating free. This was found by flood-filling the rasterised output; the
  Studio says so in its stats line rather than promising otherwise. Narrow the slot or enlarge the
  sheet.
- **Tiling**: split a big piece onto Letter / A4 / Tabloid / A3 / 24×36 Mylar with overlap and
  shared registration crosses.
- PNG (screen 4×, or print at 150/300/600 dpi) and SVG. Print PNGs are capped at 80 megapixels
  (the original allowed 240 MP, which at the default 48 in sheet asked the browser for an ~830 MB
  canvas); above that the toast points you to the vector SVG, which is exact at any size.

Studio settings persist in `localStorage` (`sg-studio`) and are validated on load: numbers are
clamped to what the fields allow, enums and colours matched exactly, anything else falls back to the
default. Tiling is refused above 1000 sheets (every tile embeds the figure) and the overlap can never
exceed half a sheet, because an overlap that equals the printable width makes the grid never advance.

### Present mode

The chrome falls away, the canvas fills the screen, and the figures build themselves in turn,
holding at completion before the next. The screen wake lock is requested so a projector doesn't
sleep. On exit the user's own view is restored exactly. Honors `prefers-reduced-motion` (no
auto-rotation). To hand someone an installation link, append `&present=1` to any share link.

### Resonance (sound)

Opt-in; never plays until the Sound chip is clicked. Root is **137 Hz**. Tuning follows the
symmetry family of the figure; see the header of `src/lib/geometry/resonance.ts` for the exact
ratio tables:

- hexagonal figures walk a spiral of pure fifths (3-limit);
- cubic figures (tetrahedron, cube, octahedron) climb the harmonic series;
- pentagonal figures (dodecahedron, icosahedron) take Fibonacci ratios, converging on φ;
- completion sounds a chord, and for each Platonic solid it is the chord of its V : E : F.

## For developers

```
src/app/geometry/page.tsx            route + metadata (server component)
src/components/geometry/
  GeometryStudio.tsx                 static shell (never re-renders), ids are the contract
  geometry.css                       all styles, scoped under .sg-root; themes: void | paper
src/lib/geometry/
  catalog.ts     figure metadata: titles, notes, step counts, named phases
  state.ts       State type, defaults, undo snapshot keys
  polyhedra.ts   the five solids (edges discovered by minimum pairwise distance)
  painter.ts     projection + every construction + overlays → SVG layers
  engine.ts      controller: wires the shell to everything below, returns a cleanup fn
  studio.ts      PURE output maths: print / plotter / stencil / tiling / zip
  studio-panel.ts  the Studio drawer UI (harvests geometry from a detached paint)
  present.ts     installation loop
  share.ts       hash codec
  resonance.ts   Web Audio sound layer (SSR-safe, lazily constructed)
  ctx.ts         shared context handed to the parts
```

Design rules worth keeping:

- **The shell is static.** `GeometryStudio` has no state or props; the engine owns every dynamic
  node through element ids. If you rename an id, rename it in `engine.ts`, `studio-panel.ts` and
  `present.ts`. React and the engine cannot disagree about the DOM because React never re-renders it.
- **`studio.ts` is pure.** No DOM, no globals: strokes in, strings and bytes out. That is what
  makes the Studio testable without a browser.
- **One painter, three uses.** The same `Painter` draws the canvas, the plan-study inset, and (at a
  higher sample density `res`) the geometry the Studio harvests, so what you export is what you see.
- **All colour comes from CSS custom properties** on `.sg-root` (`--geometry`, `--accent`,
  `--grid` …). Both themes and the exported SVGs derive from them.

### Debug hook

`window.__studio` exposes the Studio internals (`geometry`, `plotterPlan`, `stencilSheets`,
`tilePlan`, `tiles`, `zip` …). It is attached **in development only** (`NODE_ENV !== 'production'`),
so it never ships. It exists so the port could be diffed against the original artifact.

### Verification and deliberate differences from the original

What has been verified, and how (the scripts live outside the repo, in a session scratch directory,
not in the tree):

- **`studio.ts`** (the physical-output maths) was compared with the original artifact's own functions
  on synthetic geometry (Metatron's 78-chord web, a 37-circle flower lattice, polylines, fuzz and
  degenerate strokes) across page sizes, orientations and margins: 63,711 comparisons, exact equality
  on SVG strings, plotter plans, stencil slot polygons, tile files and zip bytes, plus 21 deliberate
  mutations of the port, each of which the comparison caught.
- **The whole UI** was exercised in real Chromium: stepping, undo/redo, share-link round trips
  (including hostile hashes), all three Studio downloads and both PNG paths, Present mode, sound,
  themes, keyboard rules, pointer dragging under letterboxing, and leaving and returning to the route.
- A golden-master comparison of the *painter's* rendered SVG against the original across every
  figure x step x view x toggle is the remaining open item; until its result is recorded here, treat
  `painter.ts` as ported-but-not-yet-diffed. If you change it, geometry should only ever change on purpose.

Where the port intentionally differs from the original artifact:

| Area | Original | Here | Why |
| --- | --- | --- | --- |
| Settings from `localStorage` | trusted as-is | validated and clamped | a stale or hand-edited value could hang the tiler, throw, or reach SVG markup |
| Tile overlap / count | unbounded | overlap <= half a sheet, <= 1000 tiles | overlap equal to the printable width made the grid loop forever |
| Print PNG budget | 240 MP | 80 MP | the default page asked for an ~830 MB canvas |
| Stencil claim | "nothing falls out" | states the limitation | it was not true for dense webs at small sizes |
| Registration marks | used the raw margin | use the clamped margin | on a small sheet they stacked in the middle of the drawing |
| Pointer to drawing space | assumed a 9:7 box | uses the SVG's own transform | the canvas is letterboxed, so handles jumped away from the cursor |
| Strokes | literal colours baked in | CSS token references | theme switch and the print stylesheet restyle without repainting |
