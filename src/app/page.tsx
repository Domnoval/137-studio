'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { SacredBackground } from '@/components/ui/SacredBackground';
import { WorkConstellation } from '@/components/ui/WorkConstellation';
import { FacetPanel } from '@/components/ui/FacetPanel';
import { ToolArtifact } from '@/components/ui/ToolArtifact';
import { SignalSection } from '@/components/ui/SignalSection';
import { PHI, GOLDEN_ANGLE, T4, T2 } from '@/lib/sacred-math';
import { calculateDimensionalState, updateDimensionalCSS, getDimensionalDescription } from '@/lib/dimensional-ascension';
import { quantumManager } from '@/lib/quantum-mechanics';

/**
 * 137 Studio — Sacred Geometry as Operating System
 * A single scroll experience through five sacred sections:
 * 0. The Threshold — Presence and invitation
 * 1. The Work — Constellation of creation
 * 2. The Facets — Four equal windows
 * 3. The Tools — Floating instruments
 * 4. The Signal — Connection across the void
 */

export default function HomePage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [dimensionalState, setDimensionalState] = useState({ dimension: 1.0, description: 'Beginning ascension...' });
  const lenisRef = useRef<Lenis | null>(null);
  const goldenLineRef = useRef<HTMLDivElement>(null);

  // Initialize Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: T4 / 1000, // PHI seconds
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Sacred easing
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Track scroll progress, dimensional ascension, and active section
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, scrollTop / docHeight));
      
      setScrollProgress(progress);
      
      // Calculate dimensional state and update CSS
      const dimState = calculateDimensionalState(progress);
      updateDimensionalCSS(dimState);
      
      setDimensionalState({
        dimension: dimState.dimension,
        description: getDimensionalDescription(dimState.dimension)
      });
      
      // Determine active section (5 sections total)
      const section = Math.floor(progress * 5);
      setActiveSection(Math.min(4, section));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  // Cleanup quantum manager on unmount
  useEffect(() => {
    return () => {
      quantumManager.destroy();
    };
  }, []);

  // Golden line extension effect
  useEffect(() => {
    if (goldenLineRef.current) {
      const lineLength = Math.min(100, scrollProgress * 200);
      goldenLineRef.current.style.width = `${lineLength}px`;
    }
  }, [scrollProgress]);

  return (
    <div className="relative">
      {/* Sacred background - always present */}
      <SacredBackground />
      
      {/* Skip to content for accessibility */}
      <div id="main-content" className="sr-only">137 Studio Main Content</div>

      {/* SECTION 0: THE THRESHOLD */}
      <section className="relative min-h-screen flex items-center justify-center bg-void">
        <div className="text-center z-10">
          {/* The 137 logo - subtle, large, breathing */}
          <div 
            className="absolute inset-0 flex items-center justify-center opacity-10 breathe pointer-events-none"
            style={{
              fontSize: 'min(40vw, 600px)',
              lineHeight: '1'
            }}
          >
            <span className="font-cinzel text-gold">137</span>
          </div>
          
          {/* Main title - enormous, distinctive serif */}
          <h1 
            className="relative font-cormorant font-light tracking-wider text-cream mb-8 leading-none"
            style={{ 
              fontSize: `clamp(${T4 * 2}rem, 12vw, ${T4 * 4}rem)`,
              textShadow: '0 0 40px rgba(201, 168, 76, 0.1)'
            }}
          >
            Michael MacDonald
          </h1>
          
          {/* The golden line - invitation to scroll */}
          <div className="flex justify-center">
            <div 
              ref={goldenLineRef}
              className="h-px bg-gold transition-all duration-1000 ease-out"
              style={{
                width: '0px',
                boxShadow: '0 0 20px var(--gold-dim)'
              }}
            />
          </div>
          
          {/* Subtle subtitle that appears on slight scroll */}
          <div 
            className={`
              mt-8 font-crimson text-cream/70 text-lg tracking-wide italic
              transition-all duration-${Math.floor(T4 * 1000)}
              ${scrollProgress > 0.01 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            Artist • Developer • Philosopher • Sound Designer
          </div>
        </div>

        {/* Scroll indicator (very subtle) */}
        <div 
          className={`
            absolute bottom-16 left-1/2 transform -translate-x-1/2
            transition-opacity duration-${Math.floor(T2 * 1000)}
            ${scrollProgress < 0.05 ? 'opacity-40' : 'opacity-0'}
          `}
        >
          <div className="w-px h-16 bg-gold/20 relative">
            <div className="absolute bottom-0 w-full h-4 bg-gradient-to-t from-gold/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* SECTION 1: THE WORK - Constellation of creation */}
      <WorkConstellation />

      {/* SECTION 2: THE FACETS - Four equal windows */}
      <FacetPanel />

      {/* SECTION 3: THE TOOLS - Floating instruments */}
      <ToolArtifact />

      {/* SECTION 4: THE SIGNAL - Connection transmission */}
      <SignalSection />

      {/* Sacred navigation indicator (fixed) */}
      <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50 hidden lg:block">
        <div className="flex flex-col space-y-4">
          {[
            { label: 'THRESHOLD', icon: '◈' },
            { label: 'WORK', icon: '◊' },
            { label: 'FACETS', icon: '⬢' },
            { label: 'TOOLS', icon: '◯' },
            { label: 'SIGNAL', icon: '△' }
          ].map((section, index) => (
            <button
              key={index}
              onClick={() => {
                const targetY = (index / 5) * (document.documentElement.scrollHeight - window.innerHeight);
                lenisRef.current?.scrollTo(targetY);
              }}
              className={`
                group relative w-3 h-3 border border-gold/40 rounded-full
                transition-all duration-${Math.floor(T2 * 1000)}
                ${activeSection === index ? 'bg-gold scale-125' : 'hover:bg-gold/20 hover:scale-110'}
              `}
              title={section.label}
            >
              <span className="sr-only">{section.label}</span>
              
              {/* Tooltip */}
              <div 
                className={`
                  absolute left-6 top-1/2 transform -translate-y-1/2
                  bg-void border border-gold/30 px-3 py-1 rounded
                  text-gold text-xs font-mono tracking-wider whitespace-nowrap
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  pointer-events-none
                `}
              >
                {section.icon} {section.label}
              </div>
            </button>
          ))}
        </div>
        
        {/* Progress line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-gold/10 -z-10">
          <div 
            className="w-full bg-gold/40 transition-all duration-300"
            style={{ height: `${(activeSection + 1) * 20}%` }}
          />
        </div>
      </div>

      {/* Sacred progress indicator with dimensional state (bottom) */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="text-center mb-2">
          <div className="text-gold/80 text-xs font-cinzel tracking-wider">
            DIMENSION {dimensionalState.dimension.toFixed(1)}
          </div>
          <div className="text-cream/60 text-xs font-crimson italic mt-1">
            {dimensionalState.description}
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-void/80 border border-gold/20 rounded-full px-4 py-2 backdrop-blur-sm">
          <span className="font-mono text-xs text-gold/60 tracking-wider">
            {Math.floor(scrollProgress * 100)}%
          </span>
          <div className="w-24 h-px bg-gold/20 relative">
            <div 
              className="h-full bg-gold transition-all duration-300"
              style={{ width: `${scrollProgress * 100}%` }}
            />
            {/* Dimensional transition markers */}
            <div className="absolute inset-0 flex justify-between">
              {[1, 2, 3, 4, 5].map(dim => (
                <div
                  key={dim}
                  className={`w-px h-2 -translate-y-1/2 ${
                    dimensionalState.dimension >= dim ? 'bg-gold' : 'bg-gold/30'
                  }`}
                  style={{ left: `${((dim - 1) / 4) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="text-gold/60 text-xs">
            {activeSection + 1}/5
          </div>
        </div>
      </div>

      {/* Sacred metadata for screen readers */}
      <div className="sr-only">
        <h2>Navigation</h2>
        <ul>
          <li>Section 1: The Threshold - Introduction and presence</li>
          <li>Section 2: The Work - Art constellation in sacred geometry</li>
          <li>Section 3: The Facets - Four dimensions of creative work</li>
          <li>Section 4: The Tools - Digital instruments and applications</li>
          <li>Section 5: The Signal - Contact and connection</li>
        </ul>
      </div>
    </div>
  );
}