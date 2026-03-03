'use client';

import { useEffect, useRef, useState } from 'react';
import { works } from '@/lib/works';
import { goldenSpiralPosition, PHI, T2, T4 } from '@/lib/sacred-math';

/**
 * Tool Artifacts - Apps as floating museum pieces
 * Not a grid. A curated exhibition of digital instruments.
 */

const toolWorks = works.filter(work => work.type === 'app');

export function ToolArtifact() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const progress = Math.max(0, Math.min(1, 
        (-rect.top + viewportHeight * 0.3) / (rect.height + viewportHeight * 0.4)
      ));
      
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={sectionRef}
      className="relative min-h-[150vh] flex items-center justify-center bg-void"
    >
      {/* Sacred title */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-center z-10">
        <h2 className="font-cinzel text-3xl text-gold tracking-wider mb-4">
          THE INSTRUMENTS
        </h2>
        <p className="font-crimson text-cream/70 text-lg italic">
          Digital tools born from sacred mathematics
        </p>
      </div>

      {/* Floating artifacts */}
      <div className="relative w-full h-full">
        {toolWorks.map((tool, index) => {
          // Use modified golden spiral for scattered but harmonious layout
          const baseAngle = index * 51.43; // 360° / 7 (rough number of tools)
          const radius = 200 + (index % 3) * 100;
          const x = Math.cos(baseAngle * Math.PI / 180) * radius;
          const y = Math.sin(baseAngle * Math.PI / 180) * radius * 0.6; // Flatten vertically
          
          const delay = index * 0.15;
          const adjustedProgress = Math.max(0, scrollProgress - delay);
          const isVisible = adjustedProgress > 0;
          
          return (
            <div
              key={tool.id}
              className={`
                absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer
                transition-all duration-${Math.floor(T4 * 1000)} ease-out
              `}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                opacity: isVisible ? adjustedProgress : 0,
                transform: `
                  translate(-50%, -50%) 
                  scale(${isVisible ? 0.8 + adjustedProgress * 0.4 : 0.5})
                  rotateX(${isVisible ? 0 : 15}deg)
                `,
                zIndex: hoveredTool === tool.id ? 50 : 10 + index
              }}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              onClick={() => tool.url && window.open(tool.url, '_blank')}
            >
              {/* Artifact frame */}
              <div className={`
                relative w-72 h-48 bg-surface border border-gold/20 rounded-lg
                shadow-2xl shadow-void/50
                group-hover:border-gold/60 group-hover:scale-105
                group-hover:shadow-gold/10
                transition-all duration-${Math.floor(T2 * 1000)}
                overflow-hidden
              `}>
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content area - placeholder for screenshot */}
                <div className="p-6 h-full flex flex-col">
                  {/* Mock screenshot area */}
                  <div className={`
                    flex-1 bg-deep/50 rounded border border-gold/10 mb-4
                    flex items-center justify-center
                    group-hover:border-gold/30 transition-all duration-300
                  `}>
                    <div className="text-gold/40 text-4xl font-cinzel">
                      {getToolIcon(tool.id)}
                    </div>
                  </div>
                  
                  {/* Tool info */}
                  <div className="text-center">
                    <h3 className="font-cormorant text-cream text-lg mb-1">
                      {tool.title}
                    </h3>
                    <p className="text-cream/60 text-sm leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>
                
                {/* Sacred geometry overlay */}
                <div className={`
                  absolute top-2 right-2 w-6 h-6 border border-gold/20 rounded
                  flex items-center justify-center text-gold/40 text-xs
                  group-hover:border-gold/60 group-hover:text-gold/80
                  transition-all duration-300
                `}>
                  137
                </div>
                
                {/* Interactive indicator */}
                {tool.url && (
                  <div className={`
                    absolute bottom-2 right-2 text-gold/60 text-xs
                    opacity-0 group-hover:opacity-100 transition-opacity duration-300
                    font-mono tracking-wider
                  `}>
                    LAUNCH →
                  </div>
                )}
              </div>
              
              {/* Floating label */}
              {hoveredTool === tool.id && (
                <div className={`
                  absolute -bottom-8 left-1/2 transform -translate-x-1/2
                  bg-void/90 border border-gold/30 rounded px-3 py-1
                  text-cream text-xs font-mono tracking-wider
                  animate-fadeIn
                `}>
                  {tool.facet.toUpperCase()} • {tool.type.toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress indicator */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="text-gold/60 text-sm font-mono tracking-wider">
          {toolWorks.length} instruments
        </div>
        <div className="w-24 h-px bg-gold/20 mt-2">
          <div 
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Get icon for each tool
 */
function getToolIcon(toolId: string): string {
  const icons: Record<string, string> = {
    '137-cipher': '⟨⟩',
    '137-geometry': '◊',
    '137-resonance': '◯',
    '137-cycles': '◐',
    '137-pad': '□',
    'lyric-lab': '♪',
    'harmonic-arcana': '⬢',
    'the-book': '◈',
    'speak23d': '△'
  };
  
  return icons[toolId] || '◊';
}

// Add fadeIn animation to globals.css
const fadeInStyle = `
@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out forwards;
}
`;