import type { Metadata } from 'next';
import GeometryStudio from '@/components/geometry/GeometryStudio';

const description =
  'Eleven sacred-geometry constructions drawn step by step in plan, axonometric and one-, two- and three-point perspective. Share any view as a link, present it as an installation, and export it at real size for print, pen plotter or hand-cut stencil.';

export const metadata: Metadata = {
  title: 'Sacred Geometry Studio',
  description,
  openGraph: {
    title: 'Sacred Geometry Studio — 137 Studio',
    description,
    url: '/geometry',
    images: [{ url: '/og-geometry.png', width: 1200, height: 630, alt: 'The Flower of Life drawn in chalk-white line on a dark ground' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sacred Geometry Studio — 137 Studio',
    description,
    images: ['/og-geometry.png'],
  },
};

export default function GeometryPage() {
  return <GeometryStudio />;
}
