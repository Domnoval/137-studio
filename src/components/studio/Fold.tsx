'use client';

// THE FOLD. Every way out of this room is the same move, and the move is not
// a camera move.
//
// Michael's description, and the constraint that makes it work: "you don't
// actually move at all. The perspective change is — take the view, chop it up
// into pieces, and each one of those pieces is a plane on a truncated
// dodecahedron, and it quickly shifts and it's all seamless, and then boom
// you're looking at the paintings."
//
// So the seated view never travels. What breaks is the IMAGE.
//
// ── THE IDENTITY PROBLEM ────────────────────────────────────────────────────
//
// The whole effect lives or dies on frame zero. If the first frame of the fold
// is even slightly not the frame that preceded it — a pixel of drift, a
// filtering seam, a half-stop of exposure — the illusion is over before it
// starts, because the viewer sees a cut. It has to be provably identical and
// then break.
//
// The trick is a dodecahedron with the camera INSIDE it. Twelve pentagons
// around a point tile the entire sphere, so they tile the entire view with no
// gaps. Texture them by projecting the frozen frame from the frozen camera and
// every fragment samples the texture at its own screen position — which is the
// definition of "the same image". Identity by construction, not by tuning.
//
// The subtlety is where the perspective divide happens. Screen position is a
// PROJECTIVE function of world position, and the rasteriser's perspective-
// correct interpolation reproduces functions that are LINEAR in world space.
// Interpolate per-vertex screen UVs and you get a smooth, plausible, wrong
// answer that bends across every pentagon. Clip coordinates, though, are a
// linear transform of homogeneous world position — so they interpolate
// exactly. Carry the clip coordinate as a varying, divide by w in the
// FRAGMENT shader, and the result is exact to the pixel.
//
// That is why the shader below carries `aRest` (each vertex's world position
// at freeze time, which never changes as the shard flies) rather than a uv.
//
// ── WHY IT RENDERS ITSELF ───────────────────────────────────────────────────
//
// The captured frame is already graded — it came off the canvas after the
// composer ran. Putting these shards in the main scene would send them through
// SSAO, bloom, AgX and a vignette a second time, and a twice-graded image is
// visibly not the image. So the fold owns a private scene and draws itself
// after the composer, straight to the canvas. Nothing in the chain touches it.

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** Total length of the move, seconds. Long enough to read as a place turning
 *  itself inside out, short enough that it never becomes a loading screen —
 *  the reference is a cut in a film, not a transition in a slide deck. */
export const FOLD_SECONDS = 1.55;

/** The twelve pentagons of a dodecahedron, as flat arrays of 5 vertex indices.
 *
 *  Lifted off three's own DodecahedronGeometry rather than hand-typed. Its
 *  index list is 36 triangles in face order, three per pentagon, fanned from a
 *  shared first vertex — so triangles (a,b,c) (a,c,d) (a,d,e) reconstruct the
 *  pentagon a,b,c,d,e exactly. Deriving it means the shell cannot drift out of
 *  agreement with three's own solid if either changes. */
function dodecahedronFaces() {
  const t = (1 + Math.sqrt(5)) / 2;
  const r = 1 / t;
  const v = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
    [0, -r, -t], [0, -r, t], [0, r, -t], [0, r, t],
    [-r, -t, 0], [-r, t, 0], [r, -t, 0], [r, t, 0],
    [-t, 0, -r], [t, 0, -r], [-t, 0, r], [t, 0, r],
  ];
  const idx = [
    3, 11, 7, 3, 7, 15, 3, 15, 13,
    7, 19, 17, 7, 17, 6, 7, 6, 15,
    17, 4, 8, 17, 8, 10, 17, 10, 6,
    8, 0, 16, 8, 16, 2, 8, 2, 10,
    0, 12, 1, 0, 1, 18, 0, 18, 16,
    6, 10, 2, 6, 2, 13, 6, 13, 15,
    2, 16, 18, 2, 18, 3, 2, 3, 13,
    18, 1, 9, 18, 9, 11, 18, 11, 3,
    4, 14, 12, 4, 12, 0, 4, 0, 8,
    11, 9, 5, 11, 5, 19, 11, 19, 7,
    19, 5, 14, 19, 14, 4, 19, 4, 17,
    1, 12, 14, 1, 14, 5, 1, 5, 9,
  ];
  const faces: THREE.Vector3[][] = [];
  for (let f = 0; f < 12; f++) {
    const g = idx.slice(f * 9, f * 9 + 9);
    // a,b,c from the first triangle; d and e are the third vertex of the
    // second and third triangles of the fan.
    for (const ring of [[g[0], g[1], g[2], g[5], g[8]]]) {
      faces.push(ring.map((i) => new THREE.Vector3(...v[i]).normalize()));
    }
  }
  return faces;
}

