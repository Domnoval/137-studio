'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PHI, S1, S2, S3, S4, S5, S6, S7 } from '@/lib/sacred-math';

gsap.registerPlugin(ScrollTrigger);

// Art data mapping to actual files
const artworks = [
  { id: 'totem', title: 'Totem', file: '/art/totem.jpg', aspect: 'portrait' },
  { id: 'composite-head', title: 'Composite Head', file: '/art/composite-head.jpg', aspect: 'portrait' },
  { id: 'math-chaos', title: 'Math Chaos', file: '/art/math-chaos.jpg', aspect: 'landscape' },
  { id: 'red-cross', title: 'Red Cross', file: '/art/red-cross.jpg', aspect: 'square' },
  { id: 'chaos-garden', title: 'Chaos Garden', file: '/art/chaos-garden.jpg', aspect: 'landscape' },
  { id: 'blue-teeth', title: 'Blue Teeth', file: '/art/blue-teeth.jpg', aspect: 'panoramic' },
  { id: 'teal-skull', title: 'Teal Skull', file: '/art/teal-skull.jpg', aspect: 'square' },
  { id: 'pink-skull', title: 'Pink Skull', file: '/art/pink-skull.jpg', aspect: 'portrait' },
  { id: 'cruciform', title: 'Cruciform', file: '/art/cruciform.jpg', aspect: 'portrait' },
  { id: 'menagerie', title: 'Menagerie', file: '/art/menagerie.jpg', aspect: 'landscape' }
];

// Apps data
const apps = [
  { name: '137 Cipher', url: 'https://137-cipher.vercel.app', description: 'Encode messages using the fine structure constant' },
  { name: '137 Geometry', url: 'https://137-geometry.vercel.app', description: 'Interactive sacred geometry visualizations' },
  { name: '137 Resonance', url: 'https://137-resonance.vercel.app', description: 'Frequency and resonance patterns calculator' },
  { name: '137 Cycles', url: 'https://137-cycles.vercel.app', description: 'Natural cycles and rhythm analysis' },
  { name: 'Harmonic Arcana', url: 'https://harmonic-arcana.vercel.app', description: 'Musical harmony meets occult symbolism' },
  { name: '137 Pad', url: 'https://137-pad.vercel.app', description: 'Sacred geometry note-taking interface' },
  { name: 'Lyric Lab', url: 'https://lyric-lab.vercel.app', description: 'AI-assisted songwriting and structure' },
  { name: 'The Book', url: 'https://the-book-amber.vercel.app', description: 'Digital grimoire of accumulated wisdom' },
  { name: 'Speak23D', url: 'https://speak23d.vercel.app', description: 'Dimensional language exploration tool' }
];

// Philosophy lines
const philosophyLines = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.'
];

