"use client";

import React, { useState, useEffect } from "react";

export function WalkInstructions() {
  const [isVisible, setIsVisible] = useState(true);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      setIsPointerLocked(locked);
      if (locked) {
        // Hide instructions after first pointer lock
        setTimeout(() => setIsVisible(false), 3000);
      }
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    
    // Auto-hide after 10 seconds if user doesn't interact
    const timeout = setTimeout(() => setIsVisible(false), 10000);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      clearTimeout(timeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Instructions overlay */}
      <div className="absolute top-8 left-8 text-white font-mono">
        <div className="bg-black/60 backdrop-blur-sm p-4 rounded-lg border border-gold/30">
          <h3 className="text-gold text-lg font-bold mb-2">🦞 Walk Through the Temple</h3>
          <div className="space-y-1 text-sm">
            {!isPointerLocked && (
              <p className="text-cyan animate-pulse">Click to enter first-person mode</p>
            )}
            <p><span className="text-gold">WASD</span> or <span className="text-gold">Arrow Keys</span> — Move</p>
            <p><span className="text-gold">Mouse</span> — Look around</p>
            <p><span className="text-gold">ESC</span> — Exit first-person mode</p>
            <p className="text-cyan/80 mt-2">Walk into the TV to enter the gallery</p>
          </div>
        </div>
      </div>

      {/* Crosshair when pointer locked */}
      {isPointerLocked && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border border-gold/60 rounded-full bg-transparent">
            <div className="w-1 h-1 bg-gold/80 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      )}

      {/* Distance indicator when near TV */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div 
          id="proximity-indicator" 
          className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-cyan/30 text-cyan font-mono text-sm opacity-0 transition-opacity duration-300"
        >
          Portal proximity detected
        </div>
      </div>
    </div>
  );
}