const VERT = /* glsl */ `
  attribute vec3 aRest;
  uniform mat4 uFrozenViewProj;
  // The shell's own transform AT THE MOMENT OF CAPTURE. aRest is a vertex's
  // position in the shell's local frame, and the shell is then placed on the
  // camera and spun during the fold — so without this the rest positions get
  // projected as if the shell sat at the world origin, every uv lands outside
  // 0..1, and twelve pentagons sample the clamped edge of the frame.
  uniform mat4 uRestToWorld;
  // The shell's own transform AT THE MOMENT OF CAPTURE. aRest is a vertex's
  // position in the shell's local frame, and the shell is then placed on the
  // camera and spun during the fold — so without this the rest positions are
  // projected as if the shell sat at the world origin, every uv lands outside
  // 0..1, and twelve pentagons sample the clamped edge of the frame. The
  // symptom is a black shell with the rim lighting still working perfectly,
  // which reads as "the capture failed" and is not.
  uniform mat4 uRestToWorld;
  varying vec4 vProj;
  varying vec2 vLocal;
  attribute vec2 aLocal;

  void main() {
    // The frozen frame's clip coordinate for THIS vertex's rest position.
    // Linear in homogeneous world space, so the rasteriser interpolates it
    // exactly; the divide happens per-fragment, below.
    vProj = uFrozenViewProj * uRestToWorld * vec4(aRest, 1.0);
    vLocal = aLocal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uFrame;
  uniform float uEdge;     // how lit the fracture edges are, 0..1
  uniform float uFade;     // shard opacity
  uniform vec3  uEdgeColor;
  varying vec4 vProj;
  varying vec2 vLocal;

  void main() {
    vec2 uv = (vProj.xy / vProj.w) * 0.5 + 0.5;
    vec3 col = texture2D(uFrame, uv).rgb;

    // A thin lit rim along each shard's border. Nothing about a real fracture
    // is a hairline — light gets into the break — and without this the pieces
    // read as a grid laid over the picture instead of as the picture coming
    // apart. vLocal is the shard's own 0..1 radial coordinate, so the rim
    // follows the pentagon rather than the screen.
    float d = 1.0 - smoothstep(0.86, 1.0, length(vLocal));
    float rim = (1.0 - d) * uEdge;
    col = mix(col, uEdgeColor, clamp(rim, 0.0, 1.0));

    gl_FragColor = vec4(col, uFade);
    #include <colorspace_fragment>
  }
`;

type Rig = {
  /** Allocated lazily at the first capture, and only then, because it has to
   *  match the drawing buffer exactly. */
  frame: THREE.FramebufferTexture | null;
  material: THREE.ShaderMaterial;
  shards: Shard[];
  scene: THREE.Scene;
  group: THREE.Group;
};

type Shard = {
  mesh: THREE.Mesh;
  /** Outward direction of this pentagon — its own face normal. */
  dir: THREE.Vector3;
  /** Distance from the shell's centre to this pentagon's centroid — the
   *  inradius, not the circumradius the vertices sit on. */
  rest: number;
  /** Per-shard tumble axis and phase, so twelve pieces do not move as one. */
  axis: THREE.Vector3;
  delay: number;
};

/**
 * Builds the shell. Each pentagon becomes its own mesh so it can fly on its
 * own, and each is modelled about its OWN centroid — a shard that rotates
 * about the world origin swings like a door, a shard that rotates about its
 * centre tumbles like a piece of something broken.
 */
