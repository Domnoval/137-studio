'use client';

// cosmos/CosmosFallback.tsx — OWNED BY COSMOS agent.
// The designed 2D cosmos for mobile / no-WebGL / reduced-motion: featured
// works stacked large-format down the cosmos+contraction band, lazy-loaded,
// with big mono captions. Intentional, not apologetic.

import { useJourney } from '../JourneyContext';
import { PHASES } from '../journey-utils';
import { featuredWorks } from '@/lib/works';

const START = PHASES.cosmos.start; // 0.18
const END = PHASES.contraction.end; // 0.78

export function CosmosFallback() {
  const { setSelectedWork } = useJourney();
  return (
    <section
      data-phase="cosmos-fallback"
      style={{
        position: 'absolute',
        top: `${START * 100}%`,
        height: `${(END - START) * 100}%`,
        left: 0,
        width: '100%',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        padding: 'clamp(21px, 6vw, 89px)',
        // the fixed depth rail lives at the right edge (ScrollProgress, 55px
        // wide): keep the art column clear of it instead of printing underneath
        paddingRight: 'clamp(48px, 12vw, 89px)',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.65rem',
          color: '#a09890',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        the work — {featuredWorks.length} pieces
      </p>
      {featuredWorks.map((work, i) => (
        <figure
          key={work.id}
          onClick={() => setSelectedWork(work.id)}
          style={{
            margin: 0,
            cursor: 'pointer',
            alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end',
            maxWidth: 'min(88vw, 640px)',
            width: '100%',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={work.file}
            alt={work.altText}
            loading="lazy"
            decoding="async"
            style={{
              display: 'block',
              width: '100%',
              maxHeight: '52vh',
              objectFit: 'contain',
              objectPosition: i % 2 === 0 ? 'left' : 'right',
              filter: 'saturate(0.94)',
            }}
          />
          <figcaption
            style={{
              marginTop: 13,
              textAlign: i % 2 === 0 ? 'left' : 'right',
            }}
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.7rem',
                color: '#e8e4dc',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              {String(i + 1).padStart(2, '0')} — {work.title}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.58rem',
                color: '#a09890',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {work.medium} · {work.year}
              {work.status === 'sold' ? ' · sold' : ''}
            </span>
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
