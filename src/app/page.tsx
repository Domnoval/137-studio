'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

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

const artworks = [
  { id: 'totem', title: 'Totem', file: '/art/totem.jpg' },
  { id: 'composite-head', title: 'Composite Head', file: '/art/composite-head.jpg' },
  { id: 'math-chaos', title: 'Math Chaos', file: '/art/math-chaos.jpg' },
  { id: 'cruciform', title: 'Cruciform', file: '/art/cruciform.jpg' },
  { id: 'chaos-garden', title: 'Chaos Garden', file: '/art/chaos-garden.jpg' },
  { id: 'teal-skull', title: 'Teal Skull', file: '/art/teal-skull.jpg' },
  { id: 'pink-skull', title: 'Pink Skull', file: '/art/pink-skull.jpg' },
  { id: 'menagerie', title: 'Menagerie', file: '/art/menagerie.jpg' },
  { id: 'blue-teeth', title: 'Blue Teeth', file: '/art/blue-teeth.jpg' },
];

const apps = [
  { name: '137 Cipher', url: 'https://137-cipher.vercel.app', desc: 'Ancient script translator' },
  { name: '137 Geometry', url: 'https://137-geometry.vercel.app', desc: 'Sacred geometry generator' },
  { name: 'Harmonic Arcana', url: 'https://harmonic-arcana.vercel.app', desc: 'Tarot meets music theory' },
  { name: '137 Cycles', url: 'https://137-cycles.vercel.app', desc: 'Life cycle calculator' },
  { name: '137 Pad', url: 'https://137-pad.vercel.app', desc: 'Infinite canvas notepad' },
  { name: 'Lyric Lab', url: 'https://lyric-lab.vercel.app', desc: 'AI lyric assistant' },
];

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

function fibSpiralPos(index: number) {
  const angle = index * GOLDEN_ANGLE;
  const radius = 8 * Math.sqrt(index + 1);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, rotation: (angle * 180) / Math.PI };
}

function spherePosition(index: number, total: number) {
  // Fibonacci sphere for even distribution
  const phi = Math.acos(1 - 2 * (index + 0.5) / total);
  const theta = Math.PI * (1 + Math.sqrt(5)) * index;
  const radius = 42;
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta) * 0.6,
    z: radius * Math.cos(phi),
  };
}

function generateStars(count: number) {
  const stars: { x: number; y: number; z: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: Math.random() * 2000,
      size: Math.random() * 2 + 0.5,
    });
  }
  return stars;
}

const philosophyLines = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.',
];

const NAME_TEXT = 'Michael MacDonald';
const BRAND_TEXT = 'Studio 137';

// CRT glyph characters for the static effect
const CRT_GLYPHS = '\u2234\u2235\u2206\u2207\u221E\u03B1\u03B2\u03B3\u03B4\u03C0\u03C6\u03C8\u2609\u263D\u2640\u2642\u2660\u2663\u2665\u2666\u2720\u2721\u2726\u2727\u273A\u2756\u25B3\u25BD\u25C7\u2B22\u2295\u2297\u2299\u22C5\u2261\u2245';

