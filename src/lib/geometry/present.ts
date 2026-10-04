/**
 * Present mode: the app as an installation.
 *
 * The chrome falls away, the canvas fills the screen, and the eleven constructions
 * build themselves one after another, each held at completion before the next begins.
 * Meant for a projector, a gallery wall or a second monitor. Esc, the exit button, or
 * leaving browser fullscreen ends it and puts the user's own view back exactly as it was.
 *
 * Space pauses; ← / → skip between constructions.
 */

import { MAX_STEPS, PATTERN_IDS, PHASES, TITLES, type PatternId } from './catalog';
import type { Ctx } from './ctx';
import { snapshot, type Snapshot } from './state';

export interface PresentDeps {
  /** Switch construction (resets to step 1, syncs the controls, renders). */
  setPattern(pattern: PatternId): void;
  /** Put a saved snapshot back (stops playback, syncs the controls, renders). */
  restore(snap: Snapshot): void;
  stopPlayback(): void;
  render(): void;
  /** Milliseconds per step from the speed selector. */
  stepMs(): number;
  reducedMotion: boolean;
}

export interface Present {
  readonly active: boolean;
  start(options?: { fullscreen?: boolean }): void;
  stop(): void;
  toggle(options?: { fullscreen?: boolean }): void;
}

const DWELL_MS = 4200;
const SWAP_MS = 420;
const IDLE_MS = 2500;
const FIRST_IDLE_MS = 6000; // give a first-time viewer longer to spot the exit control
const pad = (n: number) => String(n).padStart(2, '0');

export function mountPresent(ctx: Ctx, deps: PresentDeps): Present {
  const { state, root, on, q } = ctx;
  const kicker = q('.present-kicker');
  const nameEl = q('.present-name');
  const exitBtn = q('#presentExit');

  let active = false;
  let paused = false;
  let saved: Snapshot | null = null;
  let run = 0;
  let index = 0;
  let enteredFullscreen = false;
  let wake: WakeLockSentinel | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers.clear();
  };
  const wait = (ms: number) =>
    new Promise<void>(resolve => {
      const t = setTimeout(() => {
        timers.delete(t);
        resolve();
      }, ms);
      timers.add(t);
    });

  function updateTitle() {
    const max = MAX_STEPS[state.pattern];
    const phase = PHASES[state.pattern][state.step - 1] ?? 'Completion';
    kicker.textContent = `${phase} · ${pad(state.step)} / ${pad(max)}`;
    nameEl.textContent = TITLES[state.pattern];
  }

  const holdWhilePaused = async (token: number) => {
    while (paused && active && token === run) await wait(250);
  };

  async function changePattern(dir: 1 | -1, token: number) {
    index = (index + dir + PATTERN_IDS.length) % PATTERN_IDS.length;
    root.classList.add('present-swap');
    await wait(SWAP_MS);
    if (!active || token !== run) return;
    deps.setPattern(PATTERN_IDS[index]);
    updateTitle();
    root.classList.remove('present-swap');
  }

  async function loop(token: number) {
    while (active && token === run) {
      const max = MAX_STEPS[state.pattern];
      while (state.step < max) {
        await wait(deps.stepMs() * 1.35);
        if (!active || token !== run) return;
        await holdWhilePaused(token);
        if (!active || token !== run) return;
        state.step++;
        deps.render();
        updateTitle();
      }
      await wait(DWELL_MS);
      if (!active || token !== run) return;
      await holdWhilePaused(token);
      if (!active || token !== run) return;
      await changePattern(1, token);
      // brief hold on the first step of the new figure before it starts to build
      await wait(deps.stepMs());
    }
  }

  const skip = (dir: 1 | -1) => {
    run++;
    clearTimers();
    const token = run;
    void changePattern(dir, token).then(() => {
      if (active && token === run) void loop(token);
    });
  };

  async function lockScreen() {
    try {
      wake = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wake = null; // not granted (battery saver, unsupported): the show still runs
    }
  }

  const bumpIdle = (ms = IDLE_MS) => {
    root.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => root.classList.add('idle'), ms);
  };

  function start(options: { fullscreen?: boolean } = {}) {
    if (active) return;
    active = true;
    paused = false;
    deps.stopPlayback();
    saved = snapshot(state);

    root.classList.add('presenting');
    document.body.classList.add('modal-open'); // locks page scroll (see globals.css)
    state.autoRotate = !deps.reducedMotion;
    if (state.mode === 'plan') state.mode = 'perspective';
    index = Math.max(0, PATTERN_IDS.indexOf(state.pattern));
    deps.setPattern(PATTERN_IDS[index]);
    updateTitle();
    // there is no Esc key on a phone: say what actually exits, and keep it visible a little longer
    exitBtn.textContent = matchMedia('(pointer: coarse)').matches ? 'Tap to exit' : 'Esc to exit';
    bumpIdle(FIRST_IDLE_MS);
    void lockScreen();

    if (options.fullscreen && root.requestFullscreen) {
      root
        .requestFullscreen()
        .then(() => {
          enteredFullscreen = true;
        })
        .catch(() => {
          /* fullscreen refused: the fixed-position layout still fills the viewport */
        });
    }
    run++;
    void loop(run);
  }

  function stop() {
    if (!active) return;
    active = false;
    run++;
    clearTimers();
    clearTimeout(idleTimer);
    root.classList.remove('presenting', 'present-swap', 'idle');
    document.body.classList.remove('modal-open');
    if (document.fullscreenElement && enteredFullscreen) void document.exitFullscreen().catch(() => undefined);
    enteredFullscreen = false;
    void wake?.release().catch(() => undefined);
    wake = null;
    if (saved) deps.restore(saved);
    saved = null;
  }

  on<KeyboardEvent>(document, 'keydown', e => {
    if (!active) return;
    if (e.key === 'Escape') {
      stop();
    } else if (e.key === ' ') {
      e.preventDefault();
      paused = !paused;
    } else if (e.key === 'ArrowRight') {
      skip(1);
    } else if (e.key === 'ArrowLeft') {
      skip(-1);
    }
  });
  // Esc inside browser fullscreen is consumed by the browser; the only signal is the fullscreen change.
  on(document, 'fullscreenchange', () => {
    if (active && enteredFullscreen && !document.fullscreenElement) stop();
  });
  on(document, 'visibilitychange', () => {
    if (active && document.visibilityState === 'visible' && !wake) void lockScreen();
  });
  // pointermove covers a mouse; a tap (pointerdown) is the only signal on touch screens
  for (const type of ['pointermove', 'pointerdown'])
    on(document, type, () => {
      if (active) bumpIdle();
    });
  on(exitBtn, 'click', stop);
  ctx.signal.addEventListener('abort', stop, { once: true });

  return {
    get active() {
      return active;
    },
    start,
    stop,
    toggle: options => (active ? stop() : start(options)),
  };
}
