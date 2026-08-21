"use client";

import { Suspense, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { useMachine } from "@/lib/machineStore";
import { deriveParams } from "@/lib/stateTable";
import { PortalRing } from "./PortalRing";
import { CrtTerminal } from "./CrtTerminal";
import { Prop } from "./Props";

// ─────────────────────────────────────────────────────────────────────────────
// ROOM PROXIES — the environment stand-in for the gaussian-splat room.
// Real GLB props (grab-artifacts) are mounted here; proxy boxes are fallbacks.
// Spec §11.2 "if you can grab it, it's a mesh; everything else is splat."
// ─────────────────────────────────────────────────────────────────────────────

export function RoomProxies() {
  const state = useMachine((s) => s.state);
  const p = deriveParams(state);

  const wallMat = useMemo(
    () => ({ color: state.palette.wall, roughness: 0.9 }),
    [state.palette.wall]
  );
  const floorMat = useMemo(() => ({ color: "#8A6F66", roughness: 1 }), []);
  const backMural = useTexture("/assets/backdrop_mural.png");
  const backMuralScr = useMemo(() => {
    backMural.colorSpace = "srgb";
    backMural.anisotropy = 4;
    backMural.wrapS = backMural.wrapT = 1000; // ClampToEdge
    return backMural;
  }, [backMural]);

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial {...floorMat} />
      </mesh>
      {/* back wall — backdrop mural (the "window to the mood") */}
      <mesh position={[0, 2.35, -2.6]}>
        <planeGeometry args={[14, 5.2]} />
        <meshStandardMaterial map={backMuralScr} roughness={1} toneMapped={false} />
      </mesh>
      {/* left + right walls keep the palette solid (reclaimed plaster) */}
      <mesh position={[-5.6, 2.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5.2]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[5.6, 2.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5.2]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* window — glowing pane, left */}
      <mesh position={[-5.59, 2.2, 1.2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.4, 1.8]} />
        <meshStandardMaterial
          color={p.dusk ? "#5D598F" : "#BFD9E8"}
          emissive={p.lightColor}
          emissiveIntensity={p.dusk ? 0.25 : 0.5}
          roughness={0.2}
        />
      </mesh>

      {/* the machine's three spaces */}
      <PortalRing />
      <LeverRig />
      <CrtTerminal />

      {/* radio — real prop */}
      <Suspense fallback={null}>
        <Prop src="/assets/radio.glb" scale={1.0} position={[4.1, 0.55, 1.1]} rotation={[0, -0.5, 0]} />
      </Suspense>

      {/* stool — throwable in Phase 2/trust-gate; real prop now */}
      <Suspense fallback={null}>
        <Prop src="/assets/red_stool.glb" scale={0.9} position={[-1.1, 0.42, 1.8]} rotation={[0, 0.4, 0]} />
      </Suspense>
      <mesh position={[-1.1, -0.02, 1.8]}>
        <circleGeometry args={[0.55, 24]} />
        <meshStandardMaterial color="#44332b" roughness={1} />
      </mesh>

      {/* spray cans — Phase 2 */}
      {(
        [
          ["#D2A6A3", -2.3, 0.6],
          ["#7C8B5A", -2.1, 0.75],
          ["#C8452C", -2.55, 0.85],
          ["#4FC3E0", -2.35, 1.0],
        ] as const
      ).map(([color, x, z], i) => (
        <mesh key={i} position={[x, 0.09, z]} rotation={[Math.PI / 2, 0, i * 0.7]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 12]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}

      {/* flora hint — grows with L3 */}
      <group position={[1.3, 0, -1.8]} scale={0.35 + p.floraAmount * 0.9}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, 0.5 + i * 0.02, 0]} rotation={[0, (i * Math.PI) / 2.5, 0.4]}>
            <coneGeometry args={[0.06, 0.5, 5]} />
            <meshStandardMaterial color="#3E6A50" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ── the lever console + its little emissive readout (real prop) ─────────────
function LeverRig() {
  const bits = useMachine((s) => s.bits);
  return (
    <group position={[2.3, 0, 0.55]} rotation={[0, 0.32, 0]}>
      <Suspense fallback={null}>
        <Prop src="/assets/console.glb" scale={1.15} position={[0, 0.5, 0]} rotation={[0, 0, 0]} />
      </Suspense>
      {/* four emissive state indicators above the levers */}
      {bits.map((b, i) => (
        <mesh key={i} position={[-0.48 + i * 0.32, 1.12, 0.18]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial
            color={b ? "#5FBC47" : "#24301F"}
            emissive={b ? "#5FBC47" : "#000000"}
            emissiveIntensity={b ? 2 : 0}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}