function buildShards(radius: number, material: THREE.ShaderMaterial): Shard[] {
  return dodecahedronFaces().map((ring, i) => {
    const world = ring.map((p) => p.clone().multiplyScalar(radius));
    const centre = world
      .reduce((a, p) => a.add(p), new THREE.Vector3())
      .divideScalar(world.length);

    const pos: number[] = [];
    const rest: number[] = [];
    const local: number[] = [];
    // Fan the pentagon from its centroid: five triangles rather than three,
    // which keeps every triangle fat. Long thin fan triangles are where
    // interpolation error would show first if any crept in.
    for (let k = 0; k < world.length; k++) {
      const a = world[k];
      const b = world[(k + 1) % world.length];
      for (const [p, l] of [
        [centre, [0, 0]],
        [a, [1, 0]],
        [b, [0, 1]],
      ] as [THREE.Vector3, number[]][]) {
        // Local coordinates are relative to the centroid; the mesh carries the
        // centroid as its position, so shard.rotation is about its own centre.
        pos.push(p.x - centre.x, p.y - centre.y, p.z - centre.z);
        // Rest position stays in WORLD space and never changes. This is the
        // whole identity mechanism: however far the shard flies, it keeps
        // showing the part of the frozen frame it started on.
        rest.push(p.x, p.y, p.z);
        local.push(l[0], l[1]);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aRest', new THREE.Float32BufferAttribute(rest, 3));
    geo.setAttribute('aLocal', new THREE.Float32BufferAttribute(local, 2));

    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(centre);
    mesh.frustumCulled = false;

    // Deterministic per-shard variation. Math.random() here would make the
    // fold different every time it ran, which is exactly the kind of thing
    // that reads as unpolished on the third viewing.
    const g = 2.399963; // golden angle, for an even spread of axes
    const axis = new THREE.Vector3(
      Math.cos(i * g), Math.sin(i * g * 1.7), Math.sin(i * g),
    ).normalize();

    return {
      mesh,
      rest: centre.length(),
      dir: centre.clone().normalize(),
      axis,
      // Shards nearer the centre of view go first. The break should start
      // where the eye already is, not sweep in from a corner.
      delay: (Math.abs(centre.z + radius) / (radius * 2)) * 0.16,
    };
  });
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function Fold({
  active,
  onMidpoint,
  onDone,
}: {
  /** Non-null starts the fold; the value is only used to re-trigger. */
  active: string | null;
  /** Fired once, at the point the old view has broken up enough to swap what
   *  is behind it. Swapping earlier is visible; later wastes the cover. */
  onMidpoint: () => void;
  onDone: () => void;
}) {
  // Everything mutable lives behind a ref, and the renderer is read off the
  // frame callback's own state rather than from useThree.
  //
  // React 19's immutability rule rejects assigning to properties of anything a
  // hook returned — `gl.autoClear = false`, `frame.image = {...}` — and it is
  // right to: those objects belong to r3f, not to this component. A ref is the
  // sanctioned place to keep things this component genuinely owns and mutates
  // sixty times a second, and `state.gl` inside useFrame is the renderer
  // handed to us for exactly this purpose.
  const rigRef = useRef<Rig | null>(null);

  useEffect(() => {
    const build = (): Rig => {
      const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uFrame: { value: null },
        uFrozenViewProj: { value: new THREE.Matrix4() },
        uRestToWorld: { value: new THREE.Matrix4() },
        uEdge: { value: 0 },
        uFade: { value: 1 },
        uEdgeColor: { value: new THREE.Color('#ffb46b') },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true,
      });

      // Radius is arbitrary — the shell only has to enclose the camera, and the
      // projection makes the image land the same whatever the scale. Kept small
      // so the shards' travel reads as a few metres rather than a few hundred.
      const shards = buildShards(2.6, material);
      const scene = new THREE.Scene();
      const group = new THREE.Group();
      shards.forEach((s) => group.add(s.mesh));
      scene.add(group);

      return { frame: null, material, shards, scene, group };
    };

    const rig = build();
    rigRef.current = rig;
    return () => {
      rigRef.current = null;
      rig.shards.forEach((sh) => sh.mesh.geometry.dispose());
      rig.material.dispose();
      rig.frame?.dispose();
      rig.scene.clear();
    };
  }, []);

  const clock = useRef<number | null>(null);
  const swapped = useRef(false);
  const captured = useRef(false);

  useEffect(() => {
    if (active === null) {
      clock.current = null;
      captured.current = false;
      swapped.current = false;
    } else {
      clock.current = 0;
      captured.current = false;
      swapped.current = false;
    }
  }, [active]);

  // PRIORITY 3. @react-three/postprocessing renders the composer at priority
  // 1, and r3f runs frame callbacks in ascending priority, so anything above
  // that runs with the finished frame sitting in the canvas. That is both when
  // the capture is valid and when the shards can be drawn over the top without
  // going back through the chain.
  useFrame((state, dt) => {
    const rig = rigRef.current;
    if (rig === null || clock.current === null) return;

    const { gl, camera, size } = state;
    const { material, shards, group } = rig;

    if (!captured.current) {
      // Copy the composed canvas — graded, bloomed, tone-mapped, everything —
      // into the shard texture. Capturing the raw scene instead would freeze a
      // linear image and the fold would start with a visible jump in exposure.
      //
      // A FramebufferTexture, NOT a plain Texture with its `image` field set
      // to a size. That was the first attempt and it silently produced a black
      // shell: a Texture with no data source never gets storage allocated, so
      // the copy failed with GL_INVALID_VALUE ("offset overflows texture
      // dimensions") as a console warning rather than an error, and the shards
      // dutifully sampled an empty texture. FramebufferTexture exists for
      // exactly this and allocates at construction.
      const dpr = gl.getPixelRatio();
      const w = Math.max(1, Math.floor(size.width * dpr));
      const h = Math.max(1, Math.floor(size.height * dpr));
      if (rig.frame === null || rig.frame.image.width !== w || rig.frame.image.height !== h) {
        rig.frame?.dispose();
        const tex = new THREE.FramebufferTexture(w, h);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        rig.frame = tex;
        material.uniforms.uFrame.value = tex;
      }
      gl.copyFramebufferToTexture(rig.frame);

      camera.updateMatrixWorld();
      material.uniforms.uFrozenViewProj.value
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // The shell is built around the origin, so it has to be moved onto the
      // camera and turned with it — the pentagons must surround the eye, not
      // the world.
      // World, not local. The camera is a top-level object today, so these
      // happen to be the same — but reading the world transform is the version
      // that stays correct the first time the rig gets nested inside anything.
      camera.getWorldPosition(group.position);
      camera.getWorldQuaternion(group.quaternion);
      group.scale.setScalar(1);
      group.updateMatrixWorld(true);
      material.uniforms.uRestToWorld.value.copy(group.matrixWorld);

      captured.current = true;
    }

    // CLAMPED, like the camera rig's look damping and for the same reason. dt
    // is real elapsed time, so one long frame — a GC pause, a tab that lost
    // focus, a slow machine mid-shader-compile — advances the fold by a huge
    // step and the viewer is simply teleported past the thing they clicked
    // for. Measured on the headless rig, where the first frame after a click
    // arrives with dt near 0.65 s and the whole 1.55 s transition finishes in
    // two frames. At 60 Hz this ceiling is never reached; below about 20 fps
    // the fold stops being a fixed duration and becomes a fixed number of
    // frames, which is the right trade — better slightly slow than skipped.
    clock.current += Math.min(dt, 0.05);
    const t = clamp01(clock.current / FOLD_SECONDS);

    if (!swapped.current && t > 0.42) {
      swapped.current = true;
      onMidpoint();
    }

    // The whole shell turns, which is the "change of perspective" — the eye
    // stays put and the world rotates around it.
    const spin = easeInOut(t) * Math.PI * 0.62;
    group.rotateOnAxis(new THREE.Vector3(0.18, 1, 0.1).normalize(), spin * dt * 1.4);

    for (const s of shards) {
      const local = clamp01((t - s.delay) / (1 - s.delay));
      const e = easeInOut(local);
      // Out along the shard's own normal: the shell inflates rather than
      // exploding from a point, so the image stays legible while it comes
      // apart instead of instantly becoming confetti.
      // From the pentagon's OWN centroid radius, not the circumradius. The
      // geometry is modelled about that centroid, so starting anywhere else
      // shifts every face off its neighbours and opens twelve hairline gaps
      // in what is supposed to be a seamless image.
      s.mesh.position.copy(s.dir).multiplyScalar(s.rest + e * e * 7.5);
      s.mesh.quaternion.setFromAxisAngle(s.axis, e * e * 2.1);
      s.mesh.scale.setScalar(1 + e * 0.12);
    }

    // Edges light up as the break opens, then everything goes. Fade starts
    // late so the destination is already established behind the pieces.
    material.uniforms.uEdge.value = Math.sin(clamp01(t / 0.55) * Math.PI) * 0.30;
    material.uniforms.uFade.value = 1 - clamp01((t - 0.55) / 0.45) ** 1.6;

    const wasAutoClear = gl.autoClear;
    gl.autoClear = false;
    // Depth only: the composed frame is already in the colour buffer and is
    // what the shards are flying away from.
    gl.clearDepth();
    gl.render(rig.scene, camera);
    gl.autoClear = wasAutoClear;

    if (t >= 1) {
      clock.current = null;
      onDone();
    }
  }, 3);

  return null;
}
