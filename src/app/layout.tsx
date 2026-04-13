import type { Metadata, Viewport } from 'next';
import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://tonicthoughtstudios.com'),
  title: {
    default: '137 Studio — Michael MacDonald',
    template: '%s — 137 Studio',
  },
  description:
    'Art. Code. Philosophy. Sound. The work of Michael MacDonald — paintings, interactive tools, and field notes from 137 Studio.',
  applicationName: '137 Studio',
  authors: [{ name: 'Michael MacDonald' }],
  creator: 'Michael MacDonald',
  publisher: '137 Studio',
  openGraph: {
    title: '137 Studio — Michael MacDonald',
    description: 'Art. Code. Philosophy. Sound.',
    url: 'https://tonicthoughtstudios.com',
    siteName: '137 Studio',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '137 Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '137 Studio — Michael MacDonald',
    description: 'Art. Code. Philosophy. Sound.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0e0c0a',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
