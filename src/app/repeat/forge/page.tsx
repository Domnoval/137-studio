'use client';

/**
 * /repeat/forge — the Repeat Suite forge.
 *
 * One geometry, two readings. Pick a panel, set its seed and knobs, and
 * see it either as the single-ink underlay you print and transfer onto
 * the panel, or as a colour study in the four-paint spine. Export at
 * true size: an SVG, a full-size PDF for a print shop, or Letter tiles
 * with overlap crosshairs for a home printer.
 *
 * Same seed, same drawing, forever — the seed is in every file name and
 * on every sheet's slug line.
 */

import { useDeferredValue, useMemo, useState } from 'react';
import {
  fileBase,
  fullSizePdf,
  letterTilesPdf,
  PANEL_ORDER,
  PANELS,
  plateToSvg,
  renderPlate,
  type Mode,
  type PanelId,
  type PanelParams,
} from '@/lib/repeat';

// ─── style atoms ────────────────────────────────────────────────────────────

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
const serif: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const LINE = 'rgba(232, 228, 220, 0.18)';

const CSS = `
.forge-grid { display: grid; gap: 34px; grid-template-columns: 1fr; }
/* Phones see the drawing first; desktops keep it pinned beside the knobs. */
.forge-view { order: -1; }
@media (min-width: 1024px) {
  .forge-grid { grid-template-columns: 340px minmax(0, 1fr); }
  .forge-view { order: 0; position: sticky; top: 88px; align-self: start; }
}
.forge-preview svg { width: 100%; height: auto; display: block; }
.forge-range { width: 100%; accent-color: ${RED}; }
`;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        ...mono,
        fontSize: '0.62rem',
        color: FADED,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        margin: '0 0 10px',
      }}
    >
      {children}
    </p>
  );
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...mono,
        fontSize: '0.7rem',
        letterSpacing: '0.08em',
        padding: '8px 12px',
        background: active ? CHALK : 'transparent',
        color: active ? '#0e0c0a' : CHALK,
        border: `1px solid ${active ? CHALK : LINE}`,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

