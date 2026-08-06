'use client';

// OWNED BY COSMOS agent.
// DOM modal for a selected artwork. Cosmos (or the 2D fallback) opens it via
// setSelectedWork(id); close = setSelectedWork(null). Fixed, zIndex 95, the
// scene blurred behind via backdrop-filter. Esc / click-out / ✕ close, body
// scroll locked (Lenis stopped), basic focus trap. Full-res /art/*.jpg is
// allowed here — DOM only, never in Three textures.

import { useEffect, useMemo, useRef } from 'react';
import { useJourney } from './JourneyContext';
import { artworks } from '@/lib/works';

const MONO = "'JetBrains Mono', monospace";
const DISPLAY = "'Cormorant Garamond', Georgia, serif";
const BODY = "'Crimson Text', Georgia, serif";

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function WorkModal() {
  const { selectedWork, setSelectedWork } = useJourney();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const work = useMemo(
    () => artworks.find((w) => w.id === selectedWork) ?? null,
    [selectedWork],
  );
  const index = work ? artworks.findIndex((w) => w.id === work.id) : -1;
  const open = work !== null;

  // scroll lock + focus management + Esc / Tab trap
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.lenis?.stop();
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedWork(null);
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      window.lenis?.start();
      restoreFocus.current?.focus?.();
    };
  }, [open, setSelectedWork]);

  if (!work) return null;

  const statusLabel =
    work.status === 'sold' ? 'sold' : work.status === 'nfs' ? 'not for sale' : 'available';
  const mailto = `mailto:the37thmover@gmail.com?subject=${encodeURIComponent(
    `Inquiry: ${work.title}`,
  )}&body=${encodeURIComponent(
    `I am interested in the original "${work.title}" by Michael MacDonald.\n\nPlease let me know about pricing and availability.`,
  )}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      onClick={() => setSelectedWork(null)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(14, 12, 10, 0.55)',
        backdropFilter: 'blur(18px) saturate(0.85)',
        WebkitBackdropFilter: 'blur(18px) saturate(0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'wm-fade 0.38s cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      <style>{`
        @keyframes wm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wm-rise { from { opacity: 0; transform: translateY(21px); } to { opacity: 1; transform: translateY(0); } }
        .wm-panel::-webkit-scrollbar { width: 3px; }
        .wm-panel::-webkit-scrollbar-thumb { background: #3d2a3a; }
        .wm-btn { transition: background 0.3s, border-color 0.3s, color 0.3s; }
        .wm-btn-red:hover, .wm-btn-red:focus-visible { background: #c41230 !important; color: #e8e4dc !important; }
        .wm-btn-ghost:hover, .wm-btn-ghost:focus-visible { border-color: #e8e4dc !important; }
        .wm-close:hover, .wm-close:focus-visible { color: #c41230 !important; }
        @media (max-width: 860px) { .wm-grid { grid-template-columns: 1fr !important; } .wm-img-wrap { max-height: 44vh; } }
      `}</style>
      <div
        ref={panelRef}
        className="wm-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: 'auto',
          width: 'min(1180px, calc(100vw - 34px))',
          maxHeight: 'calc(100vh - 34px)',
          overflowY: 'auto',
          background: '#12100e',
          border: '1px solid rgba(232, 228, 220, 0.08)',
          animation: 'wm-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.06s both',
          position: 'relative',
        }}
      >
        <button
          ref={closeRef}
          className="wm-close"
          onClick={() => setSelectedWork(null)}
          aria-label="Close"
          style={{
            position: 'sticky',
            top: 0,
            left: '100%',
            transform: 'translate(-8px, 8px)',
            zIndex: 2,
            width: 44,
            height: 44,
            background: 'rgba(14,12,10,0.7)',
            border: '1px solid rgba(232,228,220,0.15)',
            color: '#a09890',
            fontFamily: MONO,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'block',
          }}
        >
          ✕
        </button>
        <div
          className="wm-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)',
            gap: 'clamp(21px, 3vw, 55px)',
            padding: 'clamp(21px, 3.5vw, 55px)',
            paddingTop: 0,
            marginTop: -34,
          }}
        >
          <div
            className="wm-img-wrap"
            style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={work.file}
              alt={work.altText}
              style={{
                width: '100%',
                maxHeight: 'calc(100vh - 140px)',
                objectFit: 'contain',
                objectPosition: 'top',
                display: 'block',
              }}
            />
          </div>
          <div style={{ textAlign: 'left', minWidth: 0, paddingTop: 34 }}>
            <p
              style={{
                margin: '0 0 13px',
                fontFamily: MONO,
                fontSize: '0.62rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#a09890',
              }}
            >
              work {String(index + 1).padStart(2, '0')} / {artworks.length}
              <span style={{ color: work.status === 'available' ? '#c41230' : '#a09890' }}>
                {' '}
                · {statusLabel}
              </span>
            </p>
            <h2
              style={{
                margin: '0 0 8px',
                fontFamily: DISPLAY,
                fontWeight: 300,
                fontSize: 'clamp(2.6rem, 4.5vw, 4.2rem)',
                lineHeight: 1.02,
                color: '#e8e4dc',
                letterSpacing: '-0.01em',
              }}
            >
              {work.title}
            </h2>
            <p
              style={{
                margin: '0 0 21px',
                fontFamily: MONO,
                fontSize: '0.65rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: '#a09890',
              }}
            >
              {work.medium} · {work.year}
              {work.dimensions ? ` · ${work.dimensions}` : ''}
            </p>
            <div
              aria-hidden
              style={{ width: 34, height: 1, background: '#c41230', marginBottom: 21 }}
            />
            <p
              style={{
                margin: '0 0 21px',
                fontFamily: BODY,
                fontSize: '1.08rem',
                lineHeight: 1.72,
                color: '#c9c4bb',
              }}
            >
              {work.longDescription}
            </p>
            <div style={{ display: 'flex', gap: 5, marginBottom: 13 }} aria-hidden>
              {work.colors.map((c) => (
                <span key={c} style={{ width: 21, height: 8, background: c, display: 'block' }} />
              ))}
            </div>
            <p
              style={{
                margin: '0 0 34px',
                fontFamily: MONO,
                fontSize: '0.58rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#6e675f',
                lineHeight: 2,
              }}
            >
              {work.tags.join(' / ')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, paddingBottom: 8 }}>
              {work.status === 'available' && (
                <a
                  className="wm-btn wm-btn-red"
                  href={mailto}
                  style={{
                    fontFamily: MONO,
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#e8e4dc',
                    textDecoration: 'none',
                    padding: '13px 28px',
                    border: '1px solid #c41230',
                    display: 'inline-block',
                  }}
                >
                  inquire
                </a>
              )}
              {work.printUrl && (
                <a
                  className="wm-btn wm-btn-ghost"
                  href={work.printUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: MONO,
                    fontSize: '0.68rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#e8e4dc',
                    textDecoration: 'none',
                    padding: '13px 28px',
                    border: '1px solid rgba(232, 228, 220, 0.3)',
                    display: 'inline-block',
                  }}
                >
                  prints{work.printSizes?.length ? ` · ${work.printSizes.length} sizes` : ''}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
