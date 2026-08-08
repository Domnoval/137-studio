'use client';

// OWNED BY ATMOSPHERE agent.
// Custom cursor: small chalk dot + trailing ring with inertia. The ring
// subtly scales up over interactive targets (a[href], button, [data-cursor])
// and contracts on press. mix-blend-mode: difference. Hidden on touch / coarse
// pointers; the system cursor is suppressed (journey.css class on <body>)
// only while the custom cursor is actually active.
// Contract kept: `export function Cursor()` — fixed layer, pointer-events
// none, renders null on mobile/reducedMotion.
// INTEGRATION: zIndex raised 85 → 100 so the cursor stays visible above
// WorkModal (95) — journey.css suppresses the system cursor globally, so any
// overlay above this layer would otherwise leave the user cursorless.
//
// THE LIGHT ACT. The cursor takes no --jp-* token, on purpose: chalk under
// mix-blend-mode: difference resolves to |ground − chalk|, so on the void it
// draws chalk and on the bone plane of the return it draws its own near-void
// inverse — the one piece of chrome that turns over with the world for free.
// The blend mode is load-bearing, not decorative, and it has to sit on the
// LAYER rather than on the dot and ring; see the note on the wrapper below.

import { useEffect, useRef, useState } from 'react';
import { useJourney } from './JourneyContext';

const INTERACTIVE = 'a[href], button, [data-cursor], [role="button"], input, textarea, select, label';

export function Cursor() {
  const { isMobile, reducedMotion } = useJourney();
  const [finePointer, setFinePointer] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Capability: only fine pointers that can hover get a custom cursor.
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability detection
    setFinePointer(mq.matches);
    const onChange = () => setFinePointer(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const active = finePointer && !isMobile && !reducedMotion;

  useEffect(() => {
    if (!active) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let raf = 0;
    let started = false;
    // targets
    let tx = -100;
    let ty = -100;
    // dot (near-instant, tiny smoothing so it feels physical)
    let dx = -100;
    let dy = -100;
    // ring (inertial trail)
    let rx = -100;
    let ry = -100;
    let scale = 1;
    let targetScale = 1;
    let pressed = false;
    let visible = false;

    const setVisible = (v: boolean) => {
      if (visible === v) return;
      visible = v;
      dot.style.opacity = v ? '1' : '0';
      ring.style.opacity = v ? '1' : '0';
    };

    const loop = () => {
      dx += (tx - dx) * 0.62;
      dy += (ty - dy) * 0.62;
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      const want = pressed ? targetScale * 0.82 : targetScale;
      scale += (want - scale) * 0.18;
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        started = true;
        dx = rx = tx;
        dy = ry = ty;
        // System cursor hidden only once ours is genuinely active.
        document.body.classList.add('journey-cursor-active');
        raf = requestAnimationFrame(loop);
      }
      setVisible(true);
    };
    const onOver = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest(INTERACTIVE) : null;
      targetScale = el ? 1.55 : 1;
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    const onLeave = () => setVisible(false);
    const onEnter = () => {
      if (started) setVisible(true);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.documentElement.addEventListener('mouseleave', onLeave);
    document.documentElement.addEventListener('mouseenter', onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      document.documentElement.removeEventListener('mouseenter', onEnter);
      document.body.classList.remove('journey-cursor-active');
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        pointerEvents: 'none',
        // The blend lives HERE, on the layer, not on the dot and ring. A
        // positioned element with a z-index creates an isolated stacking
        // context, so mix-blend-mode on a child blends against that group's
        // own empty backdrop — i.e. not at all. The cursor was silently
        // painting flat chalk, which looks correct on the void and vanishes
        // outright on the return's bone plane (measured 1.01:1 before this).
        // Blending the whole layer against the page restores the intent: the
        // cursor is the inverse of whatever it is over, so it inverts with the
        // light act for free and stays visible over the artwork as well.
        mixBlendMode: 'difference',
      }}
    >
      {/* trailing ring */}
      <div
        ref={ringRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 30,
          height: 30,
          border: '1px solid rgba(232, 228, 220, 0.85)',
          borderRadius: '50%',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          willChange: 'transform',
        }}
      />
      {/* chalk dot */}
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 5,
          height: 5,
          // A hair off chalk on purpose. Difference against the return's bone
          // plane — which IS chalk — would otherwise resolve to #000000, and
          // the system has no pure black in it. At #e2dfd8 the dot inverts to
          // a warm near-void on bone and still reads as chalk on the void.
          background: '#e2dfd8',
          borderRadius: '50%',
          opacity: 0,
          transition: 'opacity 0.3s ease',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
