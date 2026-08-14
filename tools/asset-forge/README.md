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
