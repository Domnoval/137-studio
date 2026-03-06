import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '137 Studio — Michael MacDonald',
  description: 'Art. Code. Philosophy. Sound.',
  openGraph: {
    title: '137 Studio — Michael MacDonald',
    description: 'Art. Code. Philosophy. Sound.',
    url: 'https://the37thmove.com',
    siteName: '137 Studio',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
