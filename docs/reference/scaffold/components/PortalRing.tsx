"use client";

import { useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useMachine } from "@/lib/machineStore";
import { STATE_TABLE } from "@/lib/stateTable";

// ─────────────────────────────────────────────────────────────────────────────
// THE RING — the room's face. 16 segments = 16 states.
// Lit segment = visited. Bright segment = current. Click a segment to travel.
// Spec: STATE_BIBLE.md §1, §2.3.
// ─────────────────────────────────────────────────────────────────────────────

const RING_R = 2.15;

export function PortalRing() {
  const group = useRef<THREE.Group>(null);
  const bits = useMachine((s) => s.bits);
  const current = useMachine((s) => s.state.index);
  const visited = useMachine((s) => s.visited);
  const setState = useMachine((s) => s.setState);
  const setFocus = useMachine((s) => s.setFocus);

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.02;
  });

  const onSegment = (e: ThreeEvent<MouseEvent>, index: number) => {
    e.stopPropagation();
    setState(index);
  };

  return (
    <group position={[0, 1.4, -1.2]}>
      {/* the stone ring */}
      <mesh>
        <torusGeometry args={[RING_R, 0.16, 12, 64]} />
        <meshStandardMaterial color="#9C8578" roughness={0.95} />
      </mesh>
      {/* inner glow disc */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[RING_R - 0.3, 48]} />
        <meshStandardMaterial
          color="#0A120A"
          emissive="#0E2A12"
          emissiveIntensity={0.6}
          roughness={0.9}
        />
      </mesh>

      <group ref={group}>
        {STATE_TABLE.map((s) => {
          const a = (s.index / 16) * Math.PI * 2;
          const x = Math.cos(a) * RING_R;
          const y = Math.sin(a) * RING_R;
          const isCurrent = s.index === current;
          const isVisited = visited.includes(s.index);
          const lit = isCurrent || isVisited;
          return (
            <mesh
              key={s.index}
              position={[x, y, 0.05]}
              onClick={(e) => onSegment(e, s.index)}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => (document.body.style.cursor = "auto")}
            >
              <boxGeometry args={[0.34, 0.1, 0.06]} />
              <meshStandardMaterial
                color={s.palette.glow}
                emissive={s.palette.glow}
                emissiveIntensity={isCurrent ? 2.4 : isVisited ? 1.1 : 0.12}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>

      {/* click the ring's heart to reset focus */}
      <mesh position={[0, 0, 0.1]} onClick={(e) => { e.stopPropagation(); setFocus(null); }}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#0A120A" transparent opacity={0.4} />
      </mesh>

      {/* bits readout floats above the ring */}
      <group position={[0, RING_R + 0.45, 0]}>
        <mesh>
          <boxGeometry args={[1.7, 0.34, 0.06]} />
          <meshStandardMaterial color="#0E1A0E" emissive="#123312" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}