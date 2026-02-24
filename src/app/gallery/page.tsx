"use client";

import { Nav } from "@/components/ui/Nav";
import { CRTOverlay, CRTText } from "@/components/ui/CRTOverlay";

export default function GalleryPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen flex items-center justify-center">
        <CRTOverlay>
          <div className="text-center p-20">
            <h1 className="font-[var(--font-playfair)] text-4xl text-[#C9A84C] mb-4">
              <CRTText>Gallery</CRTText>
            </h1>
            <p className="font-[var(--font-jetbrains)] text-sm text-[#e8e0d0] opacity-50 tracking-widest uppercase">
              <CRTText>Coming soon</CRTText>
            </p>
          </div>
        </CRTOverlay>
      </main>
    </>
  );
}
