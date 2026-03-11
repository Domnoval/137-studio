'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { artworks as worksData } from '@/lib/works';

gsap.registerPlugin(ScrollTrigger);

const heroImages = [
  '/art/eye-triangle.png',
  '/art/hero-cipher.png',
  '/art/hero-red-pyramid.png',
  '/art/hero-sun-cross.png',
  '/art/hero-math-pyramid.png',
  '/art/hero-equations.png',
  '/art/hero-red-eye.png',
];

const gallery = [
  { id: 'math-chaos', file: '/art/math-chaos.jpg' },
  { id: 'teal-skull', file: '/art/teal-skull.jpg' },
  { id: 'rosetta', file: '/art/rosetta.jpg' },
  { id: 'chaos-garden', file: '/art/chaos-garden.jpg' },
  { id: 'on-purpose-accidents', file: '/art/undertow.jpg' },
  { id: 'ultraviolet-beast', file: '/art/ultraviolet-beast.jpg' },
  { id: 'composite-head', file: '/art/composite-head.jpg' },
  { id: 'the-delegate', file: '/art/the-delegate.jpg' },
  { id: 'totem', file: '/art/totem.jpg' },
  { id: 'orbit', file: '/art/orbital.jpg' },
  { id: 'blue-teeth', file: '/art/blue-teeth.jpg' },
  { id: 'cruciform', file: '/art/cruciform.jpg' },
  { id: 'pink-skull', file: '/art/pink-skull.jpg' },
  { id: 'menagerie', file: '/art/menagerie.jpg' },
  { id: 'broken-signal', file: '/art/broken-signal.jpg' },
];

const apps = [
  { name: '137 Cipher', url: 'https://137-cipher.vercel.app', desc: 'Ancient script translator' },
  { name: '137 Geometry', url: 'https://137-geometry.vercel.app', desc: 'Sacred geometry generator' },
  { name: 'Harmonic Arcana', url: 'https://harmonic-arcana.vercel.app', desc: 'Tarot meets music theory' },
  { name: '137 Cycles', url: 'https://137-cycles.vercel.app', desc: 'Life cycle calculator' },
  { name: '137 Pad', url: 'https://137-pad.vercel.app', desc: 'Infinite canvas notepad' },
  { name: 'Lyric Lab', url: 'https://lyric-lab.vercel.app', desc: 'AI lyric assistant' },
];

const philosophyLines = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.',
];

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

function fibSpiralPos(index: number) {
  const angle = index * GOLDEN_ANGLE;
  const radius = 8 * Math.sqrt(index + 1);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, rotation: (angle * 180) / Math.PI };
}

