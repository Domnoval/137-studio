'use client';

import { useState, useEffect } from 'react';
import { PHI, GOLDEN_ANGLE, T2 } from '@/lib/sacred-math';

/**
 * Signal Section - Contact as transmission
 * Not a form. A frequency. A signal sent across the void.
 */

export function SignalSection() {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Sacred pulse animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(phase => (phase + GOLDEN_ANGLE / 10) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, []);

  const handleSignalSend = () => {
    setIsTransmitting(true);
    
    // Simulate transmission delay
    setTimeout(() => {
      window.open('mailto:the37thmover@gmail.com?subject=Signal from the137thmove.com', '_blank');
      setIsTransmitting(false);
    }, 1618); // PHI seconds in ms
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-deep">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            radial-gradient(circle at ${25 + Math.sin(pulsePhase * Math.PI / 180) * 10}% ${50 + Math.cos(pulsePhase * Math.PI / 180) * 10}%, rgba(201, 168, 76, 0.1) 1px, transparent 1px),
            radial-gradient(circle at ${75 + Math.cos(pulsePhase * Math.PI / 180) * 10}% ${50 + Math.sin(pulsePhase * Math.PI / 180) * 10}%, rgba(201, 168, 76, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }} />
      </div>

      <div className="relative text-center max-w-4xl mx-auto px-8">
        {/* The 137 logo returns */}
        <div className="mb-12">
          <div 
            className="w-32 h-32 mx-auto mb-6 opacity-20 group-hover:opacity-40 transition-opacity duration-1000"
            style={{
              backgroundImage: `url('/137-chalkboard-logo.png')`, // Placeholder - actual logo needed
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }}
          >
            {/* Fallback if no logo */}
            <div className="w-full h-full flex items-center justify-center font-cinzel text-4xl text-gold/20">
              137
            </div>
          </div>
        </div>

        {/* Sacred title */}
        <h2 className="font-cinzel text-4xl md:text-6xl text-gold mb-6 tracking-wider">
          SEND A SIGNAL
        </h2>
        
        <p className="font-crimson text-cream/70 text-xl md:text-2xl italic mb-12 leading-relaxed">
          Across the frequencies of consciousness,<br />
          through the geometries of connection
        </p>

        {/* Transmission interface */}
        <div className="relative">
          {/* Pulse visualization */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute inset-0 rounded-full border border-gold
                  animate-pulse
                `}
                style={{
                  opacity: 0.1 + (Math.sin(pulsePhase * Math.PI / 180 + i * PHI) + 1) * 0.15,
                  transform: `scale(${0.3 + i * 0.2 + Math.sin(pulsePhase * Math.PI / 180 + i * PHI) * 0.1})`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${T2 * 3}s`
                }}
              />
            ))}
            
            {/* Central transmission button */}
            <button
              onClick={handleSignalSend}
              disabled={isTransmitting}
              className={`
                absolute inset-0 rounded-full
                border-2 border-gold bg-gold/5
                flex items-center justify-center
                hover:bg-gold/10 hover:border-gold-bright
                transition-all duration-${Math.floor(T2 * 1000)}
                group disabled:opacity-50
                ${isTransmitting ? 'animate-spin' : 'hover:scale-110'}
              `}
            >
              <div className="text-center">
                <div className="text-gold text-2xl mb-2">
                  {isTransmitting ? '◐' : '◯'}
                </div>
                <span className="font-mono text-xs text-gold tracking-wider">
                  {isTransmitting ? 'TRANSMITTING...' : 'TRANSMIT'}
                </span>
              </div>
            </button>
          </div>
          
          {/* Frequency display */}
          <div className="font-mono text-gold/60 text-sm tracking-wider mb-8">
            FREQUENCY: 137.036 MHz
            <br />
            <span className="text-gold/40">
              {isTransmitting ? 'SIGNAL ACTIVE' : 'AWAITING TRANSMISSION'}
            </span>
          </div>
        </div>

        {/* Connection points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {[
            { 
              icon: '◈', 
              label: 'DIGITAL', 
              value: 'the37thmover@gmail.com',
              action: () => window.open('mailto:the37thmover@gmail.com', '_blank')
            },
            { 
              icon: '◊', 
              label: 'VISUAL', 
              value: 'Instagram @the37thmove',
              action: () => window.open('https://instagram.com/the37thmove', '_blank')
            },
            { 
              icon: '◯', 
              label: 'DIMENSIONAL', 
              value: 'GitHub @Domnoval',
              action: () => window.open('https://github.com/Domnoval', '_blank')
            }
          ].map((connection, index) => (
            <button
              key={connection.label}
              onClick={connection.action}
              className={`
                group p-6 border border-gold/20 rounded-lg
                hover:border-gold/60 hover:bg-surface/30
                transition-all duration-${Math.floor(T2 * 1000)}
                text-center
              `}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="text-gold text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {connection.icon}
              </div>
              <div className="font-cormorant text-cream text-lg mb-1">
                {connection.label}
              </div>
              <div className="font-mono text-cream/60 text-xs tracking-wide">
                {connection.value}
              </div>
            </button>
          ))}
        </div>

        {/* Sacred geometry footer */}
        <div className="mt-16 text-center">
          <div className="w-24 h-px bg-gold/60 mx-auto mb-4"></div>
          <p className="font-crimson text-cream/50 text-sm italic">
            "In the end, we are all just frequencies<br />
            seeking resonance in the cosmic symphony"
          </p>
        </div>
      </div>
    </div>
  );
}