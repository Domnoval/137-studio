// ─────────────────────────────────────────────────────────────────────────────
// SUBJECT ENGINE — the room remembers you. Spec: STATE_BIBLE.md §3.
// All persistence is LOCAL (localStorage). No cookies, no accounts.
// ─────────────────────────────────────────────────────────────────────────────
import type { Bits } from "./stateTable";

const KEY = "s137.subject";

export interface SubjectRecord {
  id: number;
  visits: number;
  createdAt: number;
  lastBits: Bits;
  visited: number[]; // state indexes the subject has ever been in
}

export function readSubject(): SubjectRecord | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SubjectRecord) : null;
  } catch {
    return null;
  }
}

export function writeSubject(r: SubjectRecord) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* private mode — the room forgets, quietly */
  }
}

export function makeSubject(): SubjectRecord {
  return {
    id: 10 + Math.floor(Math.random() * 900), // 10..909 — a small, specific number
    visits: 1,
    createdAt: Date.now(),
    lastBits: [0, 0, 0, 0],
    visited: [],
  };
}

// Register this session. Returns the record + whether this is a return visit.
export function initSubject(): { record: SubjectRecord; isReturning: boolean } {
  const existing = readSubject();
  if (!existing) {
    const fresh = makeSubject();
    writeSubject(fresh);
    return { record: fresh, isReturning: false };
  }
  const next = { ...existing, visits: existing.visits + 1 };
  writeSubject(next);
  return { record: next, isReturning: true };
}

// Trust gate — the breakable easter-egg arms at visit >= 3 (Bible §3.4).
export function toolsArmed(visits: number): boolean {
  return visits >= 3;
}