const NAME_TEXT = 'Michael MacDonald';
const BRAND_TEXT = 'Studio 137';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0e0c0a', color: '#e8e4dc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '2rem', marginBottom: '1rem' }}>137</h1>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: '#a09890' }}>Something broke. Refresh to try again.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '2rem', padding: '12px 24px', background: 'none', border: '1px solid #c41230', color: '#e8e4dc', cursor: 'pointer', fontFamily: "'Cinzel', serif" }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomePageInner() {
  const [heroImage, setHeroImage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const brandGroupRef = useRef<HTMLDivElement>(null);
  const spiralRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const getWorkData = useCallback((id: string) => worksData.find(w => w.id === id), []);

  useEffect(() => {
    setHeroImage(heroImages[Math.floor(Math.random() * heroImages.length)]);
  }, []);

  useEffect(() => {
    if (!heroImage) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = heroImage;
  }, [heroImage]);

  const nameLetters = useMemo(() => NAME_TEXT.split('').map((char, i) => ({
    char, id: 'name-' + i, spiral: fibSpiralPos(i),
  })), []);

  const brandLetters = useMemo(() => BRAND_TEXT.split('').map((char, i) => ({
    char, id: 'brand-' + i,
  })), []);

  useGSAP(() => {
    if (!heroRef.current || !loaded) return;

    const nameEls = gsap.utils.toArray('.name-letter') as HTMLElement[];
    const brandEls = gsap.utils.toArray('.brand-letter') as HTMLElement[];
    const spiralEl = spiralRef.current;
    const brandGroup = brandGroupRef.current;
    if (!spiralEl || !brandGroup) return;

    // Name -> Spiral -> Studio 137 (tight, 150%)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'top top',
        end: '+=150%',
        scrub: 1,
        pin: true,
      },
    });

    // Letters scatter
    nameEls.forEach((el, i) => {
      const sp = fibSpiralPos(i);
      tl.to(el, { x: sp.x * 3, y: sp.y * 3, rotation: sp.rotation, scale: 0.4, opacity: 0.4, duration: 0.3, ease: 'power2.inOut' }, 0);
    });
    tl.to(spiralEl, { opacity: 0.12, scale: 1.2, rotation: 137.5, duration: 0.2 }, 0.15);
    // Letters converge
    nameEls.forEach((el) => {
      tl.to(el, { x: 0, y: 0, rotation: 0, scale: 0, opacity: 0, duration: 0.15, ease: 'power3.in' }, 0.35);
    });
    tl.to(spiralEl, { opacity: 0, scale: 0.6, duration: 0.1 }, 0.4);
    // Brand appears
    tl.to(brandGroup, { opacity: 1, duration: 0.01 }, 0.5);
    brandEls.forEach((el, i) => {
      const sp = fibSpiralPos(i + 5);
      gsap.set(el, { x: sp.x * 2, y: sp.y * 2, rotation: sp.rotation * 0.5, scale: 0.3, opacity: 0 });
      tl.to(el, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.12, ease: 'back.out(1.7)' }, 0.5 + i * 0.01);
    });

    // Gallery items fade in on scroll
    if (!galleryRef.current) return;
    const items = gsap.utils.toArray('.gallery-item') as HTMLElement[];
    items.forEach((item, i) => {
      gsap.fromTo(item,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.8, ease: 'power2.out',
          scrollTrigger: { trigger: item, start: 'top 90%' },
          delay: (i % 3) * 0.1,
        }
      );
    });

    // Philosophy lines
    const lines = gsap.utils.toArray('.philosophy-line') as HTMLElement[];
    lines.forEach((line) => {
      gsap.fromTo(line,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: line, start: 'top 88%' } }
      );
    });

    // App cards
    const appEls = gsap.utils.toArray('.app-card') as HTMLElement[];
    appEls.forEach((el, i) => {
      gsap.fromTo(el,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' }, delay: i * 0.08 }
      );
    });

  }, [loaded]);

  return (
    <div style={{ background: '#0e0c0a' }}>

      {/* ═══ HERO + NAME → BRAND ═══ */}
      <div ref={heroRef}>
        <section style={{
          position: 'relative', height: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {heroImage && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(' + heroImage + ')',
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: loaded ? 0.3 : 0,
              transition: 'opacity 2s ease-out', filter: 'saturate(0.6)',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 20%, #0e0c0a 80%)',
            pointerEvents: 'none',
          }} />

          {/* Fibonacci spiral */}
          <div ref={spiralRef} style={{
            position: 'absolute', width: '600px', height: '600px',
            opacity: 0, pointerEvents: 'none', zIndex: 5,
          }}>
            <svg viewBox="-300 -300 600 600" style={{ width: '100%', height: '100%' }}>
              <path d={(() => {
                let d = 'M 0 0';
                for (let i = 0; i < 200; i++) {
                  const a = i * 0.1 * GOLDEN_ANGLE;
                  const r = 2 * Math.sqrt(i);
                  d += ' L ' + (Math.cos(a) * r).toFixed(2) + ' ' + (Math.sin(a) * r).toFixed(2);
                }
                return d;
              })()} fill="none" stroke="#c41230" strokeWidth="0.5" opacity="0.6" />
            </svg>
          </div>

          {/* Michael MacDonald */}
          <div style={{
            position: 'absolute', zIndex: 10, textAlign: 'center',
            opacity: loaded ? 1 : 0, transition: 'opacity 1.5s ease-out 0.5s',
          }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300, fontSize: 'clamp(2.5rem, 10vw, 8rem)',
              lineHeight: 1, color: '#e8e4dc', letterSpacing: '-0.02em', margin: 0,
              display: 'inline-block',
            }}>
              {nameLetters.map((l) => (
                l.char === ' ' ? (
                  <span key={l.id} className="name-letter" style={{
                    display: 'block', height: '0.15em', willChange: 'transform, opacity',
                  }} />
                ) : (
                  <span key={l.id} className="name-letter" style={{
                    display: 'inline-block', willChange: 'transform, opacity',
                  }}>{l.char}</span>
                )
              ))}
            </h1>
            <div style={{
              width: loaded ? '120px' : '0px', height: '1px', background: '#c41230',
              margin: '24px auto 0', transition: 'width 2s ease-out 1.2s',
              boxShadow: '0 0 20px rgba(196, 18, 48, 0.4)',
            }} />
          </div>

          {/* Studio 137 */}
          <div ref={brandGroupRef} style={{ position: 'absolute', zIndex: 10, textAlign: 'center', opacity: 0 }}>
            <h1 style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontWeight: 400, fontSize: 'clamp(2.5rem, 10vw, 8rem)',
              lineHeight: 1, color: '#e8e4dc', letterSpacing: '0.08em', margin: 0,
              display: 'inline-block',
            }}>
              {brandLetters.map((l) => (
                l.char === ' ' ? (
                  <span key={l.id} className="brand-letter" style={{
                    display: 'inline-block', width: '0.3em', willChange: 'transform, opacity',
                  }}>{' '}</span>
                ) : (
                  <span key={l.id} className="brand-letter" style={{
                    display: 'inline-block', willChange: 'transform, opacity',
                  }}>{l.char}</span>
                )
              ))}
            </h1>
            <div style={{
              width: '120px', height: '1px', background: '#c41230',
              margin: '24px auto 0', boxShadow: '0 0 20px rgba(196, 18, 48, 0.4)',
            }} />
          </div>
        </section>
      </div>

      {/* ═══ GALLERY — masonry grid ═══ */}
      <section ref={galleryRef} style={{
        padding: 'clamp(40px, 8vw, 100px) clamp(16px, 4vw, 60px)',
        maxWidth: '1600px', margin: '0 auto',
      }}>
        <div style={{
          columns: 'clamp(1, 3, 3)',
          columnCount: 3,
          columnGap: '16px',
        }}>
          {gallery.map((art) => {
            const work = getWorkData(art.id);
            return (
              <div
                key={art.id}
                className="gallery-item"
                onClick={() => setSelectedWork(art.id)}
                style={{
                  breakInside: 'avoid',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0,
                }}
              >
                <img
                  src={art.file}
                  alt={work?.altText || art.id}
                  loading="lazy"
                  style={{
                    width: '100%', height: 'auto', display: 'block',
                    transition: 'transform 0.5s ease, filter 0.5s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)';
                    (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)';
                    const overlay = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                    if (overlay) overlay.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
                    const overlay = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                    if (overlay) overlay.style.opacity = '0';
                  }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '40px 16px 16px',
                  background: 'linear-gradient(transparent, rgba(14, 12, 10, 0.9))',
                  opacity: 0, transition: 'opacity 0.3s ease',
                  pointerEvents: 'none',
                }}>
                  <p style={{
                    fontFamily: "'Cinzel', Georgia, serif",
                    fontSize: 'clamp(0.85rem, 1.5vw, 1.1rem)',
                    color: '#e8e4dc', margin: 0, letterSpacing: '0.04em',
                  }}>{work?.title || art.id}</p>
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.55rem', color: '#a09890',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    margin: '4px 0 0',
                  }}>{work?.medium || ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ APPS ═══ */}
      <section style={{
        padding: '60px clamp(16px, 4vw, 60px)',
        maxWidth: '1200px', margin: '0 auto',
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.6rem', color: '#a09890',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: '32px', textAlign: 'center',
        }}>Digital Tools</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          {apps.map((app) => (
            <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
              className="app-card"
              style={{
                display: 'block', textDecoration: 'none',
                padding: '20px 24px',
                background: 'rgba(26, 26, 30, 0.5)',
                border: '1px solid rgba(196, 18, 48, 0.15)',
                transition: 'border-color 0.3s, transform 0.2s',
                opacity: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#c41230';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196, 18, 48, 0.15)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <p style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '0.95rem', color: '#e8e4dc', margin: '0 0 4px',
                letterSpacing: '0.04em',
              }}>{app.name}</p>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.55rem', color: '#a09890',
                letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0,
              }}>{app.desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ═══ PHILOSOPHY + CONTACT ═══ */}
      <section style={{
        padding: 'clamp(80px, 12vw, 160px) 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {philosophyLines.map((line, i) => (
            <p key={i} className="philosophy-line" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300, fontSize: 'clamp(1.3rem, 3.5vw, 2.5rem)',
              color: '#e8e4dc', margin: '0 0 24px', opacity: 0, lineHeight: 1.4,
            }}>{line}</p>
          ))}
        </div>

        <div style={{ marginTop: '80px' }}>
          <a href="https://instagram.com/domnoval_art" target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem',
              color: '#c41230', letterSpacing: '0.1em', textDecoration: 'none',
              borderBottom: '1px solid rgba(196, 18, 48, 0.3)',
              paddingBottom: '4px', transition: 'border-color 0.3s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#c41230'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(196, 18, 48, 0.3)'; }}
          >@domnoval_art</a>
        </div>

        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
          color: '#a09890', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: '80px', opacity: 0.4,
        }}>137 Studio &copy; 2026</p>
      </section>

      {/* ═══ DETAIL MODAL ═══ */}
      {selectedWork && (() => {
        const work = getWorkData(selectedWork);
        if (!work) return null;
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedWork(null); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(10, 8, 8, 0.95)',
              backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px',
              animation: 'fadeIn 0.3s ease-out',
              cursor: 'pointer',
              overflowY: 'auto',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '1100px', width: '100%',
                display: 'flex', gap: '48px',
                alignItems: 'flex-start', cursor: 'default',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 55%', minWidth: '280px' }}>
                <img src={work.file} alt={work.altText}
                  style={{
                    width: '100%', height: 'auto', maxHeight: '80vh',
                    objectFit: 'contain',
                    border: '1px solid rgba(232, 228, 220, 0.06)',
                  }}
                />
              </div>
              <div style={{ flex: '0 1 340px', paddingTop: '8px' }}>
                <h2 style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)',
                  color: '#e8e4dc', margin: '0 0 6px', letterSpacing: '0.04em',
                }}>{work.title}</h2>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.65rem', color: '#a09890',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  margin: '0 0 20px',
                }}>{work.medium} &middot; {work.year}</p>
                <div style={{ width: '32px', height: '1px', background: '#c41230', margin: '0 0 20px', boxShadow: '0 0 8px rgba(196, 18, 48, 0.3)' }} />
                <p style={{
                  fontFamily: "'Crimson Text', Georgia, serif",
                  fontSize: '1rem', color: '#c8c4bc', lineHeight: 1.7, margin: '0 0 20px',
                }}>{work.longDescription}</p>
                <div style={{ display: 'flex', gap: '5px', margin: '0 0 16px' }}>
                  {work.colors.map((c, i) => (
                    <div key={i} style={{ width: '20px', height: '20px', background: c, borderRadius: '2px', border: '1px solid rgba(232, 228, 220, 0.12)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '0 0 24px' }}>
                  {work.tags.slice(0, 5).map((t) => (
                    <span key={t} style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem',
                      color: '#a09890', letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '3px 8px', border: '1px solid rgba(160, 152, 144, 0.2)',
                    }}>{t}</span>
                  ))}
                </div>
                <p style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
                  color: work.status === 'available' ? '#4ade80' : '#c41230',
                  letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 16px',
                }}>{work.status === 'nfs' ? 'Not for sale' : work.status}</p>
                {work.status === 'available' && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <a
                      href={'mailto:the37thmover@gmail.com?subject=Inquiry: ' + work.title + '&body=I am interested in the original "' + work.title + '" by Michael MacDonald.%0A%0APlease let me know about pricing and availability.'}
                      style={{
                        display: 'inline-block', fontFamily: "'Cinzel', Georgia, serif",
                        fontSize: '0.8rem', color: '#e8e4dc', letterSpacing: '0.08em',
                        padding: '12px 28px', border: '1px solid #c41230',
                        textDecoration: 'none', transition: 'background 0.3s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#c41230'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >Inquire About Original</a>
                    {work.printUrl && (
                      <a
                        href={work.printUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block', fontFamily: "'Cinzel', Georgia, serif",
                          fontSize: '0.8rem', color: '#e8e4dc', letterSpacing: '0.08em',
                          padding: '12px 28px', border: '1px solid rgba(232, 228, 220, 0.3)',
                          textDecoration: 'none', transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e8e4dc'; (e.currentTarget as HTMLElement).style.background = 'rgba(232, 228, 220, 0.08)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232, 228, 220, 0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >Buy Print</a>
                    )}
                    {work.printSizes && (
                      <p style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem',
                        color: '#a09890', letterSpacing: '0.08em',
                        margin: '4px 0 0', width: '100%',
                      }}>Available sizes: {work.printSizes.join(' \u00B7 ')}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setSelectedWork(null)}
                  style={{
                    position: 'fixed', top: '20px', right: '20px',
                    background: 'none', border: 'none', color: '#a09890',
                    fontSize: '1.8rem', cursor: 'pointer', padding: '8px',
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'color 0.2s', zIndex: 10000,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e8e4dc'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#a09890'; }}
                >&times;</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function HomePage() {
  return <ErrorBoundary><HomePageInner /></ErrorBoundary>;
}
