'use client';

/**
 * GENESIS — the 8-stage embryology of Metatron's Cube.
 *
 * A self-contained canvas-2D animation with a hand-rolled 3D projector,
 * reconstructed from the GENESIS handoff brief and folded into the site as a
 * first-class route. The §0 contract is the whole point:
 *
 *   Two voices — GOLD (form / geometry) and CYAN (life / process) — begin
 *   FUSED in a single white-hot point, DIFFERENTIATE as complexity unfolds,
 *   REUNITE on the Platonic solids (the radiolarian IS an icosahedron — form
 *   and life coincide), then collapse back to the origin: one becoming many
 *   while staying whole.
 *
 * Colour fusion is never decided here — it comes from `sepAt()` in the
 * timeline and `voice()` in the palette, so the contract lives in one place.
 *
 * The no-clock law: nothing animates until the user touches the void. Audio
 * is bound to that same gesture and never autoplays.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { PALETTE, rgba, voice, type RGB } from '@/lib/genesis/palette';
import {
  hexLattice,
  metatronPoints,
  metatronEdges,
  project,
  SOLIDS,
  type Pt,
} from '@/lib/genesis/geometry';
import {
  T_END,
  FOCAL,
  sepAt,
  stageAt,
  originGlow,
  clamp01,
  easeInOut,
  easeOut,
} from '@/lib/genesis/timeline';

// Frame used for the prefers-reduced-motion still: the fully-drawn Cube, the
// most legible single image of the whole idea.
const STILL_T = 40;

// ── envelope helper ──────────────────────────────────────────────────────────
// A stage "owns" a window of the timeline; this fades it 0→1→1→0 across
// (in → full → out), so each form hands off to the next as an embryology.
function band(t: number, a: number, b: number, c: number, d: number): number {
  if (t <= a || t >= d) return 0;
  if (t < b) return easeInOut((t - a) / (b - a));
  if (t < c) return 1;
  return 1 - easeInOut((t - c) / (d - c));
}

// ── low-level draws (all run under 'lighter' compositing for the glow look) ──
function ring(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  c: RGB,
  alpha: number,
  lw = 1.4,
  blur = 10,
) {
  if (alpha <= 0.001 || r <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(c, alpha);
  ctx.lineWidth = lw;
  ctx.shadowColor = rgba(c, alpha * 0.8);
  ctx.shadowBlur = blur;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  c: RGB,
  alpha: number,
  blur = 12,
) {
  if (alpha <= 0.001) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = rgba(c, alpha);
  ctx.shadowColor = rgba(c, alpha);
  ctx.shadowBlur = blur;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c: RGB,
  alpha: number,
  lw = 1,
  blur = 6,
) {
  if (alpha <= 0.001) return;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = rgba(c, alpha);
  ctx.lineWidth = lw;
  ctx.shadowColor = rgba(c, alpha * 0.7);
  ctx.shadowBlur = blur;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** Soft radial glow used for the origin point / white-hot core. */
function coreGlow(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: RGB,
  alpha: number,
) {
  if (alpha <= 0.001) return;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(c, alpha));
  g.addColorStop(0.4, rgba(c, alpha * 0.5));
  g.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── the solids procession (42→50s), dwelling on the icosahedron ──────────────
// Weighted segments; the icosahedron (the radiolarian) gets double dwell as
// the reunion moment. Edges are the FORM voice, vertices the LIFE voice — and
// because separation has fallen by now, voice() pulls both toward white: the
// two voices visibly merge on the living solid.
const SOLID_BOUNDS = (() => {
  const w = [1, 1, 1, 1, 2];
  const total = w.reduce((s, x) => s + x, 0);
  let acc = 0;
  return w.map((x) => {
    const s = acc / total;
    acc += x;
    return [s, acc / total] as [number, number];
  });
})();

function drawSolids(
  ctx: CanvasRenderingContext2D,
  t: number,
  R: number,
  gold: RGB,
  cyan: RGB,
  env: number,
) {
  const local = clamp01((t - 42) / (50 - 42));
  const ax = t * 0.31;
  const ay = t * 0.47;
  const az = t * 0.12;
  const scale = R * 0.82;
  const ov = 0.035; // crossfade overlap between solids

  SOLIDS.forEach((solid, i) => {
    const [s, e] = SOLID_BOUNDS[i];
    const a0 = i === 0 ? -1 : s - ov;
    const a3 = i === SOLIDS.length - 1 ? 2 : e + ov;
    const segAlpha = band(local, a0, s + ov, e - ov, a3) * env;
    if (segAlpha <= 0.01) return;

    const pts = solid.verts.map((v) => project(v, ax, ay, az, FOCAL));
    // edges = form (gold)
    for (const [a, b] of solid.edges) {
      const pa = pts[a];
      const pb = pts[b];
      const depth = (pa.z + pb.z) / 2;
      const fog = clamp01(0.45 + (1 - depth) * 0.4); // nearer = brighter
      line(
        ctx,
        pa.x * scale,
        pa.y * scale,
        pb.x * scale,
        pb.y * scale,
        gold,
        segAlpha * fog * 0.85,
        1.1,
        7,
      );
    }
    // vertices = life (cyan)
    for (const p of pts) {
      const fog = clamp01(0.5 + (1 - p.z) * 0.4);
      dot(ctx, p.x * scale, p.y * scale, 2.4, cyan, segAlpha * fog, 10);
    }
  });
}

