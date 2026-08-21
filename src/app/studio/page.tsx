'use client';

// /studio — the room, built here first so the live journey on / keeps working
// while it is iterated. It moves to / once it holds up.

import dynamic from 'next/dynamic';

// WebGL, canvas-generated textures and GLB loading are all client-only.
const Studio = dynamic(
  () => import('@/components/studio/Studio').then((m) => m.Studio),
  { ssr: false, loading: () => <div style={{ position: 'fixed', inset: 0, background: '#0a0908' }} /> },
);

export default function StudioPage() {
  return <Studio />;
}
