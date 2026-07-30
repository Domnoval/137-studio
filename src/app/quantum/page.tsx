'use client';

/**
 * /quantum — "Quantum Physics & Other Smart People Shit"
 *
 * An interactive playground for the ideas that broke classical intuition:
 *   1. Double-slit interference — watch a particle behave like a wave.
 *   2. Particle in a box — the discrete energy ladder of a bound state.
 *   3. Heisenberg's trade-off — squeeze position, lose momentum.
 *   4. Planck's blackbody curve — the spectrum that forced energy into lumps.
 * Plus a gallery of the equations that rewired reality.
 *
 * Styled to 137 Studio: warm void, chalk text, blood-red accents,
 * Cinzel / Cormorant / JetBrains Mono. All math lives in @/lib/quantum.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  slitIntensity,
  boxWavefunction,
  boxProbability,
  boxEnergyLevel,
  momentumSpread,
  gaussian,
  planckRadiance,
  wienPeakNm,
  type SlitParams,
} from '@/lib/quantum/physics';
import { concepts } from '@/lib/quantum/concepts';

// ─── design tokens ────────────────────────────────────────────────────────────

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const AMBER = '#d4a030';

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };
const serif: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const display: React.CSSProperties = { fontFamily: "'Cinzel', Georgia, serif" };
const body: React.CSSProperties = { fontFamily: "'Crimson Text', Georgia, serif" };

// ─── small UI atoms ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ ...mono, fontSize: '0.55rem', color: FADED, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 10px' }}>
      {children}
    </p>
  );
}

function Slider({
  label, value, min, max, step, onChange, unit,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <label style={{ display: 'block', margin: '0 0 18px' }}>
      <span style={{ ...mono, fontSize: '0.6rem', color: FADED, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span>{label}</span>
        <span style={{ color: CHALK }}>{value}{unit ? ` ${unit}` : ''}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: RED, cursor: 'pointer' }}
      />
    </label>
  );
}

function Section({ kicker, title, blurb, children }: {
  kicker: string; title: string; blurb: string; children: React.ReactNode;
}) {
  return (
    <section style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(48px, 9vw, 110px) clamp(16px, 4vw, 40px) 0' }}>
      <Label>{kicker}</Label>
      <h2 style={{ ...display, fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', color: CHALK, margin: '0 0 14px', letterSpacing: '0.02em', lineHeight: 1.1 }}>
        {title}
      </h2>
      <p style={{ ...body, fontSize: '1.05rem', color: '#c8c4bc', lineHeight: 1.7, maxWidth: '640px', margin: '0 0 32px' }}>
        {blurb}
      </p>
      {children}
    </section>
  );
}

/** Resize a canvas to its CSS box at device-pixel resolution. Returns ctx + logical size. */
function setupCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

const panel: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
  gap: '28px',
  alignItems: 'start',
};

const canvasShell: React.CSSProperties = {
  width: '100%',
  height: '300px',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(196, 18, 48, 0.18)',
  display: 'block',
};

// ─── 1. Double-slit interference ──────────────────────────────────────────────

function DoubleSlit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<SlitParams>({
    separation: 25, width: 8, wavelength: 500, screenDistance: 2,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const env = setupCanvas(canvas);
    if (!env) return;
    const { ctx, w, h } = env;

    ctx.clearRect(0, 0, w, h);

    // sample the screen across ±screenExtent metres, plot intensity as a curve
    // and as a banded brightness strip underneath.
    const extent = 0.04; // ±4 cm on the screen
    const stripTop = h - 56;

    // brightness strip
    for (let px = 0; px < w; px++) {
      const x = (px / w - 0.5) * 2 * extent;
      const I = slitIntensity(x, params);
      const shade = Math.round(Math.min(1, I) * 255);
      ctx.fillStyle = `rgb(${Math.round(shade * 0.85)}, ${Math.round(shade * 0.9)}, ${shade})`;
      ctx.fillRect(px, stripTop, 1, 48);
    }

    // intensity curve
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const x = (px / w - 0.5) * 2 * extent;
      const I = slitIntensity(x, params);
      const y = (stripTop - 16) - I * (stripTop - 40);
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(196,18,48,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = FADED;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('SCREEN INTENSITY', 8, 16);
  }, [params]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <div style={panel}>
      <canvas ref={canvasRef} style={canvasShell} />
      <div>
        <Slider label="Wavelength" value={params.wavelength} min={380} max={750} step={5}
          unit="nm" onChange={(v) => setParams((p) => ({ ...p, wavelength: v }))} />
        <Slider label="Slit separation" value={params.separation} min={10} max={60} step={1}
          unit="µm" onChange={(v) => setParams((p) => ({ ...p, separation: v }))} />
        <Slider label="Slit width" value={params.width} min={2} max={20} step={1}
          unit="µm" onChange={(v) => setParams((p) => ({ ...p, width: v }))} />
        <p style={{ ...body, fontSize: '0.92rem', color: FADED, lineHeight: 1.6, margin: '6px 0 0' }}>
          Wider separation packs the fringes closer; the single-slit width sets
          the bright central envelope they live inside.
        </p>
      </div>
    </div>
  );
}

