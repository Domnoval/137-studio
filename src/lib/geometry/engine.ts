/**
 * The Sacred Geometry controller. `mountGeometry(root)` wires an already-rendered shell
 * (see components/geometry/GeometryStudio.tsx) to the painter, the Studio drawer, Present
 * mode and the optional sound layer, and returns a cleanup function.
 *
 * The drawing is imperative on purpose: a few hundred SVG paths rebuilt per frame while
 * a figure turns is far cheaper as direct DOM writes than as a React tree.
 */

import { MAX_STEPS, NOTES, PATTERN_IDS, PENTAGONAL, PHASES, SPATIAL, TITLES, isPatternId, type PatternId } from './catalog';
import type { Ctx } from './ctx';
import { Painter, svgEl, type Layers } from './painter';
import { mountPresent, type Present } from './present';
import { createResonance, type Resonance } from './resonance';
import { decodeState, defaultPrimitive, encodeState, type Decoded, type Theme } from './share';
import {
  createState,
  isToggleKey,
  sameSnapshot,
  snapshot,
  type PerspectivePoints,
  type Primitive,
  type Snapshot,
  type ViewMode,
} from './state';
import * as S from './studio';
import { mountStudioPanel } from './studio-panel';

const NS = 'http://www.w3.org/2000/svg';
const THEME_KEY = 'sg-theme';
const SOUND_OFF = 'Off by default. Each step sounds a ratio of the figure’s family, rooted at 137 Hz.';
const SOUND_ON = 'Sounding. Hexagonal figures walk fifths, cubic ones the harmonic series, pentagonal ones φ.';

const pad2 = (n: number) => String(n).padStart(2, '0');

export function mountGeometry(root: HTMLElement): () => void {
  const ac = new AbortController();
  try {
    return mountInto(root, ac);
  } catch (err) {
    ac.abort(); // a missing shell id would otherwise leave listeners and the frame loop running
    throw err;
  }
}

