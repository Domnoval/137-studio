"use client";

import React, { useState, useEffect } from "react";

export function WalkInstructions() {
  const [showFull, setShowFull] = useState(true);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement !== null;
      setIsPointerLocked(locked);
      if (locked) setTimeout(() => setShowFull(false), 2500);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    const hide = setTimeout(() => setShowFull(false), 8000);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      clearTimeout(hide);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Instructions */}
      {showFull && (
        <div className="absolute top-6 left-6 animate-fadeIn">
          <div
            className="bg-black/70 backdrop-blur-md px-5 py-4 rounded-xl border border-[#C9A84C]/30"
            style={{ fontFamily: "monospace" }}
          >
            <h3 className="text-[#C9A84C] text-base font-bold mb-2">
              🦞 137 Studio
            </h3>
            <div className="space-y-1 text-xs text-white/80">
              {!isPointerLocked && (
                <p className="text-[#00FFD1] animate-pulse text-sm">
                  Click to move · Double-click for free look
                </p>
              )}
              <p>
                <span className="text-[#C9A84C]">WASD</span> Move
                <span className="mx-2 text-white/30">|</span>
                <span className="text-[#C9A84C]">Mouse</span> Look
              </p>
              <p>
                <span className="text-[#C9A84C]">ESC</span> Exit free look
              </p>
              <p className="text-[#00FFD1]/70 pt-1">
                Walk into a TV to enter
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Minimal hint when instructions hidden */}
      {!showFull && !isPointerLocked && (
        <div className="absolute top-4 left-4">
          <p
            className="text-[#C9A84C]/40 text-xs"
            style={{ fontFamily: "monospace" }}
          >
            Click to move · Double-click for free look
          </p>
        </div>
      )}

      {/* Crosshair */}
      {isPointerLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <svg width="20" height="20" viewBox="0 0 20 20">
            <circle
              cx="10"
              cy="10"
              r="6"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="1"
              opacity="0.5"
            />
            <circle cx="10" cy="10" r="1.5" fill="#C9A84C" opacity="0.7" />
          </svg>
        </div>
      )}
    </div>
  );
}