export default function HomePage() {
  const [heroImage, setHeroImage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const brandGroupRef = useRef<HTMLDivElement>(null);
  const spiralRef = useRef<HTMLDivElement>(null);
  const cosmosRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const tvInsideRef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);

  const stars = useMemo(() => generateStars(120), []);

  useEffect(() => {
    setHeroImage(heroImages[Math.floor(Math.random() * heroImages.length)]);
  }, []);

  useEffect(() => {
    if (!heroImage) return;
    const img = new Image();
    img.onload = () => setLoaded(true);
    img.src = heroImage;
  }, [heroImage]);

  const nameLetters = useMemo(() => {
    return NAME_TEXT.split('').map((char, i) => ({
      char, id: 'name-' + i, spiral: fibSpiralPos(i),
    }));
  }, []);

  const brandLetters = useMemo(() => {
    return BRAND_TEXT.split('').map((char, i) => ({
      char, id: 'brand-' + i,
    }));
  }, []);

  // Sphere positions for the art constellation
  const spherePositions = useMemo(() => {
    return artworks.map((_, i) => spherePosition(i, artworks.length));
  }, []);

  useGSAP(() => {
    if (!containerRef.current || !loaded) return;

    const nameEls = gsap.utils.toArray('.name-letter') as HTMLElement[];
    const brandEls = gsap.utils.toArray('.brand-letter') as HTMLElement[];
    const spiralEl = spiralRef.current;
    const brandGroup = brandGroupRef.current;
    if (!spiralEl || !brandGroup) return;

    // ═══ PHASE 1-2: Name → Spiral → Rebuild Studio 137 ═══
    const tl1 = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=250%',
        scrub: 1,
        pin: true,
      },
    });

    nameEls.forEach((el, i) => {
      const sp = fibSpiralPos(i);
      tl1.to(el, {
        x: sp.x * 3, y: sp.y * 3, rotation: sp.rotation,
        scale: 0.4, opacity: 0.5, duration: 0.3, ease: 'power2.inOut',
      }, 0);
    });
    tl1.to(spiralEl, { opacity: 0.15, scale: 1.2, rotation: 137.5, duration: 0.2, ease: 'none' }, 0.2);
    nameEls.forEach((el) => {
      tl1.to(el, { x: 0, y: 0, rotation: 0, scale: 0.2, opacity: 0.3, duration: 0.2, ease: 'power3.in' }, 0.3);
    });
    tl1.to(spiralEl, { opacity: 0, scale: 0.8, duration: 0.15, ease: 'power2.in' }, 0.35);
    nameEls.forEach((el) => {
      tl1.to(el, { opacity: 0, scale: 0, duration: 0.05, ease: 'power4.in' }, 0.5);
    });
    tl1.to(brandGroup, { opacity: 1, duration: 0.01 }, 0.5);
    brandEls.forEach((el, i) => {
      const sp = fibSpiralPos(i + 5);
      gsap.set(el, { x: sp.x * 2, y: sp.y * 2, rotation: sp.rotation * 0.5, scale: 0.3, opacity: 0 });
      tl1.to(el, {
        x: 0, y: 0, rotation: 0, scale: 1, opacity: 1,
        duration: 0.15, ease: 'back.out(1.7)',
      }, 0.5 + i * 0.01);
    });

    // ═══ PHASE 3: ART COSMOS — arrive then settle into sphere ═══
    if (!cosmosRef.current) return;
    const starEls = gsap.utils.toArray('.star-particle') as HTMLElement[];
    const artEls = gsap.utils.toArray('.cosmos-artwork') as HTMLElement[];

    const tl2 = gsap.timeline({
      scrollTrigger: {
        trigger: cosmosRef.current,
        start: 'top top',
        end: '+=1200%',
        scrub: 2,
        pin: true,
      },
    });

    // Stars drift gently
    starEls.forEach((star) => {
      const z = parseFloat(star.dataset.z || '0');
      tl2.fromTo(star, { z: z, opacity: 0.3 }, { z: z - 400, opacity: 0, scale: 1.5, duration: 4, ease: 'none' }, 0);
    });

    // Each painting: fly in from deep space → pause at center → drift back to sphere position
    const ARRIVE_DURATION = 0.06;
    const HOLD_DURATION = 0.04;
    const SETTLE_DURATION = 0.06;
    const totalArtTime = 0.7; // 70% of timeline for art arrivals
    const artSpacing = totalArtTime / artEls.length;

    artEls.forEach((art, i) => {
      const start = i * artSpacing;
      const sPos = spherePositions[i];

      // Fly in from deep space to center
      tl2.fromTo(art,
        { z: -4000, opacity: 0, scale: 0.1 },
        { z: 0, opacity: 1, scale: 1, duration: ARRIVE_DURATION, ease: 'power2.out' },
        start
      );

      // Hold at center — the painting has its moment
      // (just sits there for HOLD_DURATION)

      // Drift back to its sphere position
      tl2.to(art, {
        x: sPos.x + 'vw',
        y: sPos.y + 'vh',
        z: sPos.z * 10,
        scale: 0.35,
        opacity: 0.85,
        duration: SETTLE_DURATION,
        ease: 'power1.inOut',
      }, start + ARRIVE_DURATION + HOLD_DURATION);
    });

    // After all paintings settle, slowly rotate the whole constellation
    const cosmosInner = cosmosRef.current.querySelector('.cosmos-inner') as HTMLElement;
    if (cosmosInner) {
      tl2.to(cosmosInner, {
        rotateY: 30, rotateX: 10,
        duration: 0.25,
        ease: 'none',
      }, totalArtTime);
    }

    // ═══ PHASE 4: THE TV PORTAL (no frame image — pure CRT static) ═══
    if (!tvRef.current) return;

    const tvGlyphs = tvRef.current.querySelector('.tv-glyphs') as HTMLElement;
    const tvStatic = tvRef.current.querySelector('.tv-static-overlay') as HTMLElement;
    const tvFlash = tvRef.current.querySelector('.tv-flash') as HTMLElement;
    const tvVignette = tvRef.current.querySelector('.tv-vignette') as HTMLElement;
    const scanlineEl = tvRef.current.querySelector('.tv-scanlines') as HTMLElement;

    const tl3 = gsap.timeline({
      scrollTrigger: {
        trigger: tvRef.current,
        start: 'top top',
        end: '+=300%',
        scrub: 1,
        pin: true,
      },
    });

    // Glyphs fade in — scattered sacred symbols materializing from void
    if (tvGlyphs) {
      tl3.fromTo(tvGlyphs, { opacity: 0 }, { opacity: 0.7, duration: 0.3, ease: 'power2.in' }, 0);
    }

    // Scanlines appear
    if (scanlineEl) {
      tl3.fromTo(scanlineEl, { opacity: 0 }, { opacity: 0.5, duration: 0.2 }, 0.1);
    }

    // Static intensifies
    if (tvStatic) {
      tl3.fromTo(tvStatic, { opacity: 0 }, { opacity: 0.4, duration: 0.25 }, 0.15);
    }

    // Vignette closes in — like the screen is pulling you
    if (tvVignette) {
      tl3.fromTo(tvVignette,
        { background: 'radial-gradient(ellipse at center, transparent 60%, #0e0c0a 80%)' },
        { background: 'radial-gradient(ellipse at center, transparent 80%, #0e0c0a 95%)', duration: 0.3 },
        0.1
      );
    }

    // RED FLASH — crash through
    if (tvFlash) {
      tl3.fromTo(tvFlash, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: 'power4.in' }, 0.7);
      tl3.to(tvFlash, { opacity: 0, duration: 0.15, ease: 'power2.out' }, 0.8);
    }

    // ═══ PHASE 5: INSIDE THE TV — chaos room ═══
    if (!tvInsideRef.current) return;

    const walls = gsap.utils.toArray('.tv-wall') as HTMLElement[];
    const appCards = gsap.utils.toArray('.tv-app-card') as HTMLElement[];

    const tl4 = gsap.timeline({
      scrollTrigger: {
        trigger: tvInsideRef.current,
        start: 'top top',
        end: '+=500%',
        scrub: 1,
        pin: true,
      },
    });

    // Walls perspective shift — tesseract fold
    walls.forEach((wall, i) => {
      const rotateAxis = i % 2 === 0 ? 'rotateY' : 'rotateX';
      const angle = (i % 2 === 0 ? 1 : -1) * 15;
      tl4.fromTo(wall,
        { opacity: 0.5 },
        { opacity: 0.85, [rotateAxis]: angle + 'deg', duration: 1, ease: 'none' },
        0
      );
    });

    // App cards float in from golden angle positions
    appCards.forEach((card, i) => {
      const angle = i * GOLDEN_ANGLE;
      const x = Math.cos(angle) * 40;
      const y = Math.sin(angle) * 25;
      const start = 0.1 + i * 0.12;

      tl4.fromTo(card,
        { x: x + 'vw', y: y + 'vh', opacity: 0, scale: 0.4, rotation: (Math.random() - 0.5) * 40 },
        { x: '0vw', y: '0vh', opacity: 1, scale: 1, rotation: 0, duration: 0.2, ease: 'power2.out' },
        start
      );
    });

    // ═══ PHILOSOPHY ═══
    if (!philosophyRef.current) return;
    const lines = gsap.utils.toArray('.philosophy-line') as HTMLElement[];
    lines.forEach((line) => {
      gsap.fromTo(line,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: line, start: 'top 85%' } }
      );
    });

  }, [loaded, spherePositions]);

  // Animated CRT glyph field
  const [glyphGrid, setGlyphGrid] = useState<string[]>([]);
  useEffect(() => {
    const glyphs = CRT_GLYPHS.split('');
    const gridSize = 200;
    const initial: string[] = [];
    for (let i = 0; i < gridSize; i++) {
      initial.push(glyphs[Math.floor(Math.random() * glyphs.length)]);
    }
    setGlyphGrid(initial);

    const interval = setInterval(() => {
      setGlyphGrid(prev => {
        const next = [...prev];
        // Randomly change ~10% of glyphs each tick
        for (let i = 0; i < 20; i++) {
          const idx = Math.floor(Math.random() * gridSize);
          next[idx] = glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        return next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: '#0e0c0a' }}>

      {/* ═══ PHASE 1-2: Name → Studio 137 ═══ */}
      <div ref={containerRef}>
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
              margin: '34px auto 0', transition: 'width 2s ease-out 1.2s',
              boxShadow: '0 0 20px rgba(196, 18, 48, 0.4)',
            }} />
          </div>

          {/* Studio 137 */}
          <div ref={brandGroupRef} style={{
            position: 'absolute', zIndex: 10, textAlign: 'center', opacity: 0,
          }}>
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
              margin: '34px auto 0', boxShadow: '0 0 20px rgba(196, 18, 48, 0.4)',
            }} />
          </div>
        </section>
      </div>

      {/* ═══ PHASE 3: ART COSMOS ═══ */}
      <div ref={cosmosRef} style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        background: '#0e0c0a', perspective: '800px', perspectiveOrigin: '50% 50%',
      }}>
        <div className="cosmos-inner" style={{
          position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Star field */}
          {stars.map((star, i) => (
            <div key={'star-' + i} className="star-particle" data-z={star.z} style={{
              position: 'absolute', left: '50%', top: '50%',
              width: star.size + 'px', height: star.size + 'px', borderRadius: '50%',
              background: i % 5 === 0 ? '#c41230' : i % 3 === 0 ? '#d4a030' : '#e8e4dc',
              transform: 'translate3d(' + star.x + 'vw, ' + star.y + 'vh, ' + star.z + 'px)',
              opacity: 0.3, willChange: 'transform, opacity',
            }} />
          ))}

          {/* Art pieces */}
          {artworks.map((art, i) => (
            <div key={art.id} className="cosmos-artwork" style={{
              position: 'absolute',
              transform: 'translate3d(0, 0, -4000px)',
              opacity: 0, willChange: 'transform, opacity', cursor: 'pointer',
              transition: 'filter 0.3s',
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)';
                (e.currentTarget as HTMLElement).style.zIndex = '100';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
                (e.currentTarget as HTMLElement).style.zIndex = '1';
              }}
            >
              <div style={{
                position: 'relative',
                boxShadow: '0 0 80px rgba(196, 18, 48, 0.15), 0 30px 100px rgba(0,0,0,0.9)',
                border: '1px solid rgba(232, 228, 220, 0.08)',
              }}>
                <img src={art.file} alt={art.title} loading="lazy" style={{
                  display: 'block', maxWidth: '70vw', maxHeight: '70vh',
                  width: 'auto', height: 'auto', objectFit: 'contain',
                }} />
                <div style={{
                  position: 'absolute', bottom: '-8px', left: 0, right: 0, height: '8px',
                  background: 'linear-gradient(to bottom, #1a1a1e, #0e0c0a)',
                  borderBottom: '1px solid rgba(196, 18, 48, 0.15)',
                }} />
                <div style={{
                  position: 'absolute', top: 0, right: '-8px', bottom: '-8px', width: '8px',
                  background: 'linear-gradient(to right, #1a1a1e, #0e0c0a)',
                  borderRight: '1px solid rgba(196, 18, 48, 0.15)',
                }} />
              </div>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem',
                color: '#a09890', letterSpacing: '0.15em', textTransform: 'uppercase',
                marginTop: '16px', textAlign: 'center',
              }}>{art.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ PHASE 4: THE TV PORTAL — pure CRT static + glyphs ═══ */}
      <div ref={tvRef} style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        background: '#0a0808', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Animated sacred glyphs — the Pillars of Creation effect */}
        <div className="tv-glyphs" style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 'clamp(1rem, 2.5vw, 2rem)',
          lineHeight: 1.8, letterSpacing: '0.3em',
          color: '#c41230', opacity: 0,
          pointerEvents: 'none', padding: '5vh 5vw',
          overflow: 'hidden',
        }}>
          {glyphGrid.map((g, i) => (
            <span key={i} style={{
              opacity: 0.2 + Math.random() * 0.6,
              color: i % 7 === 0 ? '#e8e4dc' : i % 5 === 0 ? '#d4a030' : '#c41230',
              textShadow: i % 3 === 0 ? '0 0 10px currentColor' : 'none',
            }}>{g}</span>
          ))}
        </div>

        {/* CRT scanlines */}
        <div className="tv-scanlines" style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 4px)',
          opacity: 0, pointerEvents: 'none', zIndex: 2,
        }} />

        {/* Static noise overlay */}
        <div className="tv-static-overlay" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          opacity: 0, mixBlendMode: 'overlay', pointerEvents: 'none', zIndex: 3,
        }} />

        {/* Vignette */}
        <div className="tv-vignette" style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, #0a0808 75%)',
          pointerEvents: 'none', zIndex: 4,
        }} />

        {/* RED FLASH — the crash-through moment */}
        <div className="tv-flash" style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at center, #ffffff 0%, rgba(196, 18, 48, 0.9) 30%, #0a0808 70%)',
          opacity: 0, pointerEvents: 'none', zIndex: 20,
        }} />
      </div>

      {/* ═══ PHASE 5: INSIDE THE TV — chaos room ═══ */}
      <div ref={tvInsideRef} style={{
        position: 'relative', height: '100vh', overflow: 'hidden',
        background: '#0a0808',
        perspective: '1200px', perspectiveOrigin: '50% 50%',
      }}>
        {/* Wall textures */}
        <div style={{
          position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
        }}>
          <div className="tv-wall" style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/art/wall-texture-equations.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.5, transform: 'translateZ(-200px)',
          }} />
          <div className="tv-wall" style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%',
            backgroundImage: 'url(/art/wall-hebrew-triangle.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.5, transform: 'rotateY(20deg)', transformOrigin: 'left center',
          }} />
          <div className="tv-wall" style={{
            position: 'absolute', top: 0, bottom: 0, right: 0, width: '30%',
            backgroundImage: 'url(/art/wall-137-sanskrit.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.5, transform: 'rotateY(-20deg)', transformOrigin: 'right center',
          }} />
          <div className="tv-wall" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            backgroundImage: 'url(/art/wall-texture-hallway.png)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.35, transform: 'rotateX(30deg)', transformOrigin: 'bottom center',
          }} />
        </div>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(10, 8, 8, 0.9) 80%)',
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* Persistent scanlines inside the room */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 4px, rgba(0,0,0,0.15) 4px, rgba(0,0,0,0.15) 5px)',
          pointerEvents: 'none', zIndex: 6, opacity: 0.3,
        }} />

        {/* App cards */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center',
          gap: '20px', padding: '10vh 5vw', zIndex: 10,
        }}>
          {apps.map((app) => (
            <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer"
              className="tv-app-card" style={{
                display: 'block', textDecoration: 'none',
                padding: '20px 28px',
                background: 'rgba(10, 8, 8, 0.85)',
                border: '1px solid rgba(196, 18, 48, 0.25)',
                backdropFilter: 'blur(8px)',
                transition: 'border-color 0.3s, transform 0.3s, box-shadow 0.3s',
                cursor: 'pointer', opacity: 0,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = '#c41230';
                el.style.transform = 'scale(1.08)';
                el.style.boxShadow = '0 0 30px rgba(196, 18, 48, 0.2)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(196, 18, 48, 0.25)';
                el.style.transform = 'scale(1)';
                el.style.boxShadow = 'none';
              }}
            >
              <p style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 'clamp(0.9rem, 1.8vw, 1.3rem)',
                color: '#e8e4dc', margin: '0 0 6px 0', letterSpacing: '0.05em',
              }}>{app.name}</p>
              <p style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
                color: '#a09890', letterSpacing: '0.1em', margin: 0,
                textTransform: 'uppercase',
              }}>{app.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* ═══ PHILOSOPHY + CONTACT ═══ */}
      <section ref={philosophyRef} style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '89px 34px', background: '#0e0c0a',
      }}>
        <div style={{ maxWidth: '800px', textAlign: 'center' }}>
          {philosophyLines.map((line, i) => (
            <p key={i} className="philosophy-line" style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300, fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              color: '#e8e4dc', margin: '0 0 34px 0', opacity: 0, lineHeight: 1.4,
            }}>{line}</p>
          ))}
        </div>
        <div style={{ marginTop: '89px', textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(1rem, 2vw, 1.5rem)',
            color: '#a09890', letterSpacing: '0.1em', marginBottom: '34px',
          }}>Send a Signal</p>
          <a href="https://instagram.com/domnoval_art" target="_blank" rel="noopener noreferrer"
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem',
              color: '#c41230', letterSpacing: '0.1em', textDecoration: 'none',
            }}>@domnoval_art</a>
        </div>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem',
          color: '#a09890', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: '89px', opacity: 0.5,
        }}>137 Studio &copy; 2026</p>
      </section>
    </div>
  );
}
