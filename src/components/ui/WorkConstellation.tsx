'use client';

import { useEffect, useRef, useState } from 'react';
import { goldenSpiralPosition, PHI, T2, T4 } from '@/lib/sacred-math';
import { constellationWorks } from '@/lib/works';

/**
 * Work Constellation - Art pieces floating in golden spiral
 * Not a grid. Not a gallery. A nebula of creation.
 */
export function WorkConstellation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate progress through this section
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      
      const progress = Math.max(0, Math.min(1, 
        (-sectionTop + viewportHeight * 0.5) / (sectionHeight + viewportHeight)
      ));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={sectionRef}
      className="relative min-h-[300vh] flex items-center justify-center"
    >
      <div className="fixed inset-0 flex items-center justify-center">
        {constellationWorks.map((work, index) => {
          const position = goldenSpiralPosition(
            index, 
            scrollProgress, 
            0, 
            0, 
            140 // base radius
          );
          
          const delay = index * 0.1; // Staggered reveal
          const adjustedProgress = Math.max(0, scrollProgress - delay);
          
          return (
            <div
              key={work.id}
              className="absolute w-48 h-32 group cursor-pointer"
              style={{
                transform: `
                  translate(${position.x}px, ${position.y}px) 
                  scale(${position.scale})
                  rotate(${position.rotation * 0.1}deg)
                `,
                opacity: position.opacity * adjustedProgress,
                transition: `all ${T4}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                zIndex: Math.floor(position.scale * 100)
              }}
            >
              {/* Placeholder for now - will be replaced with actual images */}
              <div 
                className={`
                  w-full h-full rounded-lg border border-gold/20
                  flex items-center justify-center text-center
                  transition-all duration-${Math.floor(T2 * 1000)}
                  group-hover:border-gold/60 group-hover:shadow-lg group-hover:shadow-gold/20
                  group-hover:scale-110
                `}
                style={{
                  background: getWorkColor(work.type),
                }}
              >
                <div className="p-4">
                  <h3 
                    className="font-cormorant text-cream text-sm font-medium opacity-0 
                               group-hover:opacity-100 transition-opacity duration-300"
                  >
                    {work.title}
                  </h3>
                  <p 
                    className="text-cream/60 text-xs mt-1 opacity-0 
                               group-hover:opacity-100 transition-opacity duration-300 delay-100"
                  >
                    {work.type}
                  </p>
                </div>
              </div>
              
              {/* Golden connecting lines (subtle) */}
              {index > 0 && (
                <div
                  className="absolute w-px bg-gold/10 origin-center pointer-events-none"
                  style={{
                    height: '60px',
                    transform: `rotate(${-position.rotation}deg)`,
                    top: '50%',
                    left: '50%',
                    transformOrigin: '0 0'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Section indicator */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="text-gold/60 text-sm font-mono tracking-wider">
          {Math.floor(scrollProgress * 100)}% revealed
        </div>
      </div>
    </div>
  );
}

/**
 * Get color for work type (placeholder styling)
 */
function getWorkColor(type: string): string {
  const colors = {
    painting: 'linear-gradient(135deg, rgba(201, 168, 76, 0.1), rgba(139, 117, 53, 0.1))',
    digital: 'linear-gradient(135deg, rgba(201, 168, 76, 0.15), rgba(232, 212, 139, 0.1))',
    app: 'linear-gradient(135deg, rgba(139, 117, 53, 0.1), rgba(201, 168, 76, 0.1))',
    '3d': 'linear-gradient(135deg, rgba(232, 212, 139, 0.1), rgba(201, 168, 76, 0.15))',
    mixed: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(139, 117, 53, 0.05))'
  };
  
  return colors[type as keyof typeof colors] || colors.mixed;
}