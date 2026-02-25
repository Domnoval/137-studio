"use client";

import React from "react";
import { GoldenTesseract } from "./Tesseract";
import { TVPortal } from "./TVPortal";
import * as THREE from "three";

function ChalkboardWall({ position, rotation, size }: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
}) {
  const texture = new THREE.TextureLoader().load("/137-logo.jpg");
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(size[0] / 4, size[1] / 4);

  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial 
        map={texture} 
        transparent 
        opacity={0.6}
        emissive="#1a0a2e"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

function Floor() {
  const texture = new THREE.TextureLoader().load("/137-logo.jpg");
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial 
        map={texture} 
        transparent 
        opacity={0.2}
        emissive="#0a0a0a"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

function RoomLighting() {
  return (
    <>
      <fog attach="fog" args={["#0a0a0a", 5, 20]} />
      <ambientLight intensity={0.1} />
      
      {/* Central tesseract lighting */}
      <pointLight 
        position={[0, 3, 0]} 
        color="#E8C547" 
        intensity={2} 
        distance={12} 
      />
      
      {/* TV glow */}
      <pointLight 
        position={[0, 2, -10]} 
        color="#00FFD1" 
        intensity={1.5} 
        distance={15} 
      />
      
      {/* Corner accent lights */}
      <pointLight 
        position={[8, 3, 8]} 
        color="#C9A84C" 
        intensity={0.8} 
        distance={10} 
      />
      <pointLight 
        position={[-8, 3, 8]} 
        color="#C9A84C" 
        intensity={0.8} 
        distance={10} 
      />
      
      {/* Rim lighting for walls */}
      <spotLight
        position={[0, 6, 0]}
        target-position={[0, 0, 0]}
        color="#7B2FBE"
        intensity={0.5}
        angle={Math.PI / 3}
        penumbra={0.8}
        distance={20}
      />
    </>
  );
}

export function WalkableRoom() {
  return (
    <group>
      <RoomLighting />
      
      {/* Floor */}
      <Floor />
      
      {/* Room walls with chalkboard texture */}
      {/* Back wall (where TV will be) */}
      <ChalkboardWall 
        position={[0, 4, -12]} 
        size={[24, 8]} 
      />
      
      {/* Left wall */}
      <ChalkboardWall 
        position={[-12, 4, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
        size={[24, 8]} 
      />
      
      {/* Right wall */}
      <ChalkboardWall 
        position={[12, 4, 0]} 
        rotation={[0, -Math.PI / 2, 0]} 
        size={[24, 8]} 
      />
      
      {/* Ceiling */}
      <ChalkboardWall 
        position={[0, 8, 0]} 
        rotation={[Math.PI / 2, 0, 0]} 
        size={[24, 24]} 
      />
      
      {/* Central floating tesseract */}
      <group position={[0, 3, 0]}>
        <GoldenTesseract />
      </group>
      
      {/* TV Portal on the back wall */}
      <group position={[0, 2, -11]}>
        <TVPortal />
      </group>
      
      {/* Optional: Small pedestals or decorative elements */}
      <mesh position={[4, 0.5, 4]}>
        <cylinderGeometry args={[0.5, 0.5, 1]} />
        <meshStandardMaterial 
          color="#C9A84C" 
          transparent 
          opacity={0.3}
          emissive="#C9A84C"
          emissiveIntensity={0.1}
        />
      </mesh>
      
      <mesh position={[-4, 0.5, 4]}>
        <cylinderGeometry args={[0.5, 0.5, 1]} />
        <meshStandardMaterial 
          color="#C9A84C" 
          transparent 
          opacity={0.3}
          emissive="#C9A84C"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}