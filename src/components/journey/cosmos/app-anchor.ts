// cosmos/app-anchor.ts — OWNED BY COSMOS agent.
//
// THE ONE PLACE AN APP CALLOUT'S POSITION IS DECIDED.
//
// The app waypoints used to be plain 3D objects at fixed helix coordinates,
// with only their TYPE checked against the safe frame. That produced the exact
// bug a juror can point at: the identical module rendered with its wireframe
// glyph amputated by the left viewport edge at one scroll depth and sitting
// comfortably inside the frame at another. A callout is not scenery — it is an
// annotation of the corridor — so its position is composed, not inherited.
//
// Every frame, for every node, this module:
//   1. projects the node and the node's own silhouette radius,
//   2. DOCKS the result into the safe frame (which already clears the HUD rail
//      on the right and the phase mark bottom-left) so the whole wire, not just
//      its centre, is inside — the callout can slide along the inset, it can
//      never be cut by it,
//   3. refuses outright when docking would have to drag the node further than
//      MAX_PULL — a callout yanked half a screen has stopped describing where
//      it is, and at that point the honest answer is not to render it,
//   4. and hands back BOTH the docked screen point (for the chip and its
//      leader) and the docked world point (for the wireframe solid), so the two
//      can never disagree about where the callout is.
//
// Labels.tsx and AppsConstellation.tsx both read from here. Neither computes a
// position of its own.

import * as THREE from 'three';
import type { AppNode } from './cosmos-data';

/**
 * World-space half-extent of a waypoint's wireframe solid: the largest geometry
 * radius (tetrahedron, 0.34), its ±0.08 idle float and the 1.2x hover scale,
 * rounded up. AppsConstellation must not draw anything larger.
 */
export const NODE_R = 0.52;

/** Extra px of air demanded around the projected wire. */
const PAD = 10;

/**
 * The safe frame, in px. Identical to the one Labels.tsx places type inside:
 * left/top 56, right 104 (clear of the scroll rail), bottom 70 (clear of the
 * phase mark). On a 390px phone that leaves a 230px-wide live band, which is
 * why a docked callout is worth more than a discarded one.
 */
const INSET = { left: 56, top: 56, right: 104, bottom: 70 };

/** Max docking distance, as a fraction of the smaller viewport dimension. */
const MAX_PULL = 0.34;

const proj = new THREE.Vector3();
const edge = new THREE.Vector3();

export interface AppAnchor {
  /** docked screen position of the node centre */
  x: number;
  /** docked screen position of the node centre */
  y: number;
  /** projected silhouette radius incl. pad — the wire fits inside this */
  r: number;
  /** false ⇒ this callout does not render, at all, this frame */
  ok: boolean;
}

export function makeAppAnchor(): AppAnchor {
  return { x: 0, y: 0, r: 0, ok: false };
}

/**
 * Dock one waypoint into the safe frame. Writes the docked world position into
 * `world` and the docked screen geometry into `out`.
 */
export function appAnchor(
  node: AppNode,
  camera: THREE.Camera,
  w: number,
  h: number,
  world: THREE.Vector3,
  out: AppAnchor,
): AppAnchor {
  proj.set(node.x, node.y, node.z).project(camera);
  if (proj.z > 1) {
    out.ok = false;
    return out;
  }
  const ax = (proj.x * 0.5 + 0.5) * w;
  const ay = (-proj.y * 0.5 + 0.5) * h;

  edge.set(node.x + NODE_R, node.y + NODE_R, node.z).project(camera);
  const r =
    Math.max(
      Math.abs((edge.x * 0.5 + 0.5) * w - ax),
      Math.abs((-edge.y * 0.5 + 0.5) * h - ay),
    ) + PAD;

  const x0 = INSET.left + r;
  const y0 = INSET.top + r;
  const x1 = w - INSET.right - r;
  const y1 = h - INSET.bottom - r;
  if (x1 <= x0 || y1 <= y0) {
    out.ok = false;
    return out;
  }

  const cx = ax < x0 ? x0 : ax > x1 ? x1 : ax;
  const cy = ay < y0 ? y0 : ay > y1 ? y1 : ay;
  const pull = Math.hypot(cx - ax, cy - ay);
  if (pull > Math.min(w, h) * MAX_PULL) {
    out.ok = false;
    return out;
  }

  out.x = cx;
  out.y = cy;
  out.r = r;
  out.ok = true;

  if (pull > 0.01) {
    // same depth plane, new screen point → the docked world position
    proj.x = (cx / w) * 2 - 1;
    proj.y = -((cy / h) * 2 - 1);
    world.copy(proj).unproject(camera);
  } else {
    world.set(node.x, node.y, node.z);
  }
  return out;
}
