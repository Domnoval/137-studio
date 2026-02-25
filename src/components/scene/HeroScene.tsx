"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { FirstPersonControls } from "./FirstPersonControls";
import { WalkableRoom } from "./WalkableRoom";
import { WalkInstructions } from "../ui/WalkInstructions";

export function HeroScene() {
  return (
    <div className="w-full h-screen relative">
      <Canvas
        camera={{ position: [0, 1.6, 8], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "#0a0a0a" }}
      >
        <Suspense fallback={null}>
          <WalkableRoom />
          <FirstPersonControls />
        </Suspense>
      </Canvas>
      <WalkInstructions />
    </div>
  );
}
