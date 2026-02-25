"use client";

import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function createTVScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384; // 4:3 aspect ratio
  const ctx = canvas.getContext("2d")!;
  
  // Clear to dark
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some static/noise
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 0.1;
    data[i] = noise * 255;     // R
    data[i + 1] = noise * 255; // G  
    data[i + 2] = noise * 255; // B
    data[i + 3] = 255;         // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Add central glow
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  gradient.addColorStop(0, "rgba(0, 255, 209, 0.8)");
  gradient.addColorStop(0.3, "rgba(0, 255, 209, 0.4)");
  gradient.addColorStop(0.6, "rgba(123, 47, 190, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some scan lines
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2);
  }
  
  // Add portal text
  ctx.globalCompositeOperation = "source-over";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#00FFD1";
  ctx.font = "bold 24px monospace";
  ctx.shadowColor = "#00FFD1";
  ctx.shadowBlur = 20;
  ctx.fillText("ENTER THE TEMPLE", canvas.width / 2, canvas.height / 2 - 20);
  
  ctx.font = "14px monospace";
  ctx.fillStyle = "#C9A84C";
  ctx.shadowColor = "#C9A84C";
  ctx.shadowBlur = 10;
  ctx.fillText("Walk forward to enter", canvas.width / 2, canvas.height / 2 + 20);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function TVPortal() {
  const tvRef = useRef<THREE.Group>(null);
  const screenRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    return createTVScreenTexture();
  }, []);
  
  // Check if player is near the portal
  const checkProximity = () => {
    if (!tvRef.current) return;
    
    const tvPosition = new THREE.Vector3();
    tvRef.current.getWorldPosition(tvPosition);
    const distance = camera.position.distanceTo(tvPosition);
    
    // If player is very close to TV (walking into it)
    if (distance < 2) {
      // Trigger portal transition (placeholder for now)
      console.log("Portal activated! Distance:", distance);
      // TODO: Implement page transition or scene change
    }
  };
  
  useFrame((_, delta) => {
    // Gentle floating animation
    if (tvRef.current) {
      tvRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.1;
    }
    
    // Animate screen glow
    if (screenRef.current) {
      const material = screenRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.003) * 0.1;
    }
    
    checkProximity();
  });
  
  if (!screenTexture) return null;
  
  return (
    <group ref={tvRef}>
      {/* TV Frame/Bezel */}
      <mesh>
        <boxGeometry args={[6, 4.5, 0.8]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Screen */}
      <mesh ref={screenRef} position={[0, 0, 0.41]}>
        <planeGeometry args={[5, 3.75]} />
        <meshStandardMaterial
          map={screenTexture}
          emissive="#00FFD1"
          emissiveMap={screenTexture}
          emissiveIntensity={0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Screen glow effect */}
      <mesh position={[0, 0, 0.42]}>
        <planeGeometry args={[6, 4.5]} />
        <meshBasicMaterial
          color="#00FFD1"
          transparent
          opacity={0.1}
        />
      </mesh>
      
      {/* TV Stand */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.5]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Base */}
      <mesh position={[0, -3, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.2]} />
        <meshStandardMaterial 
          color="#2a2a2a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>
      
      {/* Portal light effect */}
      <pointLight
        position={[0, 0, 1]}
        color="#00FFD1"
        intensity={2}
        distance={10}
      />
    </group>
  );
}