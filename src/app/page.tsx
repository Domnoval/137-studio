"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LoadingGate } from "@/components/ui/LoadingGate";
import { Nav } from "@/components/ui/Nav";

const HeroScene = dynamic(
  () => import("@/components/scene/HeroScene").then((m) => m.HeroScene),
  { ssr: false }
);

const NAV_BUTTONS = [
  { label: "Featured Art", href: "/featured" },
  { label: "Gallery", href: "/gallery" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
];

export default function HomePage() {
  return (
    <LoadingGate>
      <Nav />
      <main className="relative">
        <HeroScene />

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 pb-12 pt-24 bg-gradient-to-t from-[#0a0a0a] to-transparent">
          <div className="text-center">
            <p className="font-[var(--font-jetbrains)] text-xs text-[#e8e0d0] opacity-50 tracking-widest uppercase mb-8">
              See the pattern. Feel the frequency. Open the door.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {NAV_BUTTONS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-6 py-2.5 border border-[#C9A84C]/40 text-[#C9A84C] font-[var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] hover:bg-[#C9A84C]/10 hover:border-[#C9A84C] transition-all duration-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </LoadingGate>
  );
}
