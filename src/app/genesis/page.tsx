import type { Metadata } from 'next';
import GenesisCanvas from '@/components/GenesisCanvas';

export const metadata: Metadata = {
  title: 'Genesis',
  description:
    'The 8-stage embryology of Metatron’s Cube. Two voices — form and life — begin fused, differentiate, reunite on the Platonic solids, and collapse to the origin. Touch the void to begin.',
};

/**
 * /genesis — Genesis folded in as a first-class route.
 *
 * Full-bleed: the canvas is the work. A fixed, viewport-filling layer covers
 * the global Footer (which would otherwise collide with the scrubber) while
 * sitting just under the Nav (z-40) so navigation stays usable. The no-clock
 * gate lives inside the canvas component.
 */
export default function GenesisPage() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        overflow: 'hidden',
        background: '#0e0c0a',
      }}
    >
      <GenesisCanvas />
    </main>
  );
}