function mountInto(root: HTMLElement, ac: AbortController): () => void {
  const { signal } = ac;

  // ───────────────────────────── DOM helpers ─────────────────────────────
  const q: Ctx['q'] = <T extends Element = HTMLElement>(selector: string) => {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`geometry: "${selector}" is missing from the shell markup`);
    return el;
  };
  const qa: Ctx['qa'] = <T extends Element = HTMLElement>(selector: string) =>
    [...root.querySelectorAll<T>(selector)];
  const on: Ctx['on'] = (target, type, handler, options) =>
    target.addEventListener(type, handler as EventListener, { ...options, signal });

  const els = {
    svg: q<SVGSVGElement>('#geometry'),
    layers: {
      grid: q<SVGGElement>('#gridLayer'),
      perspective: q<SVGGElement>('#perspectiveLayer'),
      guides: q<SVGGElement>('#guideLayer'),
      shapes: q<SVGGElement>('#shapeLayer'),
      points: q<SVGGElement>('#pointLayer'),
      overlay: q<SVGGElement>('#overlayLayer'),
    } satisfies Layers,
    pattern: q<HTMLSelectElement>('#pattern'),
    title: q('#patternTitle'),
    note: q('#patternNote'),
    phase: q('#phaseLabel'),
    step: q<HTMLInputElement>('#step'),
    caption: q('#stepCaption'),
    breakpoints: q('#stepBreakpoints'),
    readout: q('#stepReadout'),
    status: q('#statusLine'),
    rotation: q<HTMLInputElement>('#rotation'),
    tilt: q<HTMLInputElement>('#tilt'),
    depth: q<HTMLInputElement>('#depth'),
    weight: q<HTMLInputElement>('#weight'),
    horizon: q<HTMLInputElement>('#horizon'),
    perspectiveControls: q('#perspectiveControls'),
    badge: q('#canvasBadge'),
    play: q<HTMLButtonElement>('#playBtn'),
    speed: q<HTMLSelectElement>('#speed'),
    wrap: q('#canvasWrap'),
    toast: q('#toast'),
    undo: q<HTMLButtonElement>('#undoBtn'),
    redo: q<HTMLButtonElement>('#redoBtn'),
    prev: q<HTMLButtonElement>('#prevBtn'),
    next: q<HTMLButtonElement>('#nextBtn'),
    autoRotate: q<HTMLButtonElement>('#autoRotateBtn'),
    perspectiveLinesBtn: q<HTMLButtonElement>('#perspectiveLinesBtn'),
    phiChip: q<HTMLButtonElement>('#phiChip'),
    fruitChip: q<HTMLButtonElement>('#fruitChip'),
    primitiveNote: q('#primitiveNote'),
    svgTitle: q<SVGTitleElement>('#svgTitle'),
    svgDesc: q<SVGDescElement>('#svgDesc'),
    announce: q('#announce'),
    soundBtn: q<HTMLButtonElement>('#soundBtn'),
    soundNote: q('#soundNote'),
    themeBtn: q<HTMLButtonElement>('#themeBtn'),
  };

  // ───────────────────────────── state ─────────────────────────────
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = createState(reduced);
  const painter = new Painter(state, els.layers);

  const storedTheme = (): Theme => {
    try {
      return localStorage.getItem(THEME_KEY) === 'paper' ? 'paper' : 'void';
    } catch {
      return 'void';
    }
  };
  let theme: Theme = storedTheme();
  const initial = decodeState(location.hash);
  Object.assign(state, initial.state);
  if (initial.theme) theme = initial.theme;
  root.dataset.theme = theme;

  const undoStack: Snapshot[] = [];
  const redoStack: Snapshot[] = [];
  let pendingSnapshot: Snapshot | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let inertia = 0;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  // Present mode is mounted after the handlers that consult it, so they reach it through this holder.
  const live: { present?: Present } = {};
  let resonance: Resonance | null = null;
  const afterRender = new Set<() => void>();

  function updateHistoryButtons() {
    els.undo.disabled = !undoStack.length;
    els.redo.disabled = !redoStack.length;
  }
  function beginChange() {
    if (!pendingSnapshot) pendingSnapshot = snapshot(state);
  }
  function commitChange() {
    if (pendingSnapshot && !sameSnapshot(pendingSnapshot, snapshot(state))) {
      undoStack.push(pendingSnapshot);
      if (undoStack.length > 100) undoStack.shift();
      redoStack.length = 0;
    }
    pendingSnapshot = null;
    updateHistoryButtons();
  }

  function stopPlayback() {
    state.playing = false;
    clearInterval(timer);
    els.play.textContent = '▶';
    els.play.setAttribute('aria-label', 'Play construction');
  }

  function syncPressed() {
    qa('.chip:not(#stReset),.segmented button').forEach(b =>
      b.setAttribute('aria-pressed', String(b.classList.contains('active'))),
    );
  }

  function syncValues() {
    q('#rotationValue').textContent = `${Math.round(state.rotation)}°`;
    q('#tiltValue').textContent = `${Math.round(state.tilt)}°`;
    q('#depthValue').textContent = String(Math.round(state.depth));
    q('#weightValue').textContent = state.weight.toFixed(1);
    const horizon = `${Math.round((1 - state.horizon / 700) * 100)}%`;
    q('#horizonValue').textContent = horizon;
    els.horizon.setAttribute('aria-valuetext', horizon);
    els.weight.setAttribute('aria-valuetext', `${state.weight.toFixed(1)} pt`);
  }

  function syncAllControls() {
    els.pattern.value = state.pattern;
    els.step.value = String(state.step);
    els.rotation.value = String(state.rotation);
    els.tilt.value = String(state.tilt);
    els.depth.value = String(state.depth);
    els.weight.value = String(Math.round(state.weight * 10));
    els.horizon.value = String(state.horizon);
    qa<HTMLButtonElement>('#viewMode button').forEach(x => x.classList.toggle('active', x.dataset.mode === state.mode));
    qa<HTMLButtonElement>('#primitiveMode button').forEach(x =>
      x.classList.toggle('active', x.dataset.primitive === state.primitive),
    );
    qa<HTMLButtonElement>('#perspectiveMode button').forEach(x =>
      x.classList.toggle('active', Number(x.dataset.points) === state.perspectivePoints),
    );
    qa<HTMLButtonElement>('.chip[data-toggle]').forEach(x => {
      const key = x.dataset.toggle;
      if (isToggleKey(key)) x.classList.toggle('active', state[key]);
    });
    els.perspectiveLinesBtn.classList.toggle('active', state.perspectiveLines);
    els.autoRotate.classList.toggle('active', state.autoRotate);
    els.fruitChip.hidden = state.pattern !== 'metatron';
    const phiOk = PENTAGONAL.includes(state.pattern);
    els.phiChip.disabled = !phiOk;
    els.phiChip.title = phiOk
      ? 'Whirling golden squares'
      : 'φ governs the pentagonal figures (dodecahedron, icosahedron). Hexagonal figures run on √3.';
    syncPressed();
    els.perspectiveControls.hidden = state.mode !== 'perspective';
    els.title.textContent = TITLES[state.pattern];
    els.note.textContent = NOTES[state.pattern];
    els.primitiveNote.textContent =
      state.primitive === 'solid'
        ? 'Wireframe spheres with cube center marks.'
        : 'Planar circles with square center marks.';
    syncValues();
  }

  // ───────────────────────────── render ─────────────────────────────
  let lastStatus = '';
  let announced = { pattern: state.pattern, step: state.step };

  // The timeline ticks depend only on the figure, so rebuild them when it changes, not every frame.
  let tickedPattern: PatternId | null = null;
  function drawStepBreakpoints() {
    if (tickedPattern === state.pattern) return;
    tickedPattern = state.pattern;
    const list = PHASES[state.pattern];
    const max = list.length;
    els.breakpoints.replaceChildren();
    let previous = '';
    list.forEach((label, i) => {
      if (i === 0 || label !== previous) {
        const tick = document.createElement('i');
        tick.style.left = `${max === 1 ? 0 : (i / (max - 1)) * 100}%`;
        els.breakpoints.appendChild(tick);
      }
      previous = label;
    });
  }

  function render() {
    painter.paint(els.svg);
    const max = MAX_STEPS[state.pattern];
    const phase = PHASES[state.pattern][state.step - 1] || 'Completion';
    els.step.max = String(max);
    els.step.value = String(state.step);
    els.readout.textContent = `${pad2(state.step)} / ${pad2(max)}`;
    els.caption.textContent = phase;
    els.phase.textContent = `${phase} · Step ${state.step}`;
    els.step.setAttribute('aria-valuetext', `Step ${state.step} of ${max}, ${phase}`);
    els.prev.disabled = state.step <= 1;
    els.next.disabled = state.step >= max;
    drawStepBreakpoints();

    const viewLabel =
      state.mode === 'plan'
        ? '2D · ORTHOGRAPHIC'
        : state.mode === 'axon'
          ? '3D · AXONOMETRIC'
          : `3D · ${state.perspectivePoints}-POINT PERSPECTIVE`;
    els.badge.textContent = `${viewLabel} · ${state.primitive === 'solid' ? 'SOLIDS' : 'PLANAR'}${
      state.multiView && state.mode !== 'plan' ? ' · STUDY SHEET' : ''
    }`;

    const projection = state.mode === 'perspective' ? `${state.perspectivePoints}-pt` : state.mode;
    const status =
      `<span>${TITLES[state.pattern]}</span><span>${projection}</span>` +
      `<span>${state.primitive === 'solid' ? 'wireframe solids' : 'planar forms'}</span>` +
      `<span>${state.weight.toFixed(1)} pt</span><span>${state.darkline ? 'accent ink' : 'neutral ink'}</span>`;
    if (status !== lastStatus) {
      els.status.innerHTML = status;
      lastStatus = status;
    }

    // the drawing's accessible name follows what is on screen
    els.svgTitle.textContent = `${TITLES[state.pattern]}, step ${state.step} of ${max}: ${phase}`;
    els.svgDesc.textContent = `${viewLabel.toLowerCase()}, ${state.primitive === 'solid' ? 'wireframe solids' : 'planar forms'}.`;
    // tell screen-reader users where a deliberate step or figure change landed (not playback / Present ticks)
    if (state.pattern !== announced.pattern || state.step !== announced.step) {
      if (!state.playing && !live.present?.active)
        els.announce.textContent =
          state.pattern !== announced.pattern
            ? `${TITLES[state.pattern]}. ${phase}, step ${state.step} of ${max}`
            : `${phase}, step ${state.step} of ${max}`;
      announced = { pattern: state.pattern, step: state.step };
    }
    renderFrame(false);
  }

  /** The part of a repaint that must run every animation frame: the drawing, then the after-render hooks. */
  function renderFrame(paint = true) {
    if (paint) painter.paint(els.svg);
    afterRender.forEach(fn => fn());
  }

  function setPattern(pattern: PatternId) {
    state.pattern = pattern;
    state.step = 1;
    state.primitive = defaultPrimitive(pattern);
    syncAllControls();
    render();
  }

  function restoreSnapshot(s: Snapshot) {
    stopPlayback();
    inertia = 0;
    pendingSnapshot = null; // never let a half-recorded gesture be committed on top of the restored state
    Object.assign(state, s);
    syncAllControls();
    render();
    updateHistoryButtons();
  }
  function undo() {
    const s = undoStack.pop();
    if (!s) return;
    redoStack.push(snapshot(state));
    restoreSnapshot(s);
  }
  function redo() {
    const s = redoStack.pop();
    if (!s) return;
    undoStack.push(snapshot(state));
    restoreSnapshot(s);
  }

  // ───────────────────────────── context for the sub-modules ─────────────────────────────
  let toastClear: ReturnType<typeof setTimeout> | undefined;
  function toast(message: string) {
    clearTimeout(toastTimer);
    clearTimeout(toastClear);
    // clear first so a repeated message is announced again by the live region
    els.toast.classList.remove('show');
    els.toast.textContent = '';
    requestAnimationFrame(() => {
      els.toast.textContent = message;
      els.toast.classList.add('show');
    });
    toastTimer = setTimeout(
      () => {
        els.toast.classList.remove('show');
        toastClear = setTimeout(() => (els.toast.textContent = ''), 400);
      },
      Math.max(2400, Math.min(7000, message.length * 60)),
    );
  }

  function download(name: string, blob: Blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari and Firefox cancel a slow save if the URL is revoked too soon, and zips can be large
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }

  /** A standalone SVG has no page stylesheet and no custom properties: resolve every var(--token)
   *  to a literal colour and inline the class rules the live page gets from CSS. */
  function screenSvg(): string {
    const css = getComputedStyle(root);
    const T = (n: string) => css.getPropertyValue('--' + n).trim();
    const resolve = (v: string) => v.replace(/var\(--([\w-]+)\)/g, (_, n: string) => T(n));
    const clone = els.svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', NS);
    clone.setAttribute('width', '1800');
    clone.setAttribute('height', '1400');
    clone.querySelectorAll('*').forEach(n => {
      for (const a of [...n.attributes]) {
        if (a.value.includes('var(--')) n.setAttribute(a.name, resolve(a.value));
        if (a.name.startsWith('data-') && a.name !== 'data-kind') n.removeAttribute(a.name);
      }
    });
    const mono = '"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace';
    const label = `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:.08em`;
    const style = svgEl('style');
    style.textContent = [
      'path{fill:none}',
      `text{font-family:${mono}}`,
      `.horizon-handle,.vp-handle{fill:${T('canvas')};stroke:${T('perspective')};stroke-width:1.4}`,
      `.vp-dot{fill:${T('perspective')}}`,
      `.vp-label{${label};letter-spacing:0;fill:${T('perspective')}}`,
      `.study-frame{fill:${T('canvas')};fill-opacity:.92;stroke:${T('strong')};stroke-width:1;stroke-dasharray:5 6}`,
      `.study-label,.draft-label{${label};fill:${T('muted')};paint-order:stroke;stroke:${T('canvas')};stroke-width:3px;stroke-linejoin:round}`,
      `.study-rule{stroke:${T('strong')};stroke-width:.8;stroke-dasharray:3 5}`,
    ].join('\n');
    const bg = svgEl('rect', { width: '900', height: '700', fill: T('canvas') });
    clone.insertBefore(bg, clone.firstChild);
    clone.insertBefore(style, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  }

  const labels = (): S.Labels => ({
    patternTitle: TITLES[state.pattern],
    fileTitle: `${TITLES[state.pattern]} · step ${state.step} · ${state.mode}`,
  });

  function stopAutoRotate() {
    if (!state.autoRotate) return;
    state.autoRotate = false;
    els.autoRotate.classList.remove('active');
    syncPressed();
  }

  const ctx: Ctx = {
    root,
    signal,
    state,
    q,
    qa,
    on,
    labels,
    toast,
    download,
    screenSvg,
    afterRender,
    stopAutoRotate,
  };

  // ───────────────────────────── controls ─────────────────────────────
  on(els.pattern, 'change', () => {
    const value = els.pattern.value;
    if (!isPatternId(value)) return;
    beginChange();
    setPattern(value);
    commitChange();
  });
  qa<HTMLButtonElement>('#viewMode button').forEach(b =>
    on(b, 'click', () => {
      const mode = b.dataset.mode as ViewMode;
      if (state.mode === mode) return;
      beginChange();
      state.mode = mode;
      syncAllControls();
      render();
      commitChange();
    }),
  );
  qa<HTMLButtonElement>('#primitiveMode button').forEach(b =>
    on(b, 'click', () => {
      const primitive = b.dataset.primitive as Primitive;
      if (state.primitive === primitive) return;
      beginChange();
      state.primitive = primitive;
      syncAllControls();
      render();
      commitChange();
    }),
  );
  qa<HTMLButtonElement>('#perspectiveMode button').forEach(b =>
    on(b, 'click', () => {
      const value = Number(b.dataset.points) as PerspectivePoints;
      if (state.perspectivePoints === value) return;
      beginChange();
      state.perspectivePoints = value;
      syncAllControls();
      render();
      commitChange();
    }),
  );

  // keys that actually move a slider; Ctrl/⌘ combinations (undo!) must not start a recorded gesture
  const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);
  const rangeHistory = (el: HTMLElement) => {
    on(el, 'pointerdown', beginChange);
    on<KeyboardEvent>(el, 'keydown', e => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && SLIDER_KEYS.has(e.key)) beginChange();
    });
    on(el, 'change', commitChange);
    on(el, 'blur', commitChange);
  };
  rangeHistory(els.horizon);
  on(els.horizon, 'input', () => {
    state.horizon = Number(els.horizon.value);
    syncValues();
    render();
  });
  on(els.perspectiveLinesBtn, 'click', () => {
    beginChange();
    state.perspectiveLines = !state.perspectiveLines;
    els.perspectiveLinesBtn.classList.toggle('active', state.perspectiveLines);
    syncPressed();
    render();
    commitChange();
  });
  on(els.autoRotate, 'click', () => {
    beginChange();
    state.autoRotate = !state.autoRotate;
    els.autoRotate.classList.toggle('active', state.autoRotate);
    syncPressed();
    render();
    commitChange();
  });

  // weight is stored in tenths on the slider; dividing (not multiplying by 0.1) keeps 14 → exactly 1.4
  const sliders = [
    ['rotation', els.rotation, (v: number) => v],
    ['tilt', els.tilt, (v: number) => v],
    ['depth', els.depth, (v: number) => v],
    ['weight', els.weight, (v: number) => v / 10],
  ] as const;
  for (const [key, el, fromSlider] of sliders) {
    rangeHistory(el);
    on(el, 'input', () => {
      if (key === 'rotation' || key === 'tilt') stopAutoRotate();
      state[key] = fromSlider(Number(el.value));
      syncValues();
      render();
    });
  }

  qa<HTMLButtonElement>('.chip[data-toggle]').forEach(b =>
    on(b, 'click', () => {
      const key = b.dataset.toggle;
      if (!isToggleKey(key)) return;
      beginChange();
      state[key] = !state[key];
      b.classList.toggle('active', state[key]);
      syncPressed();
      render();
      commitChange();
    }),
  );

  rangeHistory(els.step);
  on(els.step, 'input', () => {
    stopPlayback();
    state.step = Number(els.step.value);
    render();
  });
  on(els.prev, 'click', () => {
    if (state.step <= 1) return;
    beginChange();
    stopPlayback();
    state.step--;
    render();
    commitChange();
  });
  on(els.next, 'click', () => {
    if (state.step >= MAX_STEPS[state.pattern]) return;
    beginChange();
    stopPlayback();
    state.step++;
    render();
    commitChange();
  });

  function advance() {
    state.step = state.step >= MAX_STEPS[state.pattern] ? 1 : state.step + 1;
    render();
  }
  function startPlayback() {
    clearInterval(timer);
    timer = setInterval(advance, Number(els.speed.value));
  }
  function togglePlayback() {
    state.playing = !state.playing;
    els.play.textContent = state.playing ? 'Ⅱ' : '▶';
    els.play.setAttribute('aria-label', state.playing ? 'Pause construction' : 'Play construction');
    clearInterval(timer);
    if (state.playing) startPlayback();
  }
  on(els.play, 'click', togglePlayback);
  on(els.speed, 'change', () => {
    if (state.playing) startPlayback();
  });
  on(els.undo, 'click', undo);
  on(els.redo, 'click', redo);

  // ───────────────────────────── keyboard ─────────────────────────────
  on<KeyboardEvent>(document, 'keydown', e => {
    if (live.present?.active) return;
    const target = e.target as HTMLElement | null;
    // inside the Studio drawer or a text/number/select field, native editing and the drawer's own controls win
    if (target?.closest('dialog') || target?.matches('input:not([type=range]),select,textarea')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    // leave Alt+←/→ (browser history), ⌘+←/→, Shift+arrows and screen-reader chords to the browser
    if (mod || e.altKey || e.shiftKey) return;
    const onSlider = !!target?.matches('input[type=range]');
    if (!onSlider && e.key === 'ArrowRight' && state.step < MAX_STEPS[state.pattern]) {
      beginChange();
      stopPlayback();
      state.step++;
      render();
      commitChange();
    }
    if (!onSlider && e.key === 'ArrowLeft' && state.step > 1) {
      beginChange();
      stopPlayback();
      state.step--;
      render();
      commitChange();
    }
    // one-shot toggles: holding the key must not flap Present / Studio or flood the undo history
    if (e.repeat) return;
    const idle = document.activeElement === document.body || els.wrap.contains(document.activeElement);
    if (e.key === ' ' && idle) {
      e.preventDefault();
      togglePlayback();
    } else if (e.key === 'p' || e.key === 'P') {
      live.present?.toggle({ fullscreen: true });
    } else if (e.key === 's' || e.key === 'S') {
      panel.toggle();
    } else if (e.key === '[' || e.key === ']') {
      const next = PATTERN_IDS[(PATTERN_IDS.indexOf(state.pattern) + (e.key === ']' ? 1 : -1) + PATTERN_IDS.length) % PATTERN_IDS.length];
      beginChange();
      setPattern(next);
      commitChange();
    }
  });

  // ───────────────────────────── drag, inertia, auto-rotate ─────────────────────────────
  type Drag =
    | { picker: string }
    | { x: number; y: number; r: number; t: number; lastX: number; lastTime: number; velocity: number };
  let drag: Drag | null = null;

  /** Client pixels to the 900x700 drawing space. Goes through the SVG's own transform, because the
   *  viewBox is letterboxed inside the canvas box on almost every viewport. */
  const eventToSvg = (e: PointerEvent) => {
    const m = els.svg.getScreenCTM();
    if (!m) return { x: 450, y: 350 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  on<PointerEvent>(els.wrap, 'pointerdown', e => {
    if (live.present?.active) return;
    beginChange();
    inertia = 0;
    const picker = (e.target as Element).closest<SVGElement>('[data-picker]');
    if (picker && state.mode === 'perspective') {
      drag = { picker: picker.dataset.picker ?? '' };
      els.wrap.setPointerCapture(e.pointerId);
      return;
    }
    stopAutoRotate();
    drag = {
      x: e.clientX,
      y: e.clientY,
      r: state.rotation,
      t: state.tilt,
      lastX: e.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    els.wrap.setPointerCapture(e.pointerId);
    els.wrap.classList.add('dragging');
  });

  on<PointerEvent>(els.wrap, 'pointermove', e => {
    if (!drag) return;
    if ('picker' in drag) {
      const p = eventToSvg(e);
      if (drag.picker === 'horizon') {
        state.horizon = clampN(p.y, 70, 630);
      } else {
        const i = Number(drag.picker.split('-')[1]);
        if (state.perspectivePoints === 1) {
          state.vp1X = clampN(p.x, 35, 865);
          state.horizon = clampN(p.y, 70, 630);
        } else if (i === 0) {
          state.vpLeft = clampN(p.x, 35, state.vpRight - 80);
          state.horizon = clampN(p.y, 70, 630);
        } else if (i === 1) {
          state.vpRight = Math.min(865, Math.max(state.vpLeft + 80, p.x));
          state.horizon = clampN(p.y, 70, 630);
        } else {
          state.vp3X = clampN(p.x, 35, 865);
          state.vp3Y = clampN(p.y, 70, 630);
        }
      }
      els.horizon.value = String(state.horizon);
      syncValues();
      render();
      return;
    }
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastTime);
    const dx = e.clientX - drag.lastX;
    drag.velocity = (dx / dt) * 0.55;
    drag.lastX = e.clientX;
    drag.lastTime = now;
    state.rotation = ((((drag.r + (e.clientX - drag.x) * 0.55 + 180) % 360) + 360) % 360) - 180;
    if (state.mode !== 'plan') state.tilt = clampN(drag.t - (e.clientY - drag.y) * 0.35, 0, 72);
    els.rotation.value = String(state.rotation);
    els.tilt.value = String(state.tilt);
    syncValues();
    render();
  });

  const endDrag = () => {
    if (drag && !('picker' in drag)) inertia = reduced ? 0 : drag.velocity || 0;
    drag = null;
    els.wrap.classList.remove('dragging');
    commitChange();
  };
  on(els.wrap, 'pointerup', endDrag);
  on(els.wrap, 'pointercancel', endDrag);

  let lastFrame = performance.now();
  let lastPaint = 0;
  let raf = 0;
  const wrapDeg = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
  function animate(now: number) {
    if (signal.aborted) return;
    const dt = Math.min(40, now - lastFrame);
    lastFrame = now;
    const rotating = SPATIAL.includes(state.pattern) || live.present?.active === true;
    if (!drag && state.mode !== 'plan') {
      let changed = false;
      if (state.autoRotate && rotating) {
        // 8 degrees per second moves a figure's edge under half a pixel per frame: repaint at ~30 fps
        state.rotation = wrapDeg(state.rotation + dt * 0.008);
        changed = now - lastPaint >= 32;
      } else if (Math.abs(inertia) > 0.002) {
        state.rotation = wrapDeg(state.rotation + inertia * dt);
        inertia *= Math.pow(0.93, dt / 16);
        changed = true;
      } else {
        inertia = 0;
      }
      if (changed) {
        lastPaint = now;
        els.rotation.value = String(state.rotation);
        syncValues();
        renderFrame();
      }
    }
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  // ───────────────────────────── export ─────────────────────────────
  on(q('#exportBtn'), 'click', () =>
    download(`${state.pattern}-step-${state.step}.svg`, new Blob([screenSvg()], { type: 'image/svg+xml' })),
  );
  on(q('#copyBtn'), 'click', async () => {
    try {
      await navigator.clipboard.writeText(screenSvg());
      toast('SVG copied to clipboard');
    } catch {
      toast('Copy unavailable — use Export');
    }
  });

  // ───────────────────────────── theme ─────────────────────────────
  function syncTheme() {
    root.dataset.theme = theme;
    els.themeBtn.setAttribute('aria-pressed', String(theme === 'paper'));
  }
  on(els.themeBtn, 'click', () => {
    theme = theme === 'void' ? 'paper' : 'void';
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* theme just won't persist */
    }
    syncTheme(); // strokes reference CSS tokens, so no repaint is needed
    writeHash();
  });

  // ───────────────────────────── share link ─────────────────────────────
  let hashTimer: ReturnType<typeof setTimeout> | undefined;
  let lastHash = encodeState(state, theme);

  /** The share payload for the current state. While a spatial figure is auto-rotating its angle is
   *  transient, so it is left out of the live URL (the Link button always includes it). */
  const livePayload = () => {
    const transient = state.autoRotate && SPATIAL.includes(state.pattern) && state.mode !== 'plan';
    return encodeState(transient ? { ...state, rotation: 0 } : state, theme);
  };
  function writeHash() {
    if (live.present?.active || hashTimer) return;
    hashTimer = setTimeout(() => {
      hashTimer = undefined;
      if (live.present?.active) return; // Present started while this write was pending
      const payload = livePayload();
      if (payload === lastHash) return;
      lastHash = payload;
      try {
        history.replaceState(history.state, '', `#${payload}`);
      } catch {
        /* sandboxed frame: the share button still works */
      }
    }, 600);
  }
  afterRender.add(writeHash);

  on(q('#shareBtn'), 'click', async () => {
    const url = `${location.origin}${location.pathname}#${encodeState(state, theme)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      toast('Copy unavailable — copy the address bar');
    }
  });

  function applyDecoded(d: Decoded) {
    stopPlayback();
    inertia = 0;
    Object.assign(state, createState(reduced), { autoRotate: state.autoRotate }, d.state);
    if (d.theme) {
      theme = d.theme;
      syncTheme();
    }
    syncAllControls();
    render();
  }
  on(window, 'hashchange', () => {
    if (live.present?.active) return;
    applyDecoded(decodeState(location.hash));
  });

  // ───────────────────────────── sound ─────────────────────────────
  on(els.soundBtn, 'click', async () => {
    resonance ??= createResonance();
    if (!resonance.supported) {
      toast('Sound is not available in this browser');
      return;
    }
    if (resonance.enabled) {
      resonance.disable();
    } else {
      try {
        await resonance.enable();
      } catch {
        /* reported below */
      }
      if (!resonance.enabled) {
        toast('Sound could not start');
        return;
      }
    }
    els.soundBtn.classList.toggle('active', resonance.enabled);
    els.soundNote.textContent = resonance.enabled ? SOUND_ON : SOUND_OFF;
    syncPressed();
  });

  // Sound follows the construction: a tone when the build advances within one figure, a chord on completion.
  let soundPattern = state.pattern;
  let soundStep = state.step;
  afterRender.add(() => {
    const advanced = state.pattern === soundPattern && state.step > soundStep;
    if (resonance?.enabled && advanced) {
      const max = MAX_STEPS[state.pattern];
      resonance.step(state.pattern, state.step, max);
      if (state.step === max) resonance.complete(state.pattern);
    }
    soundPattern = state.pattern;
    soundStep = state.step;
  });

  // ───────────────────────────── studio & present ─────────────────────────────
  const panel = mountStudioPanel(ctx);

  const present = (live.present = mountPresent(ctx, {
    setPattern,
    restore: restoreSnapshot,
    stopPlayback,
    render,
    stepMs: () => Number(els.speed.value),
    reducedMotion: reduced,
  }));
  on(q('#presentBtn'), 'click', () => present.toggle({ fullscreen: true }));

  // ───────────────────────────── debug hook (parity tests) ─────────────────────────────
  // Development only: it exposes the Studio internals and has no business in a production bundle.
  const debug = process.env.NODE_ENV !== 'production';
  if (debug) {
    const st = panel.settings;
    (window as unknown as { __studio?: unknown }).__studio = {
      geometry: panel.geometry,
      plotterPlan: (g: S.Geometry) => S.plotterPlan(g, st),
      stencilSheets: (g: S.Geometry) => S.stencilSheets(g, st),
      pageSize: () => S.pageSize(st),
      ST: st,
      tilePlan: (W: number, H: number) => S.tilePlan(W, H, st),
      tiles: (inner: string, W: number, H: number, name: string) => S.tiles(inner, W, H, name, st, labels()),
      zip: S.zip,
      printInner: (g: S.Geometry) => S.printInner(g, st),
      crossings: S.crossings,
      updatePreview: panel.updatePreview,
    };
  }

  // ───────────────────────────── go ─────────────────────────────
  els.soundNote.textContent = SOUND_OFF;
  syncTheme();
  syncAllControls();
  updateHistoryButtons();
  render();
  if (initial.present) present.start({ fullscreen: false });

  return () => {
    ac.abort();
    cancelAnimationFrame(raf);
    clearInterval(timer);
    clearTimeout(toastTimer);
    clearTimeout(hashTimer);
    resonance?.dispose();
    panel.close();
    if (debug) delete (window as unknown as { __studio?: unknown }).__studio;
  };
}
