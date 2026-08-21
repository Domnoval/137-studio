# Asset Forge

Prompt → textured PBR mesh → compressed, engine-ready GLB. This is how every
prop in `public/models/` was built.

## The pipeline

1. **Source image.** Single object, floating in pure black — *no ground, no
   table, no plinth, no shadow*. Anything the object touches gets fused into
   the mesh permanently. Name materials as matte and rough explicitly; the
   bake lifts dark surfaces toward pale and glossy regardless, and saying so
   up front reduces how far.

2. **A rear view to match.** Same object, same wording, described from behind.

3. **Reconstruct.** Both images into `multi_image_to_3d` with `should_texture`,
   `should_remesh` and `enable_pbr` on. Returns base colour, metallic-roughness,
   normal and emissive maps.

   Single-image reconstruction is a fallback for dressing that is only ever
   seen from one side. It invents the back, and it will fuse a supporting
   surface into the object if the source has one.

4. **Grade at load.** Per-prop base-colour multiplier and roughness floor
   (`GRADES` in `render.mjs`) to undo the bake's lift. Emissive boost is
   opt-in — these bakes give the whole prop one material, so boosting anything
   with an emissive map torches props whose only bright pixels are a white
   canvas or a pale label.

5. **Compress.** ~22× for ~3% of triangles, visually indistinguishable:

   ```
   npx @gltf-transform/cli@4 optimize in.glb out.glb \
     --texture-compress webp --texture-size 1024 --compress draco
   ```

## Reviewing a prop

```bash
# one-time: three.js needs to be reachable from the viewer
mkdir -p tools/asset-forge/vendor
cp -r node_modules/three/build     tools/asset-forge/vendor/build
cp -r node_modules/three/examples/jsm tools/asset-forge/vendor/jsm

cp public/models/*.glb tools/asset-forge/
cd tools/asset-forge && python3 -m http.server 8137 --bind 127.0.0.1 &
node render.mjs ./out radio.glb console.glb
```

Each prop renders in three passes: **studio** (neutral three-point — judges
form and material honestly), **room** (the 137 palette as practicals — judges
whether it belongs), and **wireframe** (topology, with nothing to hide behind).

The room pass is the one that decides. A prop can look superb on a neutral
turntable and wrong the moment it sits in red light.

## What this pipeline cannot do

Thin, self-occluding clusters do not reconstruct — a leaning stack of canvases
came back as an incoherent box. Reconstruction needs a single solid subject.
Cables, stacked paper, hanging cloth and the canvas stack get built
procedurally in the engine instead, where the arrangement is controllable and
the artwork can be swapped per frame.

## measure.mjs — exposure audit

```
node tools/asset-forge/measure.mjs <dir> [<dir> …]
```

Reads every PNG in a render directory and reports a Rec. 709 luminance
profile: mean, 5th/50th/95th percentile, and three fractions that matter more
than any of them — `crushed` (below 8/255, where an 8-bit frame stops carrying
recoverable detail), `mids` (40–200, the band where texture and material
actually read) and `blown` (above 250).

Zero dependencies; it inflates the PNG and undoes the scanline filters itself.

**Why this exists.** The room was graded by eye for months against a broken
render and every judgement made in that time was worthless. The numbers said
what no amount of looking had: median 11/255, **41% of every frame below
8/255**, only 15% of it in the midtones. Not "moody" — *missing*. Point this at
a render before forming an opinion about it.

Targets for a deliberately dark, practical-lit interior:

| metric  | want      | before | after |
|---------|-----------|--------|-------|
| median  | 45–75     | 11     | 44    |
| crushed | under 15% | 40.9%  | 10.7% |
| mids    | over 45%  | 14.8%  | 53.6% |
| blown   | under 1%  | 0.01%  | 0.02% |

Pair it with `room.mjs`, which can shoot the same frame under every tone curve
in one pass via `--url='http://localhost:3000/studio?tm=agx|aces|neutral|none'`.
