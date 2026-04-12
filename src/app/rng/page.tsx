'use client';

/**
 * /rng — an interactive explorer for Python's random number generator.
 *
 * The goal: make the "why is it random?" question concrete by visualizing
 * the 624-word internal state of MT19937, watching it tick forward, and
 * seeing how a tiny seed gets expanded into that whole state.
 *
 * Styled to match 137 Studio: dark void, chalk text, red accents,
 * Cinzel / Cormorant / JetBrains Mono.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  N,
  seedMT,
  extractU32,
  cloneState,
  temperSteps,
  type MTState,
} from '@/lib/rng/mt19937';

// ─── helpers ────────────────────────────────────────────────────────────────

function hex(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0');
}

/** Map a uint32 to an HSL color so the grid reads as a heatmap. */
function wordColor(n: number): string {
  const hue = ((n >>> 0) % 360);
  const light = 25 + ((n >>> 8) % 40); // 25%..64%
  return 'hsl(' + hue + ' 70% ' + light + '%)';
}

// ─── small UI atoms ─────────────────────────────────────────────────────────

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};
const serif: React.CSSProperties = {
  fontFamily: "'Cormorant Garamond', Georgia, serif",
};
const display: React.CSSProperties = {
  fontFamily: "'Cinzel', Georgia, serif",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        ...mono,
        fontSize: '0.55rem',
        color: '#a09890',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        margin: '0 0 8px',
      }}
    >
      {children}
    </p>
  );
}

function Button({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...display,
        background: active ? '#c41230' : 'transparent',
        color: disabled ? '#5a5650' : '#e8e4dc',
        border: '1px solid ' + (active ? '#c41230' : 'rgba(196, 18, 48, 0.35)'),
        padding: '10px 18px',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLElement).style.borderColor = '#c41230';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          (e.currentTarget as HTMLElement).style.borderColor =
            'rgba(196, 18, 48, 0.35)';
        }
      }}
    >
      {children}
    </button>
  );
}

// ─── the page ───────────────────────────────────────────────────────────────

