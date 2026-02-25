"use client";

import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export function FirstPersonControls() {
  const { camera, gl } = useThree();
  const moveState = useRef<MovementState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const isPointerLocked = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  // Movement settings
  const MOVE_SPEED = 3.0;
  const MOUSE_SENSITIVITY = 0.002;
  const DAMPING = 0.85;

  // Collision boundaries (room limits)
  const ROOM_SIZE = 12;
  const MIN_X = -ROOM_SIZE, MAX_X = ROOM_SIZE;
  const MIN_Z = -ROOM_SIZE, MAX_Z = ROOM_SIZE;
  const FLOOR_Y = 1.6; // Player eye height

  useEffect(() => {
    const canvas = gl.domElement;
    
    // Keyboard handlers
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = true;
          break;
        case "Escape":
          if (isPointerLocked.current) {
            document.exitPointerLock();
          }
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          moveState.current.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          moveState.current.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          moveState.current.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          moveState.current.right = false;
          break;
      }
    };

    // Mouse handlers
    const handleMouseMove = (event: MouseEvent) => {
      if (!isPointerLocked.current) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= movementX * MOUSE_SENSITIVITY;
      euler.current.x -= movementY * MOUSE_SENSITIVITY;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
    };

    const handleCanvasClick = () => {
      if (!isPointerLocked.current) {
        canvas.requestPointerLock();
      }
    };

    // Event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    canvas.addEventListener("click", handleCanvasClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      canvas.removeEventListener("click", handleCanvasClick);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    // Calculate movement direction based on camera orientation
    const { forward, backward, left, right } = moveState.current;
    
    direction.current.set(0, 0, 0);

    if (forward) direction.current.z -= 1;
    if (backward) direction.current.z += 1;
    if (left) direction.current.x -= 1;
    if (right) direction.current.x += 1;

    // Normalize diagonal movement
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Apply camera rotation to movement direction (only Y rotation for ground-based movement)
    const yRotation = new THREE.Matrix4().makeRotationY(euler.current.y);
    direction.current.applyMatrix4(yRotation);

    // Apply movement to velocity
    velocity.current.x += direction.current.x * MOVE_SPEED * delta;
    velocity.current.z += direction.current.z * MOVE_SPEED * delta;

    // Apply damping
    velocity.current.multiplyScalar(DAMPING);

    // Update camera position with collision boundaries
    const newPos = camera.position.clone().add(velocity.current.clone().multiplyScalar(delta));

    // Collision detection
    newPos.x = Math.max(MIN_X, Math.min(MAX_X, newPos.x));
    newPos.z = Math.max(MIN_Z, Math.min(MAX_Z, newPos.z));
    newPos.y = FLOOR_Y; // Keep at ground level

    camera.position.copy(newPos);
  });

  return null;
}