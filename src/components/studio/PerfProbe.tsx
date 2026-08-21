'use client';

// A window onto what the renderer is actually doing, for `?perf=1`.
//
// The room's cost lives entirely inside a canvas: draw calls, triangles,
// resident textures, how long the first frame took to appear. None of it is
// reachable from outside, so without this a performance claim can only ever be
// somebody's impression of smoothness — and impressions are what put this room
// four stops underexposed for months.
//
// Off unless asked for. It writes to a DOM attribute once a second rather than
// to React state, because state here re-renders Studio and rebuilds the whole
// post-processing chain; a profiler that changes the thing it profiles is
// worse than no profiler.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function PerfProbe({ enabled }: { enabled: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const node = useRef<HTMLDivElement | null>(null);

  // Frame times, not an averaged rate. A mean fps hides exactly the thing
  // worth finding — one 300 ms frame inside an otherwise smooth second is a
  // visible hitch and barely moves the average.
  const frames = useRef<number[]>([]);
  const firstFrameAt = useRef(0);
  const lastReport = useRef(0);

  // ONE FRAME'S WORTH OF DRAW CALLS, held between reports.
  //
  // `gl.info.render` is cleared at the start of every `renderer.render()`
  // call, and this room renders several times per frame: the scene, then each
  // pass of the post chain, plus the fold's own render target while a
  // transition is running. Sampling it from a useFrame callback therefore
  // reads whichever render happened to go last — which, once the composer was
  // in place, was its final fullscreen blit. The probe dutifully reported
  // 1 draw call and 1 triangle for a room drawing three hundred thousand of
  // them, and the recorded baseline's 34 / 368,959 was the same instrument
  // catching a different moment rather than a different truth.
  //
  // So autoReset goes off and the reset happens here, once per frame, after
  // sampling. Each sample is then the complete cost of the frame that just
  // finished — scene AND post — regardless of what order anything ran in.
  // Deliberately NOT solved with useFrame priorities: giving this probe a
  // priority would switch r3f into manual-render mode, which is a profiler
  // changing the thing it profiles.
  const perFrame = useRef({ calls: 0, triangles: 0, passes: 0 });
  const lastPassCount = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const info = gl.info;
    info.autoReset = false;
    return () => { info.autoReset = true; };
  }, [enabled, gl]);

  useEffect(() => {
    if (!enabled) return;
    const el = document.createElement('div');
    el.id = 'studio-perf';
    el.style.display = 'none';
    document.body.appendChild(el);
    node.current = el;
    return () => {
      el.remove();
      node.current = null;
    };
  }, [enabled]);

  useFrame((_, dt) => {
    if (!enabled) return;
    const now = performance.now();

    if (firstFrameAt.current === 0) {
      // Everything before this is navigation, bundle, compile and asset decode
      // — the wait a visitor actually experiences before the room exists.
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
      firstFrameAt.current = Math.round(now - (nav ? nav.startTime : 0));
    }
    // Written every report, not once at capture. The first frame can arrive
    // BEFORE the effect that creates the reporting node — which it did, and
    // the baseline duly recorded a first frame of 0 ms. A measurement that
    // silently reports zero is worse than one that reports nothing.
    node.current?.setAttribute('data-first-frame-ms', String(firstFrameAt.current));

    frames.current.push(dt * 1000);
    if (frames.current.length > 240) frames.current.shift();

    // Sample the frame that just completed, then clear for the next one.
    //
    // `passes` is the number of times renderer.render() ran, and it is the
    // single most useful number here: every shadow-casting light redraws the
    // whole scene, the SSAO pass needs depth and normals, and each post effect
    // is another pass. A triangle count that looks alarming is usually one
    // scene drawn several times, and the fix for that is a different fix.
    perFrame.current = {
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      // A DELTA, not the counter. `info.render.frame` is cumulative and
      // `info.reset()` deliberately does not clear it, so reading it raw
      // reports "renders since page load" while looking exactly like
      // "renders this frame".
      passes: gl.info.render.frame - lastPassCount.current,
    };
    lastPassCount.current = gl.info.render.frame;
    gl.info.reset();

    if (now - lastReport.current < 1000) return;
    lastReport.current = now;

    // MATERIAL GRADES, once, on the first report. The console's per-part
    // grading is code written against an asset that arrives later, and a
    // blockout lit by a warm room looks identical whether it was graded as
    // iron or fell through to the single-material fallback. Reading the
    // materials back off the live scene is the only way to know which
    // happened — the render cannot tell you, and neither can the GLB.
    //
    // Reached from here rather than from the test harness because r3f 9 keeps
    // no handle on the canvas element any more; the scene is only reachable
    // from inside the tree. A seam is more honest than a harness reaching
    // through React internals that will move again.
    // RECOMPUTED EVERY REPORT, and both halves of that matter.
    //
    // Written every report because the element it writes into is created in an
    // effect that runs twice under StrictMode, and a frame landing in the gap
    // writes into a node already detached from the document — the value then
    // exists and is unreachable, which reads exactly like the code never
    // running. That is the first-frame bug this file already fixed once.
    //
    // Computed every report because the first report lands about three seconds
    // in and the props take thirty-five: caching the answer measured a room
    // that contained the shell and nothing else, and reported, with total
    // confidence, that the console had no named parts at all.
    {
      const rows: unknown[] = [];
      let meshes = 0;
      const unnamed: string[] = [];
      try {
        scene.traverse((o) => {
          // `isMesh`, not `instanceof THREE.Mesh`. three tags its own classes
          // with these flags precisely because a bundle can end up holding
          // more than one copy of the library — and when it does, instanceof
          // is false for objects that are unquestionably meshes. This probe
          // reported an empty scene for exactly that reason.
          if (!(o as unknown as { isMesh?: boolean }).isMesh) return;
          meshes++;
          let name = '';
          for (let n: THREE.Object3D | null = o; n && !name; n = n.parent) {
            if (/^(Body_|Trim_|CRT_|Panel_|Knob_|Collision_|FocusAnchor)/.test(n.name)) name = n.name;
          }
          if (!name) { unnamed.push(o.name || '(anon)'); return; }
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial;
          rows.push({
            n: name,
            vis: o.visible,
            r: +(m.roughness ?? -1).toFixed(2),
            m: +(m.metalness ?? -1).toFixed(2),
            e: +(m.envMapIntensity ?? -1).toFixed(2),
            rmap: !!m.roughnessMap,
            c: m.color?.getHexString() ?? '?',
          });
        });
      } catch (e) {
        rows.push({ error: String(e) });
      }
      node.current?.setAttribute(
        'data-grades',
        JSON.stringify({ meshes, parts: rows, other: unnamed }),
      );
    }

    const sorted = [...frames.current].sort((a, b) => a - b);
    const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
    const info = gl.info;

    node.current?.setAttribute(
      'data-perf',
      JSON.stringify({
        frames: sorted.length,
        medianMs: +at(0.5).toFixed(1),
        p95Ms: +at(0.95).toFixed(1),
        worstMs: +at(1).toFixed(1),
        fps: sorted.length ? +(1000 / at(0.5)).toFixed(1) : 0,
        calls: perFrame.current.calls,
        triangles: perFrame.current.triangles,
        passes: perFrame.current.passes,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
      }),
    );
  });

  return null;
}
