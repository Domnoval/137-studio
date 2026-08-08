// cosmos/stage-state.ts — OWNED BY COSMOS agent.
// The camera-move channel. `shared.ts` carries the staging/label contract and
// is frozen; this module carries the things the FLOWN camera needs to publish:
// how fast we are actually travelling down the corridor, and where the composed
// formation lands on screen so the plate that names it can never sit on paint.
//
// Same discipline as shared.ts: plain mutable object, written and read inside
// useFrame, zero React state, zero per-frame allocation.

export interface StageState {
  /**
   * Analytic descent speed, normalised so 1 = the corridor's mean rate.
   * Derived from the DESCENT CURVE (a closed-form function of scroll), never
   * from a per-frame position delta — so it is identical at 3fps and 144fps
   * and it is still correct when the scroll is parked between two frames.
   */
  speed: number;
  /** 0-1 gate for near-field passes: only open on the fast stretches. */
  rush: number;
  /** Union of the composed formation's projected quads, in canvas CSS px. */
  formX0: number;
  formY0: number;
  formX1: number;
  formY1: number;
  /** true when at least one formation quad projected in front of the camera. */
  formLive: boolean;
  /** 0-1 weight of the PULL-BACK formation (Slabs writes, the plate reads). */
  formW: number;
  /** 0-1 weight of the second vantage — the low, tilted pass at the triangle. */
  formThru: number;
  /** Clock stamp of the frame the bounds above belong to. */
  formT: number;
}

export const stage: StageState = {
  speed: 1,
  rush: 0,
  formX0: 0,
  formY0: 0,
  formX1: 0,
  formY1: 0,
  formLive: false,
  formW: 0,
  formThru: 0,
  formT: -1,
};

/**
 * Fold one projected formation quad into the shared bounds.
 *
 * The accumulator resets on the first call of each frame rather than from a
 * privileged "first" subscriber: slabs mount inside Suspense boundaries, so
 * their useFrame order is a texture-loading artefact and nothing may depend on
 * it. Stamping the clock makes the reset order-independent.
 */
export function addFormBounds(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  if (t !== stage.formT) {
    stage.formT = t;
    stage.formX0 = Infinity;
    stage.formY0 = Infinity;
    stage.formX1 = -Infinity;
    stage.formY1 = -Infinity;
    stage.formLive = false;
  }
  if (x0 < stage.formX0) stage.formX0 = x0;
  if (y0 < stage.formY0) stage.formY0 = y0;
  if (x1 > stage.formX1) stage.formX1 = x1;
  if (y1 > stage.formY1) stage.formY1 = y1;
  stage.formLive = true;
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __stage?: StageState }).__stage = stage;
}
