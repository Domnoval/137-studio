// Where the head is being asked to look, when something other than the pointer
// is asking.
//
// Deliberately a module-level value and not React state. Studio.tsx re-renders
// rebuild @react-three/postprocessing's entire pass chain — it keys a layout
// effect on `children`, which is fresh JSX every render — so a `setState` here
// would recompile shader programs every time focus moved between two doors.
// That lesson cost a bisect once already; the hover label is written straight
// to the DOM for the same reason.
//
// The camera rig reads this every frame. Writers set it and clear it.

export type Aim = { yaw: number; pitch: number };

let aim: Aim | null = null;

/** Take the head. Used by keyboard focus, so tabbing to a door turns to face
 *  it — a sighted keyboard user has to be able to SEE what they have selected,
 *  and in a room the only honest way to show selection is to look at it. */
export function setAim(next: Aim) {
  aim = next;
}

/** Give the head back to the pointer. */
export function clearAim() {
  aim = null;
}

export function getAim(): Aim | null {
  return aim;
}
