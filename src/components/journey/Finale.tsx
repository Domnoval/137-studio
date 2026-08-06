'use client';

// OWNED BY FINALE agent.
// RETURN (78–100%) — the biggest, quietest moment on the site.
// Four philosophy lines land ONE AT A TIME (Cormorant Garamond 300,
// clamp(2rem,5vw,4rem), chalk, left-aligned per design law, each with its own
// scroll room), then the contact block (mono, red underline treatment carried
// over from the old site), then "137 Studio" in Cinzel — the ONLY Cinzel on
// the page — small, faded, centered, with a hair of red above it.
// Reveals are progress-gated GSAP tweens (power4.out, y + blur-in), never
// scrubbed — a line LANDS once and stays. Triggers are computed from real
// layout so they track any viewport; they reverse softly on scroll-back.
// reducedMotion: lines simply appear at their thresholds.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { PHASES } from './journey-utils';

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";

const LINES = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.',
];

// Old-site contact treatment: mono, red, hairline red underline at 30%,
// waking to full red on hover.
const LINK_CSS = `
.fin-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 400;
  color: ${RED};
  letter-spacing: 0.1em;
  text-decoration: none;
  border-bottom: 1px solid rgba(196, 18, 48, 0.3);
  padding-bottom: 4px;
  width: fit-content;
  transition: border-color 0.3s ease;
}
.fin-link:hover,
.fin-link:focus-visible {
  border-color: ${RED};
  outline: none;
}
`;

export function Finale() {
  const { reducedMotion, progressRef } = useJourney();
  const revealRefs = useRef<(HTMLElement | null)[]>([]);
  const { start, end } = PHASES.return;

  const setReveal = (i: number) => (el: HTMLElement | null) => {
    revealRefs.current[i] = el;
  };

  useEffect(() => {
    const els = revealRefs.current.filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const triggers: number[] = new Array(els.length).fill(1);
    const shown: boolean[] = new Array(els.length).fill(false);

    // Trigger = smoothed progress at which the element's top crosses 82% of
    // the viewport. Computed from real layout; capped so the final elements
    // always fire before max scroll.
    const compute = () => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      els.forEach((el, i) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        triggers[i] = Math.min((top - window.innerHeight * 0.82) / max, 0.968);
      });
    };
    compute();
    window.addEventListener('resize', compute);

    if (reducedMotion) {
      // Lines simply appear. No motion, no blur.
      gsap.set(els, { clearProps: 'transform,filter' });
      const update = () => {
        const p = progressRef.current ?? 0;
        els.forEach((el, i) => {
          const want = p >= triggers[i];
          if (want !== shown[i]) {
            shown[i] = want;
            el.style.opacity = want ? '1' : '0';
          }
        });
      };
      gsap.ticker.add(update);
      return () => {
        gsap.ticker.remove(update);
        window.removeEventListener('resize', compute);
      };
    }

    gsap.set(els, { opacity: 0, y: 38, filter: 'blur(10px)' });
    const update = () => {
      const p = progressRef.current ?? 0;
      els.forEach((el, i) => {
        if (!shown[i] && p >= triggers[i]) {
          shown[i] = true;
          gsap.to(el, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 1.1,
            ease: 'power4.out',
            overwrite: 'auto',
          });
        } else if (shown[i] && p < triggers[i] - 0.035) {
          shown[i] = false;
          gsap.to(el, {
            opacity: 0,
            y: 26,
            filter: 'blur(8px)',
            duration: 0.45,
            ease: 'power2.in',
            overwrite: 'auto',
          });
        }
      });
    };
    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      window.removeEventListener('resize', compute);
      gsap.killTweensOf(els);
    };
  }, [reducedMotion, progressRef]);

  return (
    <section
      data-phase="return"
      aria-label="Philosophy and contact"
      style={{
        position: 'absolute',
        top: `${start * 100}%`,
        height: `${(end - start) * 100}%`,
        left: 0,
        width: '100%',
        zIndex: 2,
        overflow: 'hidden',
      }}
    >
      <style>{LINK_CSS}</style>

      {/* Philosophy + contact — left-aligned editorial block, whitespace carries it. */}
      <div
        style={{
          paddingLeft: 'clamp(24px, 11vw, 220px)',
          paddingRight: 'clamp(24px, 6vw, 120px)',
        }}
      >
        {LINES.map((line, i) => (
          <p
            key={line}
            ref={setReveal(i)}
            style={{
              margin: 0,
              marginTop: i === 0 ? '12vh' : '20vh',
              fontFamily: SERIF,
              fontWeight: 300,
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              lineHeight: 1.12,
              letterSpacing: '0.005em',
              color: CHALK,
              maxWidth: '16em',
              opacity: 0,
              willChange: 'transform, opacity, filter',
            }}
          >
            {line}
          </p>
        ))}

        {/* Contact — the only interactive moment of the return. */}
        <div
          ref={setReveal(4)}
          style={{
            marginTop: '9vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 21,
            opacity: 0,
            willChange: 'transform, opacity, filter',
          }}
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: '0.65rem',
              fontWeight: 300,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: FADED,
            }}
          >
            Find the Work
          </span>
          <a
            className="fin-link"
            href="https://instagram.com/domnoval_art"
            target="_blank"
            rel="noopener noreferrer"
          >
            @domnoval_art
          </a>
          <a className="fin-link" href="mailto:the37thmover@gmail.com">
            the37thmover@gmail.com
          </a>
        </div>
      </div>

      {/* The whisper — only Cinzel on the page. A hair of red above it. */}
      <div
        ref={setReveal(5)}
        style={{
          marginTop: '11vh',
          paddingBottom: '7vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 13,
          opacity: 0,
          willChange: 'transform, opacity, filter',
        }}
      >
        <span
          aria-hidden
          style={{ width: 1, height: 34, background: 'rgba(196, 18, 48, 0.45)' }}
        />
        <span
          style={{
            fontFamily: CINZEL,
            fontWeight: 400,
            fontSize: '0.8rem',
            letterSpacing: '0.45em',
            paddingLeft: '0.45em',
            textTransform: 'uppercase',
            color: FADED,
            opacity: 0.75,
          }}
        >
          137 Studio
        </span>
      </div>
    </section>
  );
}
