// ─────────────────────────────────────────────────────────────────────────────
// COPY ENGINE — the machine's voice. Spec: STATE_BIBLE.md §7.
// lowercase teletype fragments. never explains. always confirms.
// ─────────────────────────────────────────────────────────────────────────────
import type { StateDef } from "./stateTable";
import { LEVER_LABELS, LEVER_NAMES } from "./stateTable";

export const FIRST_VISIT = (id: number) =>
  `SUBJECT ${id} — SIGNAL ACQUIRED. you were expected. not for me. for the room.`;

export const RETURNING = (id: number, name: string) =>
  `RETURNING SUBJECT ${id}. the last time you were here it was ${name}. it has been ${name} since.`;

export const STATE_LINE = (s: StateDef) => `${s.name} :: ${s.moodLine}`;

export const LEVER_LINE = (i: number, bit: number) =>
  `${LEVER_NAMES[i]} → ${LEVER_LABELS[i][bit]}`;

export const LOAD_LINES = [
  "loading the receiving room…",
  "waking the ring…",
  "the walls are listening. they are not fast.",
];

export const CRT_ENTER = "crossing the glass… the room folds away behind you.";
export const CRT_LEAVE = "back in the room. it noticed the visit.";

export const TOOLS_ARMED =
  "the tools are yours now. do not break what keeps you.";

export const RESET_DEATH = (id: number) =>
  `SUBJECT ${id} — PREVIOUS SUBJECT LOST. THE ROOM KEEPS NO ASHES.`;