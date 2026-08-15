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
    <mesh position={[slot.x, slot.y, slot.z]} castShadow={false} receiveShadow>
      <planeGeometry args={[slot.w, slot.h]} />
      {/* not emissive — a painting is lit by the room, like everything else */}
      <meshStandardMaterial map={tex} roughness={0.86} metalness={0} />
    </mesh>
  );
}

function Prop({
  spec,
  onHover,
}: {
  spec: PropSpec;
  onHover: (id: string | null) => void;
}) {
  const { scene } = useGLTF(MODEL_PATH + spec.file, DRACO_PATH);
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
      if (spec.tint !== undefined && m.color) m.color.multiplyScalar(spec.tint);
      if (spec.rough !== undefined) m.roughness = Math.max(m.roughness ?? 1, spec.rough);
      if (m.emissiveMap || (m.emissive && m.emissive.getHex() !== 0x000000)) {
        m.emissiveIntensity = spec.emis ?? 1;
      }
      o.material = m;
    });

    // normalise to the specified physical height
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const s = spec.height / (size.y || 1);
    root.scale.setScalar(s);
    // centre in X/Z, sit the base exactly on the given y
    root.position.set(-ctr.x * s, -box.min.y * s, -ctr.z * s);
    return root;
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
    >
      <primitive object={model}>
        {spec.canvas && <CanvasArt slot={spec.canvas} />}
      </primitive>
    </group>
  );
}

export function Props({ onHover }: { onHover: (label: string | null) => void }) {
  return (
    <group>
      {PROPS.map((p) => (
        <Prop key={p.id} spec={p} onHover={onHover} />
      ))}
    </group>
  );
}

// Warm the cache so the room does not pop in prop by prop.
export function preloadProps() {
  PROPS.forEach((p) => useGLTF.preload(MODEL_PATH + p.file, DRACO_PATH));
}

/** Called at module load by the Studio entry. */
export function usePreload() {
  useEffect(() => { preloadProps(); }, []);
}
