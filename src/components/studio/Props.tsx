'use client';

// Loads the twelve GLBs and puts them in the room.
//
// Two things every prop needs on the way in, both consequences of how they
// were made (see tools/asset-forge/README.md):
//
//   1. SCALE. Each mesh was reconstructed from a hero image and arrives
//      normalised, with no real-world size. We measure its bounding box and
//      scale it to the physical height in studio-data.ts. Skipping this is
//      what makes generated rooms look like doll's houses.
//
//   2. GRADE. The image-to-3D bake consistently lifts dark materials toward
//      pale and glossy, so each prop carries a base-colour multiplier and a
//      roughness floor. Emissive boost is opt-in: these bakes give a prop ONE
//      material, so boosting anything with an emissive map torches props whose
//      only bright pixels are a white canvas.
//
// Materials are cloned before grading — drei caches GLTFs, so grading the
// shared material would compound every time the component remounts.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PROPS, type PropSpec } from './studio-data';

const MODEL_PATH = '/models/';

// The props are Draco-compressed (22× smaller — see tools/asset-forge). drei's
// useGLTF defaults its Draco decoder to a Google CDN, which makes the room
// unrenderable on any network that cannot reach gstatic and puts a third party
// on the critical path of the site drawing at all. The decoder is 756 KB and
// lives in /public/draco — cheaper than the models it unpacks.
const DRACO_PATH = '/draco/';

/** `?console=proxy` swaps the hero asset for the contract blockout in
 *  `tools/blender/console_proxy.py`.
 *
 *  It is here to be RUN, not to be tidy. The per-part grading in CONSOLE_PARTS
 *  below is code written against an asset that does not exist yet, and code
 *  like that is wrong until something proves otherwise — the loader's name
 *  matching, the invisible-node handling and the height normalisation all had
 *  bugs that only a real contract-shaped GLB could show. The flag means the
 *  drop-in path can be exercised on demand without the room having to look
 *  like a blockout for everyone else.
 *
 *  Read once and cached: a prop that changed file between renders would
 *  re-suspend the whole scene. */
let consoleFileCache: string | null = null;
function consoleFile(): string {
  if (consoleFileCache === null) {
    const q =
      typeof window === 'undefined'
        ? null
        : new URLSearchParams(window.location.search).get('console');
    consoleFileCache = q === 'proxy' ? 'consoleMV-proxy.glb' : 'consoleMV.glb';
  }
  return consoleFileCache;
}

function modelFile(spec: PropSpec): string {
  return spec.id === 'consoleMV' ? consoleFile() : spec.file;
}

/** Per-part grades for a console that satisfies docs/console-asset-contract.md.
 *
 *  The whole reason the console is being rebuilt is that the reconstruction
 *  fused it into one mesh with one material, and one material cannot be
 *  blackened iron AND polished brass AND glass — so it is none of them. These
 *  are the values that stop being unusable the moment the parts are separate.
 *
 *  Keyed by the contract's node names, which is why those names are an API and
 *  not a suggestion. A GLB without them falls through to the single-material
 *  path below and behaves exactly as it does today, so this can land before the
 *  asset does and simply start working when it arrives. */
const CONSOLE_PARTS: Record<string, { rough: number; metal: number; env: number; emis?: number }> = {
  // Painted cast iron: dark, but never below the 8% reflectance floor — a
  // surface that cannot return light is how this room went black for months.
  Body_Iron: { rough: 0.62, metal: 0.05, env: 0.55 },
  // Actually metal, and the only part that is. Restraint here is the whole
  // difference between "brass fittings on an iron machine" and "a gold lamp".
  Trim_Brass: { rough: 0.34, metal: 0.9, env: 1.35 },
  CRT_Bezel: { rough: 0.58, metal: 0.1, env: 0.7 },
  // The single biggest win in the rebuild. A separate glass shell can catch a
  // reflection of the room that the display behind it cannot, which is what
  // makes a CRT read as a physical object rather than a picture of one.
  CRT_Glass: { rough: 0.06, metal: 0.0, env: 1.6 },
  // Emissive, and deliberately almost blind to the environment: a screen that
  // mirrors the candles is a mirror, not a screen.
  CRT_Display: { rough: 0.6, metal: 0.0, env: 0.15, emis: 1.0 },
  Panel_Controls: { rough: 0.55, metal: 0.15, env: 0.8 },
  // Knobs are brass, and they were the one part this table forgot. The
  // contract asks for `Knob_00 … Knob_NN` as separate nodes and the proxy
  // duly supplied eight — which then graded at metalness 0.30 off the
  // single-material fallback instead of 0.90, because nothing here named
  // them. Nothing errored; the brass just quietly stopped being brass.
  // Found by reading the materials back off the running scene, which is what
  // that instrument is for. The `Knob` key matches `Knob_00` through the same
  // separator rule that makes `Trim_Brass.001` brass.
  Knob: { rough: 0.34, metal: 0.9, env: 1.35 },
};

