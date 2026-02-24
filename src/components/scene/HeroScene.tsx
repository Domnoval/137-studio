"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GoldenTesseract } from "./Tesseract";
import * as THREE from "three";

function ChalkboardGround() {
  const texture = new THREE.TextureLoader().load("/137-logo.jpg");
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial map={texture} transparent opacity={0.3} />
    </mesh>
  );
}

function SceneContent() {
  return (
    <>
      <fog attach="fog" args={["#0a0a0a", 5, 25]} />
      <ambientLight intensity={0.15} />
      <pointLight position={[3, 4, 2]} color="#E8C547" intensity={2} distance={15} />
      <pointLight position={[-3, 2, -2]} color="#00FFD1" intensity={0.8} distance={12} />
      <pointLight position={[0, 0, 0]} color="#C9A84C" intensity={1.5} distance={8} />

      <GoldenTesseract />
      <ChalkboardGround />

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.15}
        enableZoom={false}
        enablePan={false}
        enableRotate
        rotateSpeed={0.5}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI * 0.7}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: [0, 1.5, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "#0a0a0a" }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
