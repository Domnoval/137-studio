// cosmos/shared.ts — OWNED BY COSMOS agent.
// Tiny mutable store shared across the 3D graph. No React state: everything
// here is read/written inside useFrame loops at zero re-render cost.

export interface CosmosShared {
  /** Camera world Z this frame (CameraRig writes, slabs/dust read). */
  camZ: number;
  /** Index of the slab nearest the camera (red glow + strong tilt). */
  nearest: number;
  /** Raw normalized cursor (-1..1, +y up). Written by the DOM listener. */
  cursorX: number;
  cursorY: number;
  /** Spring-damped cursor (CameraRig integrates, everyone reads). */
  swayX: number;
  swayY: number;
}

export const cosmosShared: CosmosShared = {
  camZ: 10,
  nearest: 0,
  cursorX: 0,
  cursorY: 0,
  swayX: 0,
  swayY: 0,
};

export const easeInOut = (t: number): number => t * t * (3 - 2 * t);

export const smoothstep = (a: number, b: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
