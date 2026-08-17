# Baseline — 17 August 2026

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
| Draw calls | 34 |
| Triangles | 368,959 |
| Geometries | 35 |
| Textures | 95 |
| Shader programs | 21 |
| First frame | 5,225 ms *(software renderer — see below)* |

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

**34 draw calls and 369k triangles are both healthy** and are not where any
effort should go. The room is not slow because of its geometry.

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
