'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useQuantumState } from '@/lib/quantum-mechanics';
import { useDimensionalEffects } from '@/lib/dimensional-ascension';

interface QuantumElementProps {
  children: React.ReactNode;
  id: string;
  elementIndex?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  as?: keyof React.JSX.IntrinsicElements;
  intensity?: number;
}

/**
 * QuantumElement - Interactive component with wave function collapse
 * Every interaction is observation collapsing quantum states
 * Elements exist in superposition until clicked
 */
export function QuantumElement({
  children,
  id,
  elementIndex = 0,
  className = '',
  style = {},
  onClick,
  href,
  as = 'div',
  intensity = 1
}: QuantumElementProps) {
  const elementRef = useRef<HTMLElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const [isCollapsing, setIsCollapsing] = useState(false);
  
  // Quantum state management
  const {
    state,
    superposition,
    startObserving,
    stopObserving,
    collapse
  } = useQuantumState(id);
  
  // Dimensional effects
  const { effects, css } = useDimensionalEffects(elementIndex);

  // Handle click = wave function collapse
  const handleClick = (e: React.MouseEvent) => {
    if (!state?.collapsed) {
      const rect = elementRef.current?.getBoundingClientRect();
      if (rect) {
        // Trigger quantum collapse with ripple effect
        collapse(e.clientX, e.clientY);
        setIsCollapsing(true);
        
        // Create golden ripple
        if (rippleRef.current) {
          const ripple = rippleRef.current;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;
          ripple.style.transform = 'scale(0)';
          ripple.style.opacity = '0.8';
          
          // Animate ripple
          requestAnimationFrame(() => {
            ripple.style.transform = 'scale(4)';
            ripple.style.opacity = '0';
          });
          
          setTimeout(() => setIsCollapsing(false), 618); // PHI timing
        }
      }
    }
    
    // Execute custom click handler
    if (onClick) {
      onClick(e);
    }
    
    // Handle navigation
    if (href) {
      if (href.startsWith('http') || href.startsWith('//')) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }
    }
  };

  // Combine quantum and dimensional styles
  const combinedStyle: React.CSSProperties = {
    ...style,
    ...css,
    opacity: (typeof style.opacity === 'number' ? style.opacity : 1) * superposition.opacity * effects.opacity,
    transform: `${style.transform ?? ''} ${css.transform} scale(${superposition.scale})`,
    filter: `${style.filter ?? ''} ${css.filter} blur(${superposition.blur}px)`,
    transition: state?.collapsed 
      ? 'all 0.618s cubic-bezier(0.68, -0.55, 0.265, 1.55)' // Overshoot easing for collapse
      : 'all 0.382s ease-out',
    cursor: onClick || href ? 'pointer' : 'default',
    position: 'relative',
    // Apply temporal offset for 4D+ effects
    animationDelay: `${effects.temporalOffset}ms`
  };

  // Add quantum visual effects
  if (!state?.collapsed && state) {
    combinedStyle.boxShadow = `
      0 0 ${20 + Math.sin(superposition.phase) * 10}px rgba(201, 168, 76, ${superposition.opacity * 0.3}),
      inset 0 0 ${10 + Math.sin(superposition.phase * 1.618) * 5}px rgba(201, 168, 76, ${superposition.opacity * 0.1})
    `;
  }

  // Use React.createElement for dynamic component
  return React.createElement(
    as,
    {
      ref: elementRef as any,
      className: `quantum-element ${className} ${isCollapsing ? 'collapsing' : ''}`,
      style: combinedStyle,
      onClick: handleClick,
      onMouseEnter: startObserving,
      onMouseLeave: stopObserving,
      role: onClick || href ? 'button' : undefined,
      tabIndex: onClick || href ? 0 : undefined,
      'aria-label': state?.collapsed ? 'Quantum state collapsed' : 'Quantum state in superposition'
    },
    // Main children content
    children,
    
    // Quantum ripple effect
    React.createElement('div', {
      ref: rippleRef,
      className: 'quantum-ripple',
      key: 'ripple',
      style: {
        position: 'absolute',
        width: '20px',
        height: '20px',
        background: 'radial-gradient(circle, rgba(201, 168, 76, 0.6) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
        transform: 'scale(0)',
        opacity: '0',
        transition: 'all 0.618s ease-out',
        zIndex: 1000
      }
    }),
    
    // Superposition visual indicator
    !state?.collapsed && React.createElement('div', {
      className: 'superposition-indicator',
      key: 'superposition',
      style: {
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '6px',
        height: '6px',
        background: `rgba(201, 168, 76, ${superposition.opacity * 0.6})`,
        borderRadius: '50%',
        opacity: Math.abs(Math.sin(superposition.phase)),
        pointerEvents: 'none',
        zIndex: 1001
      }
    }),
    
    // Dimensional phase indicator (4D+ only)
    effects.phaseShift > 0 && React.createElement('div', {
      className: 'dimensional-phase',
      key: 'dimensional-phase',
      style: {
        position: 'absolute',
        inset: '-2px',
        border: '1px solid rgba(201, 168, 76, 0.2)',
        borderRadius: 'inherit',
        pointerEvents: 'none',
        transform: `rotate(${effects.phaseShift}rad)`,
        opacity: Math.abs(Math.sin(effects.phaseShift)),
        zIndex: -1
      }
    })
  );
}

/**
 * Higher-order component for easy quantum wrapping
 */
export function withQuantumState<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  defaultProps: Partial<QuantumElementProps> = {}
) {
  return function QuantumWrapped(props: T & Partial<QuantumElementProps>) {
    const { id, elementIndex, ...componentProps } = props;
    
    return (
      <QuantumElement
        id={id || `quantum-${Math.random().toString(36).substr(2, 9)}`}
        elementIndex={elementIndex}
        {...defaultProps}
      >
        <Component {...(componentProps as T)} />
      </QuantumElement>
    );
  };
}

/**
 * Specialized quantum button
 */
export function QuantumButton({
  children,
  onClick,
  href,
  className = '',
  ...props
}: Omit<QuantumElementProps, 'as'>) {
  return (
    <QuantumElement
      as="button"
      className={`quantum-button ${className}`}
      onClick={onClick}
      href={href}
      {...props}
    >
      {children}
    </QuantumElement>
  );
}

/**
 * Specialized quantum link
 */
export function QuantumLink({
  children,
  href,
  className = '',
  ...props
}: Omit<QuantumElementProps, 'as'>) {
  return (
    <QuantumElement
      as="a"
      className={`quantum-link ${className}`}
      href={href}
      {...props}
    >
      {children}
    </QuantumElement>
  );
}