export default function HomePage() {
  const goldenLineRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const philosophyRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Golden line growth on scroll
    if (goldenLineRef.current) {
      gsap.fromTo(goldenLineRef.current, 
        { width: 0 },
        {
          width: '200px',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top center',
            end: 'bottom center',
            scrub: true
          }
        }
      );
    }

    // Horizontal scroll gallery
    if (galleryRef.current && galleryTrackRef.current) {
      const galleryItems = gsap.utils.toArray('.gallery-item');
      const galleryTrack = galleryTrackRef.current;
      
      gsap.to(galleryItems, {
        xPercent: -100 * (galleryItems.length - 1),
        ease: 'none',
        scrollTrigger: {
          trigger: galleryRef.current,
          pin: true,
          scrub: 1,
          end: () => '+=' + (galleryTrack.scrollWidth - window.innerWidth),
        }
      });
    }

    // Apps grid stagger reveal
    if (appsRef.current) {
      const appCards = gsap.utils.toArray('.app-card');
      gsap.fromTo(appCards, 
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          scrollTrigger: {
            trigger: appsRef.current,
            start: 'top 80%',
            end: 'bottom 20%',
          }
        }
      );
    }

    // Philosophy lines reveal
    if (philosophyRef.current) {
      const lines = gsap.utils.toArray('.philosophy-line');
      lines.forEach((line, index) => {
        gsap.fromTo(line as Element, 
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: index * 0.3,
            scrollTrigger: {
              trigger: philosophyRef.current,
              start: 'top 70%',
            }
          }
        );
      });
    }
  }, []);

  return (
    <div id="main-content" className="relative">
      {/* SECTION 1: HERO / THRESHOLD */}
      <section 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center bg-void"
        style={{ padding: `${S5}px ${S4}px` }}
      >
        {/* 137 watermark */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none"
          style={{
            fontSize: 'min(30vw, 500px)',
            lineHeight: '1'
          }}
        >
          <span className="font-cinzel text-gold">137</span>
        </div>

        {/* Main content */}
        <div className="text-center z-10">
          <h1 
            className="font-cormorant font-light tracking-wider text-cream leading-none"
            style={{ 
              fontSize: 'clamp(3rem, 8vw, 8rem)',
              marginBottom: `${S4}px`
            }}
          >
            Michael MacDonald
          </h1>
          
          {/* Golden line */}
          <div className="flex justify-center">
            <div 
              ref={goldenLineRef}
              className="h-px bg-gold transition-all duration-1000 ease-out"
              style={{
                width: '0px',
                boxShadow: '0 0 20px rgba(201, 168, 76, 0.3)'
              }}
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: ART GALLERY */}
      <section 
        ref={galleryRef}
        className="relative h-screen bg-deep overflow-hidden"
      >
        <div 
          ref={galleryTrackRef}
          className="flex h-full items-center"
          style={{ width: `${artworks.length * 100}vw` }}
        >
          {artworks.map((artwork, index) => (
            <div 
              key={artwork.id}
              className="gallery-item flex-shrink-0 h-full flex items-center justify-center"
              style={{ 
                width: '100vw',
                padding: `0 ${S6}px`
              }}
            >
              <div className="text-center group">
                <div 
                  className="relative mb-4 transition-transform duration-500 group-hover:scale-105"
                  style={{ maxHeight: '80vh' }}
                >
                  <img 
                    src={artwork.file} 
                    alt={artwork.title}
                    className="h-auto max-h-[80vh] w-auto object-contain"
                  />
                </div>
                <p 
                  className="text-gold font-cinzel tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ fontSize: `${S4}px` }}
                >
                  {artwork.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: APPS / TOOLS */}
      <section 
        ref={appsRef}
        className="relative min-h-screen bg-void flex items-center justify-center"
        style={{ padding: `${S7}px ${S5}px` }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 
            className="text-center font-cinzel text-gold tracking-wider mb-16"
            style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: `${S6}px`
            }}
          >
            Digital Instruments
          </h2>
          
          <div 
            className="grid gap-6"
            style={{ 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: `${S4}px`
            }}
          >
            {apps.map((app, index) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="app-card block border border-gold/30 bg-surface/50 rounded-lg p-6 transition-all duration-300 hover:border-gold hover:bg-surface/80 hover:scale-105"
                style={{ 
                  padding: `${S4}px`,
                  borderRadius: `${S2}px`
                }}
              >
                {/* Placeholder gradient */}
                <div 
                  className="w-full h-32 mb-4 rounded bg-gradient-to-br from-gold/20 to-gold/5"
                  style={{ 
                    height: `${S7}px`,
                    marginBottom: `${S3}px`,
                    borderRadius: `${S1}px`
                  }}
                />
                
                <h3 
                  className="font-cinzel text-gold mb-2"
                  style={{ 
                    fontSize: `${S4}px`,
                    marginBottom: `${S2}px`
                  }}
                >
                  {app.name}
                </h3>
                
                <p 
                  className="font-crimson text-cream/70 text-sm"
                  style={{ fontSize: `${S3}px` }}
                >
                  {app.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: ABOUT / PHILOSOPHY */}
      <section 
        ref={philosophyRef}
        className="relative min-h-screen bg-deep flex items-center justify-center"
        style={{ padding: `${S7}px ${S5}px` }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="font-cinzel text-gold tracking-wider mb-16"
            style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: `${S6}px`
            }}
          >
            Philosophy
          </h2>
          
          <div className="space-y-8">
            {philosophyLines.map((line, index) => (
              <p 
                key={index}
                className="philosophy-line font-cormorant text-cream text-xl opacity-0"
                style={{ 
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                  marginBottom: `${S4}px`
                }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 5: CONTACT */}
      <section 
        className="relative min-h-screen bg-void flex items-center justify-center"
        style={{ padding: `${S7}px ${S5}px` }}
      >
        <div className="text-center">
          <h2 
            className="font-cinzel text-gold tracking-wider mb-12"
            style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              marginBottom: `${S6}px`
            }}
          >
            Send a Signal
          </h2>
          
          <div className="space-y-6">
            <a 
              href="mailto:assiduous.mac@gmail.com"
              className="block font-crimson text-cream/80 hover:text-cream transition-colors"
              style={{ fontSize: `${S4}px` }}
            >
              assiduous.mac@gmail.com
            </a>
            
            <a 
              href="https://instagram.com/domnoval_art"
              target="_blank"
              rel="noopener noreferrer"
              className="block font-crimson text-gold/60 hover:text-gold transition-colors"
              style={{ fontSize: `${S3}px` }}
            >
              @domnoval_art
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
