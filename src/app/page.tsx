'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import gsap from 'gsap';
import { artworks as worksData } from '@/lib/works';
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
  { id: 'math-chaos', title: 'Math Chaos', file: '/art/math-chaos.jpg' },
  { id: 'teal-skull', title: 'Teal Skull', file: '/art/teal-skull.jpg' },
  { id: 'rosetta', title: 'Rosetta', file: '/art/rosetta.jpg' },
  { id: 'chaos-garden', title: 'Chaos Garden', file: '/art/chaos-garden.jpg' },
  { id: 'undertow', title: 'Undertow', file: '/art/undertow.jpg' },
  { id: 'ultraviolet-beast', title: 'Ultraviolet Beast', file: '/art/ultraviolet-beast.jpg' },
  { id: 'composite-head', title: 'Composite Head', file: '/art/composite-head.jpg' },
  { id: 'the-delegate', title: 'The Delegate', file: '/art/the-delegate.jpg' },
  { id: 'totem', title: 'Totem', file: '/art/totem.jpg' },
  { id: 'orbit', title: 'Orbit', file: '/art/orbital.jpg' },
  { id: 'blue-teeth', title: 'Blue Teeth', file: '/art/blue-teeth.jpg' },
  { id: 'cruciform', title: 'Cruciform', file: '/art/cruciform.jpg' },
  { id: 'pink-skull', title: 'Pink Skull', file: '/art/pink-skull.jpg' },
  { id: 'menagerie', title: 'Menagerie', file: '/art/menagerie.jpg' },
  { id: 'broken-signal', title: 'Broken Signal', file: '/art/broken-signal.jpg' },
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
  const radius = 80;
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    z: radius * Math.cos(phi) * 0.6,
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


