"use client";

import React, { useEffect, useState, useRef } from "react";

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hydration-safe: server renders the welcome screen, then on the client
    // we check localStorage and skip it if the user has already entered.
    // Using lazy `useState` init here would cause a hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof window !== "undefined" && localStorage.getItem("137-entered")) {
      setEntered(true);
      setVisible(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleEnter = () => {
    localStorage.setItem("137-entered", "true");
    setEntered(true);
    setTimeout(() => setVisible(false), 1000);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  if (!visible) return <>{children}</>;

  const parallaxX = (mousePos.x - 0.5) * -20;
  const parallaxY = (mousePos.y - 0.5) * -20;

  return (
    <>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-1000 ${
          entered ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* Background with parallax */}
        <div
          className="absolute inset-[-40px]"
          style={{
            backgroundImage: "url(/137-logo.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `translate(${parallaxX}px, ${parallaxY}px) scale(1.1)`,
            transition: "transform 0.3s ease-out",
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, rgba(201,168,76,0.08) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.95) 100%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center">
          <h1
            className="font-[var(--font-playfair)] text-[12rem] leading-none font-bold"
            style={{
              color: "#C9A84C",
              textShadow: "0 0 60px rgba(201,168,76,0.4), 0 0 120px rgba(201,168,76,0.2)",
            }}
          >
            137
          </h1>
          <p
            className="font-[var(--font-jetbrains)] text-sm tracking-[0.4em] uppercase mt-2"
            style={{ color: "#C9A84C" }}
          >
            Studio
          </p>
          <p className="font-[var(--font-jetbrains)] text-xs text-[#e8e0d0] opacity-60 mt-8 max-w-md mx-auto tracking-wide">
            See the pattern. Feel the frequency. Open the door.
          </p>
          <button
            onClick={handleEnter}
            className="mt-10 px-10 py-3 border border-[#C9A84C] text-[#C9A84C] font-[var(--font-jetbrains)] text-sm uppercase tracking-[0.3em] transition-all duration-300 hover:bg-[#C9A84C] hover:text-[#0a0a0a]"
          >
            Enter
          </button>
          <p className="font-[var(--font-jetbrains)] text-[10px] text-[#C9A84C] opacity-40 mt-4 tracking-widest">
            α = 1/137.036
          </p>
        </div>
      </div>
      {entered && children}
    </>
  );
}