/** Nodes that exist for the engine, not the eye. */
const INVISIBLE_NODES = new Set(['Collision_Console', 'FocusAnchor']);

/** The names above, longest first, so `Panel_Controls` is tested before any
 *  shorter name that happens to prefix it. */
const PART_NAMES = [...Object.keys(CONSOLE_PARTS), ...INVISIBLE_NODES].sort(
  (a, b) => b.length - a.length,
);

/** Resolve a node name to a contract part, tolerating the suffixes a real
 *  export produces.
 *
 *  This is not politeness, it is the difference between the asset working and
 *  not. A console has more than one piece of brass, and the moment a modeller
 *  duplicates `Trim_Brass` Blender names the copy `Trim_Brass.001` — which is
 *  not the string `Trim_Brass`, so an exact-match lookup drops it through to
 *  the single-material fallback grade and it renders as painted iron. Nothing
 *  errors. You just get a duller console than the one that was modelled, and
 *  the reason is invisible.
 *
 *  Rule: strip Blender's `.NNN` duplicate suffix, then accept a contract name
 *  if the rest of the string starts with it and the next character is a
 *  separator — so `Trim_Brass_plinth` is brass and `Trim_Brasserie` is not.
 *  tools/asset-forge/validate-console.mjs implements the same rule, and the
 *  validator reports every node it cannot resolve for exactly this reason. */
function normalisePart(raw: string): string | null {
  const name = raw.replace(/\.\d+$/, '');
  for (const p of PART_NAMES) {
    if (!name.startsWith(p)) continue;
    const next = name[p.length];
    if (next === undefined || next === '_' || next === '.') return p;
  }
  return null;
}

/** Walk up to the nearest ancestor the contract names, since a modeller may
 *  nest detail under Body_Iron rather than flattening everything. */
function contractPart(o: THREE.Object3D): string | null {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) {
    const part = normalisePart(n.name);
    if (part !== null) return part;
  }
  return null;
}

/** The painting on the easel. A separate plane rather than a texture swap:
 *  the reconstruction fuses the whole easel into one mesh with one material,
 *  so there is no canvas to re-texture — and the artwork has to be swappable
 *  anyway. Sits inside the model group, so it inherits the mesh's scale and
 *  travels with it. */
