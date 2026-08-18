# Baseline — 17 August 2026, corrected 18 August

The numbers the next ninety days get measured against. Taken before any
optimisation work, deliberately, because "it feels faster" is not a claim
anyone can check.

Reproduce with:

```bash
npm run dev &
node tools/asset-forge/baseline.mjs --out=docs/baseline.json
```

---

## What ships

| | Files | Size |
|---|---:|---:|
| Prop meshes (`public/models`, Draco + WebP) | 12 | **7.55 MB** |
| Draco decoder (`public/draco`) | 3 | 745 KB |
| Client JavaScript (`.next/static`) | 27 | 2.77 MB |
| **Blocking before the room can draw** | | **8.28 MB** |
| Artwork (`public/art`) | 56 | **92.96 MB** |

## At runtime

| | |
|---|---|
| **Render passes per frame** | **23** |
| Draw calls per frame | **139** |
| Triangles per frame | **2,807,921** |
| Geometries | 35 |
| Textures | 95 |
| Shader programs | 22 |
| First frame | 4,966 ms *(software renderer — see below)* |

> **Corrected 18 August.** The first version of this table read
> **34 draw calls / 368,959 triangles**. Those numbers were wrong, and the
> section below explains how.



---

## The instrument was wrong, and here is how

The original figures came from `PerfProbe`, which read `gl.info.render` inside a
`useFrame` callback. `info.render` is **cleared at the start of every
`renderer.render()` call**, and this room renders about twenty-three times per
frame — the scene, twelve shadow cube faces, and each pass of the post chain.
Sampling it from one callback therefore reads whichever render happened to go
last.

For a while that was the scene, and the table said 34 / 368,959. Once the
composer was in place it became the final fullscreen blit, and the same tool,
unchanged, reported **1 draw call and 1 triangle** for a room drawing millions.
Both readings were the instrument catching a different moment, not the room
changing.

The fix: `gl.info.autoReset` is switched off and the probe resets the counters
itself, once per frame, immediately after sampling. Each sample is now the
complete cost of the frame that just finished — scene, shadows and post —
regardless of what ran in what order. Two consecutive runs then returned
139 / 2,807,921 **identical to the triangle**, which is what a real measurement
looks like and what the old one never did.

This is the second time this project has been steered by a broken instrument,
after four months of grading a room against an exposure bug. It will not be the
last. **Every number in this document was taken twice, and the ones that are
not reproducible are named as such.**

---

## Read these, ignore those

This harness runs **SwiftShader**: software rasterisation on a CPU, at roughly
0.4 frames per second. Its frame times and first-frame figure describe the test
machine and nothing else, and must never be quoted as the room's performance.

What is portable — properties of the scene rather than of the machine drawing
it — is everything else: draw calls, triangles, geometry and texture counts,
shader programs, and every byte figure above. Those are the same on a laptop as
they are here.

Real frame rates need real hardware, and that is the one measurement this
project cannot take for itself. It is on the day-90 soak list for that reason.

---

## What the numbers actually say

**93 MB of artwork is the biggest number here and the least visible.** Only one
image is currently used in the room — the painting on the easel — but the whole
folder deploys. Individual pieces run to 7.6 MB (`wall-texture-equations.png`),
7.4 MB (`rosetta.jpg`), 6.7 MB (`wall-137-sanskrit.png`). These are
source-resolution files sitting in a public directory.

That is fine today and fatal at day 30, because THE PAINTINGS is the door being
built first and it is made entirely of these. A gallery that serves four 7 MB
JPEGs has spent 30 MB before anyone has seen a second painting. The
`public/art/tex/` subfolder is already web-sized — 28 files, 12 MB total — and
is the pattern the rest should follow.

**8.28 MB blocks the first frame.** The meshes and the Draco decoder both have
to arrive before anything can be drawn at all. That is the number the staged
loader has to attack: room shell first, console second, everything else behind
them. Right now it is all-or-nothing.

**23 render passes per frame is the number that matters, and 12 of them are
shadows.**

`three` gives a point light an omnidirectional shadow, which is a **cube map —
six renders of the scene, per light, per frame**. Two practicals carry
`casts: true` (the desk lamp and the candelabra), so twelve of the twenty-three
passes exist to produce two shadows. The main scene is one pass; the rest is
the post chain.

That is why the per-frame triangle count is 2.8 M against a scene that contains
369 k. The room is not drawn once. It is drawn about eight times, most of them
into shadow maps.

**The obvious lever, not yet pulled:** a `spotLight` casts a single 2-D shadow
map — one render instead of six. Both shadow-casters here are directional in
character (a lamp pointing down at the worktop, a candelabra washing one
corner), so converting them would take the frame from 23 passes to about 13 for
very little visual change. That is a look decision as much as a performance one
and it is not being made unilaterally, but it is the single biggest lever in the
room and it should be measured on real hardware before anyone spends a day on
anything else.

**Geometry itself is still not the problem.** 369 k triangles in one pass is
fine. Drawing it eight times is the thing worth looking at.

**95 textures against 12 props is high.** Each prop carries base colour, normal
and metallic-roughness, which is 36 for the props themselves; the room's
procedural canvases and their derived normal maps account for more. Worth an
audit before it grows, not urgent.

**One 8.3-second frame** appeared in the first run — a compile-and-upload stall
at startup. On this renderer that is expected. On real hardware it is the thing
a staged loader exists to hide, and the reason the loader is a day-5 task
rather than a day-72 one.

---

## What this changes in the plan

1. **Image pipeline moves ahead of THE PAINTINGS**, not after it. Serving the
   gallery from 7 MB source files would make the first finished door the
   slowest thing on the site.
2. **The staged loader has a target**: 8.28 MB is what it has to break into
   something that reveals a room progressively rather than all at once.
3. **Geometry optimisation is not needed yet.** Do not spend days on triangle
   counts that are already fine.