/**
 * Render one frame of the piece at clock `t`. Pure given (ctx, size, t):
 * called by the RAF loop and by the reduced-motion still.
 */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
) {
  // ground
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(PALETTE.void, 1);
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) * 0.3;
  const sep = sepAt(t);
  const gold = voice(PALETTE.gold, sep);
  const cyan = voice(PALETTE.signal, sep);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = 'lighter';

  // Collapse implosion (50→54s): the whole form scales toward the point.
  const collapse = clamp01((t - 50) / (T_END - 50));
  const formScale = 1 - easeInOut(collapse) * 0.92;
  ctx.save();
  ctx.scale(formScale, formScale);

  // 1 · POINT — already a white-hot core (drawn below as the origin glow).

  // 2 · VESICA — the point divides into two circles (first differentiation:
  //     one gold, one cyan), each passing through the other's centre.
  const eVesica = band(t, 4, 5.5, 9.5, 12);
  if (eVesica > 0) {
    const rv = R * 0.5;
    const pV = clamp01((t - 4) / 3);
    const off = (rv / 2) * easeOut(pV);
    ring(ctx, -off, 0, rv, gold, eVesica * 0.9, 1.6, 14);
    ring(ctx, off, 0, rv, cyan, eVesica * 0.9, 1.6, 14);
  }

  // 3 · SEED OF LIFE — 7 circles, revealed outward (growth = life/cyan).
  const eSeed = band(t, 11, 13, 17.5, 21);
  if (eSeed > 0) {
    const rs = R * 0.26;
    const seed = hexLattice(1, rs);
    const pS = clamp01((t - 11) / 6);
    const shown = Math.ceil(pS * seed.length);
    seed.slice(0, shown).forEach((c, i) => {
      const pop = i === shown - 1 ? clamp01((pS * seed.length) % 1) : 1;
      ring(ctx, c.x, c.y, rs, cyan, eSeed * (0.4 + 0.5 * pop), 1.4, 11);
    });
  }

  // 4 · FLOWER OF LIFE — 19 circles, the full bloom.
  const eFlower = band(t, 19, 21, 25.5, 29);
  if (eFlower > 0) {
    const rf = R * 0.18;
    const flower = hexLattice(2, rf);
    const pF = clamp01((t - 19) / 6);
    const shown = Math.ceil(pF * flower.length);
    flower.slice(0, shown).forEach((c) => {
      ring(ctx, c.x, c.y, rf, cyan, eFlower * 0.5, 1.1, 8);
    });
  }

  // 5 · FRUIT OF LIFE — the 13 nodes resolve out of the flower.
  const mPts: Pt[] = metatronPoints(R * 0.42);
  const eFruit = band(t, 27, 29, 33, 36);
  if (eFruit > 0) {
    const pFr = clamp01((t - 27) / 5);
    mPts.forEach((c, i) => {
      const delay = (i / mPts.length) * 0.5;
      const a = clamp01((pFr - delay) / 0.5);
      ring(ctx, c.x, c.y, R * 0.13, cyan, eFruit * 0.35 * a, 1, 7);
      dot(ctx, c.x, c.y, 2.6, gold, eFruit * a, 12);
    });
  }

  // 6 · METATRON'S CUBE — all 78 chords (form/gold) drawn shortest-first.
  const eCube = band(t, 34, 36, 41.5, 44);
  if (eCube > 0) {
    const edges = metatronEdges(mPts);
    const pC = clamp01((t - 34) / 7);
    const shown = Math.floor(easeInOut(pC) * edges.length);
    for (let k = 0; k < shown; k++) {
      const [a, b] = edges[k];
      line(ctx, mPts[a].x, mPts[a].y, mPts[b].x, mPts[b].y, gold, eCube * 0.5, 1, 5);
    }
    mPts.forEach((c) => dot(ctx, c.x, c.y, 2.2, gold, eCube * 0.9, 10));
  }

  // 7 · PLATONIC SOLIDS — the 3D procession, reuniting on the icosahedron.
  const eSolids = band(t, 42, 44, 49.5, 51.5);
  if (eSolids > 0) drawSolids(ctx, t, R, gold, cyan, eSolids);

  ctx.restore(); // end form-scale

  // The origin point — present at both poles (bright), faint between. This is
  // the "one" that the many never leave. Brightens hard during collapse.
  const og = originGlow(t);
  coreGlow(ctx, R * (0.5 + og * 1.4), PALETTE.fused, 0.06 + og * 0.5);
  dot(ctx, 0, 0, 1.5 + og * 3.5, PALETTE.fused, 0.5 + og * 0.5, 18 + og * 30);

  ctx.restore(); // end translate

  // Vignette (normal compositing) — keep the edges in shadow.
  ctx.globalCompositeOperation = 'source-over';
  const vg = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Corner mark: stage name (Cormorant) + technical glyph/clock (mono).
  const { stage } = stageAt(t);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = rgba(PALETTE.chalk, 0.5);
  ctx.font = "300 18px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(stage.name, 28, H - 40);
  ctx.fillStyle = rgba(PALETTE.chalk, 0.32);
  ctx.font = "300 10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillText(
    `${stage.glyph}   t ${t.toFixed(1)} / ${T_END.toFixed(0)}s`,
    28,
    H - 24,
  );
}