// ─── 2. Particle in a box ──────────────────────────────────────────────────────

function ParticleInBox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [n, setN] = useState(1);
  const [showProb, setShowProb] = useState(true);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const env = setupCanvas(canvas);
    if (!env) return;
    const { ctx, w, h } = env;
    ctx.clearRect(0, 0, w, h);

    const pad = 24;
    const mid = h / 2;
    const amp = (h / 2) - pad;

    // box walls
    ctx.strokeStyle = 'rgba(232,228,220,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad);
    ctx.moveTo(w - pad, pad); ctx.lineTo(w - pad, h - pad);
    ctx.moveTo(pad, mid); ctx.lineTo(w - pad, mid);
    ctx.stroke();

    const plotW = w - pad * 2;

    // |ψ|² fill
    if (showProb) {
      ctx.beginPath();
      ctx.moveTo(pad, mid);
      for (let i = 0; i <= plotW; i++) {
        const x = i / plotW;
        const val = boxProbability(x, n);
        ctx.lineTo(pad + i, mid - (val / 2) * amp);
      }
      ctx.lineTo(w - pad, mid);
      ctx.closePath();
      ctx.fillStyle = 'rgba(212,160,48,0.18)';
      ctx.fill();
    }

    // ψ curve
    ctx.beginPath();
    for (let i = 0; i <= plotW; i++) {
      const x = i / plotW;
      const val = boxWavefunction(x, n);
      const y = mid - (val / 2) * amp;
      if (i === 0) ctx.moveTo(pad + i, y);
      else ctx.lineTo(pad + i, y);
    }
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(196,18,48,0.45)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = FADED;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('ψ', pad + 4, pad + 4);
    if (showProb) {
      ctx.fillStyle = AMBER;
      ctx.fillText('|ψ|²', pad + 20, pad + 4);
    }
  }, [n, showProb]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <div style={panel}>
      <canvas ref={canvasRef} style={canvasShell} />
      <div>
        <Slider label="Quantum number n" value={n} min={1} max={8} step={1}
          onChange={setN} />
        <div style={{ ...mono, fontSize: '0.65rem', color: CHALK, letterSpacing: '0.1em', margin: '4px 0 18px' }}>
          E<sub>{n}</sub> = {boxEnergyLevel(n)} · E<sub>1</sub>
          <span style={{ color: FADED }}> &nbsp;({n} {n === 1 ? 'antinode' : 'antinodes'})</span>
        </div>
        <button
          type="button"
          onClick={() => setShowProb((s) => !s)}
          style={{
            ...mono, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: showProb ? VOID : CHALK, background: showProb ? AMBER : 'transparent',
            border: `1px solid ${AMBER}`, padding: '8px 14px', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          |ψ|² density {showProb ? 'on' : 'off'}
        </button>
        <p style={{ ...body, fontSize: '0.92rem', color: FADED, lineHeight: 1.6, margin: '18px 0 0' }}>
          Trap a particle and it can only hold specific energies — a ladder, not
          a ramp. Energy climbs as n², and the wave grows another bump each step.
        </p>
      </div>
    </div>
  );
}

// ─── 3. Heisenberg uncertainty ──────────────────────────────────────────────────

