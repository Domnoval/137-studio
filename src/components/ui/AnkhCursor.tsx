"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

const CHAKRAS = [
  { color: "#FF0000", name: "Root" },
  { color: "#FF7700", name: "Sacral" },
  { color: "#FFDD00", name: "Solar" },
  { color: "#00CC44", name: "Heart" },
  { color: "#00BBFF", name: "Throat" },
  { color: "#4400FF", name: "Third Eye" },
  { color: "#AA00FF", name: "Crown" },
  { color: "#FFFFFF", name: "Source" },
];

interface Particle {
  id: number;
  angle: number;
  speed: number;
  color: string;
  life: number;
}

export function AnkhCursor() {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true);
  const [idleTime, setIdleTime] = useState(0);
  const [kundaliniPhase, setKundaliniPhase] = useState(0);
  const [currentChakra, setCurrentChakra] = useState(0);
  const [isExploding, setIsExploding] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const lastMoveRef = useRef(Date.now());
  const animRef = useRef<number>(0);
  const pidRef = useRef(0);

  useEffect(() => {
    const check = () => {
      const touch =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(hover: none)").matches;
      setIsTouchDevice(touch);
      if (touch) document.body.classList.add("touch-device");
      else document.body.classList.remove("touch-device");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isTouchDevice) return;

    const onMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      lastMoveRef.current = Date.now();
    };
    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setIsHovering(
        !!(
          t.tagName === "BUTTON" ||
          t.tagName === "A" ||
          t.closest("button") ||
          t.closest("a")
        )
      );
    };
    const onOut = () => setIsHovering(false);
    const onDown = () => {
      lastMoveRef.current = Date.now();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mousedown", onDown);
    };
  }, [isTouchDevice]);

  useEffect(() => {
    if (isTouchDevice) return;

    const animate = () => {
      setCursorPos((prev) => ({
        x: prev.x + (mousePos.x - prev.x) * 0.15,
        y: prev.y + (mousePos.y - prev.y) * 0.15,
      }));

      const timeSinceMove = Date.now() - lastMoveRef.current;
      const idleSec = timeSinceMove / 1000;
      setIdleTime(idleSec);

      if (idleSec > 2) {
        const kt = idleSec - 2;
        const cycle = 8;
        const phase = (kt % cycle) / cycle;

        if (phase < 0.5) {
          const rise = phase / 0.5;
          setCurrentChakra(Math.min(Math.floor(rise * 8), 7));
          setKundaliniPhase(rise);
          setIsExploding(false);
        } else if (phase < 0.65) {
          setCurrentChakra(7);
          setKundaliniPhase(1);
          setIsExploding(true);
          if (Math.random() < 0.4) {
            const newP = Array.from({ length: 3 }, () => ({
              id: pidRef.current++,
              angle: Math.random() * Math.PI * 2,
              speed: 1 + Math.random() * 3,
              color: CHAKRAS[Math.floor(Math.random() * CHAKRAS.length)].color,
              life: 1.0,
            }));
            setParticles((prev) => [...prev.slice(-30), ...newP]);
          }
        } else {
          const ret = (phase - 0.65) / 0.35;
          setCurrentChakra(Math.max(0, 7 - Math.floor(ret * 8)));
          setKundaliniPhase(1 - ret);
          setIsExploding(false);
        }
      } else {
        setKundaliniPhase(0);
        setCurrentChakra(0);
        setIsExploding(false);
      }

      setParticles((prev) =>
        prev.map((p) => ({ ...p, life: p.life - 0.02 })).filter((p) => p.life > 0)
      );

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [mousePos, isTouchDevice]);

  if (isTouchDevice) return null;

  const isIdle = idleTime > 2;
  const activeChakra = CHAKRAS[currentChakra] || CHAKRAS[0];
  const ankhColor = isIdle ? activeChakra.color : "#C9A84C";
  const ankhScale = isHovering
    ? 1.3
    : isExploding
    ? 1.5 + Math.sin(Date.now() * 0.02) * 0.3
    : 1 + kundaliniPhase * 0.3;
  const glowIntensity = isExploding ? 30 : kundaliniPhase * 15;
  const ankhGlow = isIdle
    ? `drop-shadow(0 0 ${glowIntensity}px ${activeChakra.color})`
    : "none";

  const chakraTrail = isIdle ? CHAKRAS.slice(0, currentChakra + 1) : [];

  return (
    <>
      {particles.map((p) => {
        const dist = (1 - p.life) * 80 * p.speed;
        const px = mousePos.x + Math.cos(p.angle) * dist;
        const py = mousePos.y + Math.sin(p.angle) * dist;
        return (
          <div
            key={p.id}
            className="fixed pointer-events-none z-[9996] rounded-full"
            style={{
              left: px - 2,
              top: py - 2,
              width: 4 * p.life,
              height: 4 * p.life,
              backgroundColor: p.color,
              opacity: p.life * 0.8,
              boxShadow: `0 0 ${6 * p.life}px ${p.color}`,
            }}
          />
        );
      })}

      {chakraTrail.map((chakra, i) => {
        const yOff = 30 - i * 8;
        const pulse = Math.sin(Date.now() * 0.005 + i * 0.5) * 0.3 + 0.7;
        return (
          <div
            key={`chakra-${i}`}
            className="fixed pointer-events-none z-[9997] rounded-full"
            style={{
              left: mousePos.x - 3,
              top: mousePos.y + yOff,
              width: 6,
              height: 6,
              backgroundColor: chakra.color,
              opacity: pulse * (i === currentChakra ? 1 : 0.4),
              boxShadow: i === currentChakra ? `0 0 12px ${chakra.color}` : "none",
              transition: "opacity 0.2s",
            }}
          />
        );
      })}

      <div
        className="fixed pointer-events-none z-[9999]"
        style={{
          left: mousePos.x - 12,
          top: mousePos.y - 16,
          transform: `scale(${ankhScale})`,
          filter: ankhGlow,
          transition: "transform 0.15s ease-out, filter 0.3s ease-out",
        }}
      >
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
          <ellipse cx="12" cy="8" rx="5.5" ry="6.5" stroke={ankhColor} strokeWidth="2" fill="none" style={{ transition: "stroke 0.3s" }} />
          <line x1="12" y1="14.5" x2="12" y2="30" stroke={ankhColor} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
          <line x1="6" y1="20" x2="18" y2="20" stroke={ankhColor} strokeWidth="2" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
        </svg>
      </div>

      <div
        className="fixed pointer-events-none z-[9998] rounded-full"
        style={{
          width: isExploding ? 100 : 40 + kundaliniPhase * 30,
          height: isExploding ? 100 : 40 + kundaliniPhase * 30,
          left: cursorPos.x - (isExploding ? 50 : 20 + kundaliniPhase * 15),
          top: cursorPos.y - (isExploding ? 50 : 20 + kundaliniPhase * 15),
          border: `1px solid ${isIdle ? activeChakra.color : "rgba(201,168,76,0.15)"}`,
          backgroundColor: isExploding ? "rgba(255,255,255,0.05)" : `rgba(201,168,76,${0.03 + kundaliniPhase * 0.05})`,
          boxShadow: isExploding
            ? `0 0 40px ${activeChakra.color}, 0 0 80px rgba(255,255,255,0.1)`
            : isIdle
            ? `0 0 ${kundaliniPhase * 20}px ${activeChakra.color}`
            : "none",
          transition: "width 0.3s, height 0.3s, left 0.3s, top 0.3s, border-color 0.3s, box-shadow 0.3s",
        }}
      />
    </>
  );
}
