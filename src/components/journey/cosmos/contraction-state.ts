// cosmos/contraction-state.ts — OWNED BY COSMOS agent.
// The single channel through which the CONTRACTION beat is shared between the
// camera rig (which owns the ground colour), the sigil (which owns the
// vanishing point and the mark's projected geometry) and the post chain
// (which owns the warp). No React state: written and read inside useFrame /
// gsap ticker callbacks at zero re-render cost.

export interface ContractionState {
  /** 0-1 radial warp strength — drives the velocity smear in the post chain. */
  warp: number;
  /** 0-1 cold blue-black temperature swing. */
  cool: number;
  /** 0-1 extra, slightly warmer vignette density at the sigil beat. */
  vig: number;
  /** Vanishing point in UV space (0-1, y UP — shader convention). */
  cx: number;
  cy: number;
  /** Projected base of the mark, CSS px from the top-left of the viewport.
   *  The caption baseline-locks to this instead of floating. */
  baseX: number;
  baseY: number;
  baseW: number;
  /** true while the mark is projecting in front of the camera. */
  live: boolean;
}

export const contraction: ContractionState = {
  warp: 0,
  cool: 0,
  vig: 0,
  cx: 0.5,
  cy: 0.5,
  baseX: 0,
  baseY: 0,
  baseW: 0,
  live: false,
};

/** sRGB hex → linear-light triple. The composer buffer is half-float linear,
 *  so raw shaders must write linear values or the ground reads wrong. */
export function srgbToLinear(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const to = (s: string) => {
    const v = parseInt(s, 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return [to(h.slice(0, 2)), to(h.slice(2, 4)), to(h.slice(4, 6))];
}
