import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '137 Voice — Singing Studio',
  description: 'AI-powered vocal studio. Record, practice, and master your voice.',
  openGraph: {
    title: '137 Voice — Singing Studio',
    description: 'AI-powered vocal studio. Record, practice, and master your voice.',
  },
};

export default function SingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
