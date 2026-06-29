"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NavItem = { label: string; href: string };

// Ordered: first the gallery anchor back to home, then the working tools.
// Anything not-yet-built stays out of the Nav until it ships.
const NAV_ITEMS: NavItem[] = [
  { label: "Works", href: "/#gallery" },
  { label: "Genesis", href: "/genesis" },
  { label: "Voice", href: "/sing" },
  { label: "Lyrics", href: "/lyrics" },
  { label: "Play", href: "/play" },
  { label: "RNG", href: "/rng" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change / escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <nav
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "bg-[#0e0c0a]/85 backdrop-blur-md border-b border-[#2a2825]"
          : "bg-transparent"
      }`}
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          aria-label="137 Studio — home"
          className="text-2xl leading-none text-[#e8e4dc] hover:text-[#c41230] transition-colors"
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            letterSpacing: "0.06em",
          }}
          onClick={() => setMenuOpen(false)}
        >
          137
        </Link>

        {/* Desktop */}
        <ul className="hidden md:flex gap-8 items-center list-none m-0 p-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[10px] uppercase tracking-[0.22em] text-[#e8e4dc] hover:text-[#c41230] transition-colors"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden flex flex-col gap-1.5 p-2 -mr-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span
            className={`w-6 h-px bg-[#e8e4dc] transition-transform duration-200 ${
              menuOpen ? "rotate-45 translate-y-[7px]" : ""
            }`}
          />
          <span
            className={`w-6 h-px bg-[#e8e4dc] transition-opacity duration-200 ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-6 h-px bg-[#e8e4dc] transition-transform duration-200 ${
              menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0e0c0a]/95 backdrop-blur-md border-t border-[#2a2825]">
          <ul className="flex flex-col gap-1 px-6 py-4 list-none m-0">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-xs uppercase tracking-[0.22em] text-[#e8e4dc] hover:text-[#c41230] transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
