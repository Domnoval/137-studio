"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Suspense } from "react";
import { useMachine } from "@/lib/machineStore";
import { deriveParams } from "@/lib/stateTable";
import { RoomProxies } from "./RoomProxies";
import { CameraRig } from "./CameraRig";

export default function Scene() {
  const state = useMachine((s) => s.state);
  const p = deriveParams(state);

  return (
    <Canvas
      camera={{ position: [0, 1.6, 5.4], fov: 47, near: 0.1, far: 60 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[p.fogColor]} />
      <fog attach="fog" args={[p.fogColor, 6, 22]} />

      <ambientLight intensity={0.28} color="#FFE8D6" />
      {/* window light, left side */}
      <directionalLight
        position={[-4, 3, 2]}
        intensity={p.lightIntensity}
        color={p.lightColor}
      />
      {/* portal glow */}
      <pointLight position={[0, 1.5, -1.6]} intensity={1.4} distance={7} color={state.palette.glow} />
      {/* CRT glow */}
      <pointLight position={[2.4, 1.35, 1.2]} intensity={0.9} distance={5} color="#5FBC47" />

      <Suspense fallback={null}>
        <RoomProxies />
        <CameraRig />
      </Suspense>

      <OrbitControls
        target={[0, 1.25, 0]}
        minPolarAngle={0.55}
        maxPolarAngle={1.52}
        minDistance={1.4}
        maxDistance={8.5}
        enablePan={false}
        makeDefault
      />

      <EffectComposer>
        <Bloom
          intensity={p.bloomStrength}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.25}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}