function Uncertainty() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sigmaX, setSigmaX] = useState(2); // nm

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const env = setupCanvas(canvas);
    if (!env) return;
    const { ctx, w, h } = env;
    ctx.clearRect(0, 0, w, h);

    const half = w / 2;
    const baseline = h - 28;
    const top = 28;
    const height = baseline - top;

    // position packet (left half), momentum packet (right half)
    const sigmaP = momentumSpread(sigmaX); // kg·m/s
    // normalise the two spreads to a shared visual scale: a tighter x means a
    // taller/narrower position bump and a broader/flatter momentum bump.
    const xVisSigma = (sigmaX / 8) * (half * 0.32);
    // momentum spread is inversely related; map it onto the right panel width.
    const pVisSigma = (1 / sigmaX) * (half * 0.55);

    const drawBump = (cx: number, vis: number, color: string, peakColor: string) => {
      ctx.beginPath();
      const span = half;
      for (let i = 0; i <= span; i++) {
        const px = cx - span / 2 + i;
        const g = gaussian(i, span / 2, vis);
        const y = baseline - g * height;
        if (i === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = peakColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // divider
    ctx.strokeStyle = 'rgba(232,228,220,0.15)';
    ctx.beginPath(); ctx.moveTo(half, top - 8); ctx.lineTo(half, baseline); ctx.stroke();

    drawBump(half * 0.5, xVisSigma, RED, 'rgba(196,18,48,0.5)');
    drawBump(half * 1.5, pVisSigma, AMBER, 'rgba(212,160,48,0.5)');

    ctx.fillStyle = FADED;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('POSITION  Δx', 12, 18);
    ctx.fillText('MOMENTUM  Δp', half + 12, 18);

    return sigmaP;
  }, [sigmaX]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  const sigmaP = momentumSpread(sigmaX);

  return (
    <div style={panel}>
      <canvas ref={canvasRef} style={canvasShell} />
      <div>
        <Slider label="Position spread Δx" value={sigmaX} min={0.5} max={8} step={0.1}
          unit="nm" onChange={setSigmaX} />
        <div style={{ ...mono, fontSize: '0.62rem', color: CHALK, letterSpacing: '0.08em', lineHeight: 1.8, margin: '4px 0 14px' }}>
          Δp ≈ {sigmaP.toExponential(2)} kg·m/s<br />
          <span style={{ color: FADED }}>Δx·Δp = ℏ/2 (minimum)</span>
        </div>
        <p style={{ ...body, fontSize: '0.92rem', color: FADED, lineHeight: 1.6, margin: 0 }}>
          Pinch the red position peak narrow and the amber momentum peak fattens
          out. You can know <em>where</em> or know <em>how fast</em> — never both
          sharply. The universe charges a tax on certainty.
        </p>
      </div>
    </div>
  );
}

// ─── 4. Planck blackbody curve ──────────────────────────────────────────────────

function Blackbody() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [temp, setTemp] = useState(5778); // K (≈ the Sun)

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const env = setupCanvas(canvas);
    if (!env) return;
    const { ctx, w, h } = env;
    ctx.clearRect(0, 0, w, h);

    const pad = 28;
    const baseline = h - pad;
    const lambdaMin = 100e-9; // 100 nm
    const lambdaMax = 2500e-9; // 2500 nm

    // find a stable max for this temperature to normalise the y-axis
    let peak = 0;
    for (let i = 0; i <= 400; i++) {
      const lambda = lambdaMin + (i / 400) * (lambdaMax - lambdaMin);
      peak = Math.max(peak, planckRadiance(lambda, temp));
    }

    // visible-spectrum band along the x-axis (380–750 nm)
    const xOf = (lambdaM: number) => pad + ((lambdaM - lambdaMin) / (lambdaMax - lambdaMin)) * (w - pad * 2);
    for (let nm = 380; nm <= 750; nm += 2) {
      ctx.fillStyle = wavelengthToRGB(nm);
      ctx.globalAlpha = 0.4;
      ctx.fillRect(xOf(nm * 1e-9), baseline - 6, 2, 6);
    }
    ctx.globalAlpha = 1;

    // curve
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const lambda = lambdaMin + (i / 400) * (lambdaMax - lambdaMin);
      const r = planckRadiance(lambda, temp) / peak;
      const x = pad + (i / 400) * (w - pad * 2);
      const y = baseline - r * (baseline - pad);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(196,18,48,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // peak marker
    const peakNm = wienPeakNm(temp);
    if (peakNm * 1e-9 > lambdaMin && peakNm * 1e-9 < lambdaMax) {
      const px = xOf(peakNm * 1e-9);
      ctx.strokeStyle = 'rgba(212,160,48,0.6)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(px, pad); ctx.lineTo(px, baseline); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = FADED;
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('SPECTRAL RADIANCE  →  λ', 10, 16);
  }, [temp]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  return (
    <div style={panel}>
      <canvas ref={canvasRef} style={canvasShell} />
      <div>
        <Slider label="Temperature" value={temp} min={2000} max={10000} step={50}
          unit="K" onChange={setTemp} />
        <div style={{ ...mono, fontSize: '0.62rem', color: AMBER, letterSpacing: '0.08em', margin: '4px 0 14px' }}>
          peak λ ≈ {Math.round(wienPeakNm(temp))} nm
        </div>
        <p style={{ ...body, fontSize: '0.92rem', color: FADED, lineHeight: 1.6, margin: 0 }}>
          Classical physics predicted infinite energy at short wavelengths — the
          &ldquo;ultraviolet catastrophe&rdquo;. Planck killed it by quantizing energy. Heat
          the object and its peak slides toward blue (Wien&apos;s law).
        </p>
      </div>
    </div>
  );
}

/** Rough wavelength (nm) → CSS rgb, for the visible-spectrum band. */
function wavelengthToRGB(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 750) { r = 1; }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

// ─── concepts gallery ──────────────────────────────────────────────────────────

function ConceptGallery() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '8px' }}>
      {concepts.map((c) => {
        const isOpen = open === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setOpen(isOpen ? null : c.id)}
            aria-expanded={isOpen}
            style={{
              textAlign: 'left', cursor: 'pointer', display: 'block',
              padding: '22px 22px 20px',
              background: 'rgba(26,26,30,0.5)',
              border: `1px solid ${isOpen ? RED : 'rgba(196,18,48,0.15)'}`,
              transition: 'border-color 0.3s', color: 'inherit', font: 'inherit',
            }}
          >
            <span style={{ ...mono, fontSize: '0.5rem', color: FADED, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
              {c.field} · {c.year}
            </span>
            <span style={{ ...display, fontSize: '1.6rem', color: CHALK, display: 'block', letterSpacing: '0.02em', marginBottom: '10px' }}>
              {c.equation}
            </span>
            <span style={{ ...serif, fontSize: '1.05rem', color: AMBER, display: 'block', marginBottom: '4px' }}>
              {c.title}
            </span>
            <span style={{ ...body, fontSize: '0.9rem', color: FADED, display: 'block', fontStyle: 'italic' }}>
              {c.tagline}
            </span>
            {isOpen && (
              <span style={{ ...body, fontSize: '0.95rem', color: '#c8c4bc', lineHeight: 1.65, display: 'block', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(232,228,220,0.1)' }}>
                {c.meaning}
                <span style={{ ...mono, fontSize: '0.55rem', color: FADED, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginTop: '12px' }}>
                  — {c.thinker}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function QuantumPage() {
  return (
    <main style={{ background: VOID, color: CHALK, minHeight: '100vh', paddingBottom: 'clamp(60px, 10vw, 140px)' }}>
      {/* hero */}
      <header style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(72px, 14vw, 160px) clamp(16px, 4vw, 40px) 0' }}>
        <p style={{ ...mono, fontSize: '0.6rem', color: RED, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 24px' }}>
          137 Studio · Interactive Field Notes
        </p>
        <h1 style={{ ...display, fontSize: 'clamp(2.4rem, 8vw, 6rem)', color: CHALK, lineHeight: 1.02, letterSpacing: '0.01em', margin: '0 0 20px' }}>
          Quantum Physics<br />
          <span style={{ color: FADED }}>&amp; Other Smart People Shit</span>
        </h1>
        <p style={{ ...serif, fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)', color: '#c8c4bc', lineHeight: 1.5, maxWidth: '620px', margin: 0, fontWeight: 300 }}>
          The universe does not run on common sense. Drag the sliders and watch
          reality misbehave — interference, quantized energy, and the hard limit
          on how much you&apos;re allowed to know.
        </p>
        <div style={{ width: '120px', height: '1px', background: RED, margin: '36px 0 0', boxShadow: '0 0 20px rgba(196,18,48,0.4)' }} />
      </header>

      <Section
        kicker="Demonstration 01"
        title="The Double Slit"
        blurb="Fire particles at two slits and they paint the striped signature of a wave — each one interferes with itself. The single experiment Feynman said holds the entire mystery of quantum mechanics."
      >
        <DoubleSlit />
      </Section>

      <Section
        kicker="Demonstration 02"
        title="Particle in a Box"
        blurb="Confine a quantum particle between two walls and its energy stops being continuous. Only certain standing-wave states fit — the origin of every atom's discrete spectrum."
      >
        <ParticleInBox />
      </Section>

      <Section
        kicker="Demonstration 03"
        title="Heisenberg's Trade-off"
        blurb="Position and momentum are a conjugate pair locked in a tug-of-war. Sharpen one and the other smears. This is built into the wave, not a limit of measurement."
      >
        <Uncertainty />
      </Section>

      <Section
        kicker="Demonstration 04"
        title="Planck's Catastrophe"
        blurb="The glow of a hot object couldn't be explained until energy was forced to come in discrete packets. This curve is where the word 'quantum' was born."
      >
        <Blackbody />
      </Section>

      <Section
        kicker="The Canon"
        title="Other Smart People Shit"
        blurb="Eight equations that each rewired what reality is allowed to be. Tap one to read what it actually means — no math degree required."
      >
        <ConceptGallery />
      </Section>

      <section style={{ maxWidth: '700px', margin: '0 auto', padding: 'clamp(72px, 12vw, 150px) 24px 0', textAlign: 'center' }}>
        <p style={{ ...serif, fontWeight: 300, fontSize: 'clamp(1.3rem, 3.5vw, 2.2rem)', color: CHALK, lineHeight: 1.4, margin: 0 }}>
          Perception is choice.<br />The universe is stranger than the story we tell about it.
        </p>
      </section>
    </main>
  );
}
