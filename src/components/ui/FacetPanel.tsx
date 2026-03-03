'use client';

import { useState, useEffect } from 'react';
import { worksByFacet } from '@/lib/works';
import { PHI, T2, T4 } from '@/lib/sacred-math';
import { QuantumButton, QuantumElement } from './QuantumElement';

/**
 * Facet Panel - Four equal windows into Michael's dimensions
 * Art • Code • Philosophy • Sound
 * Perfect balance. No hierarchy.
 */

const facets = [
  {
    key: 'art',
    title: 'ART',
    description: 'Sacred geometry in paint and pixel',
    quote: '"The golden ratio whispers in every brushstroke"',
    icon: '⬢'
  },
  {
    key: 'code',
    title: 'CODE', 
    description: 'Applications of sacred mathematics',
    quote: '"137 — the fine structure constant made manifest"',
    icon: '⟨⟩'
  },
  {
    key: 'philosophy',
    title: 'PHILOSOPHY',
    description: 'The meaning behind the mystery',
    quote: '"What if reality is just geometry dreaming?"',
    icon: '◊'
  },
  {
    key: 'sound',
    title: 'SOUND',
    description: 'Frequency as fundamental force',
    quote: '"Music is math made audible"',
    icon: '◯'
  }
] as const;

type FacetKey = typeof facets[number]['key'];

export function FacetPanel() {
  const [activeFacet, setActiveFacet] = useState<FacetKey>('art');
  const [autoRotate, setAutoRotate] = useState(true);

  // Auto-rotation through facets
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setActiveFacet(current => {
        const currentIndex = facets.findIndex(f => f.key === current);
        const nextIndex = (currentIndex + 1) % facets.length;
        return facets[nextIndex].key;
      });
    }, 4236); // PHI³ seconds
    
    return () => clearInterval(interval);
  }, [autoRotate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-deep/50">
      <div className="container max-w-6xl mx-auto px-8">
        
        {/* Sacred title */}
        <div className="text-center mb-16">
          <h2 className="font-cinzel text-4xl text-gold mb-4 tracking-wider">
            THE FOUR FACETS
          </h2>
          <div className="w-32 h-px bg-gold mx-auto opacity-60"></div>
        </div>
        
        {/* Facet Navigation */}
        <div className="flex justify-center space-x-8 mb-12">
          {facets.map((facet, index) => (
            <QuantumButton
              key={facet.key}
              id={`facet-${facet.key}`}
              elementIndex={index}
              onClick={() => {
                setActiveFacet(facet.key);
                setAutoRotate(false);
              }}
              className={`
                group flex flex-col items-center space-y-2 p-4 rounded-lg
                transition-all duration-${Math.floor(T2 * 1000)}
                ${activeFacet === facet.key 
                  ? 'text-gold-bright bg-gold/10 scale-110' 
                  : 'text-gold/60 hover:text-gold hover:scale-105'
                }
              `}
            >
              <div className={`
                text-2xl font-cinzel transition-all duration-${Math.floor(T2 * 1000)}
                ${activeFacet === facet.key ? 'scale-125' : ''}
              `}>
                {facet.icon}
              </div>
              <span className="font-cormorant text-lg tracking-wide">
                {facet.title}
              </span>
            </QuantumButton>
          ))}
        </div>

        {/* Active Facet Content */}
        <div className="relative min-h-[400px]">
          {facets.map((facet) => {
            const isActive = activeFacet === facet.key;
            const works = worksByFacet[facet.key];
            
            return (
              <div
                key={facet.key}
                className={`
                  absolute inset-0 transition-all duration-${Math.floor(T4 * 1000)}
                  ${isActive 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8 pointer-events-none'
                  }
                `}
              >
                <div className="text-center mb-8">
                  <h3 className="font-cormorant text-2xl text-cream mb-2">
                    {facet.description}
                  </h3>
                  <p className="font-crimson text-cream/70 italic text-lg">
                    {facet.quote}
                  </p>
                </div>
                
                {/* Works Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {works.map((work, index) => (
                    <div
                      key={work.id}
                      className={`
                        group relative bg-surface/50 rounded-lg p-6 border border-gold/20
                        hover:border-gold/60 hover:bg-surface/70
                        transition-all duration-${Math.floor(T2 * 1000)}
                        cursor-pointer
                      `}
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        animation: isActive ? `fadeInUp ${T2}s ease-out forwards` : 'none'
                      }}
                      onClick={() => work.url && window.open(work.url, '_blank')}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center
                          bg-gold/10 group-hover:bg-gold/20 transition-colors duration-300
                        `}>
                          <span className="text-gold text-lg">
                            {facet.icon}
                          </span>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-cormorant text-lg text-cream mb-1">
                            {work.title}
                          </h4>
                          <p className="text-cream/60 text-sm mb-2">
                            {work.description}
                          </p>
                          {work.url && (
                            <span className="text-gold/80 text-xs uppercase tracking-wider">
                              Visit →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Auto-rotate indicator */}
        <div className="text-center mt-12">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="text-gold/60 hover:text-gold text-xs font-mono tracking-wider"
          >
            {autoRotate ? 'AUTO-ROTATING' : 'MANUAL CONTROL'} •{' '}
            <span className="text-cream/60">
              click to {autoRotate ? 'pause' : 'resume'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// CSS animation for staggered reveals (add to globals.css)
const styles = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;