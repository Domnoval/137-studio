'use client';

// cosmos/Slabs.tsx — OWNED BY COSMOS agent.
// ~15 paintings as textured slabs on the golden-angle helix. Correct aspect
// from the loaded texture, thin dark frame 2cm behind, unique sin float,
// spring-damped cursor tilt (strongest on the slab nearest the camera, which
// also carries the red edge glow). During contraction everything recedes to
// the vanishing point. Click → WorkModal via setSelectedWork.

import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress, texPath } from '../journey-utils';
import { cosmosShared, easeInOut, smoothstep } from './shared';
import { SLABS, SIGIL_Z, type SlabPlacement } from './cosmos-data';
import { getGlowTexture } from './textures';

const FRAME_PAD = 0.14; // dark frame border in world units
const VANISH = new THREE.Vector3(0, 0, SIGIL_Z - 26);

// shared geometry + materials (per-slab materials only where opacity differs)
const unitPlane = new THREE.PlaneGeometry(1, 1);
const frameMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#161311'),
  transparent: true,
  opacity: 1,
});
// red pushed past 1.0 so ONLY this survives the bloom threshold
const GLOW_COLOR = new THREE.Color('#c41230').multiplyScalar(3.0);

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();

interface SlabProps {
  placement: SlabPlacement;
}

function SlabArt({ placement }: SlabProps) {
  const { work, index } = placement;
  const { progressRef, setSelectedWork } = useJourney();
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const artRef = useRef<THREE.Mesh>(null);
  const baseQuat = useRef(new THREE.Quaternion());
  const anim = useRef({ fade: 0, tilt: 0.02, glow: 0 });

  const texture = useTexture(texPath(work.file), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  const aspect = texture.image
    ? (texture.image as { width: number; height: number }).width /
      (texture.image as { width: number; height: number }).height
    : 0.8;
  const h = placement.height;
  const w = h * aspect;

  const artMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 }),
    [texture],
  );
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: GLOW_COLOR,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // face a point on the camera axis slightly ahead; remember the base pose
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(placement.x, placement.y, placement.z);
    g.lookAt(placement.lookX, placement.lookY, placement.lookZ);
    baseQuat.current.copy(g.quaternion);
  }, [placement]);

  useFrame((state, rawDt) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const a = anim.current;
    const p = progressRef.current ?? 0;
    const isNearest = cosmosShared.nearest === index;

    // texture fade-in (no pop)
    a.fade = THREE.MathUtils.damp(a.fade, 1, 2.2, dt);

    // contraction: recede to vanishing point
    const cp = phaseProgress(p, 'contraction');
    const rec = easeInOut(smoothstep(0, 0.6, cp));
    const recEase = rec * rec * (3 - 2 * rec);
    const contractFade = 1 - smoothstep(0.34, 0.58, cp);

    const float = Math.sin(t * placement.floatSpeed + placement.phase) * 0.05;
    g.position.set(
      THREE.MathUtils.lerp(placement.x, VANISH.x, recEase),
      THREE.MathUtils.lerp(placement.y + float, VANISH.y, recEase),
      THREE.MathUtils.lerp(placement.z, VANISH.z, recEase),
    );
    const s = Math.max(0.001, 1 - recEase * 0.999);
    g.scale.setScalar(s);

    // inertial tilt toward cursor (max ~4° on the nearest slab)
    a.tilt = THREE.MathUtils.damp(a.tilt, isNearest ? 0.07 : 0.022, 3, dt);
    tmpEuler.set(-cosmosShared.swayY * a.tilt, cosmosShared.swayX * a.tilt, 0);
    tmpQuat.setFromEuler(tmpEuler);
    g.quaternion.copy(baseQuat.current).multiply(tmpQuat);

    // red edge glow only while nearest (and not contracting away)
    a.glow = THREE.MathUtils.damp(a.glow, isNearest && cp < 0.2 ? 0.55 : 0, 3.5, dt);
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = a.glow * a.fade;
    }
    if (artRef.current) {
      (artRef.current.material as THREE.MeshBasicMaterial).opacity = a.fade * contractFade;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = progressRef.current ?? 0;
    if (phaseProgress(p, 'contraction') > 0.15) return;
    setSelectedWork(work.id);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.documentElement.style.cursor = 'pointer';
  };
  const onOut = () => {
    document.documentElement.style.cursor = '';
  };

  return (
    <group ref={groupRef}>
      {/* red halo, furthest back */}
      <mesh ref={glowRef} position={[0, 0, -0.05]} scale={[w + 0.72, h + 0.72, 1]} geometry={unitPlane} material={glowMaterial} />
      {/* thin dark extruded-frame feel, 2cm behind the art */}
      <mesh
        position={[0, 0, -0.02]}
        scale={[w + FRAME_PAD, h + FRAME_PAD, 1]}
        geometry={unitPlane}
        material={frameMaterial}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
      />
      <mesh ref={artRef} scale={[w, h, 1]} geometry={unitPlane} material={artMaterial} onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />
    </group>
  );
}

/** Placeholder while a texture streams in: bare dark frame at guessed aspect. */
function SlabGhost({ placement }: SlabProps) {
  const h = placement.height;
  const w = h * 0.8;
  return (
    <group position={[placement.x, placement.y, placement.z]}>
      <mesh scale={[w + FRAME_PAD, h + FRAME_PAD, 1]} geometry={unitPlane} material={frameMaterial} />
    </group>
  );
}

export function Slabs() {
  const { progressRef } = useJourney();

  // one global update for the shared frame material during contraction
  useFrame(() => {
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    frameMaterial.opacity = 1 - smoothstep(0.34, 0.58, cp);
  });

  return (
    <group>
      {SLABS.map((placement) => (
        <Suspense key={placement.work.id} fallback={<SlabGhost placement={placement} />}>
          <SlabArt placement={placement} />
        </Suspense>
      ))}
    </group>
  );
}
