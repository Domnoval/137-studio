'use client';

// THE KEYBOARD PATH. Until this existed, a visitor who could not use a mouse
// could not use this site at all — the doors were raycast hit-tests on meshes
// and nothing else.
//
// The shape of the fix matters. The temptation with a 3D scene is to invent a
// focus system inside the canvas: track a selected index, draw a highlight
// ring, listen for arrow keys on window. That produces something that LOOKS
// keyboard-navigable and is invisible to assistive technology, because a
// canvas has no children and there is nothing for a screen reader to read.
//
// So the accessible layer is REAL DOM — a nav of real buttons, in the tab
// order, with real labels — and the 3D is the presentation of it. Focus a
// button and the head turns to face that door; activate it and the same code
// path runs that a click runs. There is one implementation of "open a door",
// not two that can drift.
//
// It is invisible until someone tabs into it, which is the skip-link pattern:
// a permanent menu bolted over the room would answer accessibility by
// abolishing the thing being made accessible.

import { useEffect, useId } from 'react';
import { DOORS } from './doors';
import { setAim, clearAim } from './look';

export function DoorNav({
  onOpen,
  beyond,
}: {
  onOpen: (door: string) => void;
  /** Where the visitor currently is; null is the studio. */
  beyond: string | null;
}) {
  const id = useId().replace(/[:]/g, '');

  // Escape backs out one level, from anywhere, without needing to find a
  // control first. It is the one key everybody already knows.
  useEffect(() => {
    if (beyond === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpen('BACK');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beyond, onOpen]);

  // Release the head if this unmounts mid-focus, or the camera would stay
  // locked on a door that no longer has focus.
  useEffect(() => clearAim, []);

  return (
    <>
      <style>{`
        .${id}-nav {
          position: absolute;
          left: 32px; bottom: 76px;
          display: flex; flex-direction: column; gap: 6px;
          margin: 0; padding: 0;
          z-index: 3;
        }
        .${id}-nav .${id}-hint {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: #7d6f6a;
          opacity: 0; transition: opacity .2s ease;
        }
        .${id}-nav:focus-within .${id}-hint { opacity: 1; }
        .${id}-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.7rem; letter-spacing: 0.24em;
          background: rgba(20, 16, 15, 0.82);
          border: 1px solid #3a2d29;
          color: #e8e4dc;
          padding: 9px 15px;
          text-align: left;
          cursor: pointer;
          /* Present in the tab order and in the accessibility tree at all
             times, but taking up no visual space until it is focused. NOT
             display:none or visibility:hidden — either of those would remove
             it from the tab order and undo the entire point. */
          position: absolute;
          width: 1px; height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
        }
        .${id}-btn:focus-visible {
          position: static;
          width: auto; height: auto;
          overflow: visible;
          clip-path: none;
          outline: 2px solid #d9a441;
          outline-offset: 2px;
        }
        .${id}-btn[data-built='false']::after {
          content: ' · NOT BUILT YET';
          color: #7d6f6a;
        }
        @media (prefers-reduced-motion: reduce) {
          .${id}-nav .${id}-hint { transition: none; }
        }
      `}</style>

      <nav className={`${id}-nav`} aria-label="Doors out of the studio">
        {DOORS.map((d) => (
          <button
            key={d.label}
            type="button"
            className={`${id}-btn`}
            data-built={String(d.built)}
            // Turning to face the focused door is not decoration: it is how a
            // sighted keyboard user can tell what is selected. In a room, the
            // honest way to show selection is to look at it.
            onFocus={() => setAim(d.aim)}
            onBlur={clearAim}
            onClick={() => onOpen(d.label)}
          >
            {d.label}
          </button>
        ))}
        <span className={`${id}-hint`} aria-hidden="true">
          tab · enter to open · esc to return
        </span>
      </nav>
    </>
  );
}
