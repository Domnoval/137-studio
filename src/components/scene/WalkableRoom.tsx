"use client";

import React, { useMemo } from "react";
import { GoldenTesseract } from "./Tesseract";
import { TVPortal } from "./TVPortal";
import * as THREE from "three";

function ChalkboardSurface({
  position,
  rotation,
  size,
  opacity = 0.5,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  opacity?: number;
}) {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/137-logo.jpg");
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(size[0] / 5, size[1] / 5);
    return tex;
  }, [size]);

  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={opacity}
        emissive="#0d0520"
        emissiveIntensity={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Decorative golden frame on walls
function GoldenFrame({
  position,
  rotation,
  width,
  height,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
}) {
  const thickness = 0.08;
  const depth = 0.05;
  const mat = (
    <meshStandardMaterial
      color="#C9A84C"
      roughness={0.3}
      metalness={0.8}
      emissive="#C9A84C"
      emissiveIntensity={0.05}
    />
  );

  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Top */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width + thickness * 2, thickness, depth]} />
        {mat}
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[width + thickness * 2, thickness, depth]} />
        {mat}
      </mesh>
      {/* Left */}
      <mesh position={[-width / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, depth]} />
        {mat}
      </mesh>
      {/* Right */}
      <mesh position={[width / 2, 0, 0]}>
        <boxGeometry args={[thickness, height, depth]} />
        {mat}
      </mesh>
    </group>
  );
}

// Floor with reflective quality
function Floor() {
  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/137-logo.jpg");
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[24, 24]} />
      <meshStandardMaterial
        map={texture}
        transparent
        opacity={0.15}
        roughness={0.2}
        metalness={0.3}
        emissive="#0a0a0a"
        emissiveIntensity={0.02}
      />
    </mesh>
  );
}

// Static dust geometry — computed once at module load so render stays pure.
const DUST_COUNT = 200;
const DUST_GEOMETRY: THREE.BufferGeometry = (() => {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(DUST_COUNT * 3);
  for (let i = 0; i < DUST_COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
  }
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
})();

// Atmospheric particles
function DustParticles() {
  const geom = DUST_GEOMETRY;

  return (
    <points geometry={geom}>
      <pointsMaterial
        color="#C9A84C"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

export function WalkableRoom() {
  return (
    <group>
      {/* Atmospheric */}
      <fog attach="fog" args={["#06060f", 3, 22]} />
      <ambientLight intensity={0.08} />
      <DustParticles />

      {/* Central overhead light — warm gold spotlight on tesseract */}
      <spotLight
        position={[0, 7, 0]}
        color="#E8C547"
        intensity={3}
        angle={0.5}
        penumbra={0.8}
        distance={15}
        castShadow
      />

      {/* Accent rim lights */}
      <pointLight position={[10, 5, 10]} color="#7B2FBE" intensity={0.4} distance={18} />
      <pointLight position={[-10, 5, 10]} color="#7B2FBE" intensity={0.4} distance={18} />
      <pointLight position={[0, 1, 10]} color="#C9A84C" intensity={0.3} distance={10} />

      {/* Floor */}
      <Floor />

      {/* Walls */}
      {/* Back wall */}
      <ChalkboardSurface position={[0, 4, -12]} size={[24, 8]} />
      {/* Left wall */}
      <ChalkboardSurface position={[-12, 4, 0]} rotation={[0, Math.PI / 2, 0]} size={[24, 8]} />
      {/* Right wall */}
      <ChalkboardSurface position={[12, 4, 0]} rotation={[0, -Math.PI / 2, 0]} size={[24, 8]} />
      {/* Behind player (entrance wall) */}
      <ChalkboardSurface position={[0, 4, 12]} rotation={[0, Math.PI, 0]} size={[24, 8]} />
      {/* Ceiling */}
      <ChalkboardSurface position={[0, 8, 0]} rotation={[Math.PI / 2, 0, 0]} size={[24, 24]} opacity={0.3} />

      {/* Golden frame accents on walls */}
      <GoldenFrame position={[-11.95, 4, -4]} rotation={[0, Math.PI / 2, 0]} width={4} height={3} />
      <GoldenFrame position={[-11.95, 4, 4]} rotation={[0, Math.PI / 2, 0]} width={4} height={3} />
      <GoldenFrame position={[11.95, 4, -4]} rotation={[0, -Math.PI / 2, 0]} width={4} height={3} />
      <GoldenFrame position={[11.95, 4, 4]} rotation={[0, -Math.PI / 2, 0]} width={4} height={3} />

      {/* Central floating tesseract */}
      <group position={[0, 3.5, 0]}>
        <GoldenTesseract />
      </group>

      {/* === TV PORTALS === */}

      {/* Gallery portal — center of back wall */}
      <group position={[0, 3, -11.5]}>
        <TVPortal label="GALLERY" destination="/gallery" />
      </group>

      {/* Shop portal — left wall */}
      <group position={[-11.5, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <TVPortal label="SHOP" destination="/shop" />
      </group>

      {/* About portal — right wall */}
      <group position={[11.5, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <TVPortal label="ABOUT" destination="/about" />
      </group>
    </group>
  );
}