class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0e0c0a', color: '#e8e4dc', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: "'Cinzel', serif" }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>137</h1>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const brandGroupRef = useRef<HTMLDivElement>(null);
  const spiralRef = useRef<HTMLDivElement>(null);
  const cosmosRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const tvInsideRef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);

  const stars = useMemo(() => generateStars(120), []);

  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const cosmosUnlockedRef = useRef(false);
  const cameraRotationRef = useRef({ x: 0, y: 0 });
  const cameraZoomRef = useRef(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastTouches = useRef<{ dist: number } | null>(null);

  const getWorkData = useCallback((id: string) => {
    return worksData.find(w => w.id === id);
  }, []);

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

  
  const updateCosmosTransform = useCallback(() => {
    const inner = cosmosRef.current?.querySelector('.cosmos-inner') as HTMLElement;
    if (!inner) return;
    const r = cameraRotationRef.current;
    const z = cameraZoomRef.current;
    inner.style.transform = 'rotateX(' + r.x + 'deg) rotateY(' + r.y + 'deg) scale(' + z + ')';
    inner.style.cursor = 'grab';
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
          pinType: "transform",
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
        end: '+=1800%',
        scrub: 2,
        pin: true,
          pinType: "transform",
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
        z: sPos.z * 15,
        scale: 0.45,
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

      // When scroll reaches end, unlock free orbit controls
      ScrollTrigger.create({
        trigger: cosmosRef.current,
        start: 'top top',
        end: '+=1200%',
        onLeave: () => { cosmosUnlockedRef.current = true; },
        onEnterBack: () => { cosmosUnlockedRef.current = false; },
      });
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
          pinType: "transform",
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
          pinType: "transform",
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

  // ═══ ORBIT CONTROLS — unlock after scroll completes ═══
  useEffect(() => {
    if (!cosmosUnlockedRef.current || !cosmosRef.current) return;
    const el = cosmosRef.current;

    const onMouseDown = (e: MouseEvent) => {
      if (selectedWork) return;
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      const r = cameraRotationRef.current;
      r.x = Math.max(-40, Math.min(40, r.x - dy * 0.3));
      r.y = r.y + dx * 0.3;
      updateCosmosTransform();
    };
    const onMouseUp = () => {
      isDragging.current = false;
      el.style.cursor = 'grab';
    };
    const onWheel = (e: WheelEvent) => {
      if (selectedWork) return;
      e.preventDefault();
      cameraZoomRef.current = Math.max(0.4, Math.min(2.5, cameraZoomRef.current - e.deltaY * 0.001)); updateCosmosTransform();
    };

    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
      if (selectedWork) return;
      if (e.touches.length === 1) {
        isDragging.current = true;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouches.current = { dist: Math.sqrt(dx * dx + dy * dy) };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDragging.current) {
        const dx = e.touches[0].clientX - lastMouse.current.x;
        const dy = e.touches[0].clientY - lastMouse.current.y;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const r = cameraRotationRef.current;
        r.x = Math.max(-40, Math.min(40, r.x - dy * 0.3));
        r.y = r.y + dx * 0.3;
        updateCosmosTransform();
      } else if (e.touches.length === 2 && lastTouches.current) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist - lastTouches.current.dist;
        lastTouches.current = { dist };
        cameraZoomRef.current = Math.max(0.4, Math.min(2.5, cameraZoomRef.current + delta * 0.005)); updateCosmosTransform();
      }
    };
    const onTouchEnd = () => {
      isDragging.current = false;
      lastTouches.current = null;
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [selectedWork]);

  // CRT glyph field — NO React state, direct DOM manipulation to avoid re-renders
  const glyphContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = glyphContainerRef.current;
    if (!container) return;
    const glyphs = CRT_GLYPHS.split('');
    // Build initial grid
    const spans: HTMLSpanElement[] = [];
    for (let i = 0; i < 200; i++) {
      const span = document.createElement('span');
      span.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      const colors = ['#c41230', '#c41230', '#c41230', '#c41230', '#e8e4dc', '#d4a030'];
      span.style.color = colors[i % colors.length];
      span.style.opacity = String(0.2 + Math.random() * 0.5);
      if (i % 3 === 0) span.style.textShadow = '0 0 10px currentColor';
      container.appendChild(span);
      spans.push(span);
    }
    let running = true;
    const animate = () => {
      if (!running) return;
      for (let i = 0; i < 8; i++) {
        const idx = Math.floor(Math.random() * 200);
        spans[idx].textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      setTimeout(() => requestAnimationFrame(animate), 300);
    };
    animate();
    return () => { running = false; };
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
              onClick={() => setSelectedWork(art.id)}
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
          <div ref={glyphContainerRef} />
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
    
      {/* ═══ PAINTING DETAIL MODAL ═══ */}
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
              overflow: 'auto',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '1200px', width: '100%',
                display: 'flex', flexDirection: 'row', gap: '48px',
                alignItems: 'flex-start', cursor: 'default',
              }}
            >
              {/* Painting */}
              <div style={{ flex: '1 1 60%', minWidth: 0 }}>
                <img
                  src={work.file} alt={work.altText}
                  style={{
                    width: '100%', height: 'auto',
                    maxHeight: '80vh', objectFit: 'contain',
                    border: '1px solid rgba(232, 228, 220, 0.08)',
                  }}
                />
              </div>

              {/* Info panel */}
              <div style={{
                flex: '0 0 320px', paddingTop: '20px',
              }}>
                <h2 style={{
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  color: '#e8e4dc', margin: '0 0 8px 0',
                  letterSpacing: '0.04em',
                }}>{work.title}</h2>

                <p style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.7rem', color: '#a09890',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  margin: '0 0 24px 0',
                }}>{work.medium} &middot; {work.year}</p>

                <div style={{
                  width: '40px', height: '1px',
                  background: '#c41230', margin: '0 0 24px 0',
                  boxShadow: '0 0 10px rgba(196, 18, 48, 0.3)',
                }} />

                <p style={{
                  fontFamily: "'Crimson Text', Georgia, serif",
                  fontSize: '1.05rem', color: '#c8c4bc',
                  lineHeight: 1.7, margin: '0 0 24px 0',
                }}>{work.longDescription}</p>

                {/* Color palette */}
                <div style={{
                  display: 'flex', gap: '6px', margin: '0 0 24px 0',
                }}>
                  {work.colors.map((color, i) => (
                    <div key={i} style={{
                      width: '24px', height: '24px',
                      background: color, borderRadius: '2px',
                      border: '1px solid rgba(232, 228, 220, 0.15)',
                    }} />
                  ))}
                </div>

                {/* Tags */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '6px',
                  margin: '0 0 32px 0',
                }}>
                  {work.tags.slice(0, 5).map((tag) => (
                    <span key={tag} style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '0.55rem', color: '#a09890',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '4px 10px',
                      border: '1px solid rgba(160, 152, 144, 0.2)',
                    }}>{tag}</span>
                  ))}
                </div>

                {/* Status + Price */}
                <div style={{ margin: '0 0 24px 0' }}>
                  {work.price ? (
                    <p style={{
                      fontFamily: "'Cinzel', Georgia, serif",
                      fontSize: '1.5rem', color: '#e8e4dc',
                      margin: '0 0 4px 0',
                    }}>{'$' + work.price.toLocaleString()}</p>
                  ) : null}
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.65rem',
                    color: work.status === 'available' ? '#4ade80' : work.status === 'sold' ? '#c41230' : '#a09890',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    margin: 0,
                  }}>{work.status === 'nfs' ? 'Not for sale' : work.status}</p>
                </div>

                {/* Inquiry button */}
                {work.status === 'available' && (
                  <a
                    href={'mailto:the37thmover@gmail.com?subject=Inquiry: ' + work.title + '&body=I am interested in ' + work.title + ' by Michael MacDonald.'}
                    style={{
                      display: 'inline-block',
                      fontFamily: "'Cinzel', Georgia, serif",
                      fontSize: '0.85rem', color: '#e8e4dc',
                      letterSpacing: '0.1em',
                      padding: '14px 32px',
                      border: '1px solid #c41230',
                      textDecoration: 'none',
                      transition: 'background 0.3s, color 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = '#c41230';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >Inquire</a>
                )}

                {/* Close button */}
                <button
                  onClick={() => setSelectedWork(null)}
                  style={{
                    position: 'absolute', top: '24px', right: '24px',
                    background: 'none', border: 'none',
                    color: '#a09890', fontSize: '1.5rem',
                    cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace",
                    padding: '8px',
                    transition: 'color 0.2s',
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
