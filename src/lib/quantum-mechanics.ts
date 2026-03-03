// Quantum Mechanics for Sacred Interactions
// Every click collapses the wave function

import React from 'react';
import { PHI, GOLDEN_ANGLE } from './sacred-math';

export interface QuantumState {
  id: string;
  collapsed: boolean;
  observing: boolean;
  collapseTime?: number;
  lastClickCoords?: { x: number; y: number };
}

export interface SuperpositionStyle {
  opacity: number;
  scale: number;
  blur: number;
  phase: number;
}

/**
 * Calculate superposition styling based on time and quantum state
 */
export function calculateSuperposition(
  time: number,
  state: QuantumState,
  intensity: number = 1
): SuperpositionStyle {
  if (state.collapsed) {
    return {
      opacity: 1,
      scale: 1,
      blur: 0,
      phase: 0
    };
  }

  if (state.observing) {
    // Partial collapse during hover/observation
    const oscillation = Math.sin(time * PHI) * 0.1;
    return {
      opacity: 0.85 + oscillation * 0.1,
      scale: 1.02 + oscillation * 0.01,
      blur: 0.2,
      phase: oscillation
    };
  }

  // Full superposition - multiple potential states
  const basePhase = time * PHI * intensity;
  const scaleOscillation = Math.sin(basePhase) * 0.03;
  const opacityOscillation = Math.sin(basePhase * 1.618) * 0.2;
  
  return {
    opacity: 0.6 + opacityOscillation,
    scale: 1 + scaleOscillation,
    blur: 0.5 + Math.sin(basePhase * 0.618) * 0.3,
    phase: basePhase
  };
}

/**
 * Generate wave function collapse animation
 */
export function generateCollapseRipple(
  clickX: number,
  clickY: number,
  elementRect: DOMRect
): string {
  const centerX = elementRect.left + elementRect.width / 2;
  const centerY = elementRect.top + elementRect.height / 2;
  
  const distance = Math.sqrt(
    Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
  );
  
  // Create radial gradient animation from click point
  const rippleKeyframes = `
    @keyframes quantum-collapse-${Date.now()} {
      0% {
        background: radial-gradient(
          circle at ${clickX - elementRect.left}px ${clickY - elementRect.top}px,
          rgba(201, 168, 76, 0.8) 0%,
          rgba(201, 168, 76, 0.4) 20%,
          transparent 40%
        );
        transform: scale(0) rotate(0deg);
      }
      50% {
        background: radial-gradient(
          circle at ${clickX - elementRect.left}px ${clickY - elementRect.top}px,
          rgba(201, 168, 76, 0.6) 0%,
          rgba(201, 168, 76, 0.2) 40%,
          transparent 80%
        );
        transform: scale(1.2) rotate(${GOLDEN_ANGLE}deg);
      }
      100% {
        background: radial-gradient(
          circle at ${clickX - elementRect.left}px ${clickY - elementRect.top}px,
          transparent 0%,
          transparent 100%
        );
        transform: scale(2) rotate(${GOLDEN_ANGLE * 2}deg);
      }
    }
  `;
  
  return rippleKeyframes;
}

/**
 * Quantum state manager
 */
export class QuantumManager {
  private states = new Map<string, QuantumState>();
  private time = 0;
  private animationFrame?: number;
  private observers = new Set<(states: Map<string, QuantumState>) => void>();

  constructor() {
    // Only start time loop in browser environment
    if (typeof window !== 'undefined') {
      this.startTimeLoop();
    }
  }

  private startTimeLoop() {
    if (typeof requestAnimationFrame === 'undefined') return;
    
    const update = () => {
      this.time = Date.now() * 0.001; // Convert to seconds
      this.notifyObservers();
      this.animationFrame = requestAnimationFrame(update);
    };
    update();
  }

  registerElement(id: string): QuantumState {
    const state: QuantumState = {
      id,
      collapsed: false,
      observing: false
    };
    this.states.set(id, state);
    return state;
  }

  startObserving(id: string) {
    const state = this.states.get(id);
    if (state && !state.collapsed) {
      state.observing = true;
      this.notifyObservers();
    }
  }

  stopObserving(id: string) {
    const state = this.states.get(id);
    if (state) {
      state.observing = false;
      this.notifyObservers();
    }
  }

  collapse(id: string, clickX: number, clickY: number) {
    const state = this.states.get(id);
    if (state && !state.collapsed) {
      state.collapsed = true;
      state.observing = false;
      state.collapseTime = this.time;
      state.lastClickCoords = { x: clickX, y: clickY };
      
      // Make nearby unclicked elements more ghostly
      this.increaseNearbyGhostliness(id);
      
      this.notifyObservers();
    }
  }

  private increaseNearbyGhostliness(collapsedId: string) {
    // Quantum entanglement - when one state collapses,
    // nearby states become more uncertain
    this.states.forEach((state, id) => {
      if (id !== collapsedId && !state.collapsed) {
        // Increase ghostliness by reducing baseline opacity
        // This is handled in the superposition calculation
      }
    });
  }

  getState(id: string): QuantumState | undefined {
    return this.states.get(id);
  }

  getSuperposition(id: string, intensity: number = 1): SuperpositionStyle {
    const state = this.states.get(id);
    if (!state) {
      return { opacity: 1, scale: 1, blur: 0, phase: 0 };
    }

    // Count nearby collapsed states for entanglement effect
    const collapsedCount = Array.from(this.states.values())
      .filter(s => s.collapsed).length;
    const ghostliness = Math.min(0.3, collapsedCount * 0.05);

    const baseStyle = calculateSuperposition(this.time, state, intensity);
    
    // Apply quantum entanglement ghostliness
    if (!state.collapsed && collapsedCount > 0) {
      baseStyle.opacity *= (1 - ghostliness);
      baseStyle.blur += ghostliness;
    }

    return baseStyle;
  }

  subscribe(observer: (states: Map<string, QuantumState>) => void) {
    this.observers.add(observer);
  }

  unsubscribe(observer: (states: Map<string, QuantumState>) => void) {
    this.observers.delete(observer);
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.states));
  }

  destroy() {
    if (typeof window !== 'undefined' && this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.observers.clear();
    this.states.clear();
  }
}

// Global quantum manager instance
export const quantumManager = new QuantumManager();

/**
 * React hook for quantum state
 */
export function useQuantumState(id: string) {
  const [state, setState] = React.useState<QuantumState | null>(null);
  const [superposition, setSuperposition] = React.useState<SuperpositionStyle>({
    opacity: 1, scale: 1, blur: 0, phase: 0
  });

  React.useEffect(() => {
    const quantumState = quantumManager.registerElement(id);
    setState(quantumState);

    const observer = () => {
      const newState = quantumManager.getState(id);
      const newSuperposition = quantumManager.getSuperposition(id);
      setState(newState || null);
      setSuperposition(newSuperposition);
    };

    quantumManager.subscribe(observer);
    observer(); // Initial call

    return () => {
      quantumManager.unsubscribe(observer);
    };
  }, [id]);

  const startObserving = () => quantumManager.startObserving(id);
  const stopObserving = () => quantumManager.stopObserving(id);
  const collapse = (x: number, y: number) => quantumManager.collapse(id, x, y);

  return {
    state,
    superposition,
    startObserving,
    stopObserving,
    collapse
  };
}