// ── gesture-bound audio: a "vesica fifth" drone ──────────────────────────────
// Synthesised (Web Audio), so there is no asset to 404 and no autoplay. A root
// tone with a perfect fifth (3:2) above it — the same interval the geometry
// draws at the vesica — that swells in as the form differentiates and settles
// as it reunites. To swap in the Suno score later, replace this engine with an
// <audio src="/audio/genesis.mp3"> started in start() / toggled in setMuted()
// (see public/audio/README.md).
class DroneEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private fifthGain: GainNode | null = null;
  private target = 0.11;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0; // muted by default — the glyph unmutes
    master.connect(ctx.destination);

    const mkVoice = (freq: number, type: OscillatorType, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return g;
    };

    mkVoice(110, 'sine', 0.6); // root drone (A2)
    mkVoice(110, 'triangle', 0.12); // faint body
    this.fifthGain = mkVoice(164.81, 'sine', 0.0); // the fifth (E3), swells in
    mkVoice(220, 'sine', 0.05); // soft octave shimmer

    this.ctx = ctx;
    this.master = master;
    void ctx.resume();
  }

  /** Loose sync: swell the fifth as the piece differentiates (no frame-lock). */
  update(t: number) {
    if (!this.ctx || !this.fifthGain) return;
    const swell = sepAt(t) * 0.4; // tracks the contract curve
    this.fifthGain.gain.setTargetAtTime(swell, this.ctx.currentTime, 0.3);
  }

  setMuted(muted: boolean) {
    if (!this.ctx || !this.master) return;
    void this.ctx.resume();
    this.master.gain.setTargetAtTime(
      muted ? 0 : this.target,
      this.ctx.currentTime,
      0.25,
    );
  }

  stop() {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
      this.fifthGain = null;
    }
  }
}