// ─── downloads ──────────────────────────────────────────────────────────────

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function ForgePage() {
  const [panel, setPanel] = useState<PanelId>('I');
  const [params, setParams] = useState<Record<PanelId, PanelParams>>(() => ({
    I: PANELS.I.defaults,
    II: PANELS.II.defaults,
    III: PANELS.III.defaults,
    IV: PANELS.IV.defaults,
  }));
  const [mode, setMode] = useState<Mode>('underlay');
  const [marks, setMarks] = useState(true);
  const [mirror, setMirror] = useState(false);

  const def = PANELS[panel];
  const p = params[panel];
  const deferred = useDeferredValue(p);

  const svg = useMemo(
    () => plateToSvg(renderPlate(panel, deferred, { mode, marks, mirror }), 'preview'),
    [panel, deferred, mode, marks, mirror],
  );

  const set = (patch: Partial<PanelParams>) =>
    setParams((all) => ({ ...all, [panel]: { ...all[panel], ...patch } }));

  const opts = { mode, marks, mirror };
  const tileLabel = (id: PanelId) =>
    `THE REPEAT SUITE - PANEL ${id} - ${PANELS[id].role.toUpperCase()} - SEED ${params[id].seed} - ${mode.toUpperCase()}`;

  const exportSvg = () =>
    download(`${fileBase(panel, p, mode)}.svg`, plateToSvg(renderPlate(panel, p, opts), 'export'), 'image/svg+xml');
  const exportFull = (ids: PanelId[]) =>
    download(
      ids.length === 1 ? `${fileBase(ids[0], params[ids[0]], mode)}-full-size.pdf` : `repeat-suite-all-${mode}-full-size.pdf`,
      fullSizePdf(ids.map((id) => renderPlate(id, params[id], opts))),
      'application/pdf',
    );
  const exportTiles = (ids: PanelId[]) =>
    download(
      ids.length === 1 ? `${fileBase(ids[0], params[ids[0]], mode)}-letter-tiles.pdf` : `repeat-suite-all-${mode}-letter-tiles.pdf`,
      letterTilesPdf(ids.map((id) => ({ plate: renderPlate(id, params[id], opts), label: tileLabel(id) }))),
      'application/pdf',
    );

  return (
    <main style={{ minHeight: '100vh', padding: '104px clamp(16px, 4vw, 56px) 80px', color: CHALK }}>
      <style>{CSS}</style>

      <header style={{ marginBottom: 40, maxWidth: 900 }}>
        <Label>The Repeat Suite · Forge</Label>
        <h1 style={{ ...serif, fontWeight: 300, fontSize: 'clamp(2.4rem, 6vw, 4.6rem)', lineHeight: 1, margin: 0 }}>
          Four panels, one geometry.
        </h1>
        <p style={{ color: FADED, fontSize: '1.1rem', maxWidth: 640, margin: '18px 0 0' }}>
          Gene → error → protein → brain. Set a seed, print the underlay at true size, transfer, paint. Same seed,
          same drawing, forever.
        </p>
      </header>

      <div className="forge-grid">
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <section>
            <Label>Panel</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PANEL_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanel(id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: id === panel ? 'rgba(232, 228, 220, 0.08)' : 'transparent',
                    border: `1px solid ${id === panel ? CHALK : LINE}`,
                    color: CHALK,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ ...serif, fontSize: '1.5rem', display: 'block', lineHeight: 1.1 }}>{id}</span>
                  <span style={{ ...mono, fontSize: '0.62rem', color: FADED, letterSpacing: '0.06em' }}>
                    {PANELS[id].role}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label>Reading</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Chip active={mode === 'underlay'} onClick={() => setMode('underlay')}>
                Underlay
              </Chip>
              <Chip active={mode === 'study'} onClick={() => setMode('study')}>
                Colour study
              </Chip>
            </div>
          </section>

          <section>
            <Label>Seed</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                aria-label="Seed"
                value={p.seed}
                onChange={(e) => set({ seed: e.target.value })}
                disabled={!def.seeded}
                style={{
                  ...mono,
                  flex: 1,
                  minWidth: 0,
                  fontSize: '0.85rem',
                  padding: '9px 12px',
                  background: 'transparent',
                  color: CHALK,
                  border: `1px solid ${LINE}`,
                  opacity: def.seeded ? 1 : 0.4,
                }}
              />
              <Chip onClick={() => set({ seed: randomSeed() })}>Reroll</Chip>
            </div>
            {!def.seeded && (
              <p style={{ color: FADED, fontSize: '0.95rem', margin: '10px 0 0' }}>
                Data, not chance — the seed doesn&apos;t move this one.
              </p>
            )}
          </section>

          {def.controls.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Label>Knobs · {def.role}</Label>
              {def.controls.map((c) =>
                c.kind === 'toggle' ? (
                  <label key={c.key} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(p[c.key])}
                      onChange={(e) => set({ [c.key]: e.target.checked })}
                    />
                    <span>{c.label}</span>
                  </label>
                ) : (
                  <label key={c.key} style={{ display: 'block' }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{c.label}</span>
                      <span style={{ ...mono, fontSize: '0.8rem', color: FADED }}>
                        {c.step === 1 ? Number(p[c.key]) : Number(p[c.key]).toFixed(2)}
                      </span>
                    </span>
                    <input
                      className="forge-range"
                      type="range"
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={Number(p[c.key])}
                      onChange={(e) => set({ [c.key]: Number(e.target.value) })}
                    />
                  </label>
                ),
              )}
            </section>
          )}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Label>Sheet</Label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} />
              <span>Crop marks, registration, slug</span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} style={{ marginTop: 6 }} />
              <span>
                Mirror
                <span style={{ display: 'block', color: FADED, fontSize: '0.92rem' }}>
                  Only for toner or gel transfers. Carbon and graphite tracing reads the right way round.
                </span>
              </span>
            </label>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>Export · panel {panel}</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip onClick={exportSvg}>SVG</Chip>
              <Chip onClick={() => exportFull([panel])}>PDF · full size</Chip>
              <Chip onClick={() => exportTiles([panel])}>PDF · Letter tiles</Chip>
            </div>
            <Label>Export · all four</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip onClick={() => exportFull(PANEL_ORDER)}>PDF · full size</Chip>
              <Chip onClick={() => exportTiles(PANEL_ORDER)}>PDF · Letter tiles</Chip>
            </div>
            <p style={{ color: FADED, fontSize: '0.92rem', margin: '6px 0 0' }}>
              Print at 100% / Actual Size — every sheet carries a 1-inch bar to check. Tape the tiles crosshair to
              crosshair, lay carbon or graphite paper under, trace.
            </p>
          </section>
        </aside>

        <section className="forge-view">
          <div
            className="forge-preview"
            style={{ border: `1px solid ${LINE}`, maxWidth: 820, background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div style={{ maxWidth: 820, marginTop: 22 }}>
            <p style={{ ...serif, fontSize: '1.7rem', margin: '0 0 12px' }}>
              {panel} — {def.title}
              <span style={{ color: FADED }}> · {def.role}</span>
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: FADED, lineHeight: 1.55 }}>
              {def.facts(p).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
