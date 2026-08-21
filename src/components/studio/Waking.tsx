'use client';

// The wait before the room exists — designed as the first beat of the room
// rather than as a spinner in front of it.
//
// Measured: 8.28 MB has to arrive before anything can be drawn (twelve Draco
// meshes plus the decoder that unpacks them), and the first frame took over
// five seconds on the capture harness. Until now the visitor got a flat
// #0a0908 rectangle for all of it, with no indication that anything was
// happening or ever would.
//
// Two rules this follows:
//
//   1. REAL PROGRESS, never a fake timer. A bar that animates on a schedule is
//      lying, and it lies worst on exactly the slow connection where the truth
//      matters most — it reaches 90% and sits there. This reads drei's loading
//      manager, so the number is the number.
//
//   2. IT WAITS FOR EVERYTHING, for now, and that is a deliberate limit worth
//      naming. The Suspense boundaries behind it are split so the room shell —
//      which downloads nothing — no longer waits on 7.55 MB of meshes, but
//      this overlay still covers the room until the last prop lands, so a
//      visitor does not yet SEE that gain. Lifting it when the shell and the
//      console are ready, and letting the dressing resolve into place behind
//      it, is the better experience and needs per-asset tracking rather than
//      one global percentage. Deferred on purpose: props popping in is either
//      "the room assembling itself" or "the site is broken", and which one it
//      reads as depends on art direction that has not been done yet.
//
//   3. IT NEVER OUTLIVES ITS JOB. The overlay is removed on completion rather
//      than faded to zero opacity and left in the tree, because a transparent
//      full-screen element still eats every pointer event underneath it. That
//      failure mode looks exactly like "the doors stopped working".

import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

/** How long the finished state is held before the overlay leaves. Short, but
 *  not zero: snapping away the instant the last byte lands reads as a glitch,
 *  and the room's own opening tilt needs a beat of clean frame to start on. */
const SETTLE_MS = 420;

export function Waking({ reduced }: { reduced: boolean }) {
  const { active, progress, total, errors } = useProgress();
  const [gone, setGone] = useState(false);

  // A GRACE WINDOW, and it is doing real work. The loading manager reports
  // nothing in flight before the first request is registered — which reads
  // identically to "everything has finished" — so trusting it on the first
  // frame flashes the overlay away and straight back. Waiting a beat before
  // believing `active` costs a third of a second on a warm cache and removes
  // the flash entirely.
  //
  // It also covers the case the latch version got wrong: if there is nothing
  // to load at all, `total` stays 0 forever, and a readiness test written as
  // `loaded >= total` on a latched start would never fire and the overlay
  // would sit there permanently over a perfectly good room.
  const [grace, setGrace] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGrace(true), 350);
    return () => clearTimeout(t);
  }, []);
  const ready = grace && !active;

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setGone(true), reduced ? 0 : SETTLE_MS);
    return () => clearTimeout(t);
  }, [ready, reduced]);

  if (gone) return null;

  const pct = total > 0 ? Math.round(progress) : 0;
  const failed = errors.length > 0;

  return (
    <div
      // aria-busy rather than a live region announcing every percent: a screen
      // reader counting to a hundred is not useful, "busy, then done" is.
      role="status"
      aria-busy={!ready}
      aria-label={failed ? 'Some of the studio failed to load' : 'The studio is loading'}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        background: '#0a0908',
        opacity: ready ? 0 : 1,
        transition: reduced ? 'none' : 'opacity .42s ease',
        // Off the moment it starts leaving, so the room is clickable through
        // the fade rather than a beat after it.
        pointerEvents: ready ? 'none' : 'auto',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 'clamp(2.6rem, 9vw, 4.6rem)',
          letterSpacing: '0.14em',
          color: '#e8e4dc',
          // Lifts with the load. The number is the room arriving, so the
          // brightest it gets is the moment it is there.
          opacity: 0.22 + (pct / 100) * 0.55,
          transition: reduced ? 'none' : 'opacity .5s ease',
        }}
      >
        137
      </span>

      {/* A rule that fills, not a bar in a box. The room has no chrome in it
          and neither should the thing standing in front of the room. */}
      <span
        aria-hidden="true"
        style={{ position: 'relative', width: 'min(220px, 42vw)', height: 1, background: '#3a2d29' }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left',
            transform: `scaleX(${pct / 100})`,
            background: '#d9a441',
            transition: reduced ? 'none' : 'transform .3s ease',
          }}
        />
      </span>

      <span
        aria-hidden="true"
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: failed ? '#c8392f' : '#7d6f6a',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {failed
          // Named, not hidden. A prop that fails to load leaves a hole in a
          // room the visitor cannot diagnose, and "the studio is incomplete"
          // is more honest than pretending nothing is missing.
          ? 'the studio is incomplete'
          : ready
            ? 'waking'
            : `${pct}%`}
      </span>
    </div>
  );
}