export default function GenesisCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const audioRef = useRef<DroneEngine | null>(null);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0); // 0→1, drives the scrubber

  // prefers-reduced-motion as an external store — no setState-in-effect, and
  // SSR-safe (server snapshot is always false).
  const reduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );

  // Resize / DPR handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      // Redraw the current frame on resize so a paused/reduced view stays crisp.
      renderFrame(ctx, w, h, clockRef.current);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The RAF loop. Only runs once started; never before the gesture.
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Reduced motion: a single composed still, no animation, no scrubber.
    if (reduced) {
      clockRef.current = STILL_T;
      const { w, h } = sizeRef.current;
      renderFrame(ctx, w, h, STILL_T);
      return;
    }

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;

      if (!pausedRef.current) {
        clockRef.current = Math.min(clockRef.current + dt, T_END);
      }
      const { w, h } = sizeRef.current;
      renderFrame(ctx, w, h, clockRef.current);
      audioRef.current?.update(clockRef.current);
      setProgress(clockRef.current / T_END);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [started, reduced]);

  // Teardown audio on unmount.
  useEffect(() => () => audioRef.current?.stop(), []);

  const seek = useCallback(
    (t: number) => {
      const next = Math.max(0, Math.min(t, T_END));
      clockRef.current = next;
      setProgress(next / T_END);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        const { w, h } = sizeRef.current;
        renderFrame(ctx, w, h, next);
      }
    },
    [],
  );

  const togglePause = useCallback(() => {
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  }, []);

  const restart = useCallback(() => {
    clockRef.current = 0;
    lastTsRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setProgress(0);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const start = useCallback(() => {
    // The gesture: begins the clock AND unlocks audio in one move. Audio init
    // must never block the animation — if the AudioContext can't be created
    // (headless, locked-down browser), we still start the piece silently.
    setStarted(true);
    try {
      audioRef.current = new DroneEngine();
      audioRef.current.start(); // starts muted; glyph unmutes
    } catch {
      audioRef.current = null;
    }
  }, []);

  // Keyboard controls (active once started).
  useEffect(() => {
    if (!started || reduced) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'ArrowRight':
          seek(clockRef.current + 2);
          break;
        case 'ArrowLeft':
          seek(clockRef.current - 2);
          break;
        case 'Home':
          seek(0);
          break;
        case 'End':
          seek(T_END);
          break;
        case 'r':
        case 'R':
          restart();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started, reduced, seek, togglePause, restart, toggleMute]);

  const mono = "'JetBrains Mono', ui-monospace, monospace";

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: rgba(PALETTE.void, 1),
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* The void gate. Nothing animates and no sound plays until this is
          touched — the no-clock law and the browser autoplay policy satisfied
          in a single gesture. Mirrors the /137 door rite. */}
      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label="Touch the void to begin"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            border: 'none',
            background: `radial-gradient(ellipse at center, ${rgba(
              PALETTE.void,
              0.2,
            )} 0%, ${rgba(PALETTE.void, 0.85)} 70%, #000 100%)`,
            color: rgba(PALETTE.chalk, 0.9),
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5vmin',
            fontFamily: mono,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 'clamp(8px, 1.6vmin, 14px)',
              height: 'clamp(8px, 1.6vmin, 14px)',
              borderRadius: '50%',
              background: rgba(PALETTE.fused, 0.95),
              boxShadow: `0 0 24px ${rgba(PALETTE.fused, 0.8)}, 0 0 60px ${rgba(
                PALETTE.gold,
                0.4,
              )}, 0 0 100px ${rgba(PALETTE.signal, 0.3)}`,
              animation: 'fadeIn 2s ease-in-out',
            }}
          />
          <span
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              opacity: 0.75,
              paddingLeft: '0.45em',
            }}
          >
            Touch the void
          </span>
          {reduced && (
            <span
              style={{
                fontSize: '0.55rem',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.4,
              }}
            >
              reduced motion · single frame
            </span>
          )}
        </button>
      )}

      {/* Controls — only after the gesture, and hidden under reduced motion. */}
      {started && !reduced && (
        <>
          {/* Mute / unmute glyph, top-right corner mark. */}
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute score' : 'Mute score'}
            style={{
              position: 'absolute',
              top: 'clamp(64px, 9vmin, 76px)', // clear the global Nav bar
              right: 'clamp(12px, 2vmin, 24px)',
              zIndex: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: rgba(PALETTE.chalk, muted ? 0.4 : 0.8),
              fontFamily: mono,
              fontSize: '0.62rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              padding: '6px',
            }}
          >
            {muted ? '♪ off' : '♪ on'}
          </button>

          {/* Scrubber — click/drag to seek. Thin corner-mark aesthetic. */}
          <div
            role="slider"
            aria-label="Scrub timeline"
            aria-valuemin={0}
            aria-valuemax={Math.round(T_END)}
            aria-valuenow={Math.round(progress * T_END)}
            tabIndex={0}
            onPointerDown={(e) => {
              const el = e.currentTarget;
              el.setPointerCapture(e.pointerId);
              const rect = el.getBoundingClientRect();
              const move = (clientX: number) =>
                seek(((clientX - rect.left) / rect.width) * T_END);
              move(e.clientX);
              const onMove = (ev: PointerEvent) => move(ev.clientX);
              const onUp = () => {
                el.releasePointerCapture(e.pointerId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
            style={{
              position: 'absolute',
              left: '28px',
              right: '28px',
              bottom: '14px',
              height: '14px',
              zIndex: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '2px',
                background: rgba(PALETTE.chalk, 0.12),
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${progress * 100}%`,
                  background: rgba(PALETTE.gold, 0.55),
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${progress * 100}%`,
                  top: '50%',
                  width: '6px',
                  height: '6px',
                  marginLeft: '-3px',
                  marginTop: '-3px',
                  borderRadius: '50%',
                  background: rgba(PALETTE.fused, 0.9),
                }}
              />
            </div>
          </div>

          {/* Play / pause hint, bottom-right. */}
          <button
            type="button"
            onClick={togglePause}
            aria-label={paused ? 'Play' : 'Pause'}
            style={{
              position: 'absolute',
              right: 'clamp(12px, 2vmin, 24px)',
              bottom: '30px',
              zIndex: 12,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: rgba(PALETTE.chalk, 0.55),
              fontFamily: mono,
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            {paused ? '▶ play' : '❚❚ pause'}
          </button>
        </>
      )}
    </div>
  );
}
