'use client';

import dynamic from 'next/dynamic';

// Dynamically import the game component to avoid SSR issues
const Game137 = dynamic(() => import('../../components/game/Game137'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-[#141218]">
      <div className="text-[#d4a040] text-xl">Loading The Great Work...</div>
    </div>
  ),
});

export default function PlayPage() {
  return <Game137 />;
}
