import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Repeat Suite Forge',
  description: 'Seeded underlays for The Repeat Suite — four panels tracing Machado-Joseph disease from gene to brain.',
  robots: { index: false, follow: false },
};

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
