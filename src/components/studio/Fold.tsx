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
// ── WHERE THE FROZEN FRAME COMES FROM ───────────────────────────────────────
//
// The first design copied the CANVAS with copyFramebufferToTexture, after the
// composer had run, so the capture was already graded and the shards could be
// drawn straight over the top without going back through the chain. It is the
// theoretically perfect version — a byte-identical freeze — and it could not
// be made to work. The copy returned black through a plain Texture (no storage
// allocated), through a FramebufferTexture (correct storage, still black), and
// through an explicit READ_FRAMEBUFFER rebind aimed at postprocessing's
// blitFramebuffer leaving its own binding in place. Measured at 6x gain the
// result was mean 0.1/255 every time.
//
// So the frame is RENDERED rather than copied: one extra pass of the scene
// into a render target this component owns, at the instant the fold starts.
// No framebuffer read semantics, no preserveDrawingBuffer, no dependence on
// what postprocessing left bound. It cost one draw of the room, once.
//
// The consequence is that the capture is now scene-referred and UNGRADED, so
// the shards have to live in the main scene and be graded by the composer like
// everything else — grade the frozen frame once, exactly as it would have been
// graded. Bloom, chromatic aberration, vignette and AgX are screen-space
// functions of colour, so they land identically. SSAO is the one exception: it
// reads scene depth and normals, so at t=0 the shell gets a smooth dodecahedron's
// occlusion rather than the room's. That is a soft difference in contact
// shadowing, not a cut, and it is the price of a capture that actually works.

import { useEffect, useMemo, useRef } from 'react';
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

    // NO colorspace conversion. uFrame is now a scene-referred linear render
    // target, and this pass feeds the composer, which expects linear input and
    // does the display conversion itself at the end of the chain. Converting
    // here would grade the frame twice.
    gl_FragColor = vec4(col, uFade);
  }
`;

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

/** Allocated once — a fresh Vector3 per frame per fold is exactly the kind of
 *  churn that shows up as a hitch during the one moment that must not hitch. */
const SPIN_AXIS = new THREE.Vector3(0.18, 1, 0.1).normalize();

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
  // The shell is built once and rendered as ordinary scene children, so the
  // composer grades it along with everything else — see the note at the top of
  // this file for why the frozen frame is rendered rather than copied.
  //
  // Mutated with METHOD CALLS only (`.copy`, `.setScalar`, `.setFromAxisAngle`).
  // React 19's immutability rule rejects assigning to properties of a value a
  // hook returned, and useMemo's result is one; `group.visible` therefore goes
  // through the ref below, which is the sanctioned mutable handle.
  const rig = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uFrame: { value: null as THREE.Texture | null },
        uFrozenViewProj: { value: new THREE.Matrix4() },
        uRestToWorld: { value: new THREE.Matrix4() },
        uEdge: { value: 0 },
        uFade: { value: 1 },
        uEdgeColor: { value: new THREE.Color('#ffb46b') },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });

    // HalfFloat, because this holds a scene-referred render and the room's
    // practicals and emissive props run well past 1.0. An 8-bit target would
    // clip every highlight in the frozen frame and the fold would start by
    // blowing out the neon.
    const target = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      samples: 0,
    });
    material.uniforms.uFrame.value = target.texture;

    // Radius is arbitrary — the shell only has to enclose the camera, and the
    // projection makes the image land the same whatever the scale. Kept small
    // so the shards' travel reads as a few metres rather than a few hundred.
    const shards = buildShards(2.6, material);
    return { material, target, shards };
  }, []);

  useEffect(() => {
    const owned = rig;
    return () => {
      owned.shards.forEach((sh) => sh.mesh.geometry.dispose());
      owned.material.dispose();
      owned.target.dispose();
    };
  }, [rig]);

  // The same objects, reached through a ref so they can be driven per frame.
  // React 19 tracks useMemo's result as owned-by-the-hook and rejects even
  // `material.uniforms.x.value = …` through it; a ref is the sanctioned handle
  // for state a component genuinely owns and mutates sixty times a second.
  // Same objects, two doors: the memo renders them, the ref drives them.
  const rigRef = useRef(rig);
  const groupRef = useRef<THREE.Group>(null);
  const clock = useRef<number | null>(null);
  const swapped = useRef(false);
  const captured = useRef(false);

  useEffect(() => {
    clock.current = active === null ? null : 0;
    captured.current = false;
    swapped.current = false;
    // Hidden until a fold actually starts, so twelve pentagons are not sitting
    // around the camera every frame of ordinary use.
    if (groupRef.current) groupRef.current.visible = active !== null;
  }, [active]);

  // Priority 0, which runs BEFORE the composer at priority 1 — the shards have
  // to be animated and in place before the frame that draws them. (r3f still
  // skips its own render because the composer claims a priority above zero.)
  useFrame((state, dt) => {
    const group = groupRef.current;
    if (group === null || clock.current === null) return;

    const { gl, camera, scene, size } = state;
    const { material, target, shards } = rigRef.current;

    if (!captured.current) {
      const dpr = gl.getPixelRatio();
      const w = Math.max(1, Math.floor(size.width * dpr));
      const h = Math.max(1, Math.floor(size.height * dpr));
      target.setSize(w, h);

      // Render the room into our own target, with the shell hidden so it
      // cannot photograph itself. One extra pass of the scene, once, at the
      // moment the fold begins.
      group.visible = false;
      const prev = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.render(scene, camera);
      gl.setRenderTarget(prev);
      group.visible = true;

      camera.updateMatrixWorld();
      material.uniforms.uFrozenViewProj.value
        .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

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
    // two frames. At 60 Hz this ceiling is never reached.
    clock.current += Math.min(dt, 0.05);
    const t = clamp01(clock.current / FOLD_SECONDS);

    if (!swapped.current && t > 0.42) {
      swapped.current = true;
      onMidpoint();
    }

    // The whole shell turns, which is the "change of perspective" — the eye
    // stays put and the world rotates around it.
    const spin = easeInOut(t) * Math.PI * 0.62;
    group.rotateOnAxis(SPIN_AXIS, spin * dt * 1.4);

    for (const s of shards) {
      const local = clamp01((t - s.delay) / (1 - s.delay));
      const e = easeInOut(local);
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

    if (t >= 1) {
      clock.current = null;
      group.visible = false;
      onDone();
    }
  });

  return (
    <group ref={groupRef} visible={false} frustumCulled={false}>
      {rig.shards.map((s, i) => (
        <primitive key={i} object={s.mesh} />
      ))}
    </group>
  );
}
