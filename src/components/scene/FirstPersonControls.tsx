"use client";

import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MovementState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

// Click-to-move target
interface MoveTarget {
  position: THREE.Vector3;
  active: boolean;
}

// Settings — hoisted to module scope so they're stable across renders
// and don't need to appear in hook dep arrays.
const MOVE_SPEED = 4.0;
const MOUSE_SENSITIVITY = 0.002;
const DAMPING = 0.82;
const CLICK_MOVE_SPEED = 3.0;
const ARRIVAL_THRESHOLD = 0.5;
const BOUNDS = { minX: -11, maxX: 11, minZ: -11, maxZ: 11 };
const FLOOR_Y = 1.6;

export function FirstPersonControls() {
  const { camera, gl, raycaster } = useThree();
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
  const moveTarget = useRef<MoveTarget>({ position: new THREE.Vector3(), active: false });

  // Smooth head bob
  const bobPhase = useRef(0);
  const isMoving = useRef(false);

  // Click-to-move handler (when pointer is NOT locked)
  const handleClickToMove = useCallback(
    (event: MouseEvent) => {
      if (isPointerLocked.current) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // Raycast against floor plane
      const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(floorPlane, intersection);

      if (intersection) {
        // Clamp to room bounds
        intersection.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, intersection.x));
        intersection.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, intersection.z));

        moveTarget.current = {
          position: intersection.clone(),
          active: true,
        };
      }
    },
    [camera, gl, raycaster]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel click-to-move on any WASD press
      moveTarget.current.active = false;
      switch (e.code) {
        case "KeyW": case "ArrowUp": moveState.current.forward = true; break;
        case "KeyS": case "ArrowDown": moveState.current.backward = true; break;
        case "KeyA": case "ArrowLeft": moveState.current.left = true; break;
        case "KeyD": case "ArrowRight": moveState.current.right = true; break;
        case "Escape":
          if (isPointerLocked.current) document.exitPointerLock();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": moveState.current.forward = false; break;
        case "KeyS": case "ArrowDown": moveState.current.backward = false; break;
        case "KeyA": case "ArrowLeft": moveState.current.left = false; break;
        case "KeyD": case "ArrowRight": moveState.current.right = false; break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= (e.movementX || 0) * MOUSE_SENSITIVITY;
      euler.current.x -= (e.movementY || 0) * MOUSE_SENSITIVITY;
      euler.current.x = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
    };

    const handleCanvasClick = (e: MouseEvent) => {
      if (!isPointerLocked.current) {
        // Double-click to enter pointer lock, single click for click-to-move
        // Use a small delay to distinguish
        handleClickToMove(e);
      }
    };

    const handleDoubleClick = () => {
      if (!isPointerLocked.current) {
        moveTarget.current.active = false;
        canvas.requestPointerLock();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("dblclick", handleDoubleClick);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("dblclick", handleDoubleClick);
    };
  }, [camera, gl, handleClickToMove]);

  useFrame((_, delta) => {
    const { forward, backward, left, right } = moveState.current;
    const hasKeyInput = forward || backward || left || right;

    direction.current.set(0, 0, 0);

    if (hasKeyInput) {
      // WASD movement
      if (forward) direction.current.z -= 1;
      if (backward) direction.current.z += 1;
      if (left) direction.current.x -= 1;
      if (right) direction.current.x += 1;
      direction.current.normalize();

      const yMat = new THREE.Matrix4().makeRotationY(euler.current.y);
      direction.current.applyMatrix4(yMat);

      velocity.current.x += direction.current.x * MOVE_SPEED * delta;
      velocity.current.z += direction.current.z * MOVE_SPEED * delta;
      isMoving.current = true;
    } else if (moveTarget.current.active) {
      // Click-to-move
      const target = moveTarget.current.position;
      const toTarget = new THREE.Vector3(
        target.x - camera.position.x,
        0,
        target.z - camera.position.z
      );
      const dist = toTarget.length();

      if (dist < ARRIVAL_THRESHOLD) {
        moveTarget.current.active = false;
        isMoving.current = false;
      } else {
        toTarget.normalize();
        velocity.current.x += toTarget.x * CLICK_MOVE_SPEED * delta;
        velocity.current.z += toTarget.z * CLICK_MOVE_SPEED * delta;
        isMoving.current = true;

        // Smoothly rotate camera to face movement direction (only when not pointer-locked)
        if (!isPointerLocked.current) {
          const targetAngle = Math.atan2(-toTarget.x, -toTarget.z);
          euler.current.y += (targetAngle - euler.current.y) * 2 * delta;
          camera.quaternion.setFromEuler(euler.current);
        }
      }
    } else {
      isMoving.current = false;
    }

    // Damping
    velocity.current.multiplyScalar(DAMPING);

    // Apply movement with collision
    const newPos = camera.position.clone();
    newPos.x += velocity.current.x;
    newPos.z += velocity.current.z;

    newPos.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, newPos.x));
    newPos.z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, newPos.z));

    // Head bob when moving
    if (isMoving.current && velocity.current.length() > 0.01) {
      bobPhase.current += delta * 8;
      newPos.y = FLOOR_Y + Math.sin(bobPhase.current) * 0.03;
    } else {
      newPos.y = FLOOR_Y;
      bobPhase.current = 0;
    }

    camera.position.copy(newPos);
  });

  return null;
}
