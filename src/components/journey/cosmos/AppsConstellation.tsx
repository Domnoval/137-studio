'use client';

// cosmos/AppsConstellation.tsx — OWNED BY COSMOS agent.
// The 6 apps as small wireframe polyhedron nodes out in the periphery of the
// corridor. They carry NO text: their naming lives entirely in the bracketed
// plates driven by Labels.tsx, which keeps the app catalog visually separate
// from the painting captions and guarantees the plates never sit on artwork.
// Hovering either the wire or its plate lights both.

import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { smoothstep } from './shared';
import { APP_NODES, type AppNode } from './cosmos-data';
import { appHover } from './Labels';

const WIRE_DIM = new THREE.Color('#6a7186');
const WIRE_HOT = new THREE.Color('#e8e4dc');

const GEOMETRIES = [
  new THREE.IcosahedronGeometry(0.26, 0),
  new THREE.OctahedronGeometry(0.3, 0),
  new THREE.TetrahedronGeometry(0.34, 0),
];

function Node({ node, index }: { node: AppNode; index: number }) {
  const { progressRef } = useJourney();
  const [hover, setHover] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const heat = useRef(0);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WIRE_DIM.clone(),
        wireframe: true,
        transparent: true,
        opacity: 0.42,
      }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    mesh.rotation.x = t * 0.13 + node.phase;
    mesh.rotation.y = t * 0.19 + node.phase;
    mesh.position.y = Math.sin(t * 0.4 + node.phase) * 0.08;

    const lit = hover || appHover.index === index;
    heat.current = THREE.MathUtils.damp(heat.current, lit ? 1 : 0, 6, dt);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(WIRE_DIM).lerp(WIRE_HOT, heat.current);
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const contractFade = 1 - smoothstep(0, 0.25, cp);
    // dim with distance so a far waypoint never competes with the staged art
    const rel = state.camera.position.z - node.z;
    const near = smoothstep(34, 12, rel) * smoothstep(-1, 3, rel);
    mat.opacity = (0.16 + near * 0.34 + heat.current * 0.5) * contractFade;
    mesh.scale.setScalar(1 + heat.current * 0.2);
  });

  const open = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    window.open(node.url, '_blank', 'noopener,noreferrer');
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.documentElement.style.cursor = 'pointer';
  };
  const out = () => {
    setHover(false);
    document.documentElement.style.cursor = '';
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh ref={meshRef} geometry={GEOMETRIES[node.kind]} material={material} />
      {/* generous invisible hit target */}
      <mesh onClick={open} onPointerOver={over} onPointerOut={out} visible={false}>
        <sphereGeometry args={[0.72, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export function AppsConstellation() {
  return (
    <group>
      {APP_NODES.map((node, i) => (
        <Node key={node.name} node={node} index={i} />
      ))}
    </group>
  );
}