function CanvasArt({ slot }: { slot: NonNullable<PropSpec['canvas']> }) {
  // useTexture's return is the loader's cached object and not ours to mutate —
  // two props sharing a file would fight over it. Clone, then configure.
  const shared = useTexture(slot.art);
  const tex = useMemo(() => {
    const t = shared.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, [shared]);
  return (
    <mesh
      position={[slot.x, slot.y, slot.z]}
      rotation-x={((slot.tilt ?? 0) * Math.PI) / 180}
      castShadow={false}
      receiveShadow
    >
      <planeGeometry args={[slot.w, slot.h]} />
      {/* Not emissive — a painting is lit by the room, like everything else.
          envMapIntensity is held low deliberately: the environment is painted
          from this room's own practicals, and a canvas that mirrors the
          candelabra back at you stops reading as paint. */}
      <meshStandardMaterial map={tex} roughness={0.9} metalness={0} envMapIntensity={0.25} />
    </mesh>
  );
}

function Prop({
  spec,
  onHover,
  onOpen,
}: {
  spec: PropSpec;
  onHover: (id: string | null) => void;
  onOpen: (door: string) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH + modelFile(spec), DRACO_PATH);
  const group = useRef<THREE.Group>(null);
  const [hot, setHot] = useState(false);

  // Clone + grade once per spec. useGLTF caches the source scene, so we must
  // not mutate it: two props sharing a file would otherwise fight, and a
  // remount would re-apply the tint on top of the already-tinted material.
  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const src = o.material as THREE.MeshStandardMaterial;
      const m = src.clone();

      // CONTRACT PATH. If this mesh belongs to a node the console contract
      // names, it is graded as that material and the prop-wide grade is
      // skipped — the prop-wide grade exists precisely because the old asset
      // had only one material to give.
      const part = contractPart(o);
      if (part !== null) {
        if (INVISIBLE_NODES.has(part)) {
          o.visible = false;
          o.castShadow = false;
          o.receiveShadow = false;
          o.material = m;
          return;
        }
        const g = CONSOLE_PARTS[part];
        m.roughnessMap = null;
        m.roughness = g.rough;
        m.metalness = g.metal;
        m.envMapIntensity = g.env;
        if (g.emis !== undefined && (m.emissiveMap || m.emissive?.getHex() !== 0x000000)) {
          m.emissiveIntensity = g.emis;
        }
        o.material = m;
        return;
      }

      if (spec.tint !== undefined && m.color) m.color.multiplyScalar(spec.tint);

      // METALNESS. Every one of these GLBs ships a metallicRoughness texture
      // and NO factors, which in glTF means metallicFactor defaults to 1.0 —
      // so whatever metal the reconstruction hallucinated went through at full
      // strength. That is what turned the console into a blob of liquid chrome
      // and gave every prop the same wet-plastic sheen: not a lighting
      // problem, not the reconstruction's polygon budget, just an unclamped
      // multiplier. These are painted iron, timber and brass in a room with no
      // environment map to reflect; almost nothing here should be metal.
      //
      // Scaling the factor rather than nulling the map keeps the map's
      // variation, which is the only thing distinguishing the brass fittings
      // from the body they are bolted to.
      m.metalness = spec.metal ?? 0.16;

      // How much of the room this surface shows back. Without an environment
      // a metal has nothing to reflect but seven point lights, which is why
      // these props read as wet plastic no matter what the metalness says —
      // see RoomEnvironment.tsx.
      m.envMapIntensity = spec.env ?? 0.7;

      // ROUGHNESS. `roughness` is also a FACTOR against the map, not a value,
      // and this line used to read
      //     m.roughness = Math.max(m.roughness ?? 1, spec.rough)
      // which computed Math.max(1.0, 0.66) and returned 1.0, every time, for
      // every prop. The whole roughness column in studio-data.ts has never
      // done anything. Because a factor can only ever make a surface
      // SMOOTHER, a floor is not expressible this way at all — so `rough` is
      // now an explicit scalar that replaces the map, and it is opt-in: only
      // props whose bake came back lacquered pay the cost of losing the map's
      // variation.
      if (spec.rough !== undefined) {
        m.roughnessMap = null;
        m.roughness = spec.rough;
      }
      if (m.emissiveMap || (m.emissive && m.emissive.getHex() !== 0x000000)) {
        m.emissiveIntensity = spec.emis ?? 1;
      }
      o.material = m;
    });

    // Normalise to the specified physical height — measuring only what is
    // VISIBLE. Box3.setFromObject expands over every descendant regardless of
    // `visible`, and the contract asks for a collision hull that CONTAINS the
    // console, so measuring the lot would size the machine by its hitbox and
    // shrink the thing you can see by however much slack the modeller left.
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      if (b) box.union(b.clone().applyMatrix4(o.matrixWorld));
    });
    if (box.isEmpty()) box.setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const s = spec.height / (size.y || 1);
    root.scale.setScalar(s);
    // centre in X/Z, sit the base exactly on the given y
    root.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);

    if (!spec.grid) return root;

    // Tile it. Spacing comes from the mesh's own scaled footprint, so a grid
    // stays gapless whatever aspect the reconstruction happened to produce.
    const { cols, rows, gap } = spec.grid;
    const stepX = size.x * s + gap;
    const stepY = size.y * s + gap;
    const wrap = new THREE.Group();
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = c === 0 && r === 0 ? root : root.clone(true);
        cell.position.x += (c - (cols - 1) / 2) * stepX;
        cell.position.y += r * stepY;
        wrap.add(cell);
      }
    }
    return wrap;
  }, [scene, spec]);

  // A door lifts a few millimetres and brightens when you look at it. Small
  // enough to read as attention rather than animation.
  useFrame((_, dt) => {
    if (!group.current || !spec.door) return;
    const target = hot ? 0.012 : 0;
    const k = 1 - Math.exp(-9 * dt); // frame-rate independent
    group.current.position.y += (spec.position[1] + target - group.current.position.y) * k;
  });

  return (
    <group
      ref={group}
      position={spec.position}
      rotation-y={((spec.rotation ?? 0) * Math.PI) / 180}
      onPointerOver={spec.door ? (e) => { e.stopPropagation(); setHot(true); onHover(spec.door); } : undefined}
      onPointerOut={spec.door ? () => { setHot(false); onHover(null); } : undefined}
      onClick={spec.door ? (e) => { e.stopPropagation(); onOpen(spec.door!); } : undefined}
    >
      <primitive object={model}>
        {spec.canvas && <CanvasArt slot={spec.canvas} />}
      </primitive>
    </group>
  );
}

export function Props({
  onHover,
  onOpen,
}: {
  onHover: (label: string | null) => void;
  onOpen: (door: string) => void;
}) {
  return (
    <group>
      {PROPS.map((p) => (
        <Prop key={p.id} spec={p} onHover={onHover} onOpen={onOpen} />
      ))}
    </group>
  );
}

// Warm the cache so the room does not pop in prop by prop.
export function preloadProps() {
  PROPS.forEach((p) => useGLTF.preload(MODEL_PATH + modelFile(p), DRACO_PATH));
}

/** Called at module load by the Studio entry. */
export function usePreload() {
  useEffect(() => { preloadProps(); }, []);
}
