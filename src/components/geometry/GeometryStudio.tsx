'use client';

/**
 * /geometry: the Sacred Geometry Studio.
 *
 * This component renders the static shell once; `mountGeometry` (lib/geometry/engine.ts) then owns
 * every dynamic part of it through the element ids below. Because the markup never re-renders
 * (no state, no props), React and the controller can't disagree about the DOM.
 * If you rename an id here, rename it in the engine, studio-panel and present modules too.
 */

import { memo, useEffect, useRef } from 'react';
import { mountGeometry } from '@/lib/geometry/engine';
import './geometry.css';

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {children}
  </svg>
);

function GeometryStudioShell() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return mountGeometry(root);
  }, []);

  return (
    <div className="sg-root" data-theme="void" ref={rootRef}>
      <main className="app">
        <aside className="sidebar" aria-label="Drawing controls">
          <section className="panel">
            <label className="label" htmlFor="pattern">
              Construction
            </label>
            <select id="pattern" defaultValue="seed">
              <option value="seed">Seed of Life</option>
              <option value="flower">Flower of Life</option>
              <option value="metatron">Metatron’s Cube</option>
              <option value="metatron3d">Metatron’s Cube · 3D</option>
              <option value="tetrahedron">Platonic · Tetrahedron</option>
              <option value="cube">Platonic · Cube</option>
              <option value="octahedron">Platonic · Octahedron</option>
              <option value="dodecahedron">Platonic · Dodecahedron</option>
              <option value="icosahedron">Platonic · Icosahedron</option>
              <option value="vesica">Vesica Piscis</option>
              <option value="yantra">Nine-fold Yantra</option>
            </select>
            <p className="pattern-note" id="patternNote">
              Seven equal circles unfold from a single radius.
            </p>
          </section>

          <section className="panel">
            <span className="label">View</span>
            <div className="segmented" id="viewMode" role="group" aria-label="Projection mode">
              <button type="button" data-mode="plan">
                Plan
              </button>
              <button type="button" data-mode="axon">
                Axon
              </button>
              <button type="button" className="active" data-mode="perspective">
                Perspective
              </button>
            </div>
            <div className="control">
              <div className="control-head">
                <label htmlFor="rotation">Rotation</label>
                <span className="value" id="rotationValue">
                  0°
                </span>
              </div>
              <input id="rotation" type="range" min="-180" max="180" defaultValue="0" />
            </div>
            <div className="control">
              <div className="control-head">
                <label htmlFor="tilt">Tilt</label>
                <span className="value" id="tiltValue">
                  34°
                </span>
              </div>
              <input id="tilt" type="range" min="0" max="72" defaultValue="34" />
            </div>
            <div className="control">
              <div className="control-head">
                <label htmlFor="depth">Z depth</label>
                <span className="value" id="depthValue">
                  45
                </span>
              </div>
              <input id="depth" type="range" min="0" max="100" defaultValue="45" />
            </div>
            <div className="perspective-controls" id="perspectiveControls">
              <span className="label">Perspective system</span>
              <div className="segmented" id="perspectiveMode" role="group" aria-label="Perspective point count">
                <button type="button" className="active" data-points="1">
                  1 point
                </button>
                <button type="button" data-points="2">
                  2 point
                </button>
                <button type="button" data-points="3">
                  3 point
                </button>
              </div>
              <div className="control">
                <div className="control-head">
                  <label htmlFor="horizon">Horizon</label>
                  <span className="value" id="horizonValue">
                    50%
                  </span>
                </div>
                <input id="horizon" type="range" min="70" max="630" defaultValue="350" />
              </div>
              <div className="toggle-row">
                <button className="chip active" id="perspectiveLinesBtn" type="button">
                  Perspective lines
                </button>
              </div>
              <p className="picker-note">
                Drag the horizon or numbered points directly on the drawing. Dragging the form pauses
                auto-rotation.
              </p>
            </div>
          </section>

          <section className="panel">
            <span className="label">Primitive set</span>
            <div className="segmented two" id="primitiveMode" role="group" aria-label="Primitive set">
              <button type="button" className="active" data-primitive="flat">
                Circles + squares
              </button>
              <button type="button" data-primitive="solid">
                Spheres + cubes
              </button>
            </div>
            <p className="picker-note" id="primitiveNote">
              Planar circles with square center marks.
            </p>
            <span className="label" style={{ marginTop: 16 }}>
              Drawing
            </span>
            <div className="toggle-row">
              <button type="button" className="chip active" data-toggle="guides">
                Guides
              </button>
              <button type="button" className="chip active" data-toggle="points">
                Centers
              </button>
              <button type="button" className="chip" data-toggle="mirror">
                Mirror
              </button>
              <button type="button" className="chip" data-toggle="darkline">
                Ink accent
              </button>
              <button className="chip active" id="autoRotateBtn" type="button">
                Auto rotate
              </button>
              <button type="button" className="chip" data-toggle="fruit" id="fruitChip" hidden>
                Fruit circles · r/2
              </button>
            </div>
            <div className="control">
              <div className="control-head">
                <label htmlFor="weight">Line weight</label>
                <span className="value" id="weightValue">
                  1.4
                </span>
              </div>
              <input id="weight" type="range" min="6" max="34" defaultValue="14" />
            </div>
            <span className="label" style={{ marginTop: 16 }}>
              Drafting overlays
            </span>
            <div className="toggle-row">
              <button type="button" className="chip" data-toggle="phi" id="phiChip">
                Golden ratio
              </button>
              <button type="button" className="chip" data-toggle="dimensions">
                Dimensions
              </button>
              <button type="button" className="chip" data-toggle="multiView">
                Plan study
              </button>
            </div>
            <p className="picker-note" id="overlayNote">
              Layer whirling φ squares (pentagonal figures only), symbolic measurements, and an orthographic
              plan beneath the active view.
            </p>
            <span className="label" style={{ marginTop: 16 }}>
              Resonance
            </span>
            <div className="toggle-row">
              <button type="button" className="chip" id="soundBtn">
                Sound
              </button>
            </div>
            <p className="picker-note" id="soundNote">
              Off by default. Each step sounds a ratio of the figure’s family, rooted at 137 Hz.
            </p>
          </section>

          <div className="tip">
            <p>Drag the drawing to rotate it.</p>
            <dl className="shortcuts">
              <div>
                <dt>
                  <kbd>←</kbd>
                  <kbd>→</kbd>
                </dt>
                <dd>step</dd>
              </div>
              <div>
                <dt>
                  <kbd>Space</kbd>
                </dt>
                <dd>play</dd>
              </div>
              <div>
                <dt>
                  <kbd>[</kbd>
                  <kbd>]</kbd>
                </dt>
                <dd>figure</dd>
              </div>
              <div>
                <dt>
                  <kbd>S</kbd>
                </dt>
                <dd>studio</dd>
              </div>
              <div>
                <dt>
                  <kbd>P</kbd>
                </dt>
                <dd>present</dd>
              </div>
              <div>
                <dt>
                  <kbd>Ctrl</kbd>
                  <kbd>Z</kbd>
                </dt>
                <dd>undo</dd>
              </div>
            </dl>
          </div>
        </aside>

        <section className="workspace">
          <header className="workspace-head">
            <div>
              <div className="construction-label" id="phaseLabel">
                Foundation · Circle 1
              </div>
              <h1 id="patternTitle">Seed of Life</h1>
            </div>
            <div className="head-actions">
              <div className="history-actions" role="group" aria-label="Edit history">
                <button className="action" id="undoBtn" type="button" title="Undo" aria-label="Undo" disabled>
                  <Icon>
                    <path d="M9 7 4 12l5 5" />
                    <path d="M5 12h8a6 6 0 0 1 6 6" />
                  </Icon>
                </button>
                <button className="action" id="redoBtn" type="button" title="Redo" aria-label="Redo" disabled>
                  <Icon>
                    <path d="m15 7 5 5-5 5" />
                    <path d="M19 12h-8a6 6 0 0 0-6 6" />
                  </Icon>
                </button>
              </div>
              <button className="action" id="shareBtn" type="button" title="Copy a link to this exact drawing">
                <Icon>
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                  <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </Icon>
                Link
              </button>
              <button className="action" id="copyBtn" type="button" title="Copy SVG markup">
                <Icon>
                  <rect x="8" y="8" width="11" height="11" rx="2" />
                  <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
                </Icon>
                Copy SVG
              </button>
              <button className="action" id="exportBtn" type="button">
                <Icon>
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
                </Icon>
                Export
              </button>
              <button className="action" id="presentBtn" type="button" title="Fill the screen and run every construction in turn">
                <Icon>
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </Icon>
                Present
              </button>
              <button
                className="action primary"
                id="studioBtn"
                type="button"
                aria-controls="studio"
                aria-expanded="false"
                title="Print, plotter and stencil outputs at real size"
              >
                <Icon>
                  <rect x="3" y="3" width="18" height="18" />
                  <path d="M3 9h18M9 21V9" />
                </Icon>
                Studio
              </button>
              <button className="action" id="themeBtn" type="button" aria-label="Paper theme" aria-pressed="false">
                <Icon>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 4v16" fill="currentColor" />
                  <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
                </Icon>
              </button>
            </div>
          </header>

          <div className="canvas-wrap" id="canvasWrap">
            <svg id="geometry" viewBox="0 0 900 700" role="img" aria-labelledby="svgTitle svgDesc">
              <title id="svgTitle">Sacred geometry construction</title>
              <desc id="svgDesc">An interactive geometric construction drawing.</desc>
              <g id="gridLayer" />
              <g id="perspectiveLayer" />
              <g id="guideLayer" />
              <g id="shapeLayer" />
              <g id="pointLayer" />
              <g id="overlayLayer" />
            </svg>
            <div className="canvas-badge" id="canvasBadge">
              3D · 1-POINT PERSPECTIVE
            </div>
            <div className="axis-key" aria-hidden="true">
              <span className="x">X</span>
              <span className="y">Y</span>
              <span className="z">Z</span>
            </div>
            <div className="status-line" id="statusLine" />
            <div className="present-title" aria-hidden="true">
              <span className="present-kicker" />
              <h2 className="present-name" />
            </div>
            <button type="button" className="present-hint" id="presentExit">
              Esc to exit
            </button>
          </div>

          <div className="steps">
            <button className="step-button" id="prevBtn" type="button" aria-label="Previous step">
              ←
            </button>
            <div className="timeline">
              <div className="timeline-meta">
                <span className="step-caption" id="stepCaption">
                  Origin
                </span>
                <span className="step-readout" id="stepReadout">
                  01 / 07
                </span>
              </div>
              <label className="sr-only" htmlFor="step">
                Construction step
              </label>
              <input id="step" type="range" min="1" max="7" defaultValue="1" />
              <div className="step-breakpoints" id="stepBreakpoints" aria-hidden="true" />
            </div>
            <button className="step-button" id="nextBtn" type="button" aria-label="Next step">
              →
            </button>
            <button className="step-button play" id="playBtn" type="button" aria-label="Play construction">
              ▶
            </button>
            <label className="sr-only" htmlFor="speed">
              Playback speed
            </label>
            <select className="speed-select" id="speed" title="Playback speed" defaultValue="650">
              <option value="1100">0.5×</option>
              <option value="650">1×</option>
              <option value="360">2×</option>
            </select>
          </div>
        </section>
      </main>

      <dialog className="studio" id="studio" aria-labelledby="stTitle">
        <div className="st-head">
          <div>
            <span className="label">Real size · real tools</span>
            <h2 id="stTitle">Studio</h2>
          </div>
          <button className="action" id="stClose" type="button" aria-label="Close studio">
            ✕
          </button>
        </div>
        <div className="st-body">
          <div className="segmented" id="stModes" role="group" aria-label="Output type">
            <button type="button" data-v="print">
              Print
            </button>
            <button type="button" data-v="plotter">
              Plotter
            </button>
            <button type="button" data-v="stencil">
              Stencil
            </button>
          </div>
          <div className="st-preview">
            <svg
              id="studioPreview"
              role="img"
              aria-label="The output drawn to scale on its sheet, with a 1.75 m figure for scale on large sizes"
            />
          </div>
          <p className="st-stats" id="studioStats" />
          <div className="st-actions">
            <button className="action primary" id="stDownload" type="button">
              Download
            </button>
          </div>
          <p className="st-note" data-for="print">
            Vector at true size, one layer per group, pen widths in millimetres. Opens in Illustrator, Inkscape or
            Affinity at the right dimensions.
          </p>
          <p className="st-note" data-for="plotter">
            One path per stroke, one numbered layer per pen, overlapping chords merged so no line is drawn twice,
            and strokes ordered to keep pen-up travel short. Layer numbers work with AxiDraw’s layer mode.
          </p>
          <p className="st-note" data-for="stencil">
            Each layer becomes its own sheet. Lines become slots of the width you set, and every stretch of slot
            between two crossings keeps at least one bridge, so no piece can drop out. Black is cut. The corner
            crosses are cut too, so you can register each sheet on the wall.
          </p>
          <section>
            <span className="label">Size</span>
            <label className="st-field">
              Sheet
              <select id="stPage" />
            </label>
            <div className="st-row" id="stCustom">
              <label className="st-field">
                Width mm
                <input type="number" id="stW" min="50" step="1" />
              </label>
              <label className="st-field">
                Height mm
                <input type="number" id="stH" min="50" step="1" />
              </label>
            </div>
            <div className="st-row">
              <div className="segmented two" id="stOrient" role="group" aria-label="Orientation">
                <button type="button" data-v="portrait">
                  Portrait
                </button>
                <button type="button" data-v="landscape">
                  Landscape
                </button>
              </div>
              <label className="st-field">
                Margin mm
                <input type="number" id="stMargin" min="0" step="1" />
              </label>
            </div>
          </section>
          <section>
            <span className="label">Layers · pen width · colour</span>
            <div id="stLayers" />
          </section>
          <section data-for="stencil">
            <span className="label">Stencil</span>
            <div className="st-row">
              <label className="st-field">
                Slot width mm
                <input type="number" id="stSlot" min="0.5" step="0.5" />
              </label>
              <label className="st-field">
                Bridge mm
                <input type="number" id="stBridge" min="0.5" step="0.5" />
              </label>
              <label className="st-field">
                Bridge every ≤ mm
                <input type="number" id="stSpan" min="10" step="10" />
              </label>
            </div>
          </section>
          <section data-for="print stencil">
            <span className="label">Tile onto smaller sheets</span>
            <div className="st-row">
              <label className="st-field">
                Tile sheet size
                <select id="stSheet" />
              </label>
              <label className="st-field">
                Overlap mm
                <input type="number" id="stOverlap" min="0" step="1" />
              </label>
            </div>
            <p className="st-note">
              For printing a big piece at home or cutting it from stock Mylar. Each tile is labelled by row and
              column; line up the teal crosses in the overlaps.
            </p>
          </section>
          <section>
            <span className="label">Images</span>
            <div className="st-actions">
              <button className="action" id="stPng4" type="button">
                PNG 4× (screen)
              </button>
              <button className="action" id="stScreenSvg" type="button">
                Screen SVG
              </button>
            </div>
            <div className="st-row">
              <label className="st-field">
                Print PNG resolution
                <select id="stDpi">
                  <option value="150">150 dpi</option>
                  <option value="300">300 dpi</option>
                  <option value="600">600 dpi</option>
                </select>
              </label>
              <button className="action" id="stPngPrint" type="button" style={{ alignSelf: 'end' }}>
                Print PNG
              </button>
            </div>
          </section>
          <button className="chip" id="stReset" type="button" style={{ justifySelf: 'start' }}>
            Reset studio settings
          </button>
        </div>
      </dialog>
      <div className="toast" id="toast" role="status" />
      <div className="sr-only" id="announce" role="status" aria-live="polite" />
    </div>
  );
}

export default memo(GeometryStudioShell);
