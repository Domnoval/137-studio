'use client';

// cosmos/AppsConstellation.tsx — OWNED BY COSMOS agent.
// The 6 apps as small wireframe polyhedron nodes between the slab clusters.
// JetBrains Mono <Html> labels, distance-gated so only nearby waypoints
// announce themselves. Hover brightens the wire; click opens the app.

import { useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, smoothstep } from './shared';
import { APP_NODES, type AppNode } from './cosmos-data';

const WIRE_DIM = new THREE.Color('#5a5f72');
const WIRE_HOT = new THREE.Color('#e8e4dc');

const GEOMETRIES = [
  new THREE.IcosahedronGeometry(0.34, 0),
  new THREE.OctahedronGeometry(0.4, 0),
  new THREE.TetrahedronGeometry(0.46, 0),
];

function Node({ node }: { node: AppNode }) {
  const { progressRef } = useJourney();
  const [hover, setHover] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const heat = useRef(0);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: WIRE_DIM.clone(),
        wireframe: true,
        transparent: true,
        opacity: 0.5,
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
    mesh.position.y = node.y + Math.sin(t * 0.4 + node.phase) * 0.08;

    heat.current = THREE.MathUtils.damp(heat.current, hover ? 1 : 0, 6, dt);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(WIRE_DIM).lerp(WIRE_HOT, heat.current);
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const contractFade = 1 - smoothstep(0, 0.25, cp);
    mat.opacity = (0.45 + heat.current * 0.55) * contractFade;
    const s = 1 + heat.current * 0.18;
    mesh.scale.setScalar(s);

    // label visibility: only while the camera is approaching/passing this node
    if (labelRef.current) {
      const rel = cosmosShared.camZ - node.z; // >0 while ahead of camera
      const vis = smoothstep(28, 20, rel) * smoothstep(2.5, 5, rel) * contractFade;
      labelRef.current.style.opacity = (vis * (0.75 + heat.current * 0.25)).toFixed(3);
    }
  });

  const open = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    window.open(node.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={meshRef}
        geometry={GEOMETRIES[node.kind]}
        material={material}
        onClick={open}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.documentElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.documentElement.style.cursor = '';
        }}
      />
      {/* generous invisible hit target */}
      <mesh
        onClick={open}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.documentElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.documentElement.style.cursor = '';
        }}
        visible={false}
      >
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      <Html center position={[0, -0.78, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[5, 1]}>
        <div
          ref={labelRef}
          style={{
            opacity: 0,
            transition: 'opacity 0.2s linear',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            transform: 'translateZ(0)',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.68rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#e8e4dc',
            }}
          >
            {node.name}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.55rem',
              letterSpacing: '0.12em',
              color: '#a09890',
              marginTop: 3,
            }}
          >
            {node.desc}
          </div>
        </div>
      </Html>
    </group>
  );
}

export function AppsConstellation() {
  return (
    <group>
      {APP_NODES.map((node) => (
        <Node key={node.name} node={node} />
      ))}
    </group>
  );
}
