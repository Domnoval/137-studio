// The doors, as a list — derived from the props rather than written twice.
//
// PROPS is the placement table and it is the only place a door's existence is
// declared. Three props currently carry the label THE BUILDS (the machine and
// both monitor banks), which is correct in the room — several objects can lead
// to the same place — and wrong in a menu, where it would be three identical
// entries. So this collapses by label and keeps the first prop as the one the
// camera turns toward.
//
// Deriving instead of hand-listing matters because these two things WILL drift
// otherwise: a door added to studio-data.ts that nobody added here would exist
// for mouse users and not for keyboard users, and that failure is invisible to
// everyone who tests with a mouse.

import { PROPS, SEAT } from './studio-data';
import type { Aim } from './look';

const DEG = Math.PI / 180;

/** Yaw and pitch that put a world point in the centre of the seated view.
 *
 *  three's camera looks down -Z, and with rotation order YXZ a yaw of θ and a
 *  pitch of φ point it along (−sinθ·cosφ, sinφ, −cosθ·cosφ). Setting that
 *  equal to the normalised direction from the eye to the target and solving is
 *  where the two expressions below come from.
 *
 *  Clamped to the same limits the pointer obeys. You are sitting down: a door
 *  behind your shoulder cannot be brought to the centre of the view, and
 *  pretending otherwise would let the keyboard do something the neck cannot. */
function aimAt(x: number, y: number, z: number): Aim {
  const dx = x - SEAT.position[0];
  const dy = y - SEAT.position[1];
  const dz = z - SEAT.position[2];
  const len = Math.hypot(dx, dy, dz) || 1;

  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.asin(dy / len);

  const yawLimit = SEAT.yaw * DEG * 0.5;
  const upLimit = SEAT.pitchUp * DEG * 0.75;
  const downLimit = SEAT.pitchDown * DEG * 0.75;

  return {
    yaw: Math.max(-yawLimit, Math.min(yawLimit, yaw)),
    pitch: Math.max(-downLimit, Math.min(upLimit, pitch)),
  };
}

export type Door = {
  label: string;
  /** Where to look so this door is what you are facing. */
  aim: Aim;
  /** Whether there is anything behind it yet. Shown honestly in the menu —
   *  a list that offers four doors and delivers one placeholder four times
   *  teaches a visitor that nothing here is real. */
  built: boolean;
};

export const DOORS: Door[] = (() => {
  const seen = new Set<string>();
  const out: Door[] = [];
  for (const p of PROPS) {
    if (p.door === null || seen.has(p.door)) continue;
    seen.add(p.door);
    // Aim at the middle of the prop rather than its base — `position[1]` is
    // where the object stands, and looking at a door's feet is not looking at
    // the door.
    out.push({
      label: p.door,
      aim: aimAt(p.position[0], p.position[1] + p.height / 2, p.position[2]),
      built: false,
    });
  }
  return out;
})();
