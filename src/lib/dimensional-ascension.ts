// Dimensional Ascension System
// Scroll through dimensions: 1D → 2D → 3D → 4D+

import React from 'react';
import { PHI, phiEasing } from './sacred-math';

export interface DimensionalState {
  dimension: number; // 1.0 to 4.0+
  sectionProgress: number; // 0-1 within current section
  globalProgress: number; // 0-1 overall
  transitionIntensity: number; // How intense the dimensional shift is
}

export interface DimensionalEffects {
  perspective: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  blur: number;
  opacity: number;
  scale: number;
  translateZ: number;
  phaseShift: number;
  temporalOffset: number;
}

/**
 * Calculate dimensional state from scroll progress
 */
export function calculateDimensionalState(scrollProgress: number): DimensionalState {
  // Map scroll to 5 sections (0-4)
  const sectionFloat = scrollProgress * 5;
  const currentSection = Math.floor(sectionFloat);
  const sectionProgress = sectionFloat - currentSection;
  
  // Dimension increases with each section
  // Section 0: 1D → 1.5D
  // Section 1: 1.5D → 2.5D  
  // Section 2: 2.5D → 3.5D
  // Section 3: 3.5D → 4.5D
  // Section 4: 4.5D → 5D+
  
  const baseDimension = 1 + (currentSection * 0.75);
  const dimensionProgress = phiEasing(sectionProgress) * 0.75;
  const dimension = Math.min(5, baseDimension + dimensionProgress);
  
  // Transition intensity peaks during section transitions
  const transitionPoint = sectionProgress;
  const transitionIntensity = Math.sin(transitionPoint * Math.PI) * PHI;
  
  return {
    dimension,
    sectionProgress,
    globalProgress: scrollProgress,
    transitionIntensity
  };
}

/**
 * Generate dimensional effects for elements
 */
export function generateDimensionalEffects(
  state: DimensionalState,
  elementIndex: number = 0,
  time: number = 0
): DimensionalEffects {
  const { dimension, transitionIntensity } = state;
  
  // Base effects that scale with dimension
  let effects: DimensionalEffects = {
    perspective: 1000,
    rotateX: 0,
    rotateY: 0, 
    rotateZ: 0,
    blur: 0,
    opacity: 1,
    scale: 1,
    translateZ: 0,
    phaseShift: 0,
    temporalOffset: 0
  };
  
  // 1D → 2D: Lines expand into planes
  if (dimension >= 1 && dimension < 2) {
    const progress = dimension - 1;
    effects.scale = 0.1 + progress * 0.9; // Start as line, expand to full
    effects.opacity = 0.3 + progress * 0.7;
    effects.rotateZ = (1 - progress) * 90; // Rotate from vertical line to horizontal plane
  }
  
  // 2D → 3D: Gain depth and perspective
  else if (dimension >= 2 && dimension < 3) {
    const progress = dimension - 2;
    effects.perspective = 1000 - progress * 200; // Increase perspective
    effects.translateZ = progress * 100; // Move forward in 3D space
    effects.rotateX = progress * 15 * Math.sin(time * 0.5 + elementIndex); // Subtle tilt
    effects.rotateY = progress * 10 * Math.cos(time * 0.3 + elementIndex);
    
    // Cast shadows (via filter)
    effects.blur = progress * 0.2; // Subtle depth of field
  }
  
  // 3D → 4D: Impossible geometry and time distortion
  else if (dimension >= 3 && dimension < 4) {
    const progress = dimension - 3;
    
    // Tesseract unfolding - impossible rotations
    effects.rotateX = progress * 45 * Math.sin(time * PHI + elementIndex);
    effects.rotateY = progress * 60 * Math.cos(time * PHI * 0.618 + elementIndex);
    effects.rotateZ = progress * 30 * Math.sin(time * PHI * 1.618 + elementIndex);
    
    // Perspective distortion
    effects.perspective = 1000 - progress * 500;
    effects.translateZ = progress * 200 * Math.sin(time * 0.618);
    
    // Time enters - phasing
    effects.phaseShift = progress * Math.PI * 2;
    effects.temporalOffset = progress * 1000; // Offset in animation timing
  }
  
  // 4D+: Pure abstraction, superposition of states
  else if (dimension >= 4) {
    const progress = Math.min(1, dimension - 4);
    
    // Quantum superposition effects
    effects.opacity = 0.3 + 0.7 * Math.abs(Math.sin(time * PHI + elementIndex));
    effects.scale = 0.5 + 0.5 * Math.abs(Math.cos(time * PHI * 0.618 + elementIndex));
    
    // Multiple simultaneous rotations (impossible in 3D)
    effects.rotateX = 180 * Math.sin(time * PHI + elementIndex);
    effects.rotateY = 180 * Math.cos(time * PHI * 1.618 + elementIndex);
    effects.rotateZ = 180 * Math.sin(time * PHI * 2.618 + elementIndex);
    
    // Reality breakdown
    effects.blur = progress * 3 * Math.abs(Math.sin(time * 2 + elementIndex));
    effects.perspective = 100; // Extreme perspective
    
    // Temporal displacement
    effects.temporalOffset = progress * 2000 * Math.sin(time * 0.1);
  }
  
  // Amplify effects during transitions
  if (transitionIntensity > 1) {
    const multiplier = Math.min(2, transitionIntensity);
    effects.rotateX *= multiplier;
    effects.rotateY *= multiplier;
    effects.rotateZ *= multiplier;
    effects.blur *= multiplier;
    effects.phaseShift *= multiplier;
  }
  
  return effects;
}

