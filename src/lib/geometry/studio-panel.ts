/**
 * The Studio drawer: real-size print, pen-plotter and stencil output.
 *
 * Everything the drawer shows or downloads is derived from the figure on screen (the
 * current construction, step and view). `harvest` re-paints that figure into a detached
 * set of layers at whatever sample density the physical size needs, then
 * `fitToPage` scales it onto the chosen sheet. The pure output maths lives in `studio.ts`.
 */

import type { Ctx } from './ctx';
import { Painter, svgEl, type Layers } from './painter';
import { snapshot } from './state';
import * as S from './studio';

const STORAGE_KEY = 'sg-studio';

export interface StudioPanel {
  readonly settings: S.StudioSettings;
  readonly isOpen: boolean;
  open(): void;
  close(): void;
  toggle(): void;
  geometry(tol: number): S.Geometry | null;
  updatePreview(): void;
}

export function mountStudioPanel(ctx: Ctx): StudioPanel {
  const { q, on, state, root } = ctx;
  const dlg = q<HTMLDialogElement>('#studio');
  const preview = q<SVGSVGElement>('#studioPreview');
  const statsEl = q('#studioStats');
  const field = <T extends HTMLElement = HTMLInputElement>(id: string) => q<T>('#' + id);

  // ───────────── settings (persisted) ─────────────
  const ST = (() => {
    try {
      return S.loadSettings(localStorage.getItem(STORAGE_KEY));
    } catch {
      return S.cloneDefaults();
    }
  })();
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ST));
    } catch {
      /* private mode: settings simply don't persist */
    }
  };

  // ───────────── harvest: read the drawing back out of a detached paint ─────────────
  function harvest(res: number): S.Stroke[] {
    const scratch: Layers = {
      grid: svgEl('g'),
      perspective: svgEl('g'),
      guides: svgEl('g'),
      shapes: svgEl('g'),
      points: svgEl('g'),
      overlay: svgEl('g'),
    };
    const painter = new Painter({ ...state }, scratch);
    painter.res = res;
    painter.drawGrid();
    painter.drawActivePattern();
    painter.drawPhiOverlay();
    painter.drawDimensions();

    const out: S.Stroke[] = [];
    const sources: [string, SVGGElement][] = [
      ['grid', scratch.grid],
      ['guides', scratch.guides],
      ['shapes', scratch.shapes],
      ['points', scratch.points],
    ];
    for (const [src, g] of sources) {
      g.querySelectorAll<SVGPathElement | SVGLineElement>('path[data-kind],line[data-kind]').forEach(el => {
        const kind = el.dataset.kind ?? 'main';
        let pts: S.Pt[];
        let closed = false;
        if (el instanceof SVGLineElement) {
          pts = [
            [+(el.getAttribute('x1') ?? 0), +(el.getAttribute('y1') ?? 0)],
            [+(el.getAttribute('x2') ?? 0), +(el.getAttribute('y2') ?? 0)],
          ];
        } else {
          const d = el.getAttribute('d') ?? '';
          closed = /Z\s*$/.test(d);
          const n = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
          pts = [];
          for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
        }
        if (pts.length > 1) out.push({ layer: S.layerOf(kind, src), kind, pts, closed });
      });
      // filled dots: the Yantra's bindu belongs to the figure; the tiny centre dots are marks
      if (src === 'points') {
        g.querySelectorAll('circle').forEach(c => {
          const r = +(c.getAttribute('r') ?? 0);
          const cx = +(c.getAttribute('cx') ?? 0);
          const cy = +(c.getAttribute('cy') ?? 0);
          const kind = r >= 3 ? 'bindu' : 'dot';
          const n = Math.max(12, Math.round(24 * res));
          out.push({
            layer: S.layerOf(kind, src),
            kind,
            closed: true,
            fill: true,
            pts: Array.from({ length: n }, (_, i): S.Pt => [
              cx + Math.cos((i / n) * 2 * Math.PI) * r,
              cy + Math.sin((i / n) * 2 * Math.PI) * r,
            ]),
          });
        });
      }
    }
    return out;
  }

  // ───────────── fit to the page, at a resolution that keeps chords within tolerance ─────────────
  let cache: { key: string; geo: S.Geometry | null } = { key: '', geo: null };

  function geometry(tol: number): S.Geometry | null {
    const { W, H } = S.pageSize(ST);
    const on_ = S.LAYERS.filter(l => ST.layers[l.id].on).map(l => l.id);
    const key = JSON.stringify([snapshot(state), W, H, ST.margin, on_, tol]);
    if (cache.key === key) return cache.geo;

    const bbox = (list: S.Stroke[]): [number, number, number, number] => {
      const a: [number, number, number, number] = [1e9, 1e9, -1e9, -1e9];
      list.forEach(s =>
        s.pts.forEach(([x, y]) => {
          if (x < a[0]) a[0] = x;
          if (y < a[1]) a[1] = y;
          if (x > a[2]) a[2] = x;
          if (y > a[3]) a[3] = y;
        }),
      );
      return a;
    };

    let raw = harvest(1).filter(s => on_.includes(s.layer));
    if (!raw.length) {
      cache = { key, geo: null };
      return null;
    }
    const b = bbox(raw);
    const bw = Math.max(1, b[2] - b[0]);
    const bh = Math.max(1, b[3] - b[1]);
    const m = Math.min(ST.margin, Math.min(W, H) / 3);
    const s = Math.min((W - 2 * m) / bw, (H - 2 * m) / bh);
    const rmm = (s * Math.max(bw, bh)) / 2;
    const N = Math.PI / Math.acos(Math.max(-1, 1 - tol / Math.max(rmm, tol)));
    const res = Math.min(16, Math.max(1, N / 96));
    if (res > 1.05) raw = harvest(res).filter(st => on_.includes(st.layer));
    const ox = (W - bw * s) / 2 - b[0] * s;
    const oy = (H - bh * s) / 2 - b[1] * s;
    const strokes = raw.map(st => ({ ...st, pts: st.pts.map(([x, y]): S.Pt => [x * s + ox, y * s + oy]) }));
    const geo: S.Geometry = { W, H, s, res, strokes, span: [bw * s, bh * s] };
    cache = { key, geo };
    return geo;
  }

  const tolFor = () => (ST.mode === 'stencil' ? 0.35 : 0.1);
  const baseName = () => {
    const { W, H } = S.pageSize(ST);
    return `${state.pattern}-step${state.step}-${Math.round(W)}x${Math.round(H)}mm`;
  };

  // ───────────── UI ─────────────
  field<HTMLSelectElement>('stPage').innerHTML = S.PAGES.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
  field<HTMLSelectElement>('stSheet').innerHTML = S.SHEETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('');
  field('stLayers').innerHTML = S.LAYERS.map(
    L =>
      `<div class="st-layer"><label class="st-check"><input type="checkbox" id="stOn-${L.id}"><span><b>${L.label}</b><small>${L.hint}</small></span></label>` +
      `<label class="st-num" title="Pen / line width"><input type="number" id="stPen-${L.id}" min="0.05" max="50" step="0.05"><i>mm</i></label><input type="color" id="stCol-${L.id}" aria-label="${L.label} colour"></div>`,
  ).join('');

  const modeButtons = ctx.qa<HTMLButtonElement>('#stModes button');
  const orientButtons = ctx.qa<HTMLButtonElement>('#stOrient button');

  function syncStudio() {
    field<HTMLSelectElement>('stPage').value = ST.page;
    orientButtons.forEach(b => b.classList.toggle('active', b.dataset.v === ST.orient));
    field('stCustom').hidden = ST.page !== 'custom';
    field('stW').value = String(ST.cw);
    field('stH').value = String(ST.ch);
    field('stMargin').value = String(ST.margin);
    S.LAYERS.forEach(L => {
      const c = ST.layers[L.id];
      field('stOn-' + L.id).checked = c.on;
      field('stPen-' + L.id).value = String(c.pen);
      field('stCol-' + L.id).value = c.color;
    });
    field('stSlot').value = String(ST.slot);
    field('stBridge').value = String(ST.bridge);
    field('stSpan').value = String(ST.span);
    field<HTMLSelectElement>('stSheet').value = ST.sheet;
    field('stOverlap').value = String(ST.overlap);
    field<HTMLSelectElement>('stDpi').value = String(ST.dpi);
    modeButtons.forEach(b => {
      b.classList.toggle('active', b.dataset.v === ST.mode);
      b.setAttribute('aria-pressed', String(b.dataset.v === ST.mode));
    });
    dlg.querySelectorAll<HTMLElement>('[data-for]').forEach(x => {
      x.hidden = !(x.dataset.for ?? '').split(' ').includes(ST.mode);
    });
    field('stDownload').textContent =
      ST.mode === 'print'
        ? 'Download print SVG'
        : ST.mode === 'plotter'
          ? 'Download plotter SVG'
          : 'Download stencil set (.zip)';
  }

  function updatePreview() {
    if (!dlg.open) return;
    syncStudio();
    const g = geometry(tolFor());
    const view = S.buildPreview(g, ST, ctx.labels());
    if (view.viewBox) preview.setAttribute('viewBox', view.viewBox);
    preview.innerHTML = view.svg;
    statsEl.textContent = view.stats;
  }

  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  const schedulePreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 220);
  };
  ctx.afterRender.add(() => {
    if (dlg.open) schedulePreview();
  });
  signalCleanup(ctx, () => clearTimeout(previewTimer));

  function open() {
    ctx.stopAutoRotate();
    dlg.show();
    root.classList.add('studio-open');
    syncStudio();
    updatePreview();
  }
  function close() {
    dlg.close();
    root.classList.remove('studio-open');
  }

  on(field('studioBtn'), 'click', () => (dlg.open ? close() : open()));
  on(field('stClose'), 'click', close);
  on<KeyboardEvent>(dlg, 'keydown', e => {
    if (e.key === 'Escape') close();
  });

  const bind = (id: string, fn: (t: HTMLInputElement) => void, ev = 'change') =>
    on(field(id), ev, e => {
      fn(e.target as HTMLInputElement);
      save();
      updatePreview();
    });
  bind('stPage', t => (ST.page = t.value));
  bind('stW', t => (ST.cw = Math.max(50, +t.value || 1000)));
  bind('stH', t => (ST.ch = Math.max(50, +t.value || 1000)));
  bind('stMargin', t => (ST.margin = Math.max(0, +t.value || 0)));
  orientButtons.forEach(b =>
    on(b, 'click', () => {
      ST.orient = b.dataset.v === 'landscape' ? 'landscape' : 'portrait';
      save();
      updatePreview();
    }),
  );
  modeButtons.forEach(b =>
    on(b, 'click', () => {
      ST.mode = b.dataset.v === 'plotter' ? 'plotter' : b.dataset.v === 'stencil' ? 'stencil' : 'print';
      save();
      updatePreview();
    }),
  );
  S.LAYERS.forEach(L => {
    bind('stOn-' + L.id, t => (ST.layers[L.id].on = t.checked));
    bind('stPen-' + L.id, t => (ST.layers[L.id].pen = Math.max(0.05, +t.value || 0.5)));
    bind('stCol-' + L.id, t => (ST.layers[L.id].color = t.value));
  });
  bind('stSlot', t => (ST.slot = Math.max(0.5, +t.value || 4)));
  bind('stBridge', t => (ST.bridge = Math.max(0.5, +t.value || 5)));
  bind('stSpan', t => (ST.span = Math.max(10, +t.value || 160)));
  bind('stSheet', t => (ST.sheet = t.value));
  bind('stOverlap', t => (ST.overlap = Math.max(0, +t.value || 0)));
  bind('stDpi', t => (ST.dpi = +t.value));
  on(field('stReset'), 'click', () => {
    Object.assign(ST, S.cloneDefaults());
    save();
    updatePreview();
  });

  // ───────────── downloads ─────────────
  on(field('stDownload'), 'click', () => {
    const g = geometry(tolFor());
    if (!g) {
      ctx.toast('Turn on a layer with lines first');
      return;
    }
    const out = S.buildDownload(g, ST, ctx.labels(), baseName());
    ctx.download(out.name, out.data instanceof Blob ? out.data : new Blob([out.data], { type: 'image/svg+xml' }));
  });

  function rasterize(svg: string, w: number, h: number, bg?: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d');
        if (!x) return reject(new Error('canvas'));
        if (bg) {
          x.fillStyle = bg;
          x.fillRect(0, 0, w, h);
        }
        x.drawImage(img, 0, 0, w, h);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png');
      };
      img.onerror = reject;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  on(field('stPng4'), 'click', async () => {
    try {
      ctx.download(`${state.pattern}-step-${state.step}@4x.png`, await rasterize(ctx.screenSvg(), 3600, 2800));
    } catch {
      ctx.toast('PNG render failed');
    }
  });
  on(field('stPngPrint'), 'click', async () => {
    const g = geometry(0.1);
    if (!g) return;
    const { w, h, dpi } = S.printPngSize(g, +ST.dpi);
    const svg = S.buildPrintSvgForPng(g, ST, ctx.labels(), w, h);
    try {
      ctx.download(`${baseName()}@${Math.round(dpi)}dpi.png`, await rasterize(svg, w, h, '#ffffff'));
      if (dpi < +ST.dpi - 1)
        ctx.toast(`Capped at ${Math.round(dpi)} dpi (${w}×${h} px, the browser's limit). Use the SVG for full resolution.`);
    } catch {
      ctx.toast('PNG too large for this browser — use the SVG');
    }
  });
  on(field('stScreenSvg'), 'click', () =>
    ctx.download(`${state.pattern}-step-${state.step}-screen.svg`, new Blob([ctx.screenSvg()], { type: 'image/svg+xml' })),
  );

  return {
    settings: ST,
    get isOpen() {
      return dlg.open;
    },
    open,
    close,
    toggle: () => (dlg.open ? close() : open()),
    geometry,
    updatePreview,
  };
}

/** Run `fn` when the controller is torn down (its AbortSignal fires). */
function signalCleanup(ctx: Ctx, fn: () => void) {
  ctx.signal.addEventListener('abort', fn, { once: true });
}
