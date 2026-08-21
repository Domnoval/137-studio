"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMachine } from "@/lib/machineStore";
import { LEVER_NAMES, LEVER_LABELS } from "@/lib/stateTable";

// ─────────────────────────────────────────────────────────────────────────────
// THE CONSOLE — four levers, a 4-bit register, the visitor's hand on the machine.
// Spec: STATE_BIBLE §2.1. Mesh (grabbable), not splat.
// ─────────────────────────────────────────────────────────────────────────────

const LEVER_X = [-0.48, -0.16, 0.16, 0.48];

export function LeverConsole() {
  const bits = useMachine((s) => s.bits);
  const flipLever = useMachine((s) => s.flipLever);
  const setFocus = useMachine((s) => s.setFocus);

  return (
    <group
      position={[2.3, 0, 0.55]}
      rotation={[0, 0.32, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setFocus("console");
      }}
    >
      {/* chassis */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.7, 0.72, 0.62]} />
        <meshStandardMaterial color="#7E5348" roughness={0.72} metalness={0.15} />
      </mesh>
      {/* brass top plate */}
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[1.74, 0.05, 0.64]} />
        <meshStandardMaterial color="#B08A54" roughness={0.4} metalness={0.6} />
      </mesh>

      {LEVER_NAMES.map((name, i) => {
        const bit = bits[i];
        return (
          <group key={name} position={[LEVER_X[i], 0.78, 0.16]}>
            {/* lever base */}
            <mesh position={[0, -0.09, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 0.18, 16]} />
              <meshStandardMaterial color="#4A3A33" roughness={0.5} metalness={0.4} />
            </mesh>
            {/* lever arm — leans with its bit */}
            <group rotation={[0, 0, bit ? -0.5 : 0.5]} position={[0, 0.14, 0]}>
              <mesh position={[0, 0.16, 0]}>
                <boxGeometry args={[0.045, 0.32, 0.045]} />
                <meshStandardMaterial color="#D2A6A3" roughness={0.4} metalness={0.3} />
              </mesh>
              <mesh position={[0, 0.34, 0]}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color="#C8452C" emissive="#C8452C" emissiveIntensity={bit ? 0.55 : 0.08} />
              </mesh>
            </group>
            {/* indicator */}
            <mesh position={[0, -0.02, 0.12]}>
              <planeGeometry args={[0.09, 0.09]} />
              <meshStandardMaterial
                color={bit ? "#5FBC47" : "#24301F"}
                emissive={bit ? "#5FBC47" : "#000000"}
                emissiveIntensity={bit ? 1.6 : 0}
                transparent
                opacity={0.9}
              />
            </mesh>

            {/* label — on a tiny plaque */}
            <mesh position={[0, -0.24, 0]}>
              <boxGeometry args={[0.24, 0.08, 0.02]} />
              <meshStandardMaterial color="#1A1C1F" />
            </mesh>
          </group>
        );
      })}

      {/* engraved name */}
      <mesh position={[0, -0.05, 0.32]}>
        <boxGeometry args={[0.9, 0.1, 0.01]} />
        <meshStandardMaterial color="#2A2622" />
      </mesh>
    </group>
  );
}