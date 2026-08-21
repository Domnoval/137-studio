// ─────────────────────────────────────────────────────────────────────────────
// MACHINE STORE — single source of truth for the room. Zustand + localStorage.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { create } from "zustand";
import type { Bits, StateDef } from "./stateTable";
import { bitsToIndex, stateFor, STATE_TABLE } from "./stateTable";
import { initSubject, readSubject, writeSubject, toolsArmed } from "./subject";
import {
  FIRST_VISIT,
  RETURNING,
  STATE_LINE,
  LEVER_LINE,
  LOAD_LINES,
  CRT_ENTER,
  CRT_LEAVE,
  TOOLS_ARMED,
} from "./copy";

interface MachineState {
  bits: Bits;
  state: StateDef;
  subjectId: number;
  visits: number;
  returning: boolean;
  armed: boolean;
  visited: number[];
  inCrt: boolean;
  events: string[];

  flipLever: (i: number) => void;
  setState: (index: number) => void;
  enterCrt: () => void;
  leaveCrt: () => void;
  resetSubject: () => void;
  focus: string | null;
  setFocus: (f: string | null) => void;
}

// boot the subject once (module scope — runs on first client import)
const boot = initSubject();
const initialBits: Bits = boot.record.lastBits as Bits;

function persist(record: {
  bits: Bits;
  subjectId: number;
  visits: number;
  visited: number[];
}) {
  const existing = readSubject();
  if (!existing) return;
  writeSubject({ ...existing, lastBits: record.bits, visited: record.visited });
}

export const useMachine = create<MachineState>((set, get) => {
  const push = (line: string) =>
    set((s) => ({ events: [...s.events.slice(-24), line] }));

  return {
    bits: initialBits,
    state: stateFor(initialBits),
    subjectId: boot.record.id,
    visits: boot.record.visits,
    returning: boot.isReturning,
    armed: toolsArmed(boot.record.visits),
    visited: boot.record.visited,
    inCrt: false,
    events: [],
    focus: null,

    flipLever: (i) => {
      const bits: Bits = [...get().bits] as Bits;
      bits[i] = bits[i] === 1 ? 0 : 1;
      const state = stateFor(bits);
      set((s) => ({
        bits,
        state,
        visited: s.visited.includes(state.index)
          ? s.visited
          : [...s.visited, state.index],
      }));
      push(LEVER_LINE(i, bits[i]));
      push(STATE_LINE(state));
      persist(get());
    },

    setState: (index) => {
      const state = STATE_TABLE[index];
      set((s) => ({
        bits: state.bits,
        state,
        visited: s.visited.includes(index)
          ? s.visited
          : [...s.visited, index],
      }));
      push(STATE_LINE(state));
      persist(get());
    },

    enterCrt: () => {
      push(CRT_ENTER);
      set({ inCrt: true });
    },

    leaveCrt: () => {
      push(CRT_LEAVE);
      set({ inCrt: false });
    },

    resetSubject: () => {
      const fresh = initSubject();
      set({
        subjectId: fresh.record.id,
        visits: fresh.record.visits,
        returning: fresh.isReturning,
        bits: [0, 0, 0, 0],
        state: stateFor([0, 0, 0, 0]),
        visited: [],
        armed: toolsArmed(fresh.record.visits),
      });
    },

    setFocus: (f) => set({ focus: f }),
  };
});

// Seed the opening teletype lines once the store exists.
export function seedOpeningLines() {
  const s = useMachine.getState();
  if (s.events.length > 0) return;
  const lines: string[] = [];
  if (s.returning) {
    lines.push(RETURNING(s.subjectId, s.state.name));
  } else {
    lines.push(FIRST_VISIT(s.subjectId));
  }
  LOAD_LINES.forEach((l) => lines.push(l));
  lines.push(STATE_LINE(s.state));
  if (s.armed) lines.push(TOOLS_ARMED);
  useMachine.setState({ events: lines });
}