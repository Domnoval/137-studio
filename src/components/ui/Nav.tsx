"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Featured", href: "/featured" },
  { label: "Gallery", href: "/gallery" },
  { label: "Voice", href: "/sing" },
  { label: "Lyrics", href: "/lyrics" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a0a]/80 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-[var(--font-playfair)] text-2xl font-bold"
          style={{ color: "#C9A84C" }}
        >
          137
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-[var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] text-[#C9A84C] hover:text-[#E8C547] transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`w-6 h-0.5 bg-[#C9A84C] transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`w-6 h-0.5 bg-[#C9A84C] transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`w-6 h-0.5 bg-[#C9A84C] transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0a0a0a]/95 backdrop-blur-md px-6 pb-6 flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="font-[var(--font-jetbrains)] text-sm uppercase tracking-[0.2em] text-[#C9A84C] hover:text-[#E8C547]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