export default function RNGExplorerPage() {
  const [seedStr, setSeedStr] = useState('12345');
  const [state, setState] = useState<MTState>(() => seedMT(12345));
  const [outputs, setOutputs] = useState<number[]>([]);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [focusWord, setFocusWord] = useState<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Re-seed whenever the user commits a new seed.
  const applySeed = useCallback((raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const seed = Number.isFinite(parsed) ? parsed >>> 0 : 0;
    setState(seedMT(seed));
    setOutputs([]);
    setLastIndex(null);
    setFocusWord(null);
  }, []);

  // Pull one number out of the generator. We clone the state first so
  // React sees a new object and re-renders. This is also where we capture
  // which state word was consumed, for the "highlight" effect.
  const step = useCallback(() => {
    setState((prev) => {
      const next = cloneState(prev);
      const willTwist = next.index >= N;
      const idxBefore = willTwist ? 0 : next.index;
      const out = extractU32(next);
      setLastIndex(idxBefore);
      setFocusWord(out);
      setOutputs((o) => {
        const n = [out, ...o];
        return n.slice(0, 10);
      });
      return next;
    });
  }, []);

  // Autoplay: tick forward ~6 times per second.
  useEffect(() => {
    if (!autoPlay) return;
    tickRef.current = window.setInterval(() => step(), 160) as unknown as number;
    return () => {
      if (tickRef.current !== null) window.clearInterval(tickRef.current);
    };
  }, [autoPlay, step]);

  // Pre-compute the tempering breakdown for the currently focused word.
  const temperingBreakdown = useMemo(() => {
    if (lastIndex === null) return null;
    // We want the RAW pre-tempered word. After extractU32 the state has
    // moved forward but mt[lastIndex] still holds the raw value.
    const raw = state.mt[lastIndex];
    return temperSteps(raw);
  }, [state, lastIndex]);

  const totalDrawn = useMemo(() => {
    // After first twist, index is how many have been consumed since the
    // last twist. Track total via outputs.length.
    return outputs.length;
  }, [outputs.length]);

  return (
    <div style={{ background: '#0e0c0a', minHeight: '100vh', color: '#e8e4dc' }}>
      {/* ═══ header ═══ */}
      <header
        style={{
          padding: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 60px) 24px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: '0.6rem',
            color: '#c41230',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}
        >
          Studio 137 &middot; Field Notes
        </p>
        <h1
          style={{
            ...display,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 400,
            margin: '0 0 16px',
            letterSpacing: '0.04em',
          }}
        >
          The Shape of Randomness
        </h1>
        <p
          style={{
            ...serif,
            fontSize: 'clamp(1rem, 1.6vw, 1.3rem)',
            color: '#c8c4bc',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: 0,
          }}
        >
          When you call <code style={mono}>random.randint()</code> in Python,
          a tiny seed like <code style={mono}>12345</code> becomes a field of
          624 numbers. Each call reads one word from that field, runs it
          through a bit-scrambler, and moves on. When the field is exhausted,
          it <em>twists</em> itself into a new one. This is MT19937 — the
          Mersenne Twister — and it is entirely deterministic. Watch it run.
        </p>
        <div
          style={{
            width: '80px',
            height: '1px',
            background: '#c41230',
            marginTop: '24px',
            boxShadow: '0 0 12px rgba(196, 18, 48, 0.4)',
          }}
        />
      </header>

      {/* ═══ controls ═══ */}
      <section
        style={{
          padding: '0 clamp(16px, 4vw, 60px)',
          maxWidth: '1200px',
          margin: '0 auto 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div>
          <Label>Seed</Label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applySeed(seedStr);
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              value={seedStr}
              onChange={(e) => setSeedStr(e.target.value)}
              inputMode="numeric"
              style={{
                ...mono,
                flex: 1,
                background: 'rgba(26, 26, 30, 0.5)',
                border: '1px solid rgba(196, 18, 48, 0.25)',
                color: '#e8e4dc',
                padding: '10px 14px',
                fontSize: '0.9rem',
                letterSpacing: '0.04em',
                outline: 'none',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#c41230';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  'rgba(196, 18, 48, 0.25)';
              }}
            />
            <Button onClick={() => applySeed(seedStr)}>Seed</Button>
          </form>
          <p
            style={{
              ...mono,
              fontSize: '0.55rem',
              color: '#a09890',
              letterSpacing: '0.08em',
              margin: '10px 0 0',
            }}
          >
            Try: 0, 1, 12345, 137, 2147483647
          </p>
        </div>

        <div>
          <Label>Step</Label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button onClick={step}>Draw 1</Button>
            <Button
              onClick={() => {
                for (let i = 0; i < 100; i++) step();
              }}
            >
              Draw 100
            </Button>
            <Button
              onClick={() => setAutoPlay((p) => !p)}
              active={autoPlay}
            >
              {autoPlay ? 'Pause' : 'Play'}
            </Button>
          </div>
          <p
            style={{
              ...mono,
              fontSize: '0.55rem',
              color: '#a09890',
              letterSpacing: '0.08em',
              margin: '10px 0 0',
            }}
          >
            index = {state.index} / {N} &middot; drawn = {totalDrawn}
          </p>
        </div>
      </section>

      {/* ═══ the state grid — the main attraction ═══ */}
      <section
        style={{
          padding: '0 clamp(16px, 4vw, 60px)',
          maxWidth: '1200px',
          margin: '0 auto 48px',
        }}
      >
        <Label>Internal State — 624 words of 32 bits</Label>
        <div
          style={{
            display: 'grid',
            // 48 columns × 13 rows = 624 cells exactly
            gridTemplateColumns: 'repeat(48, 1fr)',
            gap: '2px',
            padding: '14px',
            background: 'rgba(26, 26, 30, 0.5)',
            border: '1px solid rgba(196, 18, 48, 0.15)',
          }}
        >
          {state.mt.map((word, i) => {
            const isCursor = i === state.index;
            const isLast = i === lastIndex;
            return (
              <div
                key={i}
                title={'mt[' + i + '] = ' + hex(word)}
                style={{
                  aspectRatio: '1 / 1',
                  background: wordColor(word),
                  outline: isCursor
                    ? '2px solid #e8e4dc'
                    : isLast
                    ? '2px solid #c41230'
                    : 'none',
                  outlineOffset: isCursor || isLast ? '1px' : '0',
                  transition: 'outline 0.1s',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '12px',
            flexWrap: 'wrap',
            ...mono,
            fontSize: '0.6rem',
            color: '#a09890',
            letterSpacing: '0.08em',
          }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                border: '2px solid #e8e4dc',
                marginRight: '6px',
                verticalAlign: 'middle',
              }}
            />
            next word to consume
          </span>
          <span>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                border: '2px solid #c41230',
                marginRight: '6px',
                verticalAlign: 'middle',
              }}
            />
            last word consumed
          </span>
          <span>hover a cell for its hex value</span>
        </div>
      </section>

      {/* ═══ tempering breakdown ═══ */}
      <section
        style={{
          padding: '0 clamp(16px, 4vw, 60px)',
          maxWidth: '1200px',
          margin: '0 auto 48px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
        }}
      >
        <div>
          <Label>Tempering — raw state &rarr; output</Label>
          <div
            style={{
              background: 'rgba(26, 26, 30, 0.5)',
              border: '1px solid rgba(196, 18, 48, 0.15)',
              padding: '20px',
            }}
          >
            {temperingBreakdown ? (
              temperingBreakdown.map((s, i) => (
                <div
                  key={i}
                  style={{
                    ...mono,
                    fontSize: '0.75rem',
                    color: i === temperingBreakdown.length - 1 ? '#e8e4dc' : '#c8c4bc',
                    padding: '6px 0',
                    borderBottom:
                      i < temperingBreakdown.length - 1
                        ? '1px dashed rgba(160, 152, 144, 0.15)'
                        : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <span style={{ color: '#a09890', fontSize: '0.6rem' }}>{s.label}</span>
                  <span>{hex(s.value)}</span>
                </div>
              ))
            ) : (
              <p
                style={{
                  ...mono,
                  fontSize: '0.7rem',
                  color: '#a09890',
                  margin: 0,
                }}
              >
                Draw a number to see the raw state word get scrambled into the
                output, one xor at a time.
              </p>
            )}
          </div>
          {focusWord !== null && (
            <p
              style={{
                ...mono,
                fontSize: '0.6rem',
                color: '#a09890',
                margin: '10px 0 0',
                letterSpacing: '0.08em',
              }}
            >
              last output as u32 = {focusWord >>> 0} &middot; as float [0,1) &asymp;{' '}
              {((focusWord >>> 0) / 4294967296).toFixed(6)}
            </p>
          )}
        </div>

        <div>
          <Label>Recent outputs</Label>
          <div
            style={{
              background: 'rgba(26, 26, 30, 0.5)',
              border: '1px solid rgba(196, 18, 48, 0.15)',
              padding: '20px',
              minHeight: '240px',
            }}
          >
            {outputs.length === 0 ? (
              <p style={{ ...mono, fontSize: '0.7rem', color: '#a09890', margin: 0 }}>
                No outputs yet.
              </p>
            ) : (
              outputs.map((v, i) => (
                <div
                  key={i}
                  style={{
                    ...mono,
                    fontSize: '0.75rem',
                    color: i === 0 ? '#e8e4dc' : '#a09890',
                    padding: '4px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    opacity: 1 - i * 0.08,
                  }}
                >
                  <span>{hex(v)}</span>
                  <span>{(v >>> 0).toString().padStart(10, ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══ seed expansion panel ═══ */}
      <section
        style={{
          padding: '0 clamp(16px, 4vw, 60px)',
          maxWidth: '1200px',
          margin: '0 auto 80px',
        }}
      >
        <Label>How a small seed becomes 624 words</Label>
        <div
          style={{
            background: 'rgba(26, 26, 30, 0.5)',
            border: '1px solid rgba(196, 18, 48, 0.15)',
            padding: '24px',
          }}
        >
          <p
            style={{
              ...serif,
              fontSize: '1.05rem',
              color: '#c8c4bc',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            The seeding routine is a one-line recurrence:
          </p>
          <pre
            style={{
              ...mono,
              fontSize: '0.75rem',
              color: '#e8e4dc',
              background: '#0e0c0a',
              padding: '16px',
              border: '1px solid rgba(196, 18, 48, 0.2)',
              overflow: 'auto',
              margin: '0 0 16px',
            }}
          >
{`mt[0] = seed
for i in 1..623:
  mt[i] = (1812433253 * (mt[i-1] ^ (mt[i-1] >> 30)) + i) mod 2^32`}
          </pre>
          <p
            style={{
              ...serif,
              fontSize: '1.05rem',
              color: '#c8c4bc',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            That one multiply-xor-add, iterated 623 times, turns any 32-bit
            number into the entire colored grid above. Change the seed by one
            and every cell changes. Seed with{' '}
            <code style={mono}>0</code> and the first outputs are still
            different from <code style={mono}>1</code> &mdash; not because of
            any entropy source, but because the recurrence diverges
            immediately.
          </p>
          <p
            style={{
              ...mono,
              fontSize: '0.6rem',
              color: '#a09890',
              lineHeight: 1.6,
              margin: '16px 0 0',
              letterSpacing: '0.04em',
            }}
          >
            Note: this page uses the canonical reference seeder
            <code> init_genrand(n)</code> from Matsumoto &amp; Nishimura&apos;s
            mt19937ar.c. Python&apos;s <code>random.seed(n)</code> uses a
            different expansion (<code>init_by_array</code>) so the exact
            numbers will differ from Python, but the algorithm and state
            layout are identical.
          </p>
        </div>
      </section>

      {/* ═══ footer ═══ */}
      <footer
        style={{
          padding: '0 clamp(16px, 4vw, 60px) 60px',
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            ...mono,
            fontSize: '0.55rem',
            color: '#a09890',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.6,
            margin: 0,
          }}
        >
          MT19937 &middot; period 2^19937 &minus; 1 &middot; not cryptographic
        </p>
      </footer>
    </div>
  );
}
