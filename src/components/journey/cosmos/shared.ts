// cosmos/shared.ts — OWNED BY COSMOS agent.
// Tiny mutable store shared across the 3D graph. No React state: everything
// here is read/written inside useFrame loops at zero re-render cost.

/** Screen-space axis-aligned box in CSS pixels (canvas-local). */
export interface ScreenRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Extra px the label system must keep clear around this rect (the red halo
   *  around a staged slab is part of the artwork's presence, not empty space). */
  pad: number;
  /** true when the owner projected cleanly in front of the camera this frame */
  live: boolean;
  /** rendered alpha of the artwork this frame (QA harness reads this to assert
   *  that nothing with real presence is ever clipped by the viewport). */
  alpha: number;
}

export interface CosmosShared {
  /** Camera world Z this frame (CameraRig writes, slabs/dust read). */
  camZ: number;
  /** |ΔcamZ| since last frame — staging blends on camera TRAVEL, not on wall
   *  clock, so the hero is fully composed at any frame rate or scrub speed. */
  camDZ: number;
  /** Index of the slab nearest the camera (red glow + hero staging). */
  nearest: number;
  /** 0-1 staging weight of the hero slab (Slabs writes, Labels reads). */
  heroDom: number;
  /** Raw normalized cursor (-1..1, +y up). Written by the DOM listener. */
  cursorX: number;
  cursorY: number;
  /** Spring-damped cursor (CameraRig integrates, everyone reads). */
  swayX: number;
  swayY: number;
  /** 0-1 position along the descent corridor — drives the void's color arc. */
  descent: number;
  /** DOM layer the occlusion-aware label system draws into. */
  labelLayer: HTMLDivElement | null;
  /** Per-slab projected screen rects, indexed by slab index. */
  slabRects: ScreenRect[];
  /** How many slabs have mounted (and therefore subscribed to useFrame).
   *  Labels waits for this so its frame callback is appended LAST and always
   *  reads rects written this frame, never last frame's. */
  slabsLive: number;
}

export const cosmosShared: CosmosShared = {
  camZ: 10,
  camDZ: 0,
  nearest: 0,
  heroDom: 0,
  cursorX: 0,
  cursorY: 0,
  swayX: 0,
  swayY: 0,
  descent: 0,
  labelLayer: null,
  slabRects: [],
  slabsLive: 0,
};

// Dev-only inspection hook: the screenshot/QA harness reads projected slab
// rects out of here to assert that no artwork is ever clipped by the viewport.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __cosmosShared?: CosmosShared }).__cosmosShared = cosmosShared;
}

/** Grow the shared rect table so every slab index has a slot. */
export function ensureSlabRects(count: number): ScreenRect[] {
  const rects = cosmosShared.slabRects;
  while (rects.length < count) {
    rects.push({ x0: 0, y0: 0, x1: 0, y1: 0, pad: 0, live: false, alpha: 0 });
  }
  return rects;
}

export const easeInOut = (t: number): number => t * t * (3 - 2 * t);

export const smoothstep = (a: number, b: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

export const rectsOverlap = (
  a: { x0: number; y0: number; x1: number; y1: number },
  b: { x0: number; y0: number; x1: number; y1: number },
  pad = 0,
): boolean =>
  a.x0 - pad < b.x1 && a.x1 + pad > b.x0 && a.y0 - pad < b.y1 && a.y1 + pad > b.y0;