/**
 * Convert dimensional effects to CSS transform string
 */
export function effectsToCSS(effects: DimensionalEffects): {
  transform: string;
  filter: string;
  opacity: number;
  perspective: number;
} {
  const transform = [
    `perspective(${effects.perspective}px)`,
    `translateZ(${effects.translateZ}px)`,
    `scale(${effects.scale})`,
    `rotateX(${effects.rotateX}deg)`,
    `rotateY(${effects.rotateY}deg)`,
    `rotateZ(${effects.rotateZ}deg)`
  ].join(' ');
  
  const filter = effects.blur > 0 ? `blur(${effects.blur}px)` : 'none';
  
  return {
    transform,
    filter,
    opacity: effects.opacity,
    perspective: effects.perspective
  };
}

/**
 * Get section-specific dimensional transition description
 */
export function getDimensionalDescription(dimension: number): string {
  if (dimension < 1.5) return "1D → 2D: Lines unfold into existence";
  if (dimension < 2.5) return "2D → 3D: Depth emerges from the plane"; 
  if (dimension < 3.5) return "3D → 4D: Time enters the geometry";
  if (dimension < 4.5) return "4D+: Reality becomes fluid";
  return "5D: Pure abstraction";
}

/**
 * CSS custom properties for dimensional state
 * Apply to document root to make available everywhere
 */
export function updateDimensionalCSS(state: DimensionalState) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--dimension', state.dimension.toFixed(2));
    document.documentElement.style.setProperty('--section-progress', state.sectionProgress.toFixed(3));
    document.documentElement.style.setProperty('--transition-intensity', state.transitionIntensity.toFixed(3));
    document.documentElement.style.setProperty('--global-progress', state.globalProgress.toFixed(3));
  }
}

/**
 * React hook for dimensional effects
 */
export function useDimensionalEffects(elementIndex: number = 0) {
  const [effects, setEffects] = React.useState<DimensionalEffects>({
    perspective: 1000,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    blur: 0,
    opacity: 1,
    scale: 1,
    translateZ: 0,
    phaseShift: 0,
    temporalOffset: 0
  });
  
  React.useEffect(() => {
    const updateEffects = () => {
      const scrollProgress = window.scrollY / 
        (document.documentElement.scrollHeight - window.innerHeight);
      const state = calculateDimensionalState(scrollProgress);
      const time = Date.now() * 0.001;
      
      updateDimensionalCSS(state);
      
      const newEffects = generateDimensionalEffects(state, elementIndex, time);
      setEffects(newEffects);
    };
    
    updateEffects();
    window.addEventListener('scroll', updateEffects, { passive: true });
    
    const interval = setInterval(updateEffects, 50); // Update for time-based effects
    
    return () => {
      window.removeEventListener('scroll', updateEffects);
      clearInterval(interval);
    };
  }, [elementIndex]);
  
  return {
    effects,
    css: effectsToCSS(effects)
  };
}