import type { Metadata } from 'next';
import { Cormorant_Garamond, Crimson_Text, JetBrains_Mono, Cinzel } from 'next/font/google';
import { AnkhCursor } from '@/components/ui/AnkhCursor';
import './globals.css';

// Sacred Typography - Each font serves its purpose in the geometry
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-crimson',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-cinzel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '137 Studio — Sacred Geometry as Operating System',
  description: 'The polymath portfolio of Michael [surname] — Artist • Developer • Philosopher • Sound Designer. Where sacred mathematics becomes invisible architecture.',
  keywords: ['sacred geometry', 'artist', 'developer', 'philosopher', 'fine structure constant', '137', 'golden ratio', 'phi'],
  authors: [{ name: 'Michael', url: 'https://the37thmove.com' }],
  creator: 'Michael',
  openGraph: {
    title: '137 Studio — Sacred Geometry as Operating System',
    description: 'The polymath portfolio where art, code, philosophy, and sound exist in perfect balance.',
    url: 'https://the37thmove.com',
    siteName: '137 Studio',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '137 Studio — Sacred Geometry as Operating System',
    description: 'Where sacred mathematics becomes invisible architecture.',
    creator: '@the37thmove',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`
        ${cormorant.variable} 
        ${crimsonText.variable} 
        ${jetbrainsMono.variable} 
        ${cinzel.variable}
      `}
    >
      <head>
        {/* Sacred Mathematics - Preload critical constants */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.SACRED_CONSTANTS = {
                PHI: 1.6180339887,
                GOLDEN_ANGLE: 137.5077,
                PHI_INV: 0.6180339887
              };
            `,
          }}
        />
        
        {/* Smooth scrolling behavior */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                scroll-behavior: smooth;
              }
              
              /* Prevent scroll restoration issues */
              @media (prefers-reduced-motion: no-preference) {
                html {
                  scroll-behavior: auto;
                }
              }
            `,
          }}
        />
      </head>
      
      <body className="font-crimson bg-void text-cream overflow-x-hidden selection:bg-gold/20 selection:text-gold-bright">
        {/* Sacred cursor */}
        <AnkhCursor />
        
        {/* Main content */}
        <main className="relative">
          {children}
        </main>
        
        {/* Sacred loading indicator for page transitions */}
        <div 
          id="page-transition"
          className="fixed inset-0 bg-void z-50 pointer-events-none opacity-0 transition-opacity duration-618"
          style={{ transition: 'opacity 0.618s ease-out' }}
        >
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-16 border border-gold/40 rounded-full animate-spin">
              <div className="w-full h-full flex items-center justify-center font-cinzel text-gold/60 text-xs">
                137
              </div>
            </div>
          </div>
        </div>
        
        {/* Accessibility improvements */}
        <div className="sr-only">
          <h1>137 Studio - Sacred Geometry Portfolio</h1>
          <p>
            A polymath portfolio showcasing art, code, philosophy, and sound design 
            through the lens of sacred mathematics and the golden ratio.
          </p>
        </div>
        
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                     bg-void border border-gold text-gold px-4 py-2 rounded z-50
                     focus:outline-none focus:ring-2 focus:ring-gold"
        >
          Skip to main content
        </a>
      </body>
    </html